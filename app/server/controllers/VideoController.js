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
var fileSystemApi = openVeoApi.fileSystem;
var configDir = fileSystemApi.getConfDir();
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var videoPlatformFactory = process.requirePublish('app/server/providers/videoPlatforms/factory.js');
var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');
var platforms = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var MultipartParser = openVeoApi.multipart.MultipartParser;
var ContentController = openVeoApi.controllers.ContentController;
var ResourceFilter = openVeoApi.storages.ResourceFilter;

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
 * Resolves medias resources urls using CDN url.
 *
 * Medias may have attached resources like files associated to tags, timecodes images, thumbnail image and
 * so on. These resources must be accessible through an url. As all resources must, in the future, reside in
 * a CDN, resolveResourcesUrls transforms all resources URIs to URLs based on CDN.
 *
 * @param {Array} medias The list of medias
 */
function resolveResourcesUrls(medias) {
  var cdnUrl = coreApi.getCdnUrl();
  var removeFirstSlashRegExp = new RegExp(/^\//);

  if (medias && medias.length) {
    medias.forEach(function(media) {

      // Timecodes
      if (media.timecodes) {
        media.timecodes.forEach(function(timecode) {
          if (timecode.image) {

            if (timecode.image.small)
              timecode.image.small = cdnUrl + timecode.image.small.replace(removeFirstSlashRegExp, '');

            if (timecode.image.large)
              timecode.image.large = cdnUrl + timecode.image.large.replace(removeFirstSlashRegExp, '');
          }
        });
      }

      // Tags
      if (media.tags) {
        media.tags.forEach(function(tag) {
          if (tag.file && tag.file.basePath)
            tag.file.basePath = cdnUrl + tag.file.basePath.replace(removeFirstSlashRegExp, '');
        });
      }

      // Thumbnail
      if (media.thumbnail)
        media.thumbnail = cdnUrl + media.thumbnail.replace(removeFirstSlashRegExp, '');

      // Local videos are hosted in local and consequently delivered by OpenVeo HTTP server
      if (media.type === TYPES.LOCAL && media.sources) {
        media.sources.forEach(function(source) {
          if (source.files) {
            source.files.forEach(function(file) {
              if (file.link)
                file.link = cdnUrl + file.link.replace(removeFirstSlashRegExp, '');
            });
          }
        });
      }

    });
  }
}

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
 * Gets a ready media.
 *
 * A ready media is a media with a state set to ready or published.
 * Connected users may have access to ready medias but unconnected users can only access published medias.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "entity" : {
 *         "id": ..., // The media id
 *         "state": ..., // The media state
 *         "date": ..., // The media published date as a timestamp
 *         "type": ..., // The video associated platform
 *         "errorCode": ..., // The media error code or -1 if no error
 *         "category": ..., // The media category
 *         "properties": {...}, // The media custom properties
 *         "link": ..., // The media URL
 *         "mediaId": [...], // The media id on the video platform
 *         "available": ..., // The media availability on the video platform
 *         "thumbnail": ..., // The media thumbnail URL
 *         "title": ..., // The media title
 *         "leadParagraph": ..., // The media lead paragraph
 *         "description": ..., // The media description
 *         "chapters": [...], // The media chapters
 *         "tags": [...], // The media tags
 *         "cut": [...], // The media begin and end cuts
 *         "timecodes": [...], // The media associated images
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
  if (!request.params.id) return next(HTTP_ERRORS.GET_VIDEO_READY_MISSING_PARAMETERS);

  var params;
  var self = this;
  var provider = this.getProvider();

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_VIDEO_READY_WRONG_PARAMETERS);
  }

  // Get video
  provider.getOne(
    new ResourceFilter().equal('id', params.id),
    null,
    function(getOneError, media) {
      if (getOneError) {
        process.logger.error(getOneError.message, {error: getOneError, method: 'getVideoReadyAction'});
        return next(HTTP_ERRORS.GET_VIDEO_READY_ERROR);
      }

      if (!media) {
        process.logger.warn('Not found', {method: 'getVideoReadyAction', entity: params.id});
        return next(HTTP_ERRORS.GET_VIDEO_READY_NOT_FOUND);
      }

      // Media not ready
      if (media.state !== STATES.READY && media.state !== STATES.PUBLISHED)
        return next(HTTP_ERRORS.GET_VIDEO_READY_NOT_READY_ERROR);

      // User without enough privilege to read the media in ready state
      if (media.state === STATES.READY &&
          !self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.READ)
         ) {
        return next(HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN);
      }

      // Video from video platform already retrieved
      if (!media.type || !media.mediaId || (media.available && media.sources.length == media.mediaId.length)) {
        resolveResourcesUrls([media]);
        return response.send({
          entity: media
        });
      }

      // Get information about the video from the video platform
      var videoPlatformProvider = videoPlatformFactory.get(media.type, platforms[media.type]);
      var expectedDefinition = media.metadata['profile-settings']['video-height'];

      // Compatibility with old mediaId format
      var mediaId = !Array.isArray(media.mediaId) ? [media.mediaId] : media.mediaId;

      // Get video availability and sources
      videoPlatformProvider.getVideoInfo(mediaId, expectedDefinition, function(getInfoError, info) {
        if (getInfoError) {
          process.logger.error(getInfoError.message, {error: getInfoError, method: 'getVideoReadyAction'});
          return next(HTTP_ERRORS.GET_VIDEO_READY_GET_INFO_ERROR);
        }

        media.available = info.available;
        media.sources = info.sources;

        provider.updateOne(new ResourceFilter().equal('id', media.id), info);

        resolveResourcesUrls([media]);

        return response.send({
          entity: media
        });
      });

    }
  );
};

