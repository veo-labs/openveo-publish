'use strict';

var path = require('path');

var api = require('@openveo/api');
var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');

var assert = chai.assert;
var ResourceFilter = api.storages.ResourceFilter;

chai.should();
chai.use(spies);

describe('Migration 14.0.1', function() {
  var coreApi;
  var database;
  var expectedError = new Error('Something went wrong');
  var expectedMedias;
  var migration;
  var realCoreApi;
  var VideoProvider;

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

  // Initialize tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/14.0.1.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should move media videos height to mediasHeights property', function(done) {
    var updateOneCount = 0;
    expectedMedias = [
      {
        id: '42',
        mediaId: '1',
        metadata: {
          'profile-settings': {
            'video-height': 720
          }
        }
      },
      {
        id: '43',
        mediaId: ['2', '3'],
        metadata: {
          'profile-settings': {
            'video-height': 1080
          }
        }
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      var expectedMedia = expectedMedias[updateOneCount];
      var expectedMediaIds = !Array.isArray(expectedMedia.mediaId) ? [expectedMedia.mediaId] : expectedMedia.mediaId;

      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedia.id,
        'Wrong media modified'
      );
      assert.deepEqual(
        modifications.mediasHeights,
        Array(expectedMediaIds.length).fill(expectedMedia.metadata['profile-settings']['video-height']),
        'Wrong videos heights'
      );

      updateOneCount++;
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should not do anything if no media', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        mediaId: ['2', '3'],
        metadata: {
          'profile-settings': {
            'video-height': 1080
          }
        }
      }
    ];

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.at.least(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        mediaId: ['2', '3'],
        metadata: {
          'profile-settings': {
            'video-height': 1080
          }
        }
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.at.least(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

});

