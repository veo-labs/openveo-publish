'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 11.0.0', function() {
  var migration;
  var database;
  var VideoProvider;
  var expectedMedias;
  var coreApi;
  var realCoreApi;
  var openVeoApi;
  var publishConf;

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    VideoProvider = function() {};
    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    };
    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    coreApi = {
      getDatabase: function() {
        return database;
      },
      getCoreApi: function() {
        return coreApi;
      }
    };

    openVeoApi = {
      fileSystem: {
        getConfDir: function() {
          return '/conf/dir';
        }
      },
      storages: api.storages,
      imageProcessor: {
        generateSprites: chai.spy(function(imagesPaths, destinationPath, width, height, totalColumns, maxRows, quality,
          temporaryDirectoryPath, callback) {
          callback(null, []);
        })
      }
    };

    publishConf = {
      videoTmpDir: '/tmp'
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
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

  it('should generate sprites for timecodes of type "image" and update the media', function(done) {
    expectedMedias = [
      {
        id: '42',
        timecodes: [
          {
            id: '1',
            timecode: 42000,
            image: {
              large: 'large-image-1.jpg',
              small: 'small-image-1.jpg'
            }
          },
          {
            id: '2',
            timecode: 43000,
            image: {
              large: 'large-image-2.jpg',
              small: 'small-image-2.jpg'
            }
          }
        ]
      }
    ];
    var expectedImagesReferences = [
      {
        sprite: '/sprite/path',
        image: expectedMedias[0].timecodes[0].image.large,
        x: 42,
        y: 42
      },
      {
        sprite: '/sprite/path-1',
        image: expectedMedias[0].timecodes[1].image.large,
        x: 43,
        y: 43
      }
    ];

    openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
      totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
      assert.sameMembers(imagesPaths, expectedMedias[0].timecodes.map(function(timecode) {
        return timecode.image.large;
      }), 'Wrong images');

      assert.equal(
        destinationPath,
        path.join(process.rootPublish, 'assets/player/videos', expectedMedias[0].id, 'points-of-interest-images.jpg'),
        'Wrong sprite path'
      );

      assert.equal(width, 142, 'Wrong width');
      assert.equal(height, 80, 'Wrong height');
      assert.equal(totalColumns, 5, 'Wrong number of columns');
      assert.equal(maxRows, 5, 'Wrong number of rows');
      assert.equal(quality, 90, 'Wrong quality');
      assert.equal(temporaryDirectoryPath, publishConf.videoTmpDir, 'Wrong temporary directory');

      callback(null, expectedImagesReferences);
    });

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );

      for (var i = 0; i < modifications.timecodes.length; i++) {
        var timecode = modifications.timecodes[i];
        var expectedTimecode = expectedMedias[0].timecodes[i];

        assert.equal(timecode.id, expectedTimecode.id, 'Wrong timecode id');
        assert.equal(
          timecode.timecode,
          expectedTimecode.timecode,
          'Wrong timecode for timecode ' + timecode.id
        );
        assert.equal(
          timecode.image.large,
          expectedTimecode.image.large,
          'Wrong large image for timecode ' + timecode.id
        );
        assert.isObject(
          timecode.image.small,
          'Expected small image to be a sprite object for timecode ' + timecode.id
        );
        assert.equal(
          timecode.image.small.url,
          '/publish/' + expectedMedias[0].id + '/' + expectedImagesReferences[i].sprite.replace('/sprite/', ''),
          'Wrong small image URL for timecode ' + timecode.id
        );
        assert.equal(
          timecode.image.small.x,
          expectedImagesReferences[i].x,
          'Wrong small image x coordinate for timecode ' + timecode.id
        );
        assert.equal(
          timecode.image.small.y,
          expectedImagesReferences[i].y,
          'Wrong small image y coordinate for timecode ' + timecode.id
        );
      }

      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias without timecodes', function(done) {
    expectedMedias = [
      {
        id: '42'
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      done();
    });
  });

  it('should execute callback with an error if generating sprite failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        timecodes: [
          {
            id: '1',
            timecode: 42000,
            image: {
              large: 'large-image-1.jpg',
              small: 'small-image-1.jpg'
            }
          }
        ]
      }
    ];
    var expectedError = new Error('Something went wrong');

    openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
      totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        timecodes: [
          {
            id: '1',
            timecode: 42000,
            image: {
              large: 'large-image-1.jpg',
              small: 'small-image-1.jpg'
            }
          }
        ]
      }
    ];
    var expectedError = new Error('Something went wrong');
    var expectedImagesReferences = [
      {
        sprite: '/sprite/path',
        image: expectedMedias[0].timecodes[0].image.large,
        x: 42,
        y: 42
      }
    ];

    openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
      totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
      callback(null, expectedImagesReferences);
    });

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

});
