'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = api.storages.ResourceFilter;
var Package = process.requirePublish('app/server/packages/Package.js');
var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 11.0.0', function() {
  var migration;
  var database;
  var VideoProvider;
  var PoiProvider;
  var PropertyProvider;
  var expectedMedias;
  var coreApi;
  var realCoreApi;

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    VideoProvider = function() {};
    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    });
    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });
    VideoProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      callback();
    });
    VideoProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback();
    });

    PoiProvider = function() {};
    PoiProvider.prototype.add = chai.spy(function(pois, callback) {
      callback();
    });
    PoiProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback();
    });

    PropertyProvider = function() {};
    PropertyProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      callback();
    });
    PropertyProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback();
    });

    coreApi = {
      getDatabase: function() {
        return database;
      },
      getCoreApi: function() {
        return coreApi;
      }
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/PoiProvider.js'), PoiProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'), PropertyProvider);
  });

  // Initialize tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/11.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should create indexes for the new points of interest collection', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PoiProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should re-create querySearch index for the videos collection', function(done) {
    VideoProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      assert(indexName, 'querySearch', 'Wrong index removed');
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      VideoProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should re-create querySearch index for the properties collection', function(done) {
    PropertyProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      assert(indexName, 'querySearch', 'Wrong index removed');
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PropertyProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      PropertyProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if creating points of interest indexes failed', function(done) {
    var expectedError = new Error('Something went wrong');

    PoiProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      PoiProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not execute callback with an error if dropping videos querySearch index failed', function(done) {
    VideoProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      callback(new Error('Something went wrong'));
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      VideoProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not execute callback with an error if dropping properties querySearch index failed', function(done) {
    PropertyProvider.prototype.dropIndex = chai.spy(function(indexName, callback) {
      callback(new Error('Something went wrong'));
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PropertyProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      PropertyProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if re-creating videos indexes failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      VideoProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if re-creating properties indexes failed', function(done) {
    var expectedError = new Error('Something went wrong');

    PropertyProvider.prototype.createIndexes = chai.spy(function(callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      PropertyProvider.prototype.dropIndex.should.have.been.called.exactly(1);
      PropertyProvider.prototype.createIndexes.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should extract chapters and tags of medias inside the new points of interest collection', function(done) {
    var expectedMediaId = '42';
    var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', expectedMediaId, 'uploads');
    var expectedTagFileName = 'fileName1.jpg';
    var expectedTagFilePath = path.join(poiFileDestinationPath, expectedTagFileName);
    var expectedTag = {
      id: '1',
      name: 'Tag name',
      description: 'Tag description',
      value: 1000,
      file: {
        originalName: 'tagOriginalName.jpg',
        mimeType: 'image/jpeg',
        fileName: expectedTagFileName,
        size: 42,
        url: expectedTagFilePath
      }
    };
    var expectedChapter = {
      id: '2',
      name: 'Chapter name',
      description: 'Chapter description',
      value: 2000
    };
    expectedMedias = [
      {
        id: expectedMediaId,
        tags: [expectedTag],
        chapters: [expectedChapter]
      }
    ];

    PoiProvider.prototype.add = chai.spy(function(pois, callback) {
      assert.equal(pois.length, 2, 'Wrong number of points of interest');

      assert.equal(pois[0].id, expectedTag.id, 'Wrong tag id');
      assert.equal(pois[0].name, expectedTag.name, 'Wrong tag name');
      assert.equal(pois[0].description, expectedTag.description, 'Wrong tag description');
      assert.equal(pois[0].value, expectedTag.value, 'Wrong tag value');
      assert.equal(pois[0].file.originalName, expectedTag.file.originalName, 'Wrong tag file original name');
      assert.equal(pois[0].file.mimeType, expectedTag.file.mimeType, 'Wrong tag file mime type');
      assert.equal(pois[0].file.fileName, expectedTag.file.fileName, 'Wrong tag file name');
      assert.equal(pois[0].file.size, expectedTag.file.size, 'Wrong tag file size');
      assert.equal(pois[0].file.url, expectedTag.file.url, 'Wrong tag file URL');
      assert.equal(pois[0].file.path, expectedTag.file.url, 'Wrong tag file path');
      assert.equal(
        pois[0].descriptionText,
        api.util.removeHtmlFromText(expectedTag.description),
        'Wrong tag description text'
      );

      assert.equal(pois[1].id, expectedChapter.id, 'Wrong chapter id');
      assert.equal(pois[1].name, expectedChapter.name, 'Wrong chapter name');
      assert.equal(pois[1].description, expectedChapter.description, 'Wrong chapter description');
      assert.equal(pois[1].value, expectedChapter.value, 'Wrong chapter value');
      assert.equal(
        pois[1].descriptionText,
        api.util.removeHtmlFromText(expectedChapter.description),
        'Wrong chapter description text'
      );

      callback();
    });

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );

      assert.equal(modifications.tags.length, 1, 'Wrong number of tags ids');
      assert.include(modifications.tags, expectedTag.id, 'Missing tag');

      assert.equal(modifications.chapters.length, 1, 'Wrong number of chapters ids');
      assert.include(modifications.chapters, expectedChapter.id, 'Missing chapter');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should generate an id for chapters and tags of medias missing it', function(done) {
    var expectedGeneratedTagId;
    var expectedGeneratedChapterId;
    var expectedMediaId = '42';
    var expectedTag = {
      name: 'Tag name',
      description: 'Tag description',
      value: 1000
    };
    var expectedChapter = {
      name: 'Chapter name',
      description: 'Chapter description',
      value: 2000
    };
    expectedMedias = [
      {
        id: expectedMediaId,
        tags: [expectedTag],
        chapters: [expectedChapter]
      }
    ];

    PoiProvider.prototype.add = chai.spy(function(pois, callback) {
      assert.isDefined(pois[0].id, 'Missing tag id');
      assert.isDefined(pois[1].id, 'Missing chapter id');

      expectedGeneratedTagId = pois[0].id;
      expectedGeneratedChapterId = pois[1].id;
      callback();
    });

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.sameMembers(modifications.tags, [expectedGeneratedTagId], 'Missing tag');
      assert.sameMembers(modifications.chapters, [expectedGeneratedChapterId], 'Missing chapter');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });
  it('should add descriptionText property to medias which have a description', function(done) {
    expectedMedias = [
      {
        id: '1',
        description: '<p>Description</p> with HTML'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );

      assert.equal(modifications.description, expectedMedias[0].description, 'Wrong description');
      assert.equal(
        modifications.descriptionText,
        api.util.removeHtmlFromText(expectedMedias[0].description),
        'Wrong description text'
      );

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(0);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias without tags, chapters or description', function(done) {
    expectedMedias = [
      {
        id: '42'
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(0);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias for points of interest failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      PoiProvider.prototype.add.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias for description failed', function(done) {
    var expectedError = new Error('Something went wrong');
    var count = 0;

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      count++;
      callback(count === 2 ? expectedError : 0);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.exactly(2);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      PoiProvider.prototype.add.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if adding tags and chapters to the new collection failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        tags: [
          {
            id: '1',
            name: 'Tag name',
            description: 'Tag description',
            value: 1000
          }
        ]
      }
    ];

    PoiProvider.prototype.add = chai.spy(function(pois, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating media points of interest failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        tags: [
          {
            id: '1',
            name: 'Tag name',
            description: 'Tag description',
            value: 1000
          }
        ]
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      PoiProvider.prototype.add.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if adding descriptionText property failed', function(done) {
    var expectedError = new Error('Something went wrong');

    expectedMedias = [
      {
        id: '42',
        description: '<p>Description with HTML</p>'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should rename "grouped" lastState into "merged"', function(done) {
    var expectedMediaId = '42';

    expectedMedias = [
      {
        id: expectedMediaId,
        lastState: 'grouped'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.lastState, VideoPackage.STATES.MERGED, 'Wrong last state');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should rename "group" lastTransition into "merge"', function(done) {
    var expectedMediaId = '42';

    expectedMedias = [
      {
        id: expectedMediaId,
        lastTransition: 'group'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.lastTransition, VideoPackage.TRANSITIONS.MERGE, 'Wrong last transition');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should rename "publicDirectoryPrepared" lastState into "metadataRetrieved"', function(done) {
    var expectedMediaId = '42';

    expectedMedias = [
      {
        id: expectedMediaId,
        lastState: 'publicDirectoryPrepared'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.lastState, VideoPackage.STATES.METADATA_RETRIEVED, 'Wrong last state');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should rename "preparePublicDirectory" lastTransition into "uploadMedia"', function(done) {
    var expectedMediaId = '42';

    expectedMedias = [
      {
        id: expectedMediaId,
        lastTransition: 'preparePublicDirectory'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.lastTransition, Package.TRANSITIONS.UPLOAD_MEDIA, 'Wrong last transition');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if getting medias for transitions failed', function(done) {
    var expectedMediaId = '42';
    var expectedError = new Error('Something went wrong');

    expectedMedias = [
      {
        id: expectedMediaId,
        lastTransition: 'preparePublicDirectory'
      }
    ];

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      if (fields.include.indexOf('lastState') >= 0) {
        callback(expectedError);
      } else {
        callback();
      }
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.at.least(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if renaming media lastState or lastTransition failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        lastState: 'grouped'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      if (modifications.lastState === VideoPackage.STATES.MERGED) {
        callback(expectedError);
      } else {
        callback();
      }
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

});
