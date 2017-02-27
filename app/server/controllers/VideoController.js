'use strict';

/**
 * @module controllers
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var configDir = openVeoApi.fileSystem.getConfDir();
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var platforms = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var pluginManager = openVeoApi.plugin.pluginManager;
var AccessError = openVeoApi.errors.AccessError;
var ContentController = openVeoApi.controllers.ContentController;

var multer = require('multer');
var env = (process.env.NODE_ENV === 'production') ? 'prod' : 'dev';

/**
 * Defines a controller to handle actions relative to videos' routes.
 *
 * @class VideoController
 * @extends ContentController
 * @constructor
 */
function VideoController() {
  VideoController.super_.call(this, VideoModel, VideoProvider);
}

module.exports = VideoController;
util.inherits(VideoController, ContentController);

/**
 * Displays video player template.
 *
 * Checks first if the video id is valid and if the video is published
 * before returning the template.
 *
 * @method displayVideoAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.displayVideoAction = function(request, response, next) {
  var publishPlugin;
  var plugins = pluginManager.getPlugins();
  response.locals.scripts = [];
  response.locals.css = [];

  plugins.forEach(function(subPlugin) {
    if (subPlugin.name === 'publish')
      publishPlugin = subPlugin;
  });

  if (publishPlugin) {
    if (publishPlugin.custom) {
      var customScripts = publishPlugin.custom.scriptFiles;
      var playerScripts = customScripts.publishPlayer;
      response.locals.scripts = response.locals.scripts.concat(
        (customScripts.base || []),
        ((playerScripts && playerScripts[env]) ? playerScripts[env] : [])
      );
      response.locals.css = response.locals.css.concat(publishPlugin.custom.cssFiles || []);
    }
    response.render('player', response.locals);
  } else
    next();
};

/**
 * Gets all media platforms available.
 *
 * @example
 *     {
 *       "platforms" : [
 *         ...
 *       ]
 *     }
 *
 * @method getPlatformsAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getPlatformsAction = function(request, response) {
  response.send({
    platforms: Object.keys(platforms) ? Object.keys(platforms).filter(function(value) {
      return platforms[value];
    }) : []
  });
};

/**
 * Gets information about a ready video (state is ready or published).
 *
 * @example
 *     {
 *       video : {
 *         id : 123456789
 *       }
 *     }
 *
 * @method getVideoReadyAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.id The media id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getVideoReadyAction = function(request, response, next) {
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_VIDEO_READY_MISSING_PARAMETERS);
  }

  var model = this.getModel(request);

  model.getOneReady(params.id, function(error, video) {
    if (error && error instanceof AccessError)
      next(HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN);
    else if (error || (video.state === STATES.READY && !request.isAuthenticated()))
      next(HTTP_ERRORS.GET_VIDEO_READY_ERROR);
    else
      response.send({
        entity: video
      });
  });
};

/**
 * Gets published videos by properties.
 *
 * @example
 *     {
 *       "videos" : [
 *         ...
 *       ]
 *     }
 *
 * @method getEntitiesAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.query Request's query parameters
 * @param {String} request.query.query To search on both videos' title and description
 * @param {String|Array} request.query.states To filter medias by state
 * @param {String} request.query.dateStart To filter medias after or equal to a date (in format mm/dd/yyyy)
 * @param {String} request.query.dateEnd To get medias before a date (in format mm/dd/yyyy)
 * @param {String|Array} request.query.categories To filter medias by category
 * @param {String|Array} request.query.groups To filter medias by group
 * @param {String} request.query.sortBy To sort medias by either **title**, **description** or **date**
 * @param {String} request.query.sortOrder Sort order (either **asc** or **desc**)
 * @param {String} request.query.page The expected page
 * @param {String} request.query.limit To limit the number of medias per page. If not specified get all medias
 * @param {Object} request.query.properties A list of properties with the property id as the key and the expected
 * property value as the value
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getEntitiesAction = function(request, response, next) {
  var params;
  var model = this.getModel(request);
  var orderedProperties = ['title', 'description', 'date', 'state', 'views', 'category'];

  try {
    params = openVeoApi.util.shallowValidateObject(request.query, {
      query: {type: 'string'},
      states: {type: 'array<number>'},
      dateStart: {type: 'date'},
      dateEnd: {type: 'date'},
      categories: {type: 'array<string>'},
      groups: {type: 'array<string>'},
      user: {type: 'array<string>'},
      properties: {type: 'object', default: {}},
      limit: {type: 'number', gt: 0},
      page: {type: 'number', gt: 0, default: 1},
      sortBy: {type: 'string', in: orderedProperties, default: 'date'},
      sortOrder: {type: 'string', in: ['asc', 'desc'], default: 'desc'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_VIDEOS_WRONG_PARAMETERS);
  }

  // Build sort
  var sort = {};
  sort[params.sortBy] = params.sortOrder === 'asc' ? 1 : -1;

  // Build filter
  var filter = {};

  // Add search query
  if (params.query) {
    filter.$text = {
      $search: '"' + params.query + '"'
    };
  }

  // Add states
  if (params.states && params.states.length) {
    filter.state = {
      $in: params.states
    };
  }

  // Add categories
  if (params.categories && params.categories.length) {
    filter.category = {
      $in: params.categories
    };
  }

  // Add groups
  if (params.groups && params.groups.length) {
    filter['metadata.groups'] = {
      $in: params.groups
    };
  }

  // Add owner
  if (params.user && params.user.length) {
    filter['metadata.user'] = {
      $in: params.user
    };
  }

  // Add date
  if (params.dateStart || params.dateEnd) {
    filter.date = {};
    if (params.dateStart) filter.date.$gte = params.dateStart;
    if (params.dateEnd) filter.date.$lt = params.dateEnd;
  }

  // Add custom properties
  if (params.properties) {
    Object.keys(params.properties).forEach(function(propertyId) {
      filter['properties.' + propertyId] = params.properties[propertyId];
    });
  }

  model.getPaginatedFilteredEntities(filter, params.limit, params.page, sort, true,
    function(error, entities, pagination) {
      if (error) {
        process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
        next((error instanceof AccessError) ? HTTP_ERRORS.GET_VIDEOS_FORBIDDEN : HTTP_ERRORS.GET_VIDEOS_ERROR);
      } else {
        response.send({
          entities: entities,
          pagination: pagination
        });
      }
    }
  );
};

/**
 * Publishes videos.
 *
 * Change the state of videos to published
 *
 * @method publishVideosAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.ids A comma separated list of media ids
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.publishVideosAction = function(request, response, next) {
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.PUBLISH_VIDEO_MISSING_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var model = this.getModel(request);

  model.publishVideos(ids, function(error) {
    if (error)
      next((error instanceof AccessError) ? HTTP_ERRORS.PUBLISH_VIDEO_FORBIDDEN : HTTP_ERRORS.PUBLISH_VIDEO_ERROR);
    else
      response.send({
        state: STATES.PUBLISHED
      });
  });
};

/**
 * Unpublishes videos.
 *
 * Change the state of videos to unpublished.
 *
 * @method unpublishVideosAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.ids A comma separated list of media ids
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.unpublishVideosAction = function(request, response, next) {
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UNPUBLISH_VIDEO_MISSING_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var model = this.getModel(request);

  model.unpublishVideos(ids, function(error) {
    if (error)
      next(
        (error instanceof AccessError) ? HTTP_ERRORS.UNPUBLISH_VIDEO_FORBIDDEN : HTTP_ERRORS.UNPUBLISH_VIDEO_ERROR
      );
    else
      response.send({
        state: STATES.READY
      });
  });
};

/**
 * Retries to publish videos on error.
 *
 * @method retryVideosAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.ids Comma separated list of media ids
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.retryVideosAction = function(request, response, next) {
  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.RETRY_VIDEO_MISSING_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var asyncFunctions = [];
  var retryAsyncFunction = function(id) {
    return function(callback) {
      var publishManager = self.getPublishManager();
      publishManager.once('retry', callback);
      publishManager.retry(id);
    };
  };

  for (var i = 0; i < ids.length; i++)
    asyncFunctions.push(retryAsyncFunction(ids[i]));

  async.parallel(asyncFunctions, function() {
    response.send();
  });
};

/**
 * Starts uploading videos to the media platform.
 *
 * @method startUploadAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.ids Comma separated list of media ids
 * @param {String} request.params.platform The id of the platform to upload to
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.startUploadAction = function(request, response, next) {
  var params;
  var self = this;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true},
      platform: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.START_UPLOAD_VIDEO_MISSING_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var asyncFunctions = [];
  var uploadAsyncFunction = function(id, platform) {
    return function(callback) {
      var publishManager = self.getPublishManager();
      publishManager.once('upload', callback);
      publishManager.upload(id, platform);
    };
  };

  for (var i = 0; i < ids.length; i++)
    asyncFunctions.push(uploadAsyncFunction(ids[i], params.platform));

  async.parallel(asyncFunctions, function() {
    response.send();
  });
};

/**
 * Gets an instance of the video model.
 *
 * @method getModel
 * @param {Object} request The HTTP request
 * @return {VideoModel} The VideoModel instance
 */
