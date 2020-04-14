'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');
var api = require('@openveo/api');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('PoiProvider', function() {
  var PoiProvider;
  var provider;
  var openVeoApi;
  var EntityProvider;
  var storage;
  var expectedPois;
  var expectedLocation = 'location';

  // Mocks
  beforeEach(function() {
    storage = {};
    expectedPois = [];

    EntityProvider = function() {
      this.storage = storage;
      this.location = expectedLocation;
    };
    EntityProvider.prototype.executeCallback = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.shift();
      if (callback) return callback.apply(null, args);
    };
    EntityProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedPois);
    });
    EntityProvider.prototype.add = chai.spy(function(resources, callback) {
      callback(null, expectedPois.length, resources);
    });
    EntityProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
      callback(null, expectedPois[0]);
    });
    EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedPois.length);
    });
    EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    openVeoApi = {
      providers: {
        EntityProvider: EntityProvider
      },
      util: api.util,
      fileSystem: {
        rm: chai.spy(function(filePath, callback) {
          callback();
        })
      },
      errors: {
        NotFoundError: function() {}
      }
    };

    mock('@openveo/api', openVeoApi);
  });

  // Initializes tests
  beforeEach(function() {
    PoiProvider = mock.reRequire(path.join(process.rootPublish, 'app/server/providers/PoiProvider.js'));
    provider = new PoiProvider(storage, expectedLocation);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('add', function() {

    it('should add points of interest', function(done) {
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          description: 'Description with <strong>HTML</strong>',
          value: 1000,
          file: {
            originalName: 'originalFileName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: 'path'
          }
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(pois, callback) {
        expectedPois[0].descriptionText = api.util.removeHtmlFromText(expectedPois[0].description);
        assert.deepEqual(pois, expectedPois, 'Wrong points of interest');
        assert.notStrictEqual(pois[0], expectedPois[0], 'Unexpected reference to the point of interest object');
        callback(null, pois.length, pois);
      });

      provider.add(expectedPois, function(error, total, pois) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedPois.length, 'Wrong total');
        assert.deepEqual(pois, expectedPois, 'Wrong points of interest');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should generate an id if not specified', function(done) {
      expectedPois = [
        {
          name: 'Name',
          description: 'Description',
          value: 1000
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(pois, callback) {
        assert.isNotEmpty(pois[0].id, 'Expected id to be generated');
        callback(null, pois.length, pois);
      });

      provider.add(expectedPois, function(error, total, pois) {
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should initialize file to null if not specified', function(done) {
      expectedPois = [
        {
          name: 'Name',
          description: 'Description',
          value: 1000
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(pois, callback) {
        assert.isNull(pois[0].file, 'Expected file to be null');
        callback(null, pois.length, pois);
      });

      provider.add(expectedPois, function(error, total, pois) {
        assert.isNull(error, 'Unexpected error');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if name is not specified', function(done) {
      expectedPois = [
        {
          value: 0
        }
      ];

      provider.add(expectedPois, function(error, total, pois) {
        assert.isNotNull(error, 'Expected an error');
        assert.instanceOf(error, TypeError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        assert.isNotOk(pois, 'Unexpected points of interest');
        EntityProvider.prototype.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if value is not specified', function(done) {
      expectedPois = [
        {
          name: 'Name'
        }
      ];

      provider.add(expectedPois, function(error, total, pois) {
        assert.instanceOf(error, TypeError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        assert.isNotOk(pois, 'Unexpected points of interest');
        EntityProvider.prototype.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if adding points of interest failed', function(done) {
      expectedPois = [
        {
          name: 'Name',
          value: 0
        }
      ];
      var expectedError = new Error('Something went wrong');

      EntityProvider.prototype.add = chai.spy(function(pois, callback) {
        callback(expectedError);
      });

      provider.add(expectedPois, function(error, total, pois) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        assert.isNotOk(pois, 'Unexpected points of interest');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('updateOne', function() {

    it('should update a point of interest', function(done) {
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          value: 1000
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);
      var expectedModifications = {
        name: 'New name',
        description: 'New description with <strong>HTML</strong>',
        value: 2000
      };

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPois[0].id,
          'Wrong id'
        );
        assert.equal(modifications.name, expectedModifications.name, 'Wrong name');
        assert.equal(modifications.description, expectedModifications.description, 'Wrong description');
        assert.equal(modifications.value, expectedModifications.value, 'Wrong values');
        assert.notStrictEqual(modifications, expectedModifications, 'Unexpected reference');
        assert.equal(
          modifications.descriptionText,
          api.util.removeHtmlFromText(expectedModifications.description),
          'Wrong description text'
        );
        callback(null, 1);
      });

      provider.updateOne(expectedFilter, expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should delete point of interest file if the update set explicitly no file', function(done) {
      var expectedPoiId = '42';
      var expectedModifications = {
        file: null
      };
      var expectedFilePath = 'path';
      expectedPois = [
        {
          id: expectedPoiId,
          name: 'Name',
          value: 1000,
          file: {
            originalName: 'originalName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: expectedFilePath
          }
        }
      ];

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        assert.equal(filePath, expectedFilePath, 'Wrong file path');
        callback();
      });

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.isNull(modifications.file, 'Unexpected file');
        callback(null, 1);
      });

      provider.updateOne(
        new ResourceFilter().equal('id', expectedPoiId),
        expectedModifications,
        function(error, total) {
          assert.isNull(error, 'Unexpected error');
          assert.equal(total, 1, 'Wrong total');
          EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
          EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
          openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
          done();
        }
      );
    });

    it('should replace old point of interest file if a new one is specified', function(done) {
      var expectedPoiId = '42';
      var expectedModifications = {
        file: {
          originalName: 'newOriginalName',
          mimeType: 'newMimeType',
          fileName: 'newFileName',
          size: 43,
          url: 'newUrl',
          path: 'newPath'
        }
      };
      var expectedFilePath = 'path';
      expectedPois = [
        {
          id: expectedPoiId,
          name: 'Name',
          value: 1000,
          file: {
            originalName: 'originalName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: expectedFilePath
          }
        }
      ];

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        assert.equal(filePath, expectedFilePath, 'Wrong file path');
        callback();
      });

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.deepEqual(modifications.file, expectedModifications.file, 'Wrong new file');
        callback(null, 1);
      });

      provider.updateOne(
        new ResourceFilter().equal('id', expectedPoiId),
        expectedModifications,
        function(error, total) {
          assert.isNull(error, 'Unexpected error');
          assert.equal(total, 1, 'Wrong total');
          EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
          EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
          openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
          done();
        }
      );
    });

    it('should execute callback with an error if getting point of interest failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedPoiId = '42';
      var expectedModifications = {
        value: 2000
      };

      expectedPois = [
        {
          id: expectedPoiId,
          name: 'Name',
          value: 1000
        }
      ];

      EntityProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      provider.updateOne(
        new ResourceFilter().equal('id', expectedPoiId),
        expectedModifications,
        function(error, total) {
          assert.strictEqual(error, expectedError, 'Wrong error');
          assert.isNotOk(total, 'Unexpected total');
          EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
          EntityProvider.prototype.updateOne.should.have.been.called.exactly(0);
          openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
          done();
        }
      );
    });

    it('should execute callback with an error if point of interest does not exist', function(done) {
      provider.updateOne(new ResourceFilter().equal('id', '42'), {value: 2000}, function(error, total) {
        assert.instanceOf(error, openVeoApi.errors.NotFoundError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if deleting old file failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedPoiId = '42';
      var expectedModifications = {
        file: null
      };
      expectedPois = [
        {
          id: expectedPoiId,
          name: 'Name',
          value: 1000,
          file: {
            originalName: 'originalName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: 'path'
          }
        }
      ];

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      provider.updateOne(new ResourceFilter().equal('id', '42'), expectedModifications, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if updating point of interest failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedPoiId = '42';
      var expectedModifications = {
        value: 2000
      };

      expectedPois = [
        {
          id: expectedPoiId,
          name: 'Name',
          value: 1000
        }
      ];

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(expectedError);
      });

      provider.updateOne(
        new ResourceFilter().equal('id', expectedPoiId),
        expectedModifications,
        function(error, total) {
          assert.strictEqual(error, expectedError, 'Wrong error');
          assert.isNotOk(total, 'Unexpected total');
          EntityProvider.prototype.getOne.should.have.been.called.exactly(1);
          EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
          openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
          done();
        }
      );
    });

  });

  describe('remove', function() {

    it('should remove points of interest', function(done) {
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          value: 1000
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);

      EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
        assert.strictEqual(filter, expectedFilter, 'Wrong points of interest');
        callback(null, expectedPois.length);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedPois.length, 'Wrong total');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should remove files associated to points of interest', function(done) {
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          value: 1000,
          file: {
            originalName: 'originalName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: 'path'
          }
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        assert.equal(filePath, expectedPois[0].file.path, 'Wrong file path');
        callback();
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedPois.length, 'Wrong total');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if getting points of interest failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          value: 1000
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);

      EntityProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(expectedError);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.equal(total, 0, 'Wrong total');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if removing associated files failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          value: 1000,
          file: {
            originalName: 'originalName',
            mimeType: 'mimeType',
            fileName: 'fileName',
            size: 42,
            url: 'url',
            path: 'path'
          }
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.equal(total, 0, 'Wrong total');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if removing points of interest failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedPois = [
        {
          id: '42',
          name: 'Name',
          value: 1000
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedPois[0].id);

      EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
        callback(expectedError);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isNotOk(total, 'Unexpected total');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

  });

});