/**
 * Gets a media.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "entity" : {
 *         "id": ..., // The media id
 *         "state": ..., // The media state
 *         "date": ..., // The media published date as a timestamp
 *         "type": ..., // The video associated platform
 *         "errorCode": ..., // The media error code or -1 if no error
 *         "category": ..., // The media category
 *         "properties": {...}, // The media custom properties
 *         "link": ..., // The media URL
 *         "mediaId": [...], // The media id on the video platform
 *         "available": ..., // The media availability on the video platform
 *         "thumbnail": ..., // The media thumbnail URL
 *         "title": ..., // The media title
 *         "leadParagraph": ..., // The media lead paragraph
 *         "description": ..., // The media description
 *         "chapters": [...], // The media chapters
 *         "tags": [...], // The media tags
 *         "cut": [...], // The media begin and end cuts
 *         "timecodes": [...], // The media associated images
 *       }
 *     }
 *
 * @method getEntityAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The id of the media to retrieve
 * @param {Object} request.query Request query
 * @param {String|Array} [request.query.include] The list of fields to include from returned media
 * @param {String|Array} [request.query.exclude] The list of fields to exclude from returned media. Ignored if
 * include is also specified.
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getEntityAction = function(request, response, next) {
  if (request.params.id) {
    var entityId = request.params.id;
    var provider = this.getProvider();
    var self = this;
    var query;
    var fields;
    request.query = request.query || {};

    try {
      query = openVeoApi.util.shallowValidateObject(request.query, {
        include: {type: 'array<string>'},
        exclude: {type: 'array<string>'}
      });
    } catch (error) {
      return next(HTTP_ERRORS.GET_MEDIA_WRONG_PARAMETERS);
    }

    // Make sure "metadata" field is not excluded
    fields = this.removeMetatadaFromFields({
      exclude: query.exclude,
      include: query.include
    });

    provider.getOne(
      new ResourceFilter().equal('id', entityId),
      fields,
      function(error, media) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'getEntityAction', entity: entityId});
          return next(HTTP_ERRORS.GET_MEDIA_ERROR);
        }

        if (!media) {
          process.logger.warn('Not found', {method: 'getEntityAction', entity: entityId});
          return next(HTTP_ERRORS.GET_MEDIA_NOT_FOUND);
        }

        // User without enough privilege to read the media
        if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.READ)) {
          return next(HTTP_ERRORS.GET_MEDIA_FORBIDDEN);
        }

        // Video from video platform already retrieved
        if (!media.type || !media.mediaId || (media.available && media.sources.length == media.mediaId.length)) {
          resolveResourcesUrls([media]);
          return response.send({
            entity: media
          });
        }

        // Get information about the video from the video platform
        var videoPlatformProvider = videoPlatformFactory.get(media.type, platforms[media.type]);
        var expectedDefinition = media.metadata['profile-settings']['video-height'];

        // Compatibility with old mediaId format
        var mediaId = !Array.isArray(media.mediaId) ? [media.mediaId] : media.mediaId;

        // Get video availability and sources
        videoPlatformProvider.getVideoInfo(mediaId, expectedDefinition, function(getInfoError, info) {
          if (getInfoError) {
            process.logger.error(getInfoError.message, {error: getInfoError, method: 'getEntityAction'});
            return next(HTTP_ERRORS.GET_MEDIA_GET_INFO_ERROR);
          }

          media.available = info.available;
          media.sources = info.sources;

          provider.updateOne(new ResourceFilter().equal('id', media.id), info);

          resolveResourcesUrls([media]);

          return response.send({
            entity: media
          });
        });
      }
    );
  } else {

    // Missing id of the media
    next(HTTP_ERRORS.GET_MEDIA_MISSING_PARAMETERS);

  }
};

/**
 * Adds a media.
 *
 * @method addEntityAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body The media information as multipart body
 * @param {Object} [request.body.file] The media file as multipart data
 * @param {Object} [request.body.thumbnail] The media thumbnail as multipart data
 * @param {Object} request.body.info The media information
 * @param {String} request.body.info.title The media title
 * @param {Object} [request.body.info.properties] The media custom properties values with property id as keys
 * @param {String} [request.body.info.category] The media category id it belongs to
 * @param {Date|Number|String} [request.body.info.date] The media date
 * @param {String} [request.body.info.leadParagraph] The media lead paragraph
 * @param {String} [request.body.info.description] The media description
 * @param {Array} [request.body.info.groups] The media content groups it belongs to
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.addEntityAction = function(request, response, next) {
  if (!request.body) return next(HTTP_ERRORS.ADD_MEDIA_MISSING_PARAMETERS);

  var self = this;
  var categoriesIds;
  var groupsIds;
  var customProperties;
  var params;
  var provider = this.getProvider();
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
      coreApi.taxonomyProvider.getTaxonomyTerms('categories', function(error, terms) {
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
      coreApi.groupProvider.getAll(null, null, {id: 'desc'}, function(error, groups) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'addEntityAction'});
          return callback(HTTP_ERRORS.ADD_MEDIA_GROUPS_ERROR);
        }

        groupsIds = openVeoApi.util.getPropertyFromArray('id', groups);
        callback();
      });
    },

    // Get the list of custom properties
    function(callback) {
      var database = coreApi.getDatabase();
      var propertyProvider = new PropertyProvider(database);

      propertyProvider.getAll(null, null, {id: 'desc'}, function(error, properties) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'addEntityAction'});
          return callback(HTTP_ERRORS.ADD_MEDIA_CUSTOM_PROPERTIES_ERROR);
        }

        customProperties = properties;
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
        }, function(validateError, files) {
          if (validateError || (files.file && !files.file.isValid)) {
            if (validateError)
              process.logger.error(validateError.message, {error: validateError, method: 'addEntityAction'});

            callback(HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER);
          } else
            callback();
        });
      },

      // Validate custom properties
      function(callback) {
        var validationDescriptor = {};

        // Iterate through custom properties values
        for (var id in request.body.info.properties) {
          var value = request.body.info.properties[id];

          // Iterate through custom properties descriptors
          for (var i = 0; i < customProperties.length; i++) {
            var customProperty = customProperties[i];
            if (customProperties[i].id === id) {

              // Found custom property description corresponding to the custom property from request
              // Add its validation descriptor

              if (customProperty.type === PropertyProvider.TYPES.BOOLEAN)
                validationDescriptor[id] = {type: 'boolean'};

              else if (customProperty.type === PropertyProvider.TYPES.LIST && value !== null)
                validationDescriptor[id] = {type: 'string'};

              else if (customProperty.type === PropertyProvider.TYPES.TEXT)
                validationDescriptor[id] = {type: 'string'};

              else if (customProperty.type === PropertyProvider.TYPES.DATE_TIME)
                validationDescriptor[id] = {type: 'number'};

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
            leadParagraph: {type: 'string'},
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
        provider.getOne(
          new ResourceFilter()
          .equal('originalPackagePath', request.files.file[0].path),
          {
            include: ['id']
          },
          function(getOneError, media) {
            if (getOneError)
              process.logger.error(getOneError.message, {error: getOneError, method: 'addEntityAction'});

            if (media) callback(HTTP_ERRORS.ADD_MEDIA_CHECK_DUPLICATE_ERROR);
            else callback();
          }
        );
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
          leadParagraph: params.leadParagraph,
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
            if (unlinkError) {
              process.logger.error(unlinkError.message, {error: unlinkError, method: 'addEntityAction'});
              return next(HTTP_ERRORS.ADD_MEDIA_REMOVE_FILE_ERROR);
            }
            next(error);
          });

        } else
          next(error);
      } else response.send();
    });
  });
};

/**
 * Updates a media.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1
 *     }
 *
 * @method updateEntityAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {String} request.params.id Id of the media to update
 * @param {Object} request.body The media information as multipart body
 * @param {Object} [request.body.thumbnail] The media thumbnail as multipart data
 * @param {Object} request.body.info The media information
 * @param {String} [request.body.info.title] The media title
 * @param {Object} [request.body.info.properties] The media custom properties values with property id as keys
 * @param {String} [request.body.info.category] The media category id it belongs to
 * @param {Date|Number|String} [request.body.info.date] The media date
 * @param {String} [request.body.info.leadParagraph] The media lead paragraph
 * @param {String} [request.body.info.description] The media description
 * @param {Array} [request.body.info.groups] The media content groups it belongs to
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateEntityAction = function(request, response, next) {
  if (!request.body || !request.params.id) return next(HTTP_ERRORS.UPDATE_MEDIA_MISSING_PARAMETERS);

  var totalUpdated;
  var self = this;
  var mediaId = request.params.id;
  var provider = this.getProvider();
  var parser = new MultipartParser(request, [
    {
      name: 'thumbnail',
      destinationPath: publishConf.videoTmpDir,
      maxCount: 1
    }
  ]);

  parser.parse(function(error) {
    if (error) {
      process.logger.error(error.message, {error: error, method: 'updateEntityAction'});
      next(HTTP_ERRORS.UPDATE_MEDIA_PARSE_ERROR);
    }

    var info = JSON.parse(request.body.info);
    var files = request.files;
    var thumbnail = files.thumbnail ? files.thumbnail[0] : undefined;
    var imageDir = path.normalize(process.rootPublish + '/assets/player/videos/' + mediaId);

    async.series([

      // Verify that user has enough privilege to update the media
      function(callback) {
        provider.getOne(
          new ResourceFilter().equal('id', mediaId), null, function(error, media) {
            if (error) {
              process.logger.error(error.message, {error: error, method: 'updateEntityAction'});
              return callback(HTTP_ERRORS.UPDATE_MEDIA_GET_ONE_ERROR);
            }

            if (!media) return callback(HTTP_ERRORS.UPDATE_MEDIA_NOT_FOUND_ERROR);

            if (self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE)) {

              // User is authorized to update but he must be owner to update the owner
              if (!self.isUserOwner(media, request.user) &&
                  !self.isUserAdmin(request.user) &&
                  !self.isUserManager(request.user)) {
                delete info['user'];
              }

              callback();
            } else
              callback(HTTP_ERRORS.UPDATE_MEDIA_FORBIDDEN);
          }
        );
      },

      // Validate the file
      function(callback) {
        if (!thumbnail) return callback();

        openVeoApi.util.validateFiles(
          {thumbnail: thumbnail.path},
          {thumbnail: {in: [fileSystemApi.FILE_TYPES.JPG]}},
          function(error, files) {
            if (error)
              process.logger.warn(error.message, {error: error, action: 'updateEntity', mediaId: mediaId});

            if (!files.thumbnail.isValid) return callback(HTTP_ERRORS.INVALID_VIDEO_THUMBNAIL);

            callback();
          }
        );
      },

      // Copy the file
      function(callback) {
        if (!thumbnail) return callback();

        fileSystemApi.copy(thumbnail.path, path.join(imageDir, 'thumbnail.jpg'), function(error) {
          if (error) {
            process.logger.warn(
              error.message,
              {error: error, action: 'updateEntityAction', mediaId: mediaId, thumbnail: thumbnail.path}
            );
          }

          fileSystemApi.rm(thumbnail.path, function(error) {
            if (error) {
              process.logger.warn(
                error.message,
                {error: error, action: 'updateEntityAction', mediaId: mediaId, thumbnail: thumbnail.path}
              );
            }
            callback();
          });
        });
      },

      // Clear image thumbnail cache
      function(callback) {
        if (!thumbnail) return callback();

        coreApi.clearImageCache(path.join(mediaId, 'thumbnail.jpg'), 'publish', function(error) {
          if (error) {
            process.logger.warn(
              error.message,
              {error: error, action: 'updateEntityAction', mediaId: mediaId}
            );
          }
          callback();
        });
      },

      // Update the media
      function(callback) {
        if (thumbnail) info.thumbnail = '/publish/' + mediaId + '/thumbnail.jpg';

        provider.updateOne(
          new ResourceFilter().equal('id', mediaId),
          info,
          function(error, total) {
            if (error) {
              process.logger.error(error.message, {error: error, method: 'updateEntityAction', entity: mediaId});
              return callback(HTTP_ERRORS.UPDATE_MEDIA_ERROR);
            }

            totalUpdated = total;
            callback();
          }
        );
      }
    ], function(error) {
      if (error) return next(error);
      response.send({total: totalUpdated});
    });
  });
};

/**
 * Gets medias.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "entities" : [ ... ],
 *       "pagination" : {
 *         "limit": ..., // The limit number of medias by page
 *         "page": ..., // The actual page
 *         "pages": ..., // The total number of pages
 *         "size": ... // The total number of medias
 *     }
 *
 * @method getEntitiesAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.query Request's query parameters
 * @param {String} [request.query.query] To search on both medias title and description
 * @param {String|Array} [request.query.include] The list of fields to include from returned medias
 * @param {String|Array} [request.query.exclude] The list of fields to exclude from returned medias. Ignored if
 * include is also specified.
 * @param {String|Array} [request.query.states] To filter medias by state
 * @param {String} [request.query.dateStart] To filter medias after or equal to a date (in format mm/dd/yyyy)
 * @param {String} [request.query.dateEnd] To get medias before a date (in format mm/dd/yyyy)
 * @param {String|Array} [request.query.categories] To filter medias by category
 * @param {String|Array} [request.query.groups] To filter medias by group
 * @param {String|Array} [request.query.user] To filter medias by user
 * @param {String} [request.query.sortBy="date"] To sort medias by either **title**, **description**, **date**,
 * **state**, **views** or **category**
 * @param {String} [request.query.sortOrder="desc"] Sort order (either **asc** or **desc**)
 * @param {String} [request.query.page=0] The expected page
 * @param {String} [request.query.limit=10] To limit the number of medias per page
 * @param {Object} [request.query.properties] A list of properties with the property id as the key and the expected
 * property value as the value
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getEntitiesAction = function(request, response, next) {
  var params;
  var fields;
  var self = this;
  var medias = [];
  var properties = [];
  var pagination = {};
  var provider = this.getProvider();
  var orderedProperties = ['title', 'description', 'date', 'state', 'views', 'category'];

  try {
    params = openVeoApi.util.shallowValidateObject(request.query, {
      query: {type: 'string'},
      include: {type: 'array<string>'},
      exclude: {type: 'array<string>'},
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
  sort[params.sortBy] = params.sortOrder;

  // Build filter
  var filter = new ResourceFilter();

  // Add search query
  if (params.query) filter.search('"' + params.query + '"');

  // Add states
  if (params.states && params.states.length) filter.in('state', params.states);

  // Add categories
  if (params.categories && params.categories.length) filter.in('category', params.categories);

  // Add groups
  if (params.groups && params.groups.length) filter.in('metadata.groups', params.groups);

  // Add owner
  if (params.user && params.user.length) filter.in('metadata.user', params.user);

  // Add date
  if (params.dateStart) filter.greaterThanEqual('date', params.dateStart);
  if (params.dateEnd) filter.lesserThan('date', params.dateEnd);

  // Make sure "metadata" field is not excluded
  fields = this.removeMetatadaFromFields({
    exclude: params.exclude,
    include: params.include
  });

  async.series([

    // Get the list of custom properties
    function(callback) {
      var database = coreApi.getDatabase();
      var propertyProvider = new PropertyProvider(database);

      propertyProvider.getAll(null, null, {id: 'desc'}, function(error, propertiesList) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
          return callback(HTTP_ERRORS.GET_VIDEOS_GET_PROPERTIES_ERROR);
        }
        properties = propertiesList;
        callback(error);
      });
    },

    // Validate custom properties
    function(callback) {
      if (params.properties) {
        var customPropertiesIds = Object.keys(params.properties);
        try {
          for (var i = 0; i < customPropertiesIds.length; i++) {
            for (var j = 0; j < properties.length; j++) {
              if (properties[j].id === customPropertiesIds[i]) {
                var validatedProperty;
                var validationDescriptor = {};

                if (properties[j].type === PropertyProvider.TYPES.BOOLEAN)
                  validationDescriptor[properties[j].id] = {type: 'boolean', required: true};

                else if (properties[j].type === PropertyProvider.TYPES.LIST)
                  validationDescriptor[properties[j].id] = {type: 'string', required: true};

                else if (properties[j].type === PropertyProvider.TYPES.TEXT)
                  validationDescriptor[properties[j].id] = {type: 'string', required: true};

                else if (properties[j].type === PropertyProvider.TYPES.DATE_TIME)
                  validationDescriptor[properties[j].id] = {type: 'date', required: true};

                validatedProperty = openVeoApi.util.shallowValidateObject(
                  params.properties,
                  validationDescriptor
                );

                if (validatedProperty[properties[j].id]) {
                  if (properties[j].type === PropertyProvider.TYPES.DATE_TIME) {
                    var startDate = new Date(validatedProperty[properties[j].id]);
                    startDate.setHours(0);
                    startDate.setMinutes(0);
                    startDate.setSeconds(0);
                    startDate.setMilliseconds(0);

                    var endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 1);
                    filter.greaterThanEqual('properties.' + properties[j].id, startDate.getTime());
                    filter.lesserThan('properties.' + properties[j].id, endDate.getTime());
                  } else
                    filter.equal('properties.' + properties[j].id, validatedProperty[properties[j].id]);
                }

                break;
              }
            }
          }
        } catch (validationError) {
          process.logger.error(validationError.message, {error: validationError, method: 'getEntitiesAction'});
          return callback(HTTP_ERRORS.GET_VIDEOS_CUSTOM_PROPERTIES_WRONG_PARAMETERS);
        }
      }

      callback();
    },

    // Get the list of medias
    function(callback) {
      provider.get(
        self.addAccessFilter(filter, request.user),
        fields,
        params.limit,
        params.page,
        sort,
        function(error, fetchedMedias, fetchedPagination) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
            return callback(HTTP_ERRORS.GET_VIDEOS_ERROR);
          }
          medias = fetchedMedias;
          pagination = fetchedPagination;
          callback();
        }
      );
    }

  ], function(error) {
    if (error) return next(error);
    if (properties) {

      // Medias may not have custom properties or just some of them.
      // Furthermore only the id and value of properties are stored
      // within medias, not complete information about the properties
      // (no name, no description and no type).
      // Inject all custom properties information inside media objects

      medias.forEach(function(media) {
        if (!media.properties) return;
        var mediaProperties = {};

        properties.forEach(function(property) {

          // Make a copy of property object to add value
          mediaProperties[String(property.id)] = JSON.parse(JSON.stringify(property));
          if (!media.properties[String(property.id)])
            mediaProperties[String(property.id)]['value'] = '';
          else
            mediaProperties[String(property.id)]['value'] = media.properties[String(property.id)];

        });
        media.properties = mediaProperties;
      });

    }

    resolveResourcesUrls(medias);

    response.send({
      entities: medias,
      pagination: pagination
    });
  });
};

/**
 * Publishes medias.
 *
 * Change the state of medias to published.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 42
 *     }
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
  if (!request.params.ids) return next(HTTP_ERRORS.PUBLISH_VIDEOS_MISSING_PARAMETERS);

  var params;
  var self = this;
  var asyncFunctions = [];
  var total = 0;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.PUBLISH_VIDEOS_WRONG_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var provider = this.getProvider();

  // Make sure user has enough privilege to update the medias
  provider.getAll(
    new ResourceFilter().in('id', ids),
    {
      include: ['id', 'metadata']
    },
    {
      id: 'desc'
    },
    function(getAllError, medias) {
      if (getAllError) {
        process.logger.error(getAllError.message, {error: getAllError, method: 'publishVideosAction'});
        return next(HTTP_ERRORS.PUBLISH_VIDEOS_GET_VIDEOS_ERROR);
      }

      medias.forEach(function(media) {
        if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE)) return;
        asyncFunctions.push(function(callback) {
          provider.updateOne(
            new ResourceFilter()
            .equal('id', media.id)
            .equal('state', STATES.READY),
            {
              state: STATES.PUBLISHED
            },
            function(updateOneError) {
              total++;
              callback(updateOneError);
            }
          );
        });
      });

      async.parallel(asyncFunctions, function(error, results) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'publishVideosAction'});
          return next(HTTP_ERRORS.PUBLISH_VIDEOS_ERROR);
        }
        if (total !== ids.length) return next(HTTP_ERRORS.PUBLISH_VIDEOS_FORBIDDEN);

        response.send({
          total: total
        });
      });
    }
  );
};

/**
 * Unpublishes medias.
 *
 * Change the state of medias to unpublished.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 42
 *     }
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
  if (!request.params.ids) return next(HTTP_ERRORS.UNPUBLISH_VIDEOS_MISSING_PARAMETERS);

  var params;
  var self = this;
  var asyncFunctions = [];
  var total = 0;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UNPUBLISH_VIDEOS_WRONG_PARAMETERS);
  }

  var ids = params.ids.split(',');
  var provider = this.getProvider();

  // Make sure user has enough privilege to update the medias
  provider.getAll(
    new ResourceFilter().in('id', ids),
    {
      include: ['id', 'metadata']
    },
    {
      id: 'desc'
    },
    function(getAllError, medias) {
      if (getAllError) {
        process.logger.error(getAllError.message, {error: getAllError, method: 'unpublishVideosAction'});
        return next(HTTP_ERRORS.UNPUBLISH_VIDEOS_GET_VIDEOS_ERROR);
      }

      medias.forEach(function(media) {
        if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE)) return;
        asyncFunctions.push(function(callback) {
          provider.updateOne(
            new ResourceFilter()
            .equal('id', media.id)
            .equal('state', STATES.PUBLISHED),
            {
              state: STATES.READY
            },
            function(updateOneError) {
              total++;
              callback(updateOneError);
            }
          );
        });
      });

      async.parallel(asyncFunctions, function(error, results) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'unpublishVideosAction'});
          return next(HTTP_ERRORS.UNPUBLISH_VIDEOS_ERROR);
        }
        if (total !== ids.length) return next(HTTP_ERRORS.UNPUBLISH_VIDEOS_FORBIDDEN);

        response.send({
          total: total
        });
      });
    }
  );
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
  if (!request.params.ids) return next(HTTP_ERRORS.RETRY_VIDEOS_MISSING_PARAMETERS);

  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.RETRY_VIDEOS_WRONG_PARAMETERS);
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
  if (!request.params.ids || !request.params.platform) return next(HTTP_ERRORS.START_UPLOAD_VIDEOS_MISSING_PARAMETERS);

  var params;
  var self = this;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      ids: {type: 'string', required: true},
      platform: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.START_UPLOAD_VIDEOS_WRONG_PARAMETERS);
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
 * Gets an instance of the controller associated provider.
 *
 * @method getProvider
 * @return {VideoProvider} The provider
 */
