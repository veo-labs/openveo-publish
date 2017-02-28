'use strict';

/**
 * @module models
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');

var openVeoApi = require('@openveo/api');
var videoPlatformFactory = process.requirePublish('app/server/providers/videoPlatforms/factory.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var AccessError = openVeoApi.errors.AccessError;
var configDir = openVeoApi.fileSystem.getConfDir();
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));

var shortid = require('shortid');

/**
 * Defines a VideoModel to manipulate videos' entities.
 *
 * @class VideoModel
 * @extends ContentModel
 * @constructor
 * @param {Object} user The user the video belongs to
 * @param {VideoProvider} videoProvider The video provider
 * @param {PropertyProvider} propertyProvider The entity provider
 */
function VideoModel(user, videoProvider, propertyProvider) {
  VideoModel.super_.call(this, user, videoProvider);

  Object.defineProperties(this, {

    /**
     * Property provider.
     *
     * @property propertyProvider
     * @type PropertyProvider
     * @final
     */
    propertyProvider: {value: propertyProvider}

  });
}

module.exports = VideoModel;
util.inherits(VideoModel, openVeoApi.models.ContentModel);

/**
 * Removes a list of directories.
 *
 * @method removeDirectories
 * @private
 * @async
 * @param {Array} directories The list of directory paths
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
function removeDirectories(directories, callback) {

  /**
   * Gets the closure to remove the given directory.
   *
   * @param {String} directory The path of the directory to remove
   * @return {Function} A dedicated function to remove the directory
   */
  function removeDirClosure(directory) {
    return function(callback) {
      openVeoApi.fileSystem.rmdir(directory, function(error) {
        callback(error);
      });
    };
  }

  var actions = [];
  for (var i = 0; i < directories.length; i++)
    actions.push(removeDirClosure(directories[i]));

  async.parallel(actions, function(error) {
    callback(error);
  });
}

/**
 * Removes a all data related to a list of video ID.
 *
 * @method removeAllDataRelatedToVideo
 * @private
 * @async
 * @param {Array} videosToRemove The list of videos to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
function removeAllDataRelatedToVideo(videosToRemove, callback) {
  var parallel = [];

  // Remove videos public directories
  parallel.push(function(callback) {
    var directories = [];

    for (var i = 0; i < videosToRemove.length; i++)
      directories.push(path.normalize(process.rootPublish + '/assets/player/videos/' + videosToRemove[i].id));

    removeDirectories(directories, function(error) {
      callback(error);
    });
  });

  // Remove videos temporary directories
  parallel.push(function(callback) {
    var directories = [];

    for (var i = 0; i < videosToRemove.length; i++)
      directories.push(path.join(publishConf.videoTmpDir, videosToRemove[i].id));

    removeDirectories(directories, function(error) {
      callback(error);
    });
  });

  videosToRemove.forEach(function(video) {
    parallel.push(
      function(callback) {
        var videoPlatformProvider = videoPlatformFactory.get(video.type,
          videoPlatformConf[video.type]);

        // compatibility with old mediaId format
        var mediaId = !Array.isArray(video.mediaId) ? [video.mediaId] : video.mediaId;
        if (videoPlatformProvider) videoPlatformProvider.remove(mediaId, function(error, info) {
          if (error) {
            callback(error);
            return;
          }
          callback();
        });
        else callback();
      }
    );
  });

  async.parallel(parallel, function(error) {
    if (error)
      callback(error);
    else
      callback(null);
  });
}


/**
 * Gets the id of the super administrator.
 *
 * @method getSuperAdminId
 * @return {String} The id of the super admin
 */
VideoModel.prototype.getSuperAdminId = function() {
  return process.api.getCoreApi().getSuperAdminId();
};

/**
 * Gets the id of the anonymous user.
 *
 * @method getAnonymousId
 * @return {String} The id of the anonymous user
 */
VideoModel.prototype.getAnonymousId = function() {
  return process.api.getCoreApi().getAnonymousUserId();
};

/**
 * Remove a list of file
 *
 * @method removeTagsFile
 * @private
 * @async
 * @param  {Array} filePathArray The list of path file to delete
 */
