'use strict';

/**
 * @module publish-models
 */

// Module dependencies
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var openVeoAPI = require('@openveo/api');

var configDir = openVeoAPI.fileSystem.getConfDir();
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoPlatformProvider = process.requirePublish('app/server/providers/VideoPlatformProvider.js');
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));

/**
 * Defines a VideoModel class to manipulate videos.
 *
 * @class VideoModel
 * @constructor
 * @extends EntityModel
 */
function VideoModel() {
  openVeoAPI.EntityModel.prototype.init.call(this, new VideoProvider(openVeoAPI.applicationStorage.getDatabase()));
  this.propertyProvider = new PropertyProvider(openVeoAPI.applicationStorage.getDatabase());
}

module.exports = VideoModel;
util.inherits(VideoModel, openVeoAPI.EntityModel);

// States codes
VideoModel.ERROR_STATE = 0;
VideoModel.PENDING_STATE = 1;
VideoModel.COPYING_STATE = 2;
VideoModel.EXTRACTING_STATE = 3;
VideoModel.VALIDATING_STATE = 4;
VideoModel.PREPARING_STATE = 5;
VideoModel.WAITING_FOR_UPLOAD_STATE = 6;
VideoModel.UPLOADING_STATE = 7;
VideoModel.CONFIGURING_STATE = 8;
VideoModel.SAVING_TIMECODES_STATE = 9;
VideoModel.COPYING_IMAGES_STATE = 10;
VideoModel.READY_STATE = 11;
VideoModel.PUBLISHED_STATE = 12;
VideoModel.GENERATE_THUMB_STATE = 13;
VideoModel.GET_METADATA_STATE = 14;

/**
 * Updates the property of a given video.
 *
 * Update operations are grouped by event loop and only one request
 * is made to the database for each video id.
 *
 * @method updateVideoProperty
 * @private
 * @async
 * @param {Number} mediaId The id of the media to update
 * @param {String} propertyName The name of the property to update
 * @param {String|Number|Boolean} propertyValue The value of the
 * property
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
function updateVideoProperty(mediaId, propertyName, propertyValue, callback) {
  var self = this;

  // No pending update operations for now
  if (!this.pendingUpdateOperations) {
    this.pendingUpdateOperations = {};

    process.nextTick(function() {
      for (var mediaId in self.pendingUpdateOperations) {
        self.provider.update(mediaId, self.pendingUpdateOperations[mediaId], callback);
      }
      self.pendingUpdateOperations = null;
    });
  }

  // Add update opration to pending operations
  if (!this.pendingUpdateOperations[mediaId])
    this.pendingUpdateOperations[mediaId] = {};

  this.pendingUpdateOperations[mediaId][propertyName] = propertyValue;
}

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
      openVeoAPI.fileSystem.rmdir(directory, function(error) {
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
 * Adds a new video.
 *
 * @example
 *     {
 *      "id" : 1422731934859,
 *      "state" : 1,
 *      "packageType" : "tar",
 *      "lastState" : "packageCopied",
 *      "lastTransition" : "initPackage",
 *      "properties" : [],
 *      "type" : "vimeo",
 *      "path" : "C:/Temp/",
 *      "originalPackagePath" : "C:/Temp/video-package.tar",
 *      "packagePath" : "E:/openveo/node_modules/@openveo/publish/tmp/1422731934859.tar",
 *      "metadata" : {
 *        "date": 1425916390,
 *        "rich-media": true,
 *        "filename": "video.mp4",
 *        "duration": 20
 *      }
 *    }
 *
 * @method add
 * @async
 * @param {Object} videoPackage Information about the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.add = function(videoPackage, callback) {
  var data = {
    id: String(videoPackage.id),
    state: videoPackage.state,
    date: videoPackage.date,
    metadata: videoPackage.metadata,
    type: videoPackage.type,
    errorCode: videoPackage.errorCode,
    category: videoPackage.category,
    properties: videoPackage.properties,
    packageType: videoPackage.packageType,
    lastState: videoPackage.lastState,
    lastTransition: videoPackage.lastTransition,
    originalPackagePath: videoPackage.originalPackagePath
  };

  this.provider.add(data, function(error) {
    if (callback)
      callback(error, data);
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
 */