VideoController.prototype.getProvider = function() {
  return new VideoProvider(coreApi.getDatabase());
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
 * Updates a tag associated to the given media.
 *
 * If tag does not exist it is created.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1,
 *       "tag": ...
 *     }
 *
 * @method updateTagAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.body] Request multipart body
 * @param {Object} [request.body.info] Modifications to perform on the tag
 * @param {Number} [request.body.info.value] The tag time in milliseconds
 * @param {String} [request.body.info.name] The tag name
 * @param {String} [request.body.info.description] The tag description
 * @param {String} [request.body.file] The multipart file associated to the tag
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.id The media id the tag belongs to
 * @param {String} [request.params.tagid] The tag id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateTagAction = function(request, response, next) {
  if (!request.params.id) return next(HTTP_ERRORS.UPDATE_TAG_MISSING_PARAMETERS);

  var params;
  var self = this;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      tagid: {type: 'string'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UPDATE_TAG_WRONG_PARAMETERS);
  }

  var mediaId = params.id;
  var tagId = params.tagid;
  var provider = this.getProvider();

  var parser = new MultipartParser(request, [
    {
      name: 'file',
      destinationPath: process.rootPublish + '/assets/player/videos/' + mediaId + '/uploads/',
      maxCount: 1
    }
  ], {
    fileSize: 20 * 1000 * 1000
  });

  parser.parse(function(parseError) {
    if (parseError) {
      process.logger.error(parseError.message, {error: parseError, method: 'updateTagAction'});
      return next(HTTP_ERRORS.UPDATE_TAG_UPLOAD_ERROR);
    }

    if (!request.body.info) return next(HTTP_ERRORS.UPDATE_TAG_MISSING_PARAMETERS);

    var tag = JSON.parse(request.body.info);
    var file = request.files.file ? request.files.file[0] : null;
    var filter = new ResourceFilter().equal('id', mediaId);
    tag.id = tagId;

    // Make sure user has enough privilege to update the media
    provider.getOne(
      filter,
      {
        include: ['id', 'metadata']
      },
      function(getOneError, media) {
        if (getOneError) {
          process.logger.error(getOneError.message, {error: getOneError, method: 'updateTagAction'});
          return next(HTTP_ERRORS.UPDATE_TAG_GET_ONE_ERROR);
        }
        if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
          return next(HTTP_ERRORS.UPDATE_TAG_FORBIDDEN);

        provider.updateOneTag(filter, tag, file, function(updateError, total, tag) {
          if (updateError) {
            process.logger.error(updateError.message, {error: updateError, method: 'updateTagAction'});
            return next(HTTP_ERRORS.UPDATE_TAG_ERROR);
          }

          response.send({total: total, tag: tag});
        });
      }
    );
  });
};