function removeTagsFile(filePathArray) {
  var series = [];
  filePathArray.forEach(function(path) {
    series.push(
      function(callback) {
        fs.stat(path, function(error, stats) {
          if (error) {
            process.logger.error(error);
            return callback(error);
          }

          // delete file content
          fs.unlink(path, function(error, data) {
            if (error) {
              process.logger.error(error);
              return callback(error);
            }

            process.logger.info('Successfully deleted: ' + path);
            callback();
          });
        });
      }
    );
  });
  async.series(series);
}

/**
 * Adds a new video.
 *
 * @method add
 * @async
 * @param {Object} media Information about the video
 * @param {String} media.id The media id
 * @param {Boolean} [media.available] true if the media is available, false otherwise
 * @param {String} [media.title] The media title
 * @param {String} [media.description] The media description
 * @param {Number} [media.state] The media state (see STATES class from module packages)
 * @param {Date} [media.date] The media date
 * @param {String} [media.type] The id of the associated media platform
 * @param {Object} [media.metadata] Information about the media
 * @param {String} [media.metadata.user] The id of the user the media belongs to
 * @param {Array} [media.metadata.groups] The list of groups the media belongs to
 * @param {Number} [media.errorCode] The media error code (see ERRORS class from module packages)
 * @param {String} [media.category] The id of the category the media belongs to
 * @param {Array} [media.properties] The list of properties' values for this media
 * @param {String} [media.packageType] The type of package
 * @param {String} [media.lastState] The last media state in publication process
 * @param {String} [media.lastTransition] The last media transition in publication process
 * @param {String} [media.originalPackagePath] Absolute path of the original package
 * @param {String} [media.originalFileName] Original package name without the extension
 * @param {String} [media.mediaId] Id the of media of the media platform
 * @param {Object} [media.timecodes] The list of media timecodes
 * @param {Object} [media.chapters] The list of media chapters
 * @param {Array} [media.cut] Media begin and end cuts
 * @param {Array} [media.sources] The list of media sources
 * @param {Number} [media.views] The statistic number of views
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total amount of items inserted
 *   - **Object** The inserted video
 */
VideoModel.prototype.add = function(media, callback) {
  var data = {
    id: String(media.id),
    available: media.available,
    title: media.title,
    description: media.description,
    state: media.state,
    date: media.date,
    metadata: media.metadata || {},
    type: media.type,
    errorCode: media.errorCode,
    category: media.category,
    properties: media.properties || [],
    packageType: media.packageType,
    lastState: media.lastState,
    lastTransition: media.lastTransition,
    originalPackagePath: media.originalPackagePath,
    originalFileName: media.originalFileName,
    mediaId: media.mediaId,
    timecodes: media.timecodes,
    chapters: media.chapters,
    tags: media.tags,
    cut: media.cut || [],
    sources: media.sources || [],
    views: media.views || 0
  };

  data.metadata.user = media.user || (this.user && this.user.id) || this.getAnonymousId();
  data.metadata.groups = media.groups || [];

  this.provider.add(data, function(error, addedCount, videos) {
    if (callback)
      callback(error, addedCount, videos && videos[0]);
  });
};