VideoModel.prototype.updateState = function(id, state, callback) {
  updateVideoProperty.call(this, id, 'state', state, callback);
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
 */
VideoModel.prototype.updateLastState = function(id, state, callback) {
  updateVideoProperty.call(this, id, 'lastState', state, callback);
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
 */
VideoModel.prototype.updateLastTransition = function(id, state, callback) {
  updateVideoProperty.call(this, id, 'lastTransition', state, callback);
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
 */
VideoModel.prototype.updateErrorCode = function(id, errorCode, callback) {
  updateVideoProperty.call(this, id, 'errorCode', errorCode, callback);
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
 */
VideoModel.prototype.updateLink = function(id, link, callback) {
  updateVideoProperty.call(this, id, 'link', link, callback);
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
 */
VideoModel.prototype.updateMediaId = function(id, idMediaPlatform, callback) {
  updateVideoProperty.call(this, id, 'mediaId', idMediaPlatform, callback);
};

/**
 * Updates video metadata for video platform.
 *
 * @method updateMetadata
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} metadata The metadata of the video in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.updateMetadata = function(id, metadata, callback) {
  updateVideoProperty.call(this, id, 'metadata', metadata, callback);
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
 */
VideoModel.prototype.updateDate = function(id, date, callback) {
  updateVideoProperty.call(this, id, 'date', date, callback);
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
 */
VideoModel.prototype.updateCategory = function(id, categoryId, callback) {
  updateVideoProperty.call(this, id, 'category', categoryId, callback);
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
 */
VideoModel.prototype.updateType = function(id, type, callback) {
  updateVideoProperty.call(this, id, 'type', type, callback);
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
 */
VideoModel.prototype.updateThumbnail = function(id, path, callback) {
  updateVideoProperty.call(this, id, 'thumbnail', path, callback);
};

/**
 * Gets the list of videos.
 *
 * @method get
 * @async
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Array** The list of videos
 */
VideoModel.prototype.get = function(callback) {
  var self = this;
  var videos = [];
  var properties = [];

  async.parallel([

    // Get the list of videos
    function(callback) {
      self.provider.get(function(error, videoList) {
        videos = videoList;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback) {
      self.propertyProvider.get(function(error, propertyList) {
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
 * @param {Number} count The expected number of results
 * @param {Number} page The page number
 * @param {Object} sort A MongoDB sort object
 * @param {Boolean} populate Parameter to know if the entities must return populated dependencies
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Array** The list of videos
 *   - **Object** Pagination information
 */
VideoModel.prototype.getPaginatedFilteredEntities = function(filter, count, page, sort, populate, callback) {
  var self = this;
  var videos = [];
  var properties = [];
  var pagination = {};
  async.parallel([

    // Get the list of videos
    function(callback) {
      self.provider.getPaginatedFilteredEntities(filter, count, page, sort, function(error, videoList, pageArray) {
        videos = videoList;
        pagination = pageArray;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback) {
      self.propertyProvider.get(function(error, propertyList) {
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
 * Gets a video and verify that it is published.
 *
 * @method getOneReady
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The video
 */
VideoModel.prototype.getOneReady = function(id, callback) {
  this.getOne(id, function(error, video) {
    if (error)
      callback(error);
    else if (video && (video.state === VideoModel.PUBLISHED_STATE || video.state === VideoModel.READY_STATE))
      callback(null, video);
    else
      callback(new Error());
  });
};

/**
 * Gets a video.
 *
 * {
 *   "video" : {
 *      "id" : "1439286245225", // Openveo video id
 *      "metadata" : { // Metadata sent by the media encoder
 *        "profile" : "2",
 *        "audio-input" : "hdmi-camera",
 *        "date" : 1425916390,
 *        "format" : "camera",
 *        "rich-media" : true, // true if there are slides associated to the video
 *        "profile-settings" : {
 *          "video-bitrate" : 1000000,
 *          "id" : "2",
 *          "video-height" : 720,
 *          "audio-bitrate" : 128000,
 *          "name" : "HD"
 *        },
 *        "id" : "2015-03-09_16-53-10",
 *        "format-settings" : {
 *          "source" : "camera-scale-raw",
 *          "id" : "camera"
 *        },
 *        "storage-directory" : "/data/2015-03-09_16-53-10",
 *        "filename" : "video.mp4",
 *        "duration" : 30
 *      },
 *      "type" : "vimeo", // The video platform
 *      "errorCode" : -1, // The error code if status = 0
 *      "category" : null, // Category the video belongs to
 *      "properties" : [], // A list of custom properties
 *      "state" : 7, // Actual state in publishing process
 *      "link" : "/publish/video/1439286245225", // Link to the openveo player
 *      "mediaId" : "135956519", // Platform id of the video
 *      "timecodes" : { // The list of slides with timecodes
 *        "0" : {
 *          "image" : {
 *            "small" : "/publish/videos/1439286245225/slide_00000.jpeg",
 *            "large" : "/publish/videos/1439286245225/slide_00000.jpeg"
 *          }
 *        }
 *        ...
 *      },
 *      available : true,
 *      thumbnail : "/1439286245225/thumbnail.jpg",
 *      files : [ // Video original files
 *        {
 *          quality : 0, // 0 = mobile, 1 = sd, 2 = hd
 *          width : 640,
 *          height : 360,
 *          link : "https://player.vimeo.com/external/135956519.sd.mp4?s=01ffd473e33e1af14c86effe71464d15&profile_id=112&oauth2_token_id=80850094"
 *        },
 *        ...
 *     ]
 *   }
 * }
 *
 * @method getOne
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The video information (see example)
 */
VideoModel.prototype.getOne = function(id, callback) {
  var self = this;
  var videoInfo,
    timecodesFilePath,
    timecodes;

  async.series([

    // Retrieve video information from database
    function(callback) {
      self.provider.getOne(id, function(error, video) {
        if (error || !video) {
          callback(error);
          return;
        } else {

          // Retreive video timecode file
          videoInfo = video;
          videoInfo.timecodes = {};
          timecodesFilePath = path.normalize(
            process.rootPublish + '/assets/player/videos/' + videoInfo.id + '/synchro.json');
        }

        callback();

      });
    },

    // Retrieve video information from video platform
    function(callback) {
      if (videoInfo && videoInfo.type && videoInfo.mediaId) {

        // Video information already retrieved
        if (videoInfo.available)
          return callback();

        var videoPlatformProvider = VideoPlatformProvider.getProvider(videoInfo.type,
          videoPlatformConf[videoInfo.type]);
        var expectedDefinition = videoInfo.metadata['profile-settings']['video-height'];

        // Get video availability and files
        videoPlatformProvider.getVideoInfo(videoInfo.mediaId, expectedDefinition, function(error, info) {
          if (error) {
            callback(error);
            return;
          }

          videoInfo.available = info.available;
          videoInfo.files = info.files;

          self.provider.update(videoInfo.id, info);
          callback();
        });

      }
      else
        callback();
    },

    // Retrieve video timecodes
    function(callback) {
      if (timecodesFilePath) {
        fs.exists(timecodesFilePath, function(exists) {
          if (exists) {
            try {
              timecodes = require(timecodesFilePath);
            } catch (e) {
              callback(new Error(e.message));
              return;
            }
          }
          callback();
        });
      }
      else
        callback();
    }

  ], function(error) {
    if (error || !videoInfo) {
      callback(error);
    } else {
      videoInfo.timecodes = [];

      // Got timecodes for this video
      if (timecodes) {

        for (var i = 0; i < timecodes.length; i++) {
          videoInfo.timecodes.push({
            timecode: timecodes[i].timecode,
            image: {
              small: '/' + videoInfo.id + '/' + timecodes[i].image + '?thumb=small',
              large: '/' + videoInfo.id + '/' + timecodes[i].image
            }
          });
        }
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
 */
VideoModel.prototype.remove = function(ids, callback) {
  var self = this;
  async.parallel([

    // Remove videos from database
    function(callback) {
      self.provider.remove(ids, function(error) {
        callback(error);
      });
    },

    // Remove videos public directories
    function(callback) {
      var directories = [];

      for (var i = 0; i < ids.length; i++)
        directories.push(path.normalize(process.rootPublish + '/assets/player/videos/' + ids[i]));

      removeDirectories(directories, function(error) {
        callback(error);
      });
    },

    // Remove videos temporary directories
    function(callback) {
      var directories = [];

      for (var i = 0; i < ids.length; i++)
        directories.push(path.join(publishConf.videoTmpDir, ids[i]));

      removeDirectories(directories, function(error) {
        callback(error);
      });
    }

  ], function(error) {
    if (error)
      callback(error);
    else
      callback();
  });
};

/**
 * Updates a video.
 *
 * @method update
 * @async
 * @param {String} id The id of the video
 * @param {Object} data The video info
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.update = function(id, data, callback) {
  var info = {};
  if (data.title)
    info['title'] = data.title;
  if (data.description)
    info['description'] = data.description;
  if (data.properties)
    info['properties'] = data.properties;
  if (data.hasOwnProperty('category'))
    info['category'] = data.category;
  if (data.cut)
    info['cut'] = data.cut;
  if (data.chapters)
    info['chapters'] = data.chapters;

  this.provider.update(id, info, callback);
};

/**
 * Publishes a video.
 *
 * Change the state of the video to "published" only if its state is
 * actually "ready".
 *
 * @method publishVideo
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.publishVideo = function(id, callback) {
  this.provider.updateVideoState(id, VideoModel.READY_STATE, VideoModel.PUBLISHED_STATE, callback);
};

/**
 * Unpublishes a video.
 *
 * Change the state of the video to "ready" only if its state if
 * actually "published".
 *
 * @method unpublishVideo
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.unpublishVideo = function(id, callback) {
  this.provider.updateVideoState(id, VideoModel.PUBLISHED_STATE, VideoModel.READY_STATE, callback);
};