VideoController.prototype.getModel = function(request) {
  var coreApi = openVeoApi.api.getCoreApi();
  return new this.Model(
    request.user,
    new this.Provider(coreApi.getDatabase()),
    new PropertyProvider(coreApi.getDatabase())
  );
};

/**
 * Gets PublishManager singleton.
 *
 * @method getPublishManager
 * @return {PublishManager} The PublishManager singleton
 */
VideoController.prototype.getPublishManager = function() {
  return PublishManager.get();
};


/**
 * Handles back office updateTags action to upload files and save associated tags.
 *
 * @method updateTagsAction
 */
VideoController.prototype.updateTagsAction = function(request, response, next) {
  if (request.params.id) {
    var entityId = request.params.id;
    var model = this.getModel(request);
    var upload = multer({dest: process.rootPublish + '/assets/player/videos/' + entityId + '/uploads/'});
    upload.single('file')(request, response, function(err) {
      if (err || !request.body.info) {

        // An error occurred when uploading
        return response.end('Error uploading file.');
      }
      var data = JSON.parse(request.body.info);
      var file = request.file;

      model.updateTags(entityId, data, file, function(error, newtag) {
        if (error)
          next((error instanceof AccessError) ? HTTP_ERRORS.UPDATE_VIDEO_FORBIDDEN : HTTP_ERRORS.PUBLISH_VIDEO_ERROR);
        else
          response.send(newtag);
      });
    });

  } else {

    // Missing type and / or id of the video
    next(HTTP_ERRORS.PUBLISH_VIDEO_MISSING_PARAMETERS);
  }
};


/**
 * Handles back office removeTags action to remove tags.
 *
 * @method removeTagsAction
 */
VideoController.prototype.removeTagsAction = function(request, response, next) {

  if (request.params.id) {
    var entityId = request.params.id;
    var model = this.getModel(request);
    var data = request.body;

    model.removeTags(entityId, data, function(error, deletedTag) {
      if (error)
        next((error instanceof AccessError) ? HTTP_ERRORS.UPDATE_VIDEO_FORBIDDEN : HTTP_ERRORS.PUBLISH_VIDEO_ERROR);
      else
        response.send(deletedTag);
    });
  } else {

    // Missing type and / or id of the video
    next(HTTP_ERRORS.PUBLISH_VIDEO_MISSING_PARAMETERS);
  }
};