/**
 * Updates video state.
 *
 * @method updateState
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The state of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateState = function(id, state, callback) {
  this.provider.update(id, {state: state}, callback);
};

/**
 * Updates last video state.
 *
 * @method updateLastState
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The last state of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateLastState = function(id, state, callback) {
  this.provider.update(id, {lastState: state}, callback);
};

/**
 * Updates last video transition.
 *
 * @method updateLastTransition
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The last transition of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateLastTransition = function(id, state, callback) {
  this.provider.update(id, {lastTransition: state}, callback);
};

/**
 * Updates video error code.
 *
 * @method updateErrorCode
 * @async
 * @param {Number} id The id of the video to update
 * @param {Number} errorCode The error code of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateErrorCode = function(id, errorCode, callback) {
  this.provider.update(id, {errorCode: errorCode}, callback);
};

/**
 * Updates video link.
 *
 * @method updateLink
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} link The link of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateLink = function(id, link, callback) {
  this.provider.update(id, {link: link}, callback);
};

/**
 * Updates media id for media platform.
 *
 * @method updateMediaId
 * @async
 * @param {String} id The id of the media to update
 * @param {String} idMediaPlatform The id of the media in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateMediaId = function(id, idMediaPlatform, callback) {
  this.provider.update(id, {mediaId: idMediaPlatform}, callback);
};

/**
 * Updates video metadata for video platform.
 *
 * @method updateMetadata
 * @async
 * @param {Number} id The id of the video to update
 * @param {Object} metadata The metadata of the video in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateMetadata = function(id, metadata, callback) {
  this.provider.update(id, {metadata: metadata}, callback);
};

/**
 * Updates video date timestamp.
 *
 * @method updateDate
 * @async
 * @param {Number} id The id of the video to update
 * @param {Number} date The date of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateDate = function(id, date, callback) {
  this.provider.update(id, {date: date}, callback);
};

/**
 * Updates video category for video platform.
 *
 * @method updateCategory
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} category The category id of the video in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateCategory = function(id, categoryId, callback) {
  this.provider.update(id, {category: categoryId}, callback);
};

/**
 * Updates video platform type.
 *
 * @method updateType
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} type The type of the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateType = function(id, type, callback) {
  this.provider.update(id, {type: type}, callback);
};

/**
 * Updates video thumbnail.
 *
 * @method updateThumbnail
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} path The path of the thumbnail file
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.updateThumbnail = function(id, path, callback) {
  this.provider.update(id, {thumbnail: path}, callback);
};

/**
 * Gets the list of videos.
 *
 * @method get
 * @async
 * @param {Object} filter A MongoDB filter
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Array** The list of videos
 */
