'use strict';

var async = require('async');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var STATES = process.requirePublish('app/server/packages/states.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoController = process.requirePublish('app/server/controllers/VideoController.js');
var PublishPlugin = process.requirePublish('app/server/PublishPlugin.js');
var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');

// VideoController.js
describe('VideoController', function() {
  var request;
  var response;
  var videoController;
  var videoModel;
  var publishManager;

  // Mocks
  beforeEach(function() {
    videoModel = {};
    publishManager = {};
  });

  // Prepare tests
  beforeEach(function() {
    request = {
      params: {},
      query: {},
      isAuthenticated: function() {
        return true;
      }
    };
    response = {
      locals: {}
    };

    videoController = new VideoController();
    videoController.getModel = function() {
      return videoModel;
    };
    videoController.getPublishManager = function() {
      return publishManager;
    };
  });

  // displayVideoAction method
  describe('displayVideoAction', function() {
    var publishPlugin;
    var expectedBaseJsFiles = [];
    var expectedJsFiles = [];
    var expectedCssFiles = [];

    beforeEach(function() {
      publishPlugin = new PublishPlugin();
      publishPlugin.name = 'publish';
      publishPlugin.custom = {
        scriptFiles: {
          base: expectedBaseJsFiles,
          publishPlayer: {
            dev: expectedJsFiles
          }
        },
        cssFiles: expectedCssFiles
      };
      process.api.addPlugin(publishPlugin);
    });

    afterEach(function() {
      process.api.removePlugins();
    });

    it('should display the video page', function(done) {
      response.render = function(templateName, variables) {
        assert.equal(templateName, 'player', 'Unexpected template name');
        assert.deepEqual(variables.scripts, expectedBaseJsFiles.concat(expectedJsFiles), 'Unexpected scripts');
        assert.deepEqual(variables.css, expectedCssFiles, 'Unexpected css files');
        done();
      };

      videoController.displayVideoAction(request, response);
    });

    it('should not display the page if plugin publish is not found', function(done) {
      response.render = function() {
        assert.ok(false, 'Unexpected call to render');
      };
      process.api.removePlugins();
      videoController.displayVideoAction(request, response, done);
    });
  });

  // getPlatformsAction method
  describe('getPlatformsAction', function() {

    it('should return the list of available platforms', function(done) {
      response.send = function(data) {
        assert.isArray(data.platforms);
        done();
      };
      videoController.getPlatformsAction(request, response);
    });

  });

  // getVideoReadyAction method
  describe('getVideoReadyAction', function() {

    it('should return the video', function(done) {
      var expectedVideo = {};
      request.params.id = '42';
      videoModel.getOneReady = function(id, callback) {
        callback(null, expectedVideo);
      };
      response.send = function(data) {
        assert.strictEqual(data.entity, expectedVideo);
        done();
      };
      videoController.getVideoReadyAction(request, response);
    });

    it('should execute next with an error if video is not ready', function(done) {
      request.params.id = '42';
      videoModel.getOneReady = function(id, callback) {
        callback(new Error());
      };
      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_ERROR);
        done();
      });
    });

    it('should execute next with an error if video is ready and user not authenticated', function(done) {
      var expectedVideo = {state: STATES.READY};
      request.params.id = '42';
      request.isAuthenticated = function() {
        return false;
      };
      videoModel.getOneReady = function(id, callback) {
        callback(null, expectedVideo);
      };
      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_ERROR);
        done();
      });
    });

    it('should execute next with an error if access to the video is forbidden for the user', function(done) {
      request.params.id = '42';
      videoModel.getOneReady = function(id, callback) {
        callback(new openVeoApi.errors.AccessError());
      };
      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN);
        done();
      });
    });

    it('should execute next with an error if video id is missing', function(done) {
      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_MISSING_PARAMETERS);
        done();
      });
    });

  });

  // getEntitiesAction method
  describe('getEntitiesAction', function() {

    it('should be able to return the whole list of videos', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter, {}, 'Unexpected filters');
        assert.isUndefined(limit, 'Unexpected limit');
        assert.equal(page, 0, 'Unexpected page');
        assert.deepEqual(sort, {date: -1}, 'Unexpected sort');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to search by title or description', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {query: 'search text'};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.equal(filter.$text.$search, '"' + request.query.query + '"', 'Unexpected filters');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to sort results by either, title, description, date, state or views', function(done) {
      var asyncActions = [];
      var orderedProperties = ['title', 'description', 'date', 'state', 'views'];
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};

      function test(property, order, callback) {
        request.query = {sortOrder: order, sortBy: property};
        videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
          assert.equal(sort[property], order === 'asc' ? 1 : -1, 'Unexpected ' + property + ' ' + order + ' sort');
          callback(null, expectedEntities, expectedPagination);
        };

        response.send = function(data) {
          assert.strictEqual(data.entities, expectedEntities);
          assert.strictEqual(data.pagination, expectedPagination);
          callback();
        };

        videoController.getEntitiesAction(request, response, function() {
          assert.ok(false, 'Unexpected call to next for property=' + property + ' and order=' + order);
        });
      }

      orderedProperties.forEach(function(property) {
        asyncActions.push(function(callback) {
          test(property, 'asc', callback);
        });
        asyncActions.push(function(callback) {
          test(property, 'desc', callback);
        });
      });

      async.parallel(asyncActions, function() {
        done();
      });
    });

    it('should execute next with an error if sortBy property is not valid', function(done) {
      request.query = {sortBy: 'wrong property'};
      videoModel.getPaginatedFilteredEntities = function() {
        assert.ok(false, 'Unexpected call to getPaginatedFilteredEntities');
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_WRONG_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if sortOrder value is not valid', function(done) {
      request.query = {sortOrder: 'wrong order'};
      videoModel.getPaginatedFilteredEntities = function() {
        assert.ok(false, 'Unexpected call to getPaginatedFilteredEntities');
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_WRONG_PARAMETERS);
        done();
      });
    });

    it('should be able to filter results by states', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {states: [42]};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter.state.$in, request.query.states, 'Unexpected filters');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to filter results by categories', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {categories: ['42']};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter.category.$in, request.query.categories, 'Unexpected filters');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to filter results by groups', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {groups: ['42']};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter['metadata.groups'].$in, request.query.groups, 'Unexpected filters');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to filter results by owners', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      request.query = {user: ['42']};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter['metadata.user'].$in, request.query.user, 'Unexpected filters');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to filter results by date', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      var expectedStartDate = '01/19/2017';
      var expectedEndDate = '02/20/2017';
      request.query = {dateStart: expectedStartDate, dateEnd: '02/20/2017'};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter.date.$gte, new Date(expectedStartDate).getTime(), 'Unexpected start date filter');
        assert.deepEqual(filter.date.$lt, new Date(expectedEndDate).getTime(), 'Unexpected end date filter');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should be able to filter results by properties', function(done) {
      var expectedEntities = [{id: 42}];
      var expectedPagination = {};
      var expectedProperties = {property1: 'value1'};
      request.query = {properties: expectedProperties};
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        assert.deepEqual(filter['properties.property1'], 'value1', 'Unexpected properties filter');
        callback(null, expectedEntities, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedEntities);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response);
    });

    it('should call next with an error if a server error occurred', function(done) {
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        callback(new Error());
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_ERROR);
        done();
      });
    });

    it('should call next with an error if user is not authorized', function(done) {
      videoModel.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
        callback(new openVeoApi.errors.AccessError());
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_FORBIDDEN);
        done();
      });
    });
  });

  // publishVideosAction method
  describe('publishVideosAction', function() {

    it('should be able to publish a video (changing its state to published)', function(done) {
      request.params.ids = '41,42';
      response.send = function(data) {
        assert.equal(data.state, STATES.PUBLISHED);
        done();
      };

      videoModel.publishVideos = function(ids, callback) {
        assert.deepEqual(ids, request.params.ids.split(','));
        callback();
      };

      videoController.publishVideosAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });

    });

    it('should execute next with an error if videos ids are not provided', function(done) {
      videoController.publishVideosAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.PUBLISH_VIDEO_MISSING_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if something went wrong', function(done) {
      request.params.ids = '41,42';

      videoModel.publishVideos = function(ids, callback) {
        callback(new Error());
      };

      videoController.publishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.PUBLISH_VIDEO_ERROR);
        done();
      });

    });

    it('should execute next with an error if use is not authorized to perform this action', function(done) {
      request.params.ids = '41,42';

      videoModel.publishVideos = function(ids, callback) {
        callback(new openVeoApi.errors.AccessError());
      };

      videoController.publishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.PUBLISH_VIDEO_FORBIDDEN);
        done();
      });

    });

  });

  // unpublishVideosAction method
  describe('unpublishVideosAction', function() {

    it('should be able to unpublish a video', function(done) {
      request.params.ids = '41,42';

      videoModel.unpublishVideos = function(ids, callback) {
        assert.deepEqual(ids, request.params.ids.split(','));
        callback();
      };

      response.send = function(data) {
        assert.equal(data.state, STATES.READY);
        done();
      };

      videoController.unpublishVideosAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if videos ids are not provided', function(done) {
      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEO_MISSING_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if something went wrong', function(done) {
      request.params.ids = '41,42';

      videoModel.unpublishVideos = function(ids, callback) {
        callback(new Error());
      };

      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEO_ERROR);
        done();
      });
    });

    it('should execute next with an error if user is not authorized to perform this action', function(done) {
      request.params.ids = '41,42';

      videoModel.unpublishVideos = function(ids, callback) {
        callback(new openVeoApi.errors.AccessError());
      };

      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEO_FORBIDDEN);
        done();
      });
    });
  });

  // retryVideosAction method
  describe('retryVideosAction', function() {

    it('should be able to retry videos processing', function(done) {
      var ids = [];
      var callbacks = [];
      request.params.ids = '41,42';
      publishManager.once = function(name, callback) {
        callbacks.push(callback);
      };
      publishManager.retry = function(id) {
        ids.push(id);
      };

      response.send = function() {
        assert.deepEqual(ids, request.params.ids.split(','));
        done();
      };

      videoController.retryVideosAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });

      callbacks.forEach(function(callback) {
        callback();
      });
    });

    it('should call next with an error if videos ids are not provided', function(done) {
      videoController.retryVideosAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.RETRY_VIDEO_MISSING_PARAMETERS);
        done();
      });
    });
  });

  // startUploadAction method
  describe('startUploadAction', function() {

    it('should be able to start uploading videos', function(done) {
      var ids = [];
      var callbacks = [];
      request.params.ids = '41,42';
      request.params.platform = TYPES.WOWZA;
      publishManager.once = function(name, callback) {
        callbacks.push(callback);
      };
      publishManager.upload = function(id, platform) {
        ids.push(id);
        assert.equal(platform, request.params.platform, 'Unexpected platform');
      };

      response.send = function() {
        assert.deepEqual(ids, request.params.ids.split(','));
        done();
      };

      videoController.startUploadAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });

      callbacks.forEach(function(callback) {
        callback();
      });
    });

    it('should call next with an error if videos ids are not provided', function(done) {
      request.params.platform = TYPES.WOWZA;
      videoController.startUploadAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.START_UPLOAD_VIDEO_MISSING_PARAMETERS);
        done();
      });
    });

    it('should call next with an error if platform is not provided', function(done) {
      request.params.ids = '41,42';
      videoController.startUploadAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.START_UPLOAD_VIDEO_MISSING_PARAMETERS);
        done();
      });
    });
  });

  // updatePoiAction method
  describe('updatePoiAction', function() {
    it('should convert points of interest values from percent to milliseconds', function(done) {
      request.params.id = '42';
      request.body = {duration: 600000};

      videoModel.getOneReady = function(id, callback) {
        var video = {
          chapters: [{value: 0.25}, {value: 0.75}],
          tags: [{value: 0.2}, {value: 0.4}, {value: 0.6}],
          cut: [{value: 0}, {value: 1}],
          needPointsOfInterestUnitConversion: true
        };

        callback(null, video);
      };

      videoModel.update = function(id, data, callback) {
        var expectedData = {
          chapters: [{value: 150000}, {value: 450000}],
          cut: [{value: 0}, {value: 600000}],
          tags: [{value: 120000}, {value: 240000}, {value: 360000}]
        };

        for (var prop in expectedData) {
          for (var i in expectedData[prop]) {
            assert.strictEqual(expectedData[prop][i].value, data[prop][i].value);
          }
        }

        callback(null, data);
      };

      response.send = function(data) {
        assert.isUndefined(data.needPointsOfInterestUnitConversion);
        done();
      };

      videoController.updatePoiAction(request, response);
    });
  });

});
