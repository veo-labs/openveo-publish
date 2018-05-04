'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var openVeoApi = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 2.1.2', function() {
  var migration;
  var database;
  var VideoProvider;
  var expectedMedias;
  var coreApi;
  var realCoreApi;
  var synchro;
  var expectedMediaId = '42';
  var expectedLocation = 'location';

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    VideoProvider = function() {
      this.location = expectedLocation;
    };
    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    };

    database = {
      updateOne: chai.spy(function(location, filter, modifications, callback) {
        callback();
      })
    };
    coreApi = {
      getDatabase: function() {
        return database;
      },
      getCoreApi: function() {
        return coreApi;
      }
    };
    synchro = [
      {
        timecode: 42,
        image: 'image.jpg'
      }
    ];

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
    mock(path.join(process.rootPublish, '/assets/player/videos/', expectedMediaId, '/synchro.json'), synchro);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/2.1.2.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should import medias synchro.json files into database', function(done) {
    expectedMedias = [
      {
        id: expectedMediaId
      }
    ];

    database.updateOne = chai.spy(function(location, filter, modifications, callback) {
      var index = modifications.metadata.indexes[0];

      assert.equal(location, expectedLocation, 'Wrong location');
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(index.timecode, synchro[0].timecode, 'Wrong timecode');
      assert.equal(index.type, 'image', 'Wrong type');
      assert.equal(index.data.filename, synchro[0].image, 'Wrong image');
      assert.equal(modifications.metadata.indexes.length, 1, 'Wront number of timecodes');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      database.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should ignore media if it has no associated synchro.json file', function(done) {
    expectedMedias = [
      {
        id: '43'
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      database.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      database.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting all medias failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: expectedMediaId
      }
    ];

    database.updateOne = function(location, filter, modifications, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

});
