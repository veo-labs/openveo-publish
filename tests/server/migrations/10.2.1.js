'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 10.2.1', function() {
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

    database = {
      get: function(location, filter, fields, limit, page, sort, callback) {
        callback(null, expectedMedias);
      }
    };

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
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/10.2.1.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
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
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should remove base paths from Wowza links', function(done) {
    var baseUrl = 'http://wowza-url:1443/sub-directory';
    var expectedLinks = [
      'video.mp4/manifest.mpd',
      'video.mp4/playlist.m3u8',
      'video.mp4/manifest.f4m',
      'video-name/manifest-name'
    ];
    expectedMedias = [
      {
        id: '42',
        type: TYPES.WOWZA,
        sources: [
          {
            adaptive: []
          }
        ]
      }
    ];

    expectedLinks.forEach(function(expectedLink) {
      expectedMedias[0].sources[0].adaptive.push({
        link: baseUrl + '/' + expectedLink
      });
    });

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );

      for (var i = 0; i < modifications.sources[0].adaptive; i++) {
        assert.equal(modifications.sources[0].adaptive[i].link, expectedLinks[i], 'Wrong link for index ' + i);
      }
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        type: TYPES.WOWZA,
        sources: [
          {
            adaptive: [
              {
                link: 'http://wowza-url:1443/sub-directory/video.mp4/manifest.f4m'
              }
            ]
          }
        ]
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

  it('should not update the media if link is not valid', function(done) {
    expectedMedias = [
      {
        id: '42',
        type: TYPES.WOWZA,
        sources: [
          {
            adaptive: [
              {
                link: 'invalid'
              }
            ]
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

});
