'use strict';

var util = require('util');
var chai = require('chai');
var spies = require('chai-spies');
var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var assert = chai.assert;
var fileSystem = openVeoApi.fileSystem;

chai.should();
chai.use(spies);

// VideoModel.js
describe('VideoModel', function() {
  var user;
  var videoModel;
  var TestPropertyProvider;
  var TestVideoProvider;
  var anonymousUserId = 'anonymous';
  var superAdminId = 'admin';
  var CDN_URL = 'http://cdn.openveo.com';

  // Mocks
  beforeEach(function() {
    TestPropertyProvider = function() {};
    TestVideoProvider = function() {};

    util.inherits(TestPropertyProvider, PropertyProvider);
    util.inherits(TestVideoProvider, VideoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    var videoProvider = new TestVideoProvider();
    var propertyProvider = new TestPropertyProvider();

    user = {};
    videoModel = new VideoModel(user, videoProvider, propertyProvider);
    videoModel.getSuperAdminId = function() {
      return superAdminId;
    };

    videoModel.getAnonymousId = function() {
      return anonymousUserId;
    };
    process.api.addPlugin({
      name: 'core',
      api: {
        getCdnUrl: function() {
          return CDN_URL;
        }
      }
    });
  });

  afterEach(function() {
    process.api.removePlugins();
  });

  it('should be an instance of EntityModel', function() {
    assert.ok(videoModel instanceof openVeoApi.models.EntityModel);
  });

  // propertyProvider property
  describe('propertyProvider', function() {

    it('should not be editable', function() {
      assert.throws(function() {
        videoModel.propertyProvider = null;
      });
    });

  });

  // add method
  describe('add', function() {

    it('should be able to add a video', function() {
      var expectedVideo = {
        id: '42',
        available: false,
        title: 'title',
        description: 'description',
        state: STATES.PUBLISHED,
        date: new Date(),
        metadata: {},
        type: 'vimeo',
        errorCode: ERRORS.NO_ERROR,
        category: '43',
        properties: [],
        packageType: fileSystem.FILE_TYPES.TAR,
        lastState: STATES.PUBLISHED,
        lastTransition: Package.TRANSITIONS.INIT,
        originalPackagePath: 'path',
        originalFileName: 'fileName',
        mediaId: '44',
        timecodes: [],
        chapters: [],
        cut: [],
        sources: [],
        views: 100,
        user: '45',
        groups: ['value']
      };
      TestVideoProvider.prototype.add = function(video, callback) {
        callback(null, 1, [video]);
      };
      videoModel.add(expectedVideo,
      function(error, count, video) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(count, 1, 'Expected only one modification');
        assert.equal(video.metadata.user, expectedVideo.user, 'Wrong user');
        assert.equal(video.metadata.groups, expectedVideo.groups, 'Wrong groups');
      });
    });

    it('should initialized some properties with default values if not specified', function() {
      var expectedVideo = {
        id: '42'
      };
      TestVideoProvider.prototype.add = function(video, callback) {
        callback(null, 1, [video]);
      };
      videoModel.add(expectedVideo,
      function(error, count, video) {
        assert.isObject(video.metadata, 'Expected metadata to be an object');
        assert.equal(video.metadata.user, anonymousUserId, 'Expected user to be anonymous');
        assert.isArray(video.metadata.groups, 'Expected groups to be an array');
        assert.isObject(video.properties, 'Expected properties to be an object');
        assert.isArray(video.cut, 'Expected cut to be an array');
        assert.isArray(video.sources, 'Expected sources to be an array');
        assert.equal(video.views, 0, 'Expected view to be 0 by default');
      });
    });

    it('should asociated video to the connected user if any', function() {
      user.id = '42';
      var expectedVideo = {
        id: '42'
      };
      TestVideoProvider.prototype.add = function(video, callback) {
        callback(null, 1, [video]);
      };
      videoModel.add(expectedVideo,
      function(error, count, video) {
        assert.equal(video.metadata.user, user.id);
      });
    });

  });

  // updateState method
  describe('updateState', function() {

    it('should be able to update state property of a video', function() {
      var expectedId = '42';
      var expectedState = STATES.CONFIGURING;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.state, expectedState, 'Wrong state');
      };

      videoModel.updateState(expectedId, expectedState);
    });

  });

  // updateLastState method
  describe('updateLastState', function() {

    it('should be able to update lastState property of a video', function() {
      var expectedId = '42';
      var expectedState = STATES.CONFIGURING;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.lastState, expectedState, 'Wrong state');
      };

      videoModel.updateLastState(expectedId, expectedState);
    });

  });

  // updateLastTransition method
  describe('updateLastTransition', function() {

    it('should be able to update lastTransition property of a video', function() {
      var expectedId = '42';
      var expectedTransition = Package.TRANSITIONS.INIT;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.lastTransition, expectedTransition, 'Wrong transition');
      };

      videoModel.updateLastTransition(expectedId, expectedTransition);
    });

  });

  // updateErrorCode method
  describe('updateErrorCode', function() {

    it('should be able to update errorCode property of a video', function() {
      var expectedId = '42';
      var expectedErrorCode = ERRORS.NO_ERROR;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.errorCode, expectedErrorCode, 'Wrong error code');
      };

      videoModel.updateErrorCode(expectedId, expectedErrorCode);
    });

  });

  // updateLink method
  describe('updateLink', function() {

    it('should be able to update link property of a video', function() {
      var expectedId = '42';
      var expectedLink = 'link';
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.link, expectedLink, 'Wrong link');
      };

      videoModel.updateLink(expectedId, expectedLink);
    });

  });

  // updateMediaId method
  describe('updateMediaId', function() {

    it('should be able to update mediaId property of a video', function() {
      var expectedId = '42';
      var expectedMediaId = '43';
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.mediaId, expectedMediaId, 'Wrong media id');
      };

      videoModel.updateMediaId(expectedId, expectedMediaId);
    });

  });

  // updateMetadata method
  describe('updateMetadata', function() {

    it('should be able to update metadata property of a video', function() {
      var expectedId = '42';
      var expectedMetadata = {};
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.metadata, expectedMetadata, 'Wrong metadata');
      };

      videoModel.updateMetadata(expectedId, expectedMetadata);
    });

  });

  // updateDate method
  describe('updateDate', function() {

    it('should be able to update date property of a video', function() {
      var expectedId = '42';
      var expectedDate = new Date();
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.date, expectedDate, 'Wrong date');
      };

      videoModel.updateDate(expectedId, expectedDate);
    });

  });

  // updateCategory method
  describe('updateCategory', function() {

    it('should be able to update category property of a video', function() {
      var expectedId = '42';
      var expectedCategory = '43';
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.category, expectedCategory, 'Wrong category');
      };

      videoModel.updateCategory(expectedId, expectedCategory);
    });

  });

  // updateType method
  describe('updateType', function() {

    it('should be able to update type property of a video', function() {
      var expectedId = '42';
      var expectedType = fileSystem.FILE_TYPES.TAR;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.type, expectedType, 'Wrong type');
      };

      videoModel.updateType(expectedId, expectedType);
    });

  });

  // updateThumbnail method
  describe('updateThumbnail', function() {

    it('should be able to update thumbnail property of a video', function() {
      var expectedId = '42';
      var expectedThumbnail = fileSystem.FILE_TYPES.TAR;
      TestVideoProvider.prototype.update = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.strictEqual(filter.thumbnail, expectedThumbnail, 'Wrong thumbnail');
      };

      videoModel.updateThumbnail(expectedId, expectedThumbnail);
    });

  });

  // update method
  describe('update', function() {

    it('should execute updates sequentially', function(done) {
      var expectedFirstId = '42';
      var expectedSecondId = '43';
      var expectedState = STATES.CONFIGURING;
      var count = 0;

      TestVideoProvider.prototype.update = function(id, filter, callback) {
        if (id === expectedFirstId)
          setTimeout(callback, 50);
        else
          callback();
      };

      videoModel.updateState(expectedFirstId, expectedState, function() {
        assert.equal(count, 0);
        done();
      });
      videoModel.updateState(expectedSecondId, expectedState, function() {
        count++;
      });
    });

  });

  // get method
  describe('get', function() {

    it('should be able to get videos and their associated properties', function() {
      var expectedFilter = {};
      var expectedPropertyId = '41';
      var expectedPropertyValue = 'value';
      var expectedProperties = [
        {
          id: expectedPropertyId
        }
      ];
      var expectedVideos = [{
        id: '42',
        properties: {}
      }];
      expectedVideos[0].properties[expectedPropertyId] = expectedPropertyValue;

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, expectedVideos);
      };

      TestPropertyProvider.prototype.get = function(filter, callback) {
        callback(null, expectedProperties);
      };

      videoModel.get(expectedFilter, function(error, videos) {
        assert.isNull(error);
        assert.equal(videos.length, expectedVideos.length, 'Wrong number of videos');
        assert.equal(videos[0].properties[0].value, expectedPropertyValue, 'Wrong property value');
      });

    });

    it('should filter videos depending on user permissions', function() {
      var expectedFilter = {};
      var expectedVideos = [{
        id: '42'
      }];
      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, expectedVideos);
      };

      TestPropertyProvider.prototype.get = function(filter, callback) {
        callback(null, []);
      };

      videoModel.addAccessFilter = chai.spy(videoModel.addAccessFilter);
      videoModel.get(expectedFilter, function(error, videos) {
      });
      videoModel.addAccessFilter.should.have.been.called.with.exactly(expectedFilter);
    });
  });

  // getOne method
  describe('getOne', function() {

    it('should be able to a get a video', function() {
      var expectedId = '42';
      var expectedFilter = {};
      var expectedVideo = {
        metadata: {
          user: anonymousUserId
        }
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        assert.deepEqual(filter, expectedFilter, 'Wrong filter');
        callback(null, expectedVideo);
      };

      videoModel.getOne(expectedId, expectedFilter, function(error, video) {
        assert.isNull(error, 'Unexpected error');
        assert.strictEqual(video, expectedVideo, 'Wrong video');
      });
    });

    it('should execute callback with an error if user does not have permission on the video', function() {
      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, {});
      };

      videoModel.getOne('42', null, function(error, video) {
        assert.instanceOf(error, openVeoApi.errors.AccessError, 'Expected an AccessError');
        assert.isUndefined(video, 'Unexpected video');
      });
    });

    it('should execute callback with an error if something went wrong', function() {
      var expectedError = new Error();
      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(expectedError);
      };

      videoModel.getOne('42', null, function(error, video) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(video, 'Unexpected video');
      });
    });
  });

  // getOneReady method
  describe('getOneReady', function() {

    it('should be able to get a video if ready', function(done) {
      var readyStates = [STATES.READY, STATES.PUBLISHED];
      var asyncActions = [];

      function test(state, callback) {
        var expectedVideo = {
          metadata: {
            user: anonymousUserId
          },
          state: state
        };

        TestVideoProvider.prototype.getOne = function(id, filter, callback) {
          callback(null, expectedVideo);
        };

        videoModel.getOneReady('42', function(error, video) {
          assert.isNull(error, 'Unexpected error');
          assert.strictEqual(video, expectedVideo, 'Wrong video');
          callback();
        });
      }

      readyStates.forEach(function(readyState) {
        asyncActions.push(function(callback) {
          test(readyState, callback);
        });
      });

      async.parallel(asyncActions, done);
    });

    it('should execute callback with an error if video is not in a ready state', function(done) {
      var readyStates = [STATES.READY, STATES.PUBLISHED];
      var pendingStates = [];
      var asyncActions = [];

      // Build pending states
      for (var name in STATES) {
        if (readyStates.indexOf(STATES[name]) === -1)
          pendingStates.push(STATES[name]);
      }

      function test(state, callback) {
        var expectedVideo = {
          metadata: {
            user: anonymousUserId
          },
          state: state
        };

        TestVideoProvider.prototype.getOne = function(id, filter, callback) {
          callback(null, expectedVideo);
        };

        videoModel.getOneReady('42', function(error, video) {
          assert.instanceOf(error, Error, 'Wrong error');
          assert.isUndefined(video, 'Unexpected video');
          callback();
        });
      }

      pendingStates.forEach(function(pendingState) {
        asyncActions.push(function(callback) {
          test(pendingState, callback);
        });
      });

      async.parallel(asyncActions, done);
    });
  });

  // update method
  describe('update', function() {

    it('should be able to update a video', function() {
      var expectedId = '42';
      var expectedData = {
        metadata: {
          user: anonymousUserId
        }
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, expectedData);
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        assert.strictEqual(id, expectedId, 'Wrong id');
        callback(null, 1);
      };

      videoModel.update(expectedId, expectedData, function(error, count) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(count, 1, 'Expected only one modification');
      });
    });

    it('should filter data to ignore unsupported properties', function() {
      var supportedProperties = ['title', 'description', 'properties', 'category', 'cut', 'chapters', 'views'];

      supportedProperties.forEach(function(supportedProperty) {
        var expectedId = '42';
        var expectedData = {
          metadata: {
            user: anonymousUserId
          }
        };
        expectedData[supportedProperty] = supportedProperty;

        TestVideoProvider.prototype.getOne = function(id, filter, callback) {
          callback(null, expectedData);
        };

        TestVideoProvider.prototype.update = function(id, data, callback) {
          assert.strictEqual(data[supportedProperty], expectedData[supportedProperty],
                             'Unexpected value for property ' + supportedProperty);
          callback(null, 1);
        };

        videoModel.update(expectedId, expectedData, function(error, count) {
          assert.isNull(error, 'Unexpected error (property=' + supportedProperty + ')');
          assert.equal(count, 1, 'Expected only one modification (property=' + supportedProperty + ')');
        });
      });
    });

    it('should move groups to metadata', function() {
      var expectedData = {
        metadata: {
          user: anonymousUserId
        },
        groups: ['value']
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, expectedData);
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        assert.deepEqual(data['metadata.groups'], expectedData.groups, 'Wrong groups');
      };

      videoModel.update('42', expectedData);
    });

    it('should filter unvalid groups', function() {
      var expectedData = {
        metadata: {
          user: anonymousUserId
        },
        groups: ['value', undefined, null]
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, expectedData);
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        assert.equal(data['metadata.groups'].length, 1, 'Expected only one group');
      };

      videoModel.update('42', expectedData);
    });

    it('should move user to metadata', function() {
      user.id = '44';
      var expectedData = {
        user: '42'
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, {
          metadata: {
            user: user.id
          }
        });
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        assert.deepEqual(data['metadata.user'], expectedData.user, 'Wrong user');
      };

      videoModel.update('43', expectedData);
    });

    it('should execute callback with an error if update failed', function() {
      var expectedError = new Error();
      user.id = '44';
      var expectedData = {
        user: '42'
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, {
          metadata: {
            user: user.id
          }
        });
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        callback(expectedError);
      };

      videoModel.update('43', expectedData, function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should execute callback with an error if getting video failed', function() {
      var expectedError = new Error();
      user.id = '44';
      var expectedData = {
        user: '42'
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(expectedError);
      };

      videoModel.update('43', expectedData, function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should not be able to edit the owner of the video if not already the owner or administrator', function() {
      user.id = anonymousUserId;
      var expectedData = {
        user: '42'
      };

      TestVideoProvider.prototype.getOne = function(id, filter, callback) {
        callback(null, {
          metadata: {
            user: '44'
          }
        });
      };

      TestVideoProvider.prototype.update = function(id, data, callback) {
        assert.isUndefined(data['metadata.user'], 'Unexpected user');
      };

      videoModel.update('43', expectedData, function(error, count) {
        assert.instanceOf(error, openVeoApi.errors.AccessError, 'Expected an AccessError');
        assert.isUndefined(count, 'Unexpected count');
      });
    });
  });

  // publishVideos method
  describe('publishVideos', function() {

    it('should be able to publish videos', function() {
      var expectedIds = ['41'];
      user.id = '42';

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: user.id
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        assert.deepEqual(ids, expectedIds);
        assert.strictEqual(oldState, STATES.READY, 'Expected old state to be ready');
        assert.strictEqual(newState, STATES.PUBLISHED, 'Expected new state to be published');
        callback();
      };

      videoModel.publishVideos(expectedIds, function(error, count) {
        assert.isUndefined(error, 'Unexpected error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should not be able to publish videos without permission', function() {
      var expectedIds = ['41'];

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: '42'
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        assert.equal(ids.length, 0);
        callback();
      };

      videoModel.publishVideos(expectedIds, function(error, count) {
        assert.isUndefined(error, 'Unexpected error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should execute callback with an error if getting a video failed', function() {
      var expectedError = new Error();

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(expectedError);
      };

      videoModel.publishVideos(['42'], function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
      });
    });

    it('should execute callback with an error if publish the video failed', function() {
      var expectedError = new Error();
      var expectedIds = ['41'];

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: '42'
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        callback(expectedError);
      };

      videoModel.publishVideos(expectedIds, function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
      });
    });
  });

  // unpublishVideos method
  describe('unpublishVideos', function() {

    it('should be able to unpublish videos', function() {
      var expectedIds = ['41'];
      user.id = '42';

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: user.id
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        assert.deepEqual(ids, expectedIds);
        assert.strictEqual(oldState, STATES.PUBLISHED, 'Expected old state to be published');
        assert.strictEqual(newState, STATES.READY, 'Expected new state to be ready');
        callback();
      };

      videoModel.unpublishVideos(expectedIds, function(error, count) {
        assert.isUndefined(error, 'Unexpected error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should not be able to unpublish videos without permission', function() {
      var expectedIds = ['41'];

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: '42'
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        assert.equal(ids.length, 0);
        callback();
      };

      videoModel.unpublishVideos(expectedIds, function(error, count) {
        assert.isUndefined(error, 'Unexpected error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });

    it('should execute callback with an error if getting a video failed', function() {
      var expectedError = new Error();

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(expectedError);
      };

      videoModel.unpublishVideos(['42'], function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
      });
    });

    it('should execute callback with an error if unpublish the video failed', function() {
      var expectedError = new Error();
      var expectedIds = ['41'];

      TestVideoProvider.prototype.get = function(filter, callback) {
        callback(null, [{
          id: '41',
          metadata: {
            user: '42'
          }
        }]);
      };

      TestVideoProvider.prototype.updateVideosState = function(ids, oldState, newState, callback) {
        callback(expectedError);
      };

      videoModel.unpublishVideos(expectedIds, function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
      });
    });
  });

  describe('increaseVideoViews', function() {

    it('should be able to increase the number of views of a video', function() {
      var expectedId = '42';
      var expectedCount = 900;

      TestVideoProvider.prototype.increase = function(id, filter, callback) {
        assert.equal(filter.views, expectedCount);
        callback(null, 1);
      };

      videoModel.increaseVideoViews(expectedId, expectedCount, function(error, count) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(count, 1, 'Expected one modification');
      });
    });

    it('should execute callback with an error if something went wrong', function() {
      var expectedError = new Error();

      TestVideoProvider.prototype.increase = function(id, filter, callback) {
        callback(expectedError);
      };

      videoModel.increaseVideoViews('42', 900, function(error, count) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(count, 'Unexpected count');
      });
    });
  });
});
