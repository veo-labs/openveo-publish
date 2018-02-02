'use strict';

/**
 * @module controllers
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var openVeoApi = require('@openveo/api');
var coreApi = process.api.getCoreApi();
var configDir = openVeoApi.fileSystem.getConfDir();
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var platforms = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var MultipartParser = openVeoApi.multipart.MultipartParser;
var AccessError = openVeoApi.errors.AccessError;
var errors = process.requireApi('lib/controllers/httpErrors.js');
var ContentController = openVeoApi.controllers.ContentController;
var fileSystemApi = openVeoApi.fileSystem;

var env = (process.env.NODE_ENV === 'production') ? 'prod' : 'dev';

/**
 * Defines a controller to handle actions relative to videos' routes.
 *
 * @class VideoController
 * @extends ContentController
 * @constructor
 */
function VideoController() {
  VideoController.super_.call(this);
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
  var plugins = process.api.getPlugins();
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
 * Adds a media.
 *
 * @example
 *
 *     // Expected multipart body example
 *     {
 *       "file" : ...,
 *       "info": {
 *         "title" : 'Media title',
 *         "description" : 'Media HTML description',
 *         "category" : 'Media category',
 *         "groups" : 'Media groups'
 *       }
 *     }
 *
 * @method addEntityAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.addEntityAction = function(request, response, next) {
  if (request.body) {
    var self = this;
    var categoriesIds;
    var groupsIds;
    var customProperties;
    var params;
    var model = this.getModel(request);
    var parser = new MultipartParser(request, [
      {
        name: 'file',
        destinationPath: publishConf.videoTmpDir,
        maxCount: 1
      },
      {
        name: 'thumbnail',
        destinationPath: publishConf.videoTmpDir,
        maxCount: 1
      }
    ]);

    async.parallel([

      // Get the list of categories
      function(callback) {
        process.api.getCoreApi().taxonomyModel.getTaxonomyTerms('categories', function(error, terms) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'addEntityAction'});
            categoriesIds = [];
          } else
            categoriesIds = openVeoApi.util.getPropertyFromArray('id', terms, 'items');

          callback();
        });
      },

      // Get the list of groups
      function(callback) {
        process.api.getCoreApi().groupModel.get(null, function(error, entities) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_GROUPS_ERROR);
          }

          groupsIds = openVeoApi.util.getPropertyFromArray('id', entities);
          callback();
        });
      },

      // Get the list of custom properties
      function(callback) {
        var database = process.api.getCoreApi().getDatabase();
        var model = new PropertyModel(new PropertyProvider(database), new VideoProvider(database));

        model.get(null, function(error, entities) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_CUSTOM_PROPERTIES_ERROR);
          }

          customProperties = entities;
          callback();
        });
      },

      // Parse multipart body
      function(callback) {
        parser.parse(function(error) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_PARSE_ERROR);
          }

          if (!request.body.info) return callback(HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS);

          request.body.info = JSON.parse(request.body.info);
          callback();
        });
      }

    ], function(error) {
      if (error) return next(error);

      async.series([

        // Validate file
        function(callback) {
          if (!request.files || !request.files.file || !request.files.file.length)
            return callback(HTTP_ERRORS.ADD_MEDIA_PARSE_ERROR);

          openVeoApi.util.validateFiles({
            file: request.files.file[0].path
          }, {
            file: {in: [fileSystemApi.FILE_TYPES.MP4, fileSystemApi.FILE_TYPES.TAR]}
          }, function(error, files) {
            if (error || (files.file && !files.file.isValid)) {
              if (error)
                process.logger.error(error.message, {error: error, method: 'addEntityAction'});

              callback(HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER);
            } else
              callback();
          });
        },

        // Validate custom properties
        function(callback) {
          var validationDescriptor = {};

          // Iterate through properties
          for (var id in request.body.info.properties) {
            var value = request.body.info.properties[id];

            // Iterate through custom properties
            for (var i = 0; i < customProperties.length; i++) {
              var customProperty = customProperties[i];
              if (customProperties[i].id === id) {

                // Found custom property description corresponding to the custom property from request
                // Add its validation descriptor

                if (customProperty.type === PropertyModel.TYPES.BOOLEAN)
                  validationDescriptor[id] = {type: 'boolean'};

                else if (customProperty.type === PropertyModel.TYPES.LIST && value !== null)
                  validationDescriptor[id] = {type: 'string'};

                else if (customProperty.type === PropertyModel.TYPES.TEXT)
                  validationDescriptor[id] = {type: 'string'};

                break;
              }
            }
          }

          try {
            request.body.info.properties = openVeoApi.util.shallowValidateObject(
              request.body.info.properties,
              validationDescriptor
            );
          } catch (validationError) {
            process.logger.error(validationError.message, {error: validationError, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_WRONG_PROPERTIES_PARAMETER);
          }

          callback();
        },

        // Validate other parameters
        function(callback) {
          try {
            var validationDescriptor = {
              title: {type: 'string', required: true},
              date: {type: 'number', default: Date.now()},
              shortDescription: {type: 'string'},
              description: {type: 'string'},
              groups: {type: 'array<string>', in: groupsIds}
            };

            // Avoid getting a category with value "null" (string)
            if (request.body.info.category !== null)
              validationDescriptor.category = {type: 'string', in: categoriesIds};

            params = openVeoApi.util.shallowValidateObject(request.body.info, validationDescriptor);

          } catch (validationError) {
            process.logger.error(validationError.message, {error: validationError, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS);
          }

          callback();
        },

        // Make sure media does not already exist in database
        function(callback) {
          model.get({originalPackagePath: request.files.file[0].path}, function(error, medias) {
            if (error)
              process.logger.error(error.message, {error: error, method: 'addEntityAction'});

            if (medias && medias.length)
              callback(HTTP_ERRORS.ADD_MEDIA_CHECK_DUPLICATE_ERROR);
            else callback();
          });
        },

        // Add new media
        function(callback) {
          var pathDescriptor = path.parse(request.files.file[0].path);
          var publishManager = self.getPublishManager();

          var listener = function(mediaPackage) {
            if (mediaPackage.originalPackagePath === request.files.file[0].path) {
              publishManager.removeListener('stateChanged', listener);
              callback();
            }
          };

          // Make sure process has started before sending back response to the client
          publishManager.on('stateChanged', listener);

          publishManager.publish({
            originalPackagePath: request.files.file[0].path,
            originalThumbnailPath: request.files.thumbnail ? request.files.thumbnail[0].path : undefined,
            originalFileName: pathDescriptor.name,
            title: params.title,
            date: params.date,
            shortDescription: params.shortDescription,
            description: params.description,
            category: params.category,
            groups: params.groups,
            user: request.user.id,
            properties: request.body.info.properties
          });
        }

      ], function(error) {
        if (error) {
          if (request.files && request.files.file && request.files.file.length) {

            // Remove temporary file
            fs.unlink(request.files.file[0].path, function(unlinkError) {
              if (unlinkError) return next(HTTP_ERRORS.ADD_MEDIA_REMOVE_FILE_ERROR);
              next(error);
            });

          } else
            next(error);
        } else response.send();
      });
    });

  } else {

    // Missing body
    next(HTTP_ERRORS.ADD_MEDIA_MISSING_PARAMETERS);

  }
};

