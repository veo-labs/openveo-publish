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

describe('Migration 3.0.1', function() {
  var migration;
  var database;
  var VideoProvider;
  var expectedMedias;
  var coreApi;
  var realCoreApi;

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

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/3.0.1.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should update medias to migrate indexes from metadata to timecodes property', function(done) {
    expectedMedias = [
      {
        id: '42',
        metadata: {
          indexes: [
            {
              timecode: 42000,
              data: {
                filename: 'file'
              }
            }
          ]
        }
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      var expectedIndex = expectedMedias[0].metadata.indexes[0];
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.isNotEmpty(modifications.timecodes[0].id, 'Expected a timecode id');
      assert.equal(
        modifications.timecodes[0].timecode,
        expectedIndex.timecode,
        'Wrong timecode'
      );
      assert.equal(
        modifications.timecodes[0].image.small,
        '/publish/' + expectedMedias[0].id + '/' + expectedIndex.data.filename + '?thumb=small',
        'Wrong timecode small image path'
      );
      assert.equal(
        modifications.timecodes[0].image.large,
        '/publish/' + expectedMedias[0].id + '/' + expectedIndex.data.filename,
        'Wrong timecode large image path'
      );
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias which have already timecodes instead of indexes', function(done) {
    expectedMedias = [
      {
        id: '42',
        timecodes: [
          {
            timecode: 42000,
            image: {
              small: 'small',
              large: 'large'
            }
          }
        ]
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
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

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        metadata: {
          indexes: [
            {
              timecode: 42000,
              data: {
                filename: 'file'
              }
            }
          ]
        }
      }
    ];

    VideoProvider.prototype.updateOne = function(filter, modifications, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      done();
    });
  });

});
