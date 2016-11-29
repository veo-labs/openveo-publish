'use strict';

/**
 * @module publish-controllers
 */

var util = require('util');
var path = require('path');
var openVeoAPI = require('@openveo/api');
var configDir = openVeoAPI.fileSystem.getConfDir();
var errors = process.requirePublish('app/server/httpErrors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var platforms = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var applicationStorage = openVeoAPI.applicationStorage;
var AccessError = openVeoAPI.errors.AccessError;
var ContentController = openVeoAPI.controllers.ContentController;

var env = (process.env.NODE_ENV === 'production') ? 'prod' : 'dev';

/**
 * Provides route actions for all requests relative to videos.
 *
 * @class VideoController
 * @constructor
 * @extends ContentController
 */
function VideoController() {
  ContentController.call(this, VideoModel);
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
 */
VideoController.prototype.displayVideoAction = function(request, response, next) {
  response.locals.scripts = [];
  response.locals.css = [];

  // Retrieve openveo sub plugins
  var plugins = applicationStorage.getPlugins();

  // Got sub plugins
  if (plugins) {
    plugins.forEach(function(subPlugin) {
      if (subPlugin.name === 'publish') {
        if (subPlugin.custom) {
          var customScripts = subPlugin.custom.scriptFiles;
          var playerScripts = customScripts['publishPlayer'];
          response.locals.scripts = response.locals.scripts.concat(
            (customScripts['base'] || []),
            ((playerScripts && playerScripts[env]) ? playerScripts[env] : [])
          );
          response.locals.css = response.locals.css.concat(subPlugin.custom.cssFiles || []);
        }
      }
    });

    response.render('player', response.locals);
  } else {

    // No sub plugins
    next();

  }
};

/**
 * Gets all media platforms available.
 *
 * @example
 *     {
 *       "platforms" : ["vimeo", "youtube"]
 *     }
 *
 * @method getPlatformsAction
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
 * Expects one GET parameter :
 *  - **id** The id of the video
 *
 * @example
 *     {
 *       video : {
 *         id : 123456789,
 *         ...
 *       }
 *     }
 *
 * @method getVideoReadyAction
 */
VideoController.prototype.getVideoReadyAction = function(request, response, next) {
  if (request.params.id) {
    var model = new this.Entity(request.user);

    model.getOneReady(request.params.id, function(error, video) {
      if (error && error instanceof AccessError)
        next(errors.GET_VIDEO_READY_FORBIDDEN);
      else if (error || (video.state === VideoModel.READY_STATE && !request.isAuthenticated()))
        next(errors.GET_VIDEO_READY_ERROR);
      else
        response.send({
          entity: video
        });
    });
  } else {

    // Missing id of the video
    next(errors.GET_VIDEO_READY_MISSING_PARAMETERS);

  }
};

/**
 * Gets published videos by properties.
 *
 * Optional GET parameters :
 *  - **query** To search on both videos title and description
 *  - **states** To filter videos by state
 *  - **dateStart** To get videos after a date
 *  - **dateEnd** To get videos before a date
 *  - **categories** To filter videos by category
 *  - **groups** To filter videos by group
 *  - **sortBy** To sort videos by either title, description or date
 *  - **sortOrder** Sort order (either asc or desc)
 *  - **limit** To limit the number of videos per page
 *  - **page** The expected page
 *  - **properties** A list of properties with the property id as the key and the expected property
 *    value as the value. (e.g. properties[property1Id]=property1Value)
 *
 * @example
 *     {
 *       "videos" : [
 *         ...
 *       ]
 *     }
 *
 * @method getEntitiesAction
 */
VideoController.prototype.getEntitiesAction = function(request, response, next) {
  var params;
  var model = new this.Entity(request.user);
  var orderedProperties = ['title', 'description', 'date', 'state', 'views'];

  try {
    params = openVeoAPI.util.shallowValidateObject(request.query, {
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
    return next(errors.GET_VIDEOS_WRONG_PARAMETERS);
  }

  // Build sort
  var sort = {};
  sort[params.sortBy] = params.sortOrder === 'asc' ? 1 : -1;

  // Build filter
  var filter = {};

  // Add search query
  if (params.query) {
    filter.$text = {
      $search: params.query
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
        next((error instanceof AccessError) ? errors.GET_VIDEOS_FORBIDDEN : errors.GET_VIDEOS_ERROR);
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
 * Publishes a video.
 *
 * Expects one GET parameter :
 *  - **id** The id of the video
 *
 * Change the state of the video to published
 *
 * @example
 *     {
 *       state : 12
 *     }
 *
 * @method publishVideoAction
 */
VideoController.prototype.publishVideoAction = function(request, response, next) {
  if (request.params.id) {
    var arrayId = request.params.id.split(',');
    var model = new this.Entity(request.user);

    model.publishVideo(arrayId, function(error) {
      if (error)
        next((error instanceof AccessError) ? errors.PUBLISH_VIDEO_FORBIDDEN : errors.PUBLISH_VIDEO_ERROR);
      else
        response.send({
          state: VideoModel.PUBLISHED_STATE
        });
    });
  } else {

    // Missing type and / or id of the video
    next(errors.PUBLISH_VIDEO_MISSING_PARAMETERS);

  }
};

/**
 * Unpublishes a video.
 *
 * Expects one GET parameter :
 *  - **id** The id of the video
 *
 * Change the state of the video to unpublished.
 *
 * @example
 *     {
 *       state : 11
 *     }
 *
 * @method unpublishVideoAction
 */
VideoController.prototype.unpublishVideoAction = function(request, response, next) {
  if (request.params.id) {
    var arrayId = request.params.id.split(',');
    var model = new this.Entity(request.user);

    model.unpublishVideo(arrayId, function(error) {
      if (error)
        next((error instanceof AccessError) ? errors.UNPUBLISH_VIDEO_FORBIDDEN : errors.UNPUBLISH_VIDEO_ERROR);
      else
        response.send({
          state: VideoModel.READY_STATE
        });
    });
  } else {

    // Missing type and / or id of the video
    next(errors.UNPUBLISH_VIDEO_MISSING_PARAMETERS);

  }
};
