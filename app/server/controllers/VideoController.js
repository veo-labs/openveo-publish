'use strict';

/**
 * @module publish/controllers/VideoController
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var url = require('url');
var async = require('async');
var openVeoApi = require('@openveo/api');
var coreApi = process.api.getCoreApi();
var fileSystemApi = openVeoApi.fileSystem;
var configDir = fileSystemApi.getConfDir();
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var PoiProvider = process.requirePublish('app/server/providers/PoiProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var mediaPlatformFactory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
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
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about ContentController
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
 * @static
 * @private
 * @memberof module:publish/controllers/VideoController~VideoController
 * @param {Array} medias The list of medias
 */
function resolveResourcesUrls(medias) {
  var cdnUrl = coreApi.getCdnUrl();
  var wowzaStreamPath = platforms[TYPES.WOWZA] && platforms[TYPES.WOWZA].streamPath &&
      (new url.URL(platforms[TYPES.WOWZA].streamPath)).href;
  var removeFirstSlashRegExp = new RegExp(/^\//);

  if (medias && medias.length) {
    medias.forEach(function(media) {

      // Timecodes
      if (media.timecodes) {
        media.timecodes.forEach(function(timecode) {
          if (timecode.image) {
            if (timecode.image.small)
              timecode.image.small.url = cdnUrl + timecode.image.small.url.replace(removeFirstSlashRegExp, '');

            if (timecode.image.large)
              timecode.image.large = cdnUrl + timecode.image.large.replace(removeFirstSlashRegExp, '');
          }
        });
      }

      // Tags
      if (media.tags) {
        media.tags.forEach(function(tag) {
          if (tag.file && tag.file.url)
            tag.file.url = cdnUrl + tag.file.url.replace(removeFirstSlashRegExp, '');
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

      // Wowza videos links are relative to the streamPath defined in configuration
      if (media.type === TYPES.WOWZA && media.sources) {
        media.sources.forEach(function(source) {
          if (source.adaptive) {
            source.adaptive.forEach(function(adaptiveSource) {
              if (adaptiveSource.link)
                adaptiveSource.link = wowzaStreamPath + adaptiveSource.link;
            });
          }
        });
      }

    });
  }
}

/**
 * Updates a point of interest associated to the given media.
 *
 * If point of interest does not exist it is created.
 *
 * @example
 * // Response example
 * {
 *   "total": 1,
 *   "poi": ...
 * }
 *
 * @memberof module:publish/controllers/VideoController~VideoController
 * @this module:publish/controllers/VideoController~VideoController
 * @private
 * @param {String} type The type of point of interest (either 'tags' or 'chapters')
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.body] Request multipart body
 * @param {Object} [request.body.info] Point of interest information
 * @param {Number} [request.body.info.value] The point of interest time in milliseconds
 * @param {String} [request.body.info.name] The point of interest name
 * @param {String} [request.body.info.description] The point of interest description
 * @param {String} [request.body.file] The multipart file associated to the point of interest
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.id The media id the point of interest belongs to
 * @param {String} [request.params.poiid] The point of interest id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
function updatePoiAction(type, request, response, next) {
  if (!request.params.id) return next(HTTP_ERRORS.UPDATE_POI_MISSING_PARAMETERS);

  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      poiid: {type: 'string'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.UPDATE_POI_WRONG_PARAMETERS);
  }

  var media;
  var poi;
  var mediaId = params.id;
  var totalUpdatedPois = 0;
  var poiId = params.poiid;
  var provider = this.getProvider();
  var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', mediaId, 'uploads');
  var mediaFilter = new ResourceFilter().equal('id', mediaId);

  async.series([

    // Parse body multipart data
    function(callback) {
      var parser = new MultipartParser(request, [
        {
          name: 'file',
          destinationPath: poiFileDestinationPath,
          maxCount: 1
        }
      ], {
        fileSize: 20 * 1000 * 1000
      });

      parser.parse(function(parseError) {
        if (parseError) {
          process.logger.error(parseError.message, {error: parseError, method: 'updatePoiAction'});
          return callback(HTTP_ERRORS.UPDATE_POI_UPLOAD_ERROR);
        }

        if (!request.body.info) return callback(HTTP_ERRORS.UPDATE_POI_MISSING_PARAMETERS);

        var file = request.files.file ? request.files.file[0] : null;

        try {
          poi = openVeoApi.util.shallowValidateObject(JSON.parse(request.body.info), {
            value: {type: 'number'},
            name: {type: 'string'},
            description: {type: 'string'}
          });
        } catch (error) {
          return callback(HTTP_ERRORS.UPDATE_POI_WRONG_PARAMETERS);
        }

        if (file) {
          poi.file = {
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileName: file.filename,
            size: file.size,
            path: file.path
          };
          poi.file.url = provider.getPoiFilePath(mediaId, poi.file);
        } else {
          poi.file = null;
        }

        callback();
      });
    },

    // Fetch media and make sure user has enough privilege to update the media
    function(callback) {
      provider.getOne(
        mediaFilter,
        {
          include: ['id', 'metadata', type]
        },
        function(getOneError, fetchedMedia) {
          media = fetchedMedia;
          if (getOneError) {
            process.logger.error(getOneError.message, {error: getOneError, method: 'updatePoiAction'});
            return callback(HTTP_ERRORS.UPDATE_POI_GET_ONE_ERROR);
          }
          if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
            return callback(HTTP_ERRORS.UPDATE_POI_FORBIDDEN);

          callback();
        }
      );
    },

    // Create / update point of interest
    function(callback) {
      var poiProvider = new PoiProvider(coreApi.getDatabase());

      if (poiId) {

        // Point of interest already exists
        // Update it
        poiProvider.updateOne(new ResourceFilter().equal('id', poiId), poi, function(updateError, total) {
          if (updateError) {
            process.logger.error(updateError.message, {error: updateError, method: 'updatePoiAction'});
            return callback(HTTP_ERRORS.UPDATE_POI_UPDATE_ERROR);
          }
          totalUpdatedPois = total;
          callback();
        });

      } else {

        // Point of interest does not exist
        // Create it
        poiProvider.add([poi], function(createError, total, pois) {
          if (createError) {
            process.logger.error(createError.message, {error: createError, method: 'updatePoiAction'});
            return callback(HTTP_ERRORS.UPDATE_POI_CREATE_ERROR);
          }
          poiId = pois[0].id;
          totalUpdatedPois = total;
          callback();
        });

      }

    },

    // Add point of interest to the media if not already associated to it
    function(callback) {
      if (media[type] && media[type].indexOf(poiId) !== -1) return callback();

      var data = {};
      data[type] = media[type] || [];
      data[type].push(poiId);
      provider.updateOne(mediaFilter, data, function(updateMediaError, total) {
        if (updateMediaError) {
          process.logger.error(updateMediaError.message, {error: updateMediaError, method: 'updatePoiAction'});
          return callback(HTTP_ERRORS.UPDATE_POI_UPDATE_MEDIA_ERROR);
        }
        callback();
      });
    }

  ], function(error) {
    if (error) return next(error);
    poi.id = poiId;
    response.send({total: totalUpdatedPois, poi: poi});
  });
}

/**
 * Removes points of interest from a media.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "total": 1
 *     }
 *
 * @memberof module:publish/controllers/VideoController~VideoController
 * @this module:publish/controllers/VideoController~VideoController
 * @private
 * @param {String} type The type of points of interest (either 'tags' or 'chapters')
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.poiids A comma separated list of points of interest ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
function removePoisAction(type, request, response, next) {
  if (!request.params.id || !request.params.poiids) return next(HTTP_ERRORS.REMOVE_POIS_MISSING_PARAMETERS);

  var self = this;
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true},
      poiids: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.REMOVE_POIS_WRONG_PARAMETERS);
  }

  var media;
  var totalRemovedPois = 0;
  var poiIds = params.poiids.split(',');
  var provider = this.getProvider(request);
  var mediaFilter = new ResourceFilter().equal('id', params.id);

  async.series([

    // Fetch the media and make sure user has enough privilege to update the media
    function(callback) {
      provider.getOne(
        mediaFilter,
        {
          include: ['id', 'metadata', type]
        },
        function(getOneError, fetchedMedia) {
          media = fetchedMedia;
          if (getOneError) {
            process.logger.error(getOneError.message, {error: getOneError, method: 'removePoisAction'});
            return callback(HTTP_ERRORS.REMOVE_POIS_GET_ONE_ERROR);
          }
          if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.UPDATE))
            return callback(HTTP_ERRORS.REMOVE_POIS_FORBIDDEN);

          callback();
        }
      );
    },

    // Remove points of interest
    function(callback) {
      var poiProvider = new PoiProvider(coreApi.getDatabase());

      poiProvider.remove(new ResourceFilter().in('id', poiIds), function(removeError, total) {
        if (removeError) {
          process.logger.error(removeError.message, {error: removeError, method: 'removePoisAction'});
          return callback(HTTP_ERRORS.REMOVE_POIS_REMOVE_ERROR);
        }
        totalRemovedPois = total;
        callback();
      });
    },

    // Remove points of interest from the media
    function(callback) {
      var poisIdsToKeep = media[type].filter(function(poiId) {
        return poiIds.indexOf(poiId) === -1;
      });

      var data = {};
      data[type] = poisIdsToKeep;
      provider.updateOne(mediaFilter, data, function(updateMediaError, total) {
        if (updateMediaError) {
          process.logger.error(updateMediaError.message, {error: updateMediaError, method: 'removePoisAction'});
          return callback(HTTP_ERRORS.REMOVE_POIS_UPDATE_MEDIA_ERROR);
        }
        callback();
      });
    }

  ], function(error) {
    if (error) return next(error);
    response.send({total: totalRemovedPois});
  });

}

/**
 * Replaces media chapters ids and tags ids by detailed points of interest.
 *
 * @memberof module:publish/controllers/VideoController~VideoController
 * @this module:publish/controllers/VideoController~VideoController
 * @private
 * @param {Object} media The media to populate
 * @param {Array} media.chapters The media chapters
 * @param {Array} media.tags The media tags
 * @param {Function} callback Function to call when media has been populated
 */
function populateMediaWithPois(media, callback) {
  var poisIds = (media.chapters || []).concat(media.tags || []);
  if (!poisIds.length) return callback();

  var poiProvider = new PoiProvider(coreApi.getDatabase());
  poiProvider.getAll(
    new ResourceFilter().in('id', poisIds),
    {
      exclude: ['_id']
    },
    {
      id: 'desc'
    },
    function(getPoisError, fetchedPois) {
      var pois = fetchedPois || [];

      if (getPoisError) {
        return callback(getPoisError);
      }

      if (media.tags) {
        media.tags = pois.filter(function(poi) {
          if (poi.file) delete poi.file.path;
          return media.tags.indexOf(poi.id) !== -1;
        });
      }

      if (media.chapters) {
        media.chapters = pois.filter(function(poi) {
          if (poi.file) delete poi.file.path;
          return media.chapters.indexOf(poi.id) !== -1;
        });
      }

      callback();
    }
  );
}

/**
 * Updates the given media with corresponding information from its video platform.
 *
 * If information from the video platform have already been fetched for this media this does nothing.
 *
 * @memberof module:publish/controllers/VideoController~VideoController
 * @this module:publish/controllers/VideoController~VideoController
 * @private
 * @param {Object} media The media to update
 * @param {String} media.id The media id
 * @param {String} media.type The id of the associated media platform
 * @param {Array} media.mediaId The list of medias in the media platform. Could have several media ids if media has
 * multiple sources
 * @param {Boolan} media.available true if the media is available, false otherwise, if true information from the video
 * platform have already been fetched then this does nothing
 * @param {Array} media.sources The list of media sources
 * @param {Function} callback Function to call when media has been updated
 */
function updateMediaWithPlatformInfo(media, callback) {
  if (
    !media.type ||
    !media.mediaId ||
    (media.available &&
      (
        media.sources.length == media.mediaId.length ||
        media.type === TYPES.YOUTUBE
      )
    )
  ) {

    // Info from video platform already retrieved for this media
    return callback();

  }

  // Get information about the media from the medias platform
  var mediaPlatformProvider = mediaPlatformFactory.get(media.type, platforms[media.type]);
  var expectedDefinition = media.metadata['profile-settings']['video-height'];

  // Compatibility with old mediaId format
  var mediaId = !Array.isArray(media.mediaId) ? [media.mediaId] : media.mediaId;
  var provider = this.getProvider();

  // Get media availability and sources
  mediaPlatformProvider.getMediaInfo(mediaId, expectedDefinition, function(error, info) {
    if (error) return callback(error);

    media.available = info.available;
    media.sources = info.sources;

    provider.updateOne(new ResourceFilter().equal('id', media.id), info, callback);
  });
}

/**
 * Displays video player template.
 *
 * Checks first if the video id is valid and if the video is published
 * before returning the template.
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.displayVideoAction = function(request, response, next) {
  var publishPlugin;
  var plugins = process.api.getPlugins();
  response.locals.scripts = [];
  response.locals.css = [];
  response.locals.languages = ['"en"', '"fr"'];

  plugins.forEach(function(subPlugin) {
    if (subPlugin.name === 'publish')
      publishPlugin = subPlugin;
  });

  if (publishPlugin) {
    if (publishPlugin.custom) {
      var customScripts = publishPlugin.custom.scriptFiles;
      var playerScripts = customScripts.publishPlayer;

      // Custom scripts
      if (customScripts && customScripts.base) {
        response.locals.scripts = response.locals.scripts.concat(customScripts.base.map(function(customScript) {
          return path.join(publishPlugin.mountPath, customScript);
        }));
      }

      // Custom player scripts
      if (playerScripts && playerScripts[env]) {
        response.locals.scripts = response.locals.scripts.concat(playerScripts[env].map(function(playerScript) {
          return path.join(publishPlugin.mountPath, playerScript);
        }));
      }

      // Custom CSS
      if (publishPlugin.custom.cssFiles) {
        response.locals.css = response.locals.css.concat(
          publishPlugin.custom.cssFiles.map(function(cssFile) {
            return path.join(publishPlugin.mountPath, cssFile);
          })
        );
      }

    }
    response.render('player', response.locals);
  } else
    next();
};

/**
 * Gets all media platforms available.
 *
 * @example
 * {
 *   "platforms" : [
 *     ...
 *   ]
 * }
 *
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
 * // Response example
 * {
 *   "entity" : {
 *     "id": ..., // The media id
 *     "state": ..., // The media state
 *     "date": ..., // The media published date as a timestamp
 *     "type": ..., // The video associated platform
 *     "errorCode": ..., // The media error code or -1 if no error
 *     "category": ..., // The media category
 *     "properties": {...}, // The media custom properties
 *     "link": ..., // The media URL
 *     "mediaId": [...], // The media id on the video platform
 *     "available": ..., // The media availability on the video platform
 *     "thumbnail": ..., // The media thumbnail URL
 *     "title": ..., // The media title
 *     "leadParagraph": ..., // The media lead paragraph
 *     "description": ..., // The media description
 *     "chapters": [...], // The media chapters
 *     "tags": [...], // The media tags
 *     "cut": [...], // The media begin and end cuts
 *     "timecodes": [...], // The media associated images
 *   }
 * }
 *
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

  try {
    params = openVeoApi.util.shallowValidateObject(request.params, {
      id: {type: 'string', required: true}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_VIDEO_READY_WRONG_PARAMETERS);
  }

  var media;
  var provider = this.getProvider();

  async.series([

    // Get video
    function(callback) {
      provider.getOne(
        new ResourceFilter().equal('id', params.id),
        null,
        function(getOneError, fetchedMedia) {
          media = fetchedMedia;

          if (getOneError) {
            process.logger.error(getOneError.message, {error: getOneError, method: 'getVideoReadyAction'});
            return callback(HTTP_ERRORS.GET_VIDEO_READY_ERROR);
          }

          if (!media) {
            process.logger.warn('Not found', {method: 'getVideoReadyAction', entity: params.id});
            return callback(HTTP_ERRORS.GET_VIDEO_READY_NOT_FOUND);
          }

          // Media not ready
          if (media.state !== STATES.READY && media.state !== STATES.PUBLISHED)
            return callback(HTTP_ERRORS.GET_VIDEO_READY_NOT_READY_ERROR);

          // User without enough privilege to read the media in ready state
          if (media.state === STATES.READY &&
            !self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.READ)
          ) {
            return callback(HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN);
          }

          callback();
        }
      );
    },

    // Populate media with points of interest
    function(callback) {
      populateMediaWithPois(media, function(populateError) {
        if (populateError) {
          process.logger.error(populateError.message, {error: populateError, method: 'getVideoReadyAction'});
          return callback(HTTP_ERRORS.GET_VIDEO_READY_POPULATE_WITH_POIS_ERROR);
        }
        callback();
      });
    },

    // Update media with information from the video platform
    function(callback) {
      updateMediaWithPlatformInfo.call(self, media, function(error) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'getVideoReadyAction'});
          return callback(HTTP_ERRORS.GET_VIDEO_READY_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR);
        }
        callback();
      });
    }

  ], function(error) {
    if (error) return next(error);

    resolveResourcesUrls([media]);
    return response.send({
      entity: media
    });
  });
};

/**
 * Gets a media.
 *
 * @example
 * // Response example
 * {
 *   "entity" : {
 *     "id": ..., // The media id
 *     "state": ..., // The media state
 *     "date": ..., // The media published date as a timestamp
 *     "type": ..., // The video associated platform
 *     "errorCode": ..., // The media error code or -1 if no error
 *     "category": ..., // The media category
 *     "properties": {...}, // The media custom properties
 *     "link": ..., // The media URL
 *     "mediaId": [...], // The media id on the video platform
 *     "available": ..., // The media availability on the video platform
 *     "thumbnail": ..., // The media thumbnail URL
 *     "title": ..., // The media title
 *     "leadParagraph": ..., // The media lead paragraph
 *     "description": ..., // The media description
 *     "chapters": [...], // The media chapters
 *     "tags": [...], // The media tags
 *     "cut": [...], // The media begin and end cuts
 *     "timecodes": [...], // The media associated images
 *   }
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The id of the media to retrieve
 * @param {Object} request.query Request query
 * @param {(String|Array)} [request.query.include] The list of fields to include from returned media
 * @param {(String|Array)} [request.query.exclude] The list of fields to exclude from returned media. Ignored if
 * include is also specified.
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.getEntityAction = function(request, response, next) {
  if (!request.params.id) return next(HTTP_ERRORS.GET_MEDIA_MISSING_PARAMETERS);

  var entityId = request.params.id;
  var provider = this.getProvider();
  var self = this;
  var query;
  var fields;
  var media;
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

  async.series([

    // Fetch media and make sure user has enough privilege to read it
    function(callback) {
      provider.getOne(
        new ResourceFilter().equal('id', entityId),
        fields,
        function(error, fetchedMedia) {
          media = fetchedMedia;

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

          callback();
        }
      );
    },

    // Get media points of interest
    function(callback) {
      populateMediaWithPois(media, function(populateError) {
        if (populateError) {
          process.logger.error(populateError.message, {error: populateError, method: 'getEntityAction'});
          return callback(HTTP_ERRORS.GET_MEDIA_POPULATE_WITH_POIS_ERROR);
        }
        callback();
      });
    },

    // Update media with information from the video platform
    function(callback) {
      updateMediaWithPlatformInfo.call(self, media, function(error) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'getEntityAction'});
          return callback(HTTP_ERRORS.GET_MEDIA_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR);
        }
        callback();
      });
    }

  ], function(error) {
    if (error) return next(error);

    resolveResourcesUrls([media]);

    return response.send({
      entity: media
    });
  });
};

/**
 * Adds a media.
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body The media information as multipart body
 * @param {Object} [request.body.file] The media file as multipart data
 * @param {Object} [request.body.thumbnail] The media thumbnail as multipart data
 * @param {Object} request.body.info The media information
 * @param {String} request.body.info.title The media title
 * @param {Object} [request.body.info.properties] The media custom properties values with property id as keys
 * @param {String} [request.body.info.category] The media category id it belongs to
 * @param {(Date|Number|String)} [request.body.info.date] The media date
 * @param {String} [request.body.info.leadParagraph] The media lead paragraph
 * @param {String} [request.body.info.description] The media description
 * @param {Array} [request.body.info.groups] The media content groups it belongs to
 * @param {String} [request.body.info.platform] The platform to upload the file to
 * @param {String} [request.body.info.user] The id of the OpenVeo user to use as the video owner
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.addEntityAction = function(request, response, next) {
  if (!request.body) return next(HTTP_ERRORS.ADD_MEDIA_MISSING_PARAMETERS);

  var self = this;
  var mediaId;
  var categoriesIds;
  var groupsIds;
  var customProperties;
  var params;
  var mediaPackageType;
  var parser = new MultipartParser(request, [
    {
      name: 'file',
      destinationPath: publishConf.videoTmpDir,
      maxCount: 1,
      unique: true
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
    }

  ], function(error) {
    if (error) return next(error);

    async.series([

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
      },

      // Validate file
      function(callback) {
        if (!request.files || !request.files.file || !request.files.file.length)
          return callback(HTTP_ERRORS.ADD_MEDIA_MISSING_FILE_PARAMETER);

        openVeoApi.util.validateFiles({
          file: request.files.file[0].path,
          validateExtension: true
        }, {
          file: {in: [fileSystemApi.FILE_TYPES.MP4, fileSystemApi.FILE_TYPES.TAR, fileSystemApi.FILE_TYPES.ZIP]}
        }, function(validateError, files) {
          if (validateError || (files.file && !files.file.isValid)) {
            if (validateError)
              process.logger.error(validateError.message, {error: validateError, method: 'addEntityAction'});

            callback(HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER);
          } else {
            mediaPackageType = files.file.type;
            callback();
          }
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
            groups: {type: 'array<string>', in: groupsIds},
            user: {type: 'string'}
          };

          if (request.body.info.category)
            validationDescriptor.category = {type: 'string', in: categoriesIds};

          if (request.body.info.platform)
            validationDescriptor.platform = {type: 'string', in: Object.keys(platforms)};

          params = openVeoApi.util.shallowValidateObject(request.body.info, validationDescriptor);

        } catch (validationError) {
          process.logger.error(validationError.message, {error: validationError, method: 'addEntityAction'});
          return callback(HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS);
        }

        callback();
      },

      // Make sure that user exists
      function(callback) {
        if (!params.user) return callback();

        coreApi.userProvider.getOne(new ResourceFilter().equal('id', params.user), null, function(error, fetchedUser) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_VERIFY_OWNER_ERROR);
          } else if (!fetchedUser) {
            process.logger.error('User "' + params.user + '" does not exist', {method: 'addEntityAction'});
            return callback(HTTP_ERRORS.ADD_MEDIA_WRONG_USER_PARAMETER);
          }

          callback();
        });
      },

      // Add new media
      function(callback) {
        var pathDescriptor = path.parse(request.files.file[0].path);
        var publishManager = self.getPublishManager();

        var listener = function(mediaPackage) {
          if (mediaPackage.originalPackagePath === request.files.file[0].path) {
            mediaId = mediaPackage.id;
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
          user: params.user || (request.user.type === 'oAuthClient' ? coreApi.getSuperAdminId() : request.user.id),
          properties: request.body.info.properties,
          packageType: mediaPackageType,
          type: params.platform
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
      } else response.send({id: mediaId});
    });
  });
};

/**
 * Updates a media.
 *
 * @example
 * // Response example
 * {
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {String} request.params.id Id of the media to update
 * @param {Object} request.body The media information as multipart body
 * @param {Object} [request.body.thumbnail] The media thumbnail as multipart data
 * @param {Object} request.body.info The media information
 * @param {String} [request.body.info.title] The media title
 * @param {Object} [request.body.info.properties] The media custom properties values with property id as keys
 * @param {String} [request.body.info.category] The media category id it belongs to
 * @param {(Date|Number|String)} [request.body.info.date] The media date
 * @param {String} [request.body.info.leadParagraph] The media lead paragraph
 * @param {String} [request.body.info.description] The media description
 * @param {Array} [request.body.info.groups] The media content groups it belongs to
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateEntityAction = function(request, response, next) {
  if (!request.body || !request.params.id) return next(HTTP_ERRORS.UPDATE_MEDIA_MISSING_PARAMETERS);

  var media;
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
          new ResourceFilter().equal('id', mediaId), null, function(error, fetchedMedia) {
            if (error) {
              process.logger.error(error.message, {error: error, method: 'updateEntityAction'});
              return callback(HTTP_ERRORS.UPDATE_MEDIA_GET_ONE_ERROR);
            }

            if (!fetchedMedia) return callback(HTTP_ERRORS.UPDATE_MEDIA_NOT_FOUND_ERROR);

            media = fetchedMedia;

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
      },

      // Synchronize the media with the media platform
      function(callback) {
        if (!media.type || !media.mediaId) return callback();

        var mediaPlatformProvider = mediaPlatformFactory.get(media.type, platforms[media.type]);

        mediaPlatformProvider.update(media, info, false, function(error) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'updateEntityAction', entity: mediaId});
            return callback(HTTP_ERRORS.UPDATE_MEDIA_SYNCHRONIZE_ERROR);
          }

          callback();
        });
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
 * // Response example
 * {
 *   "entities" : [ ... ],
 *   "pagination" : {
 *     "limit": ..., // The limit number of medias by page
 *     "page": ..., // The actual page
 *     "pages": ..., // The total number of pages
 *     "size": ... // The total number of medias
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.query Request's query parameters
 * @param {String} [request.query.query] To search on both medias title and description
 * @param {Number} [request.query.useSmartSearch=1] 1 to use a more advanced search mechanism, 0 to use a simple search
 * based on a regular expression
 * @param {Number} [request.query.searchInPois=0] 1 to also search in points of interest (tags / chapters) titles and
 * descriptions when useSmartSearch is set to 1
 * @param {(String|Array)} [request.query.include] The list of fields to include from returned medias
 * @param {(String|Array)} [request.query.exclude] The list of fields to exclude from returned medias. Ignored if
 * include is also specified.
 * @param {(String|Array)} [request.query.states] To filter medias by state
 * @param {String} [request.query.dateStart] To filter medias after or equal to a date (in format mm/dd/yyyy)
 * @param {String} [request.query.dateEnd] To get medias before a date (in format mm/dd/yyyy)
 * @param {(String|Array)} [request.query.categories] To filter medias by category
 * @param {(String|Array)} [request.query.groups] To filter medias by group
 * @param {(String|Array)} [request.query.user] To filter medias by user
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
  var poiProvider = new PoiProvider(coreApi.getDatabase());
  var orderedProperties = ['title', 'description', 'date', 'state', 'views', 'category'];

  try {
    params = openVeoApi.util.shallowValidateObject(request.query, {
      query: {type: 'string'},
      useSmartSearch: {type: 'number', in: [0, 1], default: 1},
      searchInPois: {type: 'number', in: [0, 1], default: 0},
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

  // Build filter
  var filter = new ResourceFilter();
  var querySearchFilters = [];

  // Add search query
  if (params.query) {
    if (params.useSmartSearch) {
      querySearchFilters.push(new ResourceFilter().search('"' + params.query + '"'));
      sort['score'] = 'score';
    } else {
      var queryRegExp = new RegExp(openVeoApi.util.escapeTextForRegExp(params.query), 'i');
      filter.or([
        new ResourceFilter().regex('title', queryRegExp),
        new ResourceFilter().regex('description', queryRegExp)
      ]);
    }
  }

  // Sort
  sort[params.sortBy] = params.sortOrder;

  // Add states
  if (params.states && params.states.length) filter.in('state', params.states);

  // Add groups
  if (params.groups && params.groups.length) filter.in('metadata.groups', params.groups);

  // Add owner
  if (params.user && params.user.length) filter.in('metadata.user', params.user);

  // Add date
  if (params.dateStart) filter.greaterThanEqual('date', params.dateStart);
  if (params.dateEnd) filter.lesserThanEqual('date', params.dateEnd);

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
                  validationDescriptor[properties[j].id] = {type: 'number', in: [0, 1], required: true};

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
                  } else if (properties[j].type === PropertyProvider.TYPES.BOOLEAN) {
                    filter.equal('properties.' + properties[j].id, Boolean(validatedProperty[properties[j].id]));
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

    // Validate categories
    function(callback) {
      if (!params.categories || !params.categories.length) return callback();

      coreApi.taxonomyProvider.getTaxonomyTerms('categories', function(error, terms) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
          return callback(HTTP_ERRORS.GET_VIDEOS_GET_CATEGORIES_ERROR);
        }

        var categories = [];
        params.categories.forEach(function(category) {
          categories = categories.concat(
            openVeoApi.util.getPropertyFromArray('id', terms, 'items', category),
            [category]
          );
        });

        filter.in('category', categories);
        callback();
      });
    },

    // Get the list of points of interest matching the query
    function(callback) {
      if (!params.query || !params.useSmartSearch || !params.searchInPois) return callback();

      var poisSort = {};
      poisSort['score'] = 'score';
      poiProvider.getAll(
        new ResourceFilter().search('"' + params.query + '"'),
        {
          include: ['id']
        },
        poisSort,
        function(error, fetchedPois) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
            return callback(HTTP_ERRORS.GET_VIDEOS_SEARCH_IN_POIS_ERROR);
          }

          var matchingPoisIds = fetchedPois.map(function(fetchedPoi) {
            return fetchedPoi.id;
          });
          querySearchFilters.push(new ResourceFilter().in('chapters', matchingPoisIds));
          querySearchFilters.push(new ResourceFilter().in('tags', matchingPoisIds));
          callback();
        }
      );
    },

    // Get the list of medias
    function(callback) {
      if (params.query && params.useSmartSearch) filter.or(querySearchFilters);

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
    },

    // Populate medias with points of interest
    function(callback) {
      var asyncFunctions = [];

      medias.forEach(function(media) {
        asyncFunctions.push(function(asyncCallback) {
          populateMediaWithPois(media, asyncCallback);
        });
      });
      async.parallel(asyncFunctions, function(populateError) {
        if (populateError) {
          process.logger.error(populateError.message, {error: populateError, method: 'getEntitiesAction'});
          return callback(HTTP_ERRORS.GET_VIDEOS_POPULATE_WITH_POIS_ERROR);
        }
        callback();
      });
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
 * // Response example
 * {
 *   "total": 42
 * }
 *
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
            new ResourceFilter().equal('id', media.id).equal('state', STATES.READY),
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
 * // Response example
 * {
 *   "total": 42
 * }
 *
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
            new ResourceFilter().equal('id', media.id).equal('state', STATES.PUBLISHED),
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
 * @return {module:publish/providers/VideoProvider~VideoProvider} The provider
 */
VideoController.prototype.getProvider = function() {
  return new VideoProvider(coreApi.getDatabase());
};

/**
 * Gets PublishManager singleton.
 *
 * @return {module:publish/PublishManager~PublishManager} The PublishManager singleton
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
 * // Response example
 * {
 *   "total": 1,
 *   "poi": ...
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.body] Request multipart body
 * @param {Object} [request.body.info] Modifications to perform on the tag
 * @param {Number} [request.body.info.value] The tag time in milliseconds
 * @param {String} [request.body.info.name] The tag name
 * @param {String} [request.body.info.description] The tag description
 * @param {String} [request.body.file] The multipart file associated to the tag
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.id The media id the tag belongs to
 * @param {String} [request.params.poiid] The tag id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateTagAction = function(request, response, next) {
  updatePoiAction.call(this, 'tags', request, response, next);
};

/**
 * Updates a chapter associated to the given media.
 *
 * If chapter does not exist it is created.
 *
 * @example
 * // Response example
 * {
 *   "total": 1,
 *   "poi": ...
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.body] Request body
 * @param {Object} [request.body.info] Modifications to perform on the chapter
 * @param {Number} [request.body.info.value] The chapter time in milliseconds
 * @param {String} [request.body.info.name] The chapter name
 * @param {String} [request.body.info.description] The chapter description
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id the chapter belongs to
 * @param {String} [request.params.poiid] The chapter id
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.updateChapterAction = function(request, response, next) {
  updatePoiAction.call(this, 'chapters', request, response, next);
};

/**
 * Removes tags from a media.
 *
 * @example
 * // Response example
 * {
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.poiids A comma separated list of tags ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.removeTagsAction = function(request, response, next) {
  removePoisAction.call(this, 'tags', request, response, next);
};

/**
 * Removes chapters from a media.
 *
 * @example
 * // Response example
 * {
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.params.poiids A comma separated list of chapters ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.removeChaptersAction = function(request, response, next) {
  removePoisAction.call(this, 'chapters', request, response, next);
};

/**
 * Converts points of interest (chapters, tags & cut) units
 * from percents to milliseconds (depending on the video
 * duration).
 *
 * @example
 * // Response example
 * {
 *   "entity": ...
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id The media id
 * @param {String} request.body Information to convert points of interest
 * @param {Number} request.body.duration The media duration in milliseconds
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.convertPoiAction = function(request, response, next) {
  if (!request.params.id || !request.body || !request.body.duration)
    return next(HTTP_ERRORS.CONVERT_POIS_MISSING_PARAMETERS);

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
    return next(HTTP_ERRORS.CONVERT_POIS_WRONG_PARAMETERS);
  }

  var pois;
  var media;
  var provider = this.getProvider();
  var poiProvider = new PoiProvider(coreApi.getDatabase());
  var duration = body.duration;
  var filter = new ResourceFilter().equal('id', params.id);
  var convertToMilliseconds = function(percent) {
    return Math.floor(percent * duration);
  };

  async.series([

    // Get media and make sure user has enought privilege to read it
    function(callback) {
      provider.getOne(filter, null, function(getOneError, fetchedMedia) {
        media = fetchedMedia;

        if (getOneError) {
          process.logger.error(getOneError.message, {error: getOneError, method: 'convertPoiAction'});
          return callback(HTTP_ERRORS.CONVERT_POIS_GET_MEDIA_ERROR);
        }

        // Media not ready
        if (media.state !== STATES.READY && media.state !== STATES.PUBLISHED)
          return callback(HTTP_ERRORS.CONVERT_POIS_MEDIA_NOT_READY_ERROR);

        // User without enough privilege to read the media in ready state
        if (media.state === STATES.READY &&
          !self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.READ)
        ) {
          return callback(HTTP_ERRORS.CONVERT_POIS_FORBIDDEN);
        }

        callback();
      });
    },

    // Get media points of interest
    function(callback) {
      var poisIds = (media.chapters || []).concat(media.tags || []);
      if (!poisIds.length) return callback();

      poiProvider.getAll(
        new ResourceFilter().in('id', poisIds),
        {
          include: ['id', 'value']
        },
        {
          id: 'desc'
        },
        function(getPoisError, fetchedPois) {
          pois = fetchedPois;

          if (getPoisError) {
            process.logger.error(getPoisError.message, {error: getPoisError, method: 'convertPoiAction'});
            return callback(HTTP_ERRORS.CONVERT_POIS_GET_POIS_ERROR);
          }

          callback();
        }
      );
    },

    // Convert points of interest
    function(callback) {
      if (!media.needPointsOfInterestUnitConversion || !pois) return callback();
      var asyncFunctions = [];

      pois.forEach(function(poi) {
        asyncFunctions.push(function(callback) {
          poi.value = convertToMilliseconds(poi.value);
          poiProvider.updateOne(
            new ResourceFilter().equal('id', poi.id),
            {
              value: poi.value
            },
            callback
          );
        });
      });

      async.parallel(asyncFunctions, function(error) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'convertPoiAction'});
          return callback(HTTP_ERRORS.CONVERT_POIS_UPDATE_POI_ERROR);
        }
        callback();
      });
    },

    // Convert cuts
    function(callback) {
      if (!media.needPointsOfInterestUnitConversion || !media.cut) return callback();

      media.cut[0].value = convertToMilliseconds(media.cut[0].value);
      media.cut[1].value = convertToMilliseconds(media.cut[1].value);

      provider.updateOne(
        filter,
        {
          cut: media.cut,
          needPointsOfInterestUnitConversion: false
        },
        function(updateError, total) {
          if (updateError) {
            process.logger.error(updateError.message, {error: updateError, method: 'convertPoiAction'});
            return next(HTTP_ERRORS.CONVERT_POIS_UPDATE_MEDIA_ERROR);
          }
          media.needPointsOfInterestUnitConversion = false;

          callback();
        }
      );
    }

  ], function(error) {
    if (error) return next(error);

    if (pois) {
      media.chapters = pois.filter(function(poi) {
        if (poi.file) delete poi.file.path;
        return media.chapters && media.chapters.indexOf(poi.id) !== -1;
      });
      media.tags = pois.filter(function(poi) {
        if (poi.file) delete poi.file.path;
        return media.tags && media.tags.indexOf(poi.id) !== -1;
      });
    }
    resolveResourcesUrls([media]);

    return response.send({
      entity: media
    });
  });
};

/**
 * Gets the id of the super administrator.
 *
 * @return {String} The id of the super admin
 */
VideoController.prototype.getSuperAdminId = function() {
  return process.api.getCoreApi().getSuperAdminId();
};

/**
 * Gets the id of the anonymous user.
 *
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
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 * @throws {Error} Function is not implemented for this controller
 */
VideoController.prototype.addEntitiesAction = function(request, response, next) {
  throw new Error('addEntitiesAction method not available for medias');
};

/**
 * Removes medias.
 *
 * User must have permission to remove the medias. If user doesn't have permission to remove a particular media an
 * HTTP forbidden error will be sent as response.
 * Only medias in a stable state can be removed.
 *
 * @example
 * // Response example
 * {
 *   "total": 42
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request parameters
 * @param {String} request.params.id A comma separated list of media ids to remove
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
VideoController.prototype.removeEntitiesAction = function(request, response, next) {
  if (request.params.id) {
    var self = this;
    var mediaIds = request.params.id.split(',');
    var stableStates = [
      STATES.ERROR,
      STATES.WAITING_FOR_UPLOAD,
      STATES.READY,
      STATES.PUBLISHED
    ];
    var mediaIdsToRemove = [];
    var provider = this.getProvider();

    // Get information on medias which are about to be removed to validate that the user has enough permissions
    // to do it and that the media is on a stable state
    provider.get(
      new ResourceFilter().in('id', mediaIds),
      {
        include: ['id', 'metadata', 'state']
      },
      mediaIds.length,
      null,
      null,
      function(error, medias, pagination) {
        if (error) return next(HTTP_ERRORS.REMOVE_MEDIAS_GET_MEDIAS_ERROR);

        medias.forEach(function(media) {

          // Make sure user is authorized to modify the media
          if (!self.isUserAuthorized(request.user, media, ContentController.OPERATIONS.DELETE)) {
            process.logger.error(
              'User doesn\'t have enough privilege to remove the media',
              {method: 'removeEntitiesAction', media: media.id, user: request.user}
            );
            return next(HTTP_ERRORS.REMOVE_MEDIAS_FORBIDDEN);
          }

          // Make sure media is in a stable state
          if (stableStates.indexOf(media.state) < 0) {
            process.logger.error(
              'Media can\'t be removed, it is not in a stable state',
              {method: 'removeEntitiesAction', media: media.id, state: media.state}
            );
            return next(HTTP_ERRORS.REMOVE_MEDIAS_STATE_ERROR);
          }
          mediaIdsToRemove.push(media.id);
        });

        if (!mediaIdsToRemove.length) return next(HTTP_ERRORS.REMOVE_MEDIAS_ERROR);

        provider.remove(new ResourceFilter().in('id', mediaIdsToRemove), function(error, total) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'removeEntitiesAction'});
            next(HTTP_ERRORS.REMOVE_MEDIAS_ERROR);
          } else if (total != mediaIdsToRemove.length) {
            process.logger.error(
              total + '/' + mediaIds.length + ' removed',
              {method: 'removeEntitiesAction', medias: mediaIdsToRemove}
            );
            next(HTTP_ERRORS.REMOVE_MEDIAS_ERROR);
          } else {
            response.send({total: total});
          }
        });

      }
    );

  } else {

    // Missing media ids
    next(HTTP_ERRORS.REMOVE_MEDIAS_MISSING_PARAMETERS);

  }
};