/**
 * Update a media
 *
 * @example
 *
 *     // Expected multipart body example
 *     {
 *       "info": {
 *         "title" : 'Media title',
 *         "description" : 'Media HTML description',
 *         "category" : 'Media category',
 *         "groups" : 'Media groups'
 *       },
 *       "thumbnail" : ...
 *     }
 *
 * @method updateEntityAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateEntityAction = function(request, response, next) {
  var entityId = request.params.id;

  if (request.body) {
    var model = this.getModel(request);
    var parser = new MultipartParser(request, [
      {
        name: 'thumbnail',
        destinationPath: publishConf.videoTmpDir,
        maxCount: 1
      }
    ]);

    parser.parse(function(error) {
      var info = JSON.parse(request.body.info);
      var files = request.files;
      var thumbnail = files.thumbnail ? files.thumbnail[0] : undefined;
      var imageDir = path.normalize(process.rootPublish + '/assets/player/videos/' + entityId);

      async.series([
        function(callback) {
          if (thumbnail) {
            async.series([

              // Validate the file
              function(thumbCallback) {
                openVeoApi.util.validateFiles(
                  {thumbnail: thumbnail.path},
                  {thumbnail: {in: [openVeoApi.fileSystem.FILE_TYPES.JPG]}},
                  function(error, files) {
                    if (error)
                      process.logger.warn(error.message, {action: 'updateEntity', mediaId: entityId});

                    if (!files.thumbnail.isValid)
                      return next(new Error(HTTP_ERRORS.INVALID_VIDEO_THUMBNAIL));

                    thumbCallback();
                  }
                );
              },

              // Copy the file
              function(thumbCallback) {
                openVeoApi.fileSystem.copy(thumbnail.path, path.join(imageDir, 'thumbnail.jpg'), function(error) {
                  if (error)
                    process.logger.warn(error.message,
                                        {action: 'updateEntityAction', mediaId: entityId, thumbnail: thumbnail.path});
                  thumbCallback();
                });
              },

              // Clear image thumbnail cache
              function(thumbCallback) {
                coreApi.clearImageCache(path.join(entityId, 'thumbnail.jpg'), 'publish', function(error) {
                  if (error)
                    process.logger.error(error.message);

                  thumbCallback();
                });
              },

              // Update the video
              function(thumbCallback) {
                model.updateThumbnail(entityId, '/publish/' + entityId + '/thumbnail.jpg', function(error) {
                  if (error) {
                    process.logger.error((error && error.message) || 'Fail updating',
                                         {method: 'updateEntityAction', entity: entityId});
                  }
                  thumbCallback(error);
                });
              }
            ], function(error) {
              callback(error);
            });
          } else {
            callback();
          }
        },
        function(callback) {
          model.update(entityId, info, function(error, updateCount) {
            if (error) {
              process.logger.error((error && error.message) || 'Fail updating',
                                   {method: 'updateEntityAction', entity: entityId});
            }

            callback(error);
          });
        }
      ], function(error) {
        if (error) {
          next((error instanceof AccessError) ? errors.UPDATE_ENTITY_FORBIDDEN : errors.UPDATE_ENTITY_ERROR);
        } else {
          response.send({error: null, status: 'ok'});
        }
      });
    });
  } else {

    // Missing body
    next(HTTP_ERRORS.UPDATE_MEDIA_MISSING_PARAMETERS);

  }
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
      page: {type: 'number', gte: 0, default: 0},
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
  var database = process.api.getCoreApi().getDatabase();
  return new VideoModel(
    request.user,
    new VideoProvider(database),
    new PropertyProvider(database)
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
  var params;
  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UPDATE_VIDEO_TAGS_MISSING_PARAMETERS);
  }

  var entityId = params.id;
  var model = this.getModel(request);

  var parser = new MultipartParser(request, [
    {
      name: 'file',
      destinationPath: process.rootPublish + '/assets/player/videos/' + entityId + '/uploads/',
      maxCount: 1
    }
  ], {
    fileSize: 20 * 1000 * 1000
  });

  parser.parse(function(error) {
    if (error || !request.body.info) {
      if (error)
        process.logger.error(error.message, {error: error, method: 'updateTagsAction'});

      // An error occurred when uploading
      return next(HTTP_ERRORS.UPLOAD_TAG_FILE_ERROR);
    }

    var data = JSON.parse(request.body.info);
    var file = request.files.file ? request.files.file[0] : null;

    model.updateTags(entityId, data, file, function(error, newtag) {
      if (error)
        next((error instanceof AccessError) ?
          HTTP_ERRORS.UPDATE_VIDEO_TAGS_FORBIDDEN : HTTP_ERRORS.UPDATE_VIDEO_TAGS_ERROR);
      else
        response.send(newtag);
    });
  });
};

/**
 * Handles back office removeTags action to remove tags.
 *
 * @method removeTagsAction
 */