/**
 * Updates a chapter associated to the given media.
 *
 * If chapter does not exist it is created.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1,
 *       "chapter": ...
 *     }
 *
 * @method updateChapterAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.body] Request body
 * @param {Object} [request.body.info] Modifications to perform on the chapter
 * @param {Number} [request.body.info.value] The chapter time in milliseconds
 * @param {String} [request.body.info.name] The chapter name
 * @param {String} [request.body.info.description] The chapter description
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id the chapter belongs to
 * @param {String} [request.params.chapterid] The chapter id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateChapterAction = function(request, response, next) {
  if (!request.params.id || !request.body) return next(HTTP_ERRORS.UPDATE_CHAPTER_MISSING_PARAMETERS);

  var params;
  var self = this;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      chapterid: {type: 'string'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UPDATE_CHAPTER_WRONG_PARAMETERS);
  }

  var mediaId = params.id;
  var chapterId = params.chapterid;
  var chapter = request.body;
  var provider = this.getProvider();
  var filter = new ResourceFilter().equal('id', mediaId);
  chapter.id = chapterId;

  // Make sure user has enough privilege to update the media
  provider.getOne(
    filter,
    {
      include: ['id', 'metadata']
    },
    function(getOneError, media) {
      if (getOneError) {
        process.logger.error(getOneError.message, {error: getOneError, method: 'updateChapterAction'});
        return next(HTTP_ERRORS.UPDATE_CHAPTER_GET_ONE_ERROR);
      }
      if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
        return next(HTTP_ERRORS.UPDATE_CHAPTER_FORBIDDEN);

      provider.updateOneChapter(filter, chapter, function(updateError, total, chapter) {
        if (updateError) {
          process.logger.error(updateError.message, {error: updateError, method: 'updateChapterAction'});
          return next(HTTP_ERRORS.UPDATE_CHAPTER_ERROR);
        }

        response.send({total: total, chapter: chapter});
      });
    }
  );
};

/**
 * Removes tags from a media.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1
 *     }
 *
 * @method removeTagsAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.tagsids A comma separated list of tags ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.removeTagsAction = function(request, response, next) {
  if (!request.params.id || !request.params.tagsids) return next(HTTP_ERRORS.REMOVE_TAGS_MISSING_PARAMETERS);

  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      tagsids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.REMOVE_TAGS_WRONG_PARAMETERS);
  }

  var tagsIds = params.tagsids.split(',');
  var provider = this.getProvider(request);
  var filter = new ResourceFilter().equal('id', params.id);

  // Make sure user has enough privilege to update the media
  provider.getOne(
    filter,
    {
      include: ['id', 'metadata']
    },
    function(getOneError, media) {
      if (getOneError) {
        process.logger.error(getOneError.message, {error: getOneError, method: 'removeTagsAction'});
        return next(HTTP_ERRORS.REMOVE_TAGS_GET_ONE_ERROR);
      }
      if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
        return next(HTTP_ERRORS.REMOVE_TAGS_FORBIDDEN);

      provider.removeTags(filter, tagsIds, function(updateError, total) {
        if (updateError) {
          process.logger.error(updateError.message, {error: updateError, method: 'removeTagsAction'});
          return next(HTTP_ERRORS.REMOVE_TAGS_ERROR);
        }

        response.send({total: total});
      });
    }
  );
};

/**
 * Removes chapters from a media.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1
 *     }
 *
 * @method removeChaptersAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.chaptersids A comma separated list of chapters ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.removeChaptersAction = function(request, response, next) {
  if (!request.params.id || !request.params.chaptersids) return next(HTTP_ERRORS.REMOVE_CHAPTERS_MISSING_PARAMETERS);

  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      chaptersids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.REMOVE_CHAPTERS_WRONG_PARAMETERS);
  }

  var chaptersIds = params.chaptersids.split(',');
  var provider = this.getProvider(request);
  var filter = new ResourceFilter().equal('id', params.id);

  // Make sure user has enough privilege to update the media
  provider.getOne(
    filter,
    {
      include: ['id', 'metadata']
    },
    function(getOneError, media) {
      if (getOneError) {
        process.logger.error(getOneError.message, {error: getOneError, method: 'removeChaptersAction'});
        return next(HTTP_ERRORS.REMOVE_CHAPTERS_GET_ONE_ERROR);
      }
      if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
        return next(HTTP_ERRORS.REMOVE_CHAPTERS_FORBIDDEN);

      provider.removeChapters(filter, chaptersIds, function(updateError, total) {
        if (updateError) {
          process.logger.error(updateError.message, {error: updateError, method: 'removeChaptersAction'});
          return next(HTTP_ERRORS.REMOVE_CHAPTERS_ERROR);
        }

        response.send({total: total});
      });
    }
  );
};

/**
 * Converts points of interest (chapters, tags & cut) units
 * from percents to milliseconds (depending on the video
 * duration).
 *
 * @example
 *
 *     // Response example
 *     {
 *       "entity": ...
 *     }
 *
 * @method convertPoiAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.chaptersIds A comma separated list of chapters ids to remove
 * @param {String} request.body Information to convert points of interest
 * @param {Number} request.body.duration The media duration in milliseconds
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.convertPoiAction = function(request, response, next) {
  if (!request.params.id || !request.body || !request.body.duration)
    return next(HTTP_ERRORS.CONVERT_POINTS_OF_INTEREST_MISSING_PARAMETERS);

  var params;
  var body;
  var self = this;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
    body = openVeoApi.util.shallowValidateObject(request.body, {
      duration: {type: 'number', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.CONVERT_POINTS_OF_INTEREST_WRONG_PARAMETERS);
  }

  var provider = this.getProvider();
  var duration = body.duration;
  var filter = new ResourceFilter().equal('id', params.id);

  // Get media
  provider.getOne(
    filter,
    null,
    function(getOneError, media) {
      if (getOneError) {
        process.logger.error(getOneError.message, {error: getOneError, method: 'convertPoiAction'});
        return next(HTTP_ERRORS.CONVERT_POINTS_OF_INTEREST_GET_ONE_ERROR);
      }

      // Media not ready
      if (media.state !== STATES.READY && media.state !== STATES.PUBLISHED)
        return next(HTTP_ERRORS.CONVERT_POINTS_OF_INTEREST_NOT_READY_ERROR);

      // User without enough privilege to read the media in ready state
      if (media.state === STATES.READY &&
          !self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.READ)
         ) {
        return next(HTTP_ERRORS.CONVERT_POINTS_OF_INTEREST_FORBIDDEN);
      }

      if (!media.needPointsOfInterestUnitConversion) {
        resolveResourcesUrls([media]);

        return response.send({
          entity: media
        });
      }

      var properties = ['chapters', 'tags', 'cut'];

      for (var i = 0; i < properties.length; i++) {
        if (Array.isArray(media[properties[i]])) {
          media[properties[i]].forEach(function(pointOfInterest) {
            pointOfInterest.value = Math.floor(pointOfInterest.value * duration);
          });
        } else {
          media[properties[i]] = [];
        }
      }

      delete media.needPointsOfInterestUnitConversion;

      provider.updateOne(
        filter,
        {
          chapters: media.chapters,
          cut: media.cut,
          tags: media.tags
        },
        function(updateError, total) {
          if (updateError) {
            process.logger.error(updateError.message, {error: updateError, method: 'convertPoiAction'});
            return next(HTTP_ERRORS.CONVERT_VIDEO_POI_ERROR);
          }

          resolveResourcesUrls([media]);

          response.send({
            entity: media
          });
        }
      );
    }
  );
};

/**
 * Gets the id of the super administrator.
 *
 * @method getSuperAdminId
 * @return {String} The id of the super admin
 */
VideoController.prototype.getSuperAdminId = function() {
  return process.api.getCoreApi().getSuperAdminId();
};

/**
 * Gets the id of the anonymous user.
 *
 * @method getAnonymousId
 * @return {String} The id of the anonymous user
 */
VideoController.prototype.getAnonymousId = function() {
  return process.api.getCoreApi().getAnonymousUserId();
};

/**
 * Tests if user is a contents manager.
 *
 * A contents manager can perform CRUD operations on medias.
 *
 * @method isUserManager
 * @param {Object} user The user to test
 * @param {Array} user.permissions The user's permissions
 * @return {Boolean} true if the user has permission to manage medias, false otherwise
 */
VideoController.prototype.isUserManager = function(user) {
  if (!user || !user.permissions) return false;

  for (var i = 0; i < user.permissions.length; i++) {
    if (user.permissions[i] === 'publish-manage-videos') return true;
  }
  return false;
};

/**
 * Adds medias.
 *
 * It is not possible to add several medias at a time.
 *
 * @method addEntitiesAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 * @throws {Error} Function is not implemented for this controller
 */
VideoController.prototype.addEntitiesAction = function(request, response, next) {
  throw new Error('addEntitiesAction method not available for medias');
};