VideoModel.prototype.get = function(filter, callback) {
  var self = this;
  var videos = [];
  var properties = [];

  async.parallel([

    // Get the list of videos
    function(callback) {
      self.provider.get(self.addAccessFilter(filter), function(error, videoList) {
        videos = videoList;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback) {
      self.propertyProvider.get(null, function(error, propertyList) {
        properties = propertyList;
        callback(error);
      });
    }

  ], function(error) {
    if (error) {
      callback(error);
    } else {
      if (videos && properties) {

        // Videos may not have custom properties or just some of them.
        // Furthermore only the id and value of properties are stored
        // with videos, not complete information about the properties
        // (no name, no description and no type).
        // Inject all custom properties information inside video objects

        // Videos
        for (var i in videos) {
          var videoProperties = videos[i].properties;
          var videoPropertiesWithValues = [];

          // Custom properties
          for (var j in properties) {

            // Video properties
            for (var propertyId in videoProperties) {

              // Video already has the property
              // Add property information
              if (properties[j].id === propertyId) {
                properties[j].value = videoProperties[propertyId];
                break;
              }

            }

            videoPropertiesWithValues.push(properties[j]);

          }

          videos[i].properties = videoPropertiesWithValues;
        }

      }

      callback(null, videos);
    }
  });
};

/**
 * Gets an ordered list of videos by page.
 *
 * @method getPaginatedFilteredEntities
 * @async
 * @param {Object} filter A MongoDB filter object
 * @param {Number} limit The expected number of results
 * @param {Number} page The page number
 * @param {Object} sort A MongoDB sort object
 * @param {Boolean} populate Parameter to know if the entities must return populated dependencies
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Array** The list of videos
 *   - **Object** Pagination information
 */
VideoModel.prototype.getPaginatedFilteredEntities = function(filter, limit, page, sort, populate, callback) {
  var self = this;
  var videos = [];
  var properties = [];
  var pagination = {};
  async.parallel([

    // Get the list of videos
    function(callback) {
      self.provider.getPaginatedFilteredEntities(self.addAccessFilter(filter), limit, page, sort,
      function(error, videoList, pageArray) {
        videos = videoList;
        pagination = pageArray;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback) {
      self.propertyProvider.get(null, function(error, propertyList) {
        properties = propertyList;
        callback(error);
      });
    }

  ], function(error) {
    if (error) {
      callback(error);
    } else {
      if (videos && properties) {

        // Videos may not have custom properties or just some of them.
        // Furthermore only the id and value of properties are stored
        // with videos, not complete information about the properties
        // (no name, no description and no type).
        // Inject all custom properties information inside video objects

        // Videos
        for (var i in videos) {
          var newVideoProperty = {};

          // Custom properties
          if (!populate) {
            for (var j in properties) {
              if (!videos[i].properties[String(properties[j].id)])
                newVideoProperty[String(properties[j].id)] = '';
              else
                newVideoProperty[String(properties[j].id)] = videos[i].properties[String(properties[j].id)];
            }
          } else {
            for (var k in properties) {

              // make a copy of propertie object to add value
              newVideoProperty[String(properties[k].id)] = JSON.parse(JSON.stringify(properties[k]));
              if (!videos[i].properties[String(properties[k].id)])
                newVideoProperty[String(properties[k].id)]['value'] = '';
              else
                newVideoProperty[String(properties[k].id)]['value'] = videos[i].properties[String(properties[k].id)];
            }
          }
          videos[i].properties = newVideoProperty;
        }
      }
      callback(null, videos, pagination);
    }
  });
};

/**
 * Gets a video.
 *
 * Only a ready video can be fetched.
 *
 * @method getOneReady
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The video
 */
VideoModel.prototype.getOneReady = function(id, callback) {
  this.getOne(id, null, function(error, video) {
    if (error)
      callback(error);
    else if (video && (video.state === STATES.PUBLISHED || video.state === STATES.READY))
      callback(null, video);
    else
      callback(new Error('Video is not ready'));
  });
};

/**
 * Gets a video.
 *
 * @method getOne
 * @async
 * @param {String} id The id of the video
 * @param {Object} filter A MongoDB filter
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The video information (see example)
 */
VideoModel.prototype.getOne = function(id, filter, callback) {
  var self = this;
  var videoInfo,
    timecodes;

  async.series([

    // Retrieve video information from database
    function(callback) {
      self.provider.getOne(id, filter, function(error, video) {
        if (error || !video) {
          callback(error);
          return;
        } else if (!error && !self.isUserAuthorized(video, openVeoApi.models.ContentModel.READ_OPERATION)) {
          var userId = self.user.id;
          callback(new AccessError('User "' + userId + '" doesn\'t have access to video "' + id + '"'));
          return;
        } else {

          // Retreive video timecode file path
          videoInfo = video;
        }

        callback();

      });
    },

    // Retrieve video information from video platform
    function(callback) {
      if (videoInfo && videoInfo.type && videoInfo.mediaId) {

        // Get timecodes from metadata
        timecodes = videoInfo.metadata.indexes;

        // Video information already retrieved
        if (videoInfo.available && videoInfo.sources.length == videoInfo.mediaId.length)
          return callback();

        var videoPlatformProvider = videoPlatformFactory.get(videoInfo.type,
          videoPlatformConf[videoInfo.type]);
        var expectedDefinition = videoInfo.metadata['profile-settings']['video-height'];

        // compatibility with old mediaId format
        var mediaId = !Array.isArray(videoInfo.mediaId) ? [videoInfo.mediaId] : videoInfo.mediaId;

        // Get video availability and sources
        videoPlatformProvider.getVideoInfo(mediaId, expectedDefinition, function(error, info) {
          if (error) {
            callback(error);
            return;
          }
          videoInfo.available = info.available;
          videoInfo.sources = info.sources;

          self.provider.update(videoInfo.id, info);
          callback();
        });

      } else
        callback();
    }

  ], function(error) {
    if (error || !videoInfo) {
      callback(error);
    } else {

      // Got timecodes for this video
      if (timecodes) {
        videoInfo.timecodes = [];
        var tags = [];

        for (var i = 0; i < timecodes.length; i++) {
          var currentTc = timecodes[i];
          var timecodeType = currentTc.type;

          switch (timecodeType) {
            case 'image':
              videoInfo.timecodes.push({
                timecode: currentTc.timecode,
                image: {
                  small: '/publish/' + videoInfo.id + '/' + currentTc.data.filename + '?thumb=small',
                  large: '/publish/' + videoInfo.id + '/' + currentTc.data.filename
                }
              });
              break;

            case 'tag':
              tags.push({
                value: currentTc.timecode / (videoInfo.metadata.duration * 1000),
                name: currentTc.data && currentTc.data.tagname ? currentTc.data.tagname : 'Tag' + (tags.length + 1)
              });
              break;
            default:
          }
        }

        // Set tags from timecode only if user has not allready edit tags
        if ((!videoInfo.tags || !videoInfo.tags.length) && tags.length) videoInfo.tags = tags;
      }
      callback(null, videoInfo);
    }

  });
};

/**
 * Removes a list of videos.
 *
 * @method remove
 * @async
 * @param {Array} ids The list of video ids
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total number of deleted videos
 */
VideoModel.prototype.remove = function(ids, callback) {
  var self = this;
  var idsToRemove = [];

  self.provider.get({id: {$in: ids}}, function(error, videos) {
    if (!error) {
      for (var i = 0; i < videos.length; i++) {
        if (self.isUserAuthorized(videos[i], openVeoApi.models.ContentModel.DELETE_OPERATION))
          idsToRemove.push(videos[i].id);
      }
    }

    // Remove videos from database
    self.provider.remove(idsToRemove, function(error, results) {
      if (error)
        callback(error);
      else {

        // Only if videos are removed, we can remove all data related
        removeAllDataRelatedToVideo(videos, function(error) {
          if (error)
            callback(error);
          else {
            callback(null, idsToRemove.length);
          }
        });
      }
    });
  });
};

/**
 * Updates a video.
 *
 * @method update
 * @async
 * @param {String} id The id of the media
 * @param {Object} data The media info
 * @param {String} [data.title] The media title
 * @param {String} [data.description] The media description
 * @param {Array} [data.properties] The media properties' values
 * @param {String} [data.category] The category the media belongs to
 * @param {Array} [data.cut] Begin and end cuts
 * @param {Array} [data.chapters] The media chapters
 * @param {Number} [data.views] The media number of views
 * @param {Array} [data.groups] The list of groups the media belongs to
 * @param {String} [data.user] The id of the user the media belongs to
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.update = function(id, data, callback) {
  var self = this;
  var info = {};
  if (data.title)
    info.title = data.title;
  if (data.description)
    info.description = data.description;
  if (data.properties)
    info.properties = data.properties;
  if (data.category)
    info.category = data.category;
  if (data.cut)
    info.cut = data.cut;
  if (data.chapters)
    info.chapters = data.chapters;
  if (data.tags)
    info.tags = data.tags;
  if (data.views)
    info.views = data.views;
  if (data.groups) {
    info['metadata.groups'] = data.groups.filter(function(group) {
      return group ? true : false;
    });
  }
  if (data.user)
    info['metadata.user'] = data.user;

  this.provider.getOne(id, null, function(error, entity) {
    if (!error) {
      if (self.isUserAuthorized(entity, openVeoApi.models.ContentModel.UPDATE_OPERATION)) {

        // user is authorized to update but he must be owner to update the owner
        if (!self.isUserOwner(entity, self.user) && !self.isUserAdmin(self.user)) delete info['metadata.user'];

        self.provider.update(id, info, callback);
      } else
        callback(new AccessError('User "' + self.user.id + '" can\'t edit video "' + id + '"'));
    } else
      callback(error);
  });
};

/**
 * Publishes videos.
 *
 * Change the state of the videos to "published" only if its state is
 * actually "ready".
 *
 * @method publishVideos
 * @async
 * @param {Array} ids The array ids of videos
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of published videos
 */
VideoModel.prototype.publishVideos = function(ids, callback) {
  var self = this;
  var idsToPublish = [];

  this.provider.get({id: {$in: ids}}, function(error, entities) {
    if (!error) {
      for (var i = 0; i < entities.length; i++) {
        if (self.isUserAuthorized(entities[i], openVeoApi.models.ContentModel.UPDATE_OPERATION))
          idsToPublish.push(entities[i].id);
      }

      self.provider.updateVideoState(idsToPublish, STATES.READY, STATES.PUBLISHED, callback);
    } else
      callback(error);
  });
};

/**
 * Unpublishes videos.
 *
 * Change the state of the videos to "ready" only if its state is
 * actually "published".
 *
 * @method unpublishVideos
 * @async
 * @param {Array} ids The array ids of videos
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of unpublished videos
 */
VideoModel.prototype.unpublishVideos = function(ids, callback) {
  var self = this;
  var idsToUnpublish = [];

  this.provider.get({id: {$in: ids}}, function(error, entities) {
    if (!error) {
      for (var i = 0; i < entities.length; i++) {
        if (self.isUserAuthorized(entities[i], openVeoApi.models.ContentModel.UPDATE_OPERATION))
          idsToUnpublish.push(entities[i].id);
      }

      self.provider.updateVideoState(idsToUnpublish, STATES.PUBLISHED, STATES.READY, callback);
    } else
      callback(error);
  });
};

/**
 * Updates video views.
 *
 * @method increaseVideoViews
 * @async
 * @param {String} id The id of the video to update
 * @param {Number} views number to add to existing count (or to initialize)
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoModel.prototype.increaseVideoViews = function(id, count, callback) {
  this.provider.increase(id, {views: count}, callback);
};

/**
 * Add/update video tags/chapters to existing tags/chapters
 * Associate a file to a tag
 *
 * @method updateTags
 * @async
 * @param  {String}   id       The id of the video to update
 * @param  {Object}   data     The list of tags to updates
 * @param  {Object}   file     The file information to attach to the tag
 * @param  {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The dataed pass in param
 */
VideoModel.prototype.updateTags = function(id, data, file, callback) {
  var self = this;

  this.provider.get({id: id}, function(error, entities) {
    if (error || !entities || !entities[0]) {
      return callback(error);
    } else {
      var items = data;
      var entity = entities[0];
      var tags = {};
      Object.keys(items).forEach(function(key) {
        var item = items[key][0];
        if (!entity[key]) entity[key] = [];
        tags[key] = entity[key];
        var tag = tags[key];

        if (!item.id) {
          item.id = shortid.generate();
          if (file) item.file = file;
          tag.push(item);
        } else {
          for (var i = 0; i < tag.length; i++) {
            if (tag[i].id == item.id) {
              if (file) { // delete old file when new file uploaded
                if (tag[i].file) removeTagsFile([tag[i].file.path]);
                item.file = file;
                item.file.basePath = '/publish/' + entity.id + '/uploads/' + item.file.filename;
              } else if (!item.file && tag[i].file) { // or when user delete file attached
                removeTagsFile([tag[i].file.path]);
              }
              tag[i] = item;
            }
          }
        }
      });
      self.update(id, tags, function(update) {
        callback(null, items);
      });
    }
  });
};

/**
 * Remove video tags/chapters to existing tags/chapters
 * Remove associated file
 *
 * @method removeTags
 * @async
 * @param  {String}   id       The id of the video to delete tag
 * @param  {Object}   data     The list of tags to delete
 * @param  {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The data passed in param
 */
VideoModel.prototype.removeTags = function(id, data, callback) {
  var self = this;

  this.provider.get({id: id}, function(error, entities) {
    if (error || !entities || !entities[0]) {
      return callback(error);
    } else {
      var items = data;
      var entity = entities[0];
      var tags = {};
      Object.keys(items).forEach(function(key) {
        var item = data[key];
        var ids = item.map(function(el) {
          return el.id;
        });
        var paths = item.filter(function(el) {
          return el.file && el.file.path;
        })
        .map(function(el) {
          return el.file.path;
        });
        tags[key] = entity[key];

        // remove old file from filesystem;
        if (paths && paths.length) removeTagsFile(paths);

        for (var i = 0; i < tags[key].length; i++) {
          if (ids.indexOf(tags[key][i].id) >= 0) {
            process.logger.debug(tags[key][i].id + ' deleted');
            tags[key].splice(i, 1);
            i--;
          }
        }
      });
      self.update(id, tags, function(update) {
        callback(null, items);
      });
    }
  });
};