VideoController.prototype.removeTagsAction = function(request, response, next) {
  var params;
  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.REMOVE_VIDEO_TAGS_MISSING_PARAMETERS);
  }

  var entityId = params.id;
  var model = this.getModel(request);
  var data = request.body;

  model.removeTags(entityId, data, function(error, deletedTag) {
    if (error)
      next((error instanceof AccessError) ?
        HTTP_ERRORS.REMOVE_VIDEO_TAGS_FORBIDDEN : HTTP_ERRORS.REMOVE_VIDEO_TAGS_FORBIDDEN);
    else
      response.send(deletedTag);
  });
};

/**
 * Convert points of interest (chapters, tags & cut) units
 * from percents to milliseconds (depending on the video
 * duration).
 *
 * @method updatePoiAction
 * @return {VideoModel} The updated VideoModel instance
 */
VideoController.prototype.updatePoiAction = function(request, response, next) {
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_VIDEO_READY_MISSING_PARAMETERS);
  }

  var model = this.getModel(request);
  var duration = request.body.duration;

  model.getOneReady(params.id, function(error, video) {
    if (error && error instanceof AccessError)
      next(HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN);
    else if (error || (video.state === STATES.READY && !request.isAuthenticated()))
      next(HTTP_ERRORS.GET_VIDEO_READY_ERROR);
    else if (video.needPointsOfInterestUnitConversion === true) {
      var properties = ['chapters', 'tags', 'cut'];

      for (var i = 0; i < properties.length; i++) {
        if (Array.isArray(video[properties[i]])) {
          video[properties[i]].forEach(function(pointOfInterest) {
            pointOfInterest.value = Math.floor(pointOfInterest.value * duration);
          });
        } else {
          video[properties[i]] = [];
        }
      }

      delete video.needPointsOfInterestUnitConversion;

      model.update(params.id,
        {
          chapters: video.chapters,
          cut: video.cut,
          tags: video.tags
        },
        function(error, updateCount) {
          if (error) {
            next(HTTP_ERRORS.CONVERT_VIDEO_POI_ERROR);
          } else {
            response.send({
              entity: video
            });
          }
        }
      );
    }
  });
};
