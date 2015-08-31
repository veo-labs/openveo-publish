"use strict"

/**
 * @module publish-models
 */

// Module dependencies
var util = require("util");
var path = require("path");
var fs = require("fs");
var async = process.requireModule("async");
var openVeoAPI = process.requireModule("openveo-api");

var VideoProvider = process.requirePublish("app/server/providers/VideoProvider.js");
var PropertyProvider = process.requirePublish("app/server/providers/PropertyProvider.js");
var VideoPlatformProvider = process.requirePublish("app/server/providers/VideoPlatformProvider.js");
var videoPlatformConf = process.requirePublish("config/videoPlatformConf.json");

/**
 * Defines a VideoModel class to manipulate videos.
 *
 * @class VideoModel
 * @constructor
 * @extends EntityModel
 */
function VideoModel(){
  openVeoAPI.EntityModel.prototype.init.call(this, new VideoProvider(openVeoAPI.applicationStorage.getDatabase()));
  this.pendingUpdateOperations;
  this.propertyProvider = new PropertyProvider(openVeoAPI.applicationStorage.getDatabase());
}

module.exports = VideoModel;
util.inherits(VideoModel, openVeoAPI.EntityModel);

// Error codes
VideoModel.COPY_ERROR = 0;
VideoModel.UNLINK_ERROR = 1;
VideoModel.PACKAGE_NOT_DEFINED_ERROR = 2;
VideoModel.EXTRACT_ERROR = 3;
VideoModel.VALIDATION_ERROR = 4;
VideoModel.CREATE_VIDEO_PUBLIC_DIR_ERROR = 5;
VideoModel.SAVE_VIDEO_DATA_ERROR = 6;
VideoModel.SAVE_TIMECODE_ERROR = 7;
VideoModel.UPLOAD_ERROR = 8;
VideoModel.SCAN_FOR_IMAGES_ERROR = 9;
VideoModel.CREATE_VIDEOS_PUBLIC_DIR_ERROR = 10;

// States codes
VideoModel.PENDING_STATE = 0;
VideoModel.COPYING_STATE = 1;
VideoModel.EXTRACTING_STATE = 2;
VideoModel.VALIDATING_STATE = 3;
VideoModel.PREPARING_STATE = 4;
VideoModel.SENDING_STATE = 5;
VideoModel.SENT_STATE = 6;
VideoModel.PUBLISHED_STATE = 7;
VideoModel.ERROR_STATE = 8;

/**
 * Adds a new video.
 *
 * @example
 *     {
 *      "id" : 1422731934859,
 *      "status" : 1,
 *      "properties" : [],
 *      "published" : false,
 *      "type" : "vimeo",
 *      "path" : "C:/Temp/",
 *      "originalPackagePath" : "C:/Temp/video-package.tar",
 *      "packagePath" : "E:/openveo/node_modules/openveo-publish/tmp/1422731934859.tar",
 *      "metadata" : {
 *        "profile": "2",
 *        "audio-input": "analog-top",
 *        "date": "13/01/1970 20:36:15",
 *        "format": "mix-pip",
 *        "rich-media": true,
 *        "profile-settings": {
 *          "video-bitrate": 1000000,
 *          "id": "2",
 *          "video-height": 720,
 *          "audio-bitrate": 128000,
 *          "name": "Haute définition"
 *        },
 *        "id": "1970-01-13_20-36-15",
 *        "format-settings": {
 *          "source": "mix-raw",
 *          "id": "mix-pip",
 *          "name": "Mélangé caméra incrustée",
 *          "template": "pip"
 *        },
 *        "date-epoch": 1107375,
 *        "storage-directory": "/data/1970-01-13_20-36-15",
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
VideoModel.prototype.add = function(videoPackage, callback){
  var data = {
    id : videoPackage.id + "",
    status : videoPackage.status,
    metadata : videoPackage.metadata,
    type : videoPackage.type,
    errorCode : videoPackage.errorCode,
    published : videoPackage.published,
    category : videoPackage.category,
    properties : videoPackage.properties
  };
  
  this.provider.add(data, function(error){
    if(callback)
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
VideoModel.prototype.updateState = function(id, state, callback){
  updateVideoProperty.call(this, id, "state", state, callback);
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
VideoModel.prototype.updateErrorCode = function(id, errorCode, callback){
  updateVideoProperty.call(this, id, "errorCode", errorCode, callback);
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
VideoModel.prototype.updateLink = function(id, link, callback){
  updateVideoProperty.call(this, id, "link", link, callback);
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
VideoModel.prototype.updateMediaId = function(id, idMediaPlatform, callback){
  updateVideoProperty.call(this, id, "mediaId", idMediaPlatform, callback);
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
VideoModel.prototype.updateMetadata = function(id, metadata, callback){
  updateVideoProperty.call(this, id, "metadata", metadata, callback);
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
VideoModel.prototype.updateCategory = function(id, categoryId, callback){
  updateVideoProperty.call(this, id, "category", categoryId, callback);
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
VideoModel.prototype.get = function(callback){
  var self = this;
  var videos = [];
  var properties = [];

  async.parallel([

    // Get the list of videos
    function(callback){
      self.provider.get(function(error, videoList){
        videos = videoList;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback){
      self.propertyProvider.get(function(error, propertyList){
        properties = propertyList;
        callback(error);
      });
    }

  ], function(error, result){
      if(error){
        callback(error)
      }
      else{
        if(videos && properties){

          // Videos may not have custom properties or just some of them.
          // Furthermore only the id and value of properties are stored
          // with videos, not complete information about the properties
          // (no name, no description and no type).
          // Inject all custom properties information inside video objects

          // Videos
          for(var i in videos){
            var videoProperties = videos[i].properties;
            var videoPropertiesWithValues = [];

            // Custom properties
            for(var j in properties){
              var found = false;

              // Video properties
              for(var propertyId in videoProperties){

                // Video already has the property
                // Add property information
                if(properties[j].id === propertyId){
                  found = true;
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

VideoModel.prototype.getPaginatedFilteredEntities = function(filter, count, page, sort, callback){
  var self = this;
  var videos = [];
  var properties = [];
  var pagination = {};
  async.parallel([

    // Get the list of videos
    function(callback){
      self.provider.getPaginatedFilteredEntities(filter, count, page, sort, function(error, videoList, pageArray){
        videos = videoList;
        pagination = pageArray;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback){
      self.propertyProvider.get(function(error, propertyList){
        properties = propertyList;
        callback(error);
      });
    }

  ], function(error, result){
      if(error){
        callback(error);
      }
      else{
        if(videos && properties){

          // Videos may not have custom properties or just some of them.
          // Furthermore only the id and value of properties are stored
          // with videos, not complete information about the properties
          // (no name, no description and no type).
          // Inject all custom properties information inside video objects

          // Videos
          for(var i in videos){
            var newVideoProperty = {};
            // Custom properties
            for(var j in properties){    
              if(!videos[i].properties[''+properties[j].id]) newVideoProperty[''+properties[j].id] = "";
              else newVideoProperty[''+properties[j].id] = videos[i].properties[''+properties[j].id];
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
 *      "published" : false, // true if video is published
 *      "category" : null, // Category the video belongs to
 *      "properties" : [], // A list of custom properties
 *      "state" : 7, // Actual state in publishing process (0 = Pending, 1 = Copying, 2 = Extracting, 3 = Validating, 4 = Preparing, 5 = Sending, 6 = Sent, 7 = Published, 8 = Error)
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
 *      pictures : [ // Video thumbnails
 *        {
 *          width : 100,
 *          height : 75,
 *          link : "https://i.vimeocdn.com/video/530303243_100x75.jpg"
 *        },
 *        ...
 *      ],
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
VideoModel.prototype.getOne = function(id, callback){
  var self = this;
  var videoInfo, timecodesFilePath, timecodes;
  
  async.series([
    
    // Retrieve video information from database
    function(callback){
      self.provider.getOne(id, function(error, video){
        if(error){
          callback(error);
          return;
        }
        else if(video && video.state === VideoModel.PUBLISHED_STATE){

          // Retreive video timecode file
          videoInfo = video;
          videoInfo.timecodes = {};
          timecodesFilePath = path.normalize(process.rootPublish + "/public/publish/videos/" + videoInfo.id + "/synchro.json");

        }

        callback();

      });
    },

    // Retrieve video information from video platform
    function(callback){
      if(videoInfo){

        // Video information already retrieved
        if(videoInfo.files)
          return callback();

        var videoPlatformProvider = VideoPlatformProvider.getProvider(videoInfo.type, videoPlatformConf[videoInfo.type]);
        videoPlatformProvider.getVideoInfo(videoInfo.mediaId, function(error, info){
          if(error){
            callback(error);
            return;
          }

          videoInfo.available = info.available;
          videoInfo.files = info.files;
          videoInfo.pictures = info.pictures;

          self.provider.update(videoInfo.id, info);
          callback();
        });

      }
    },

    // Retrieve video timecodes
    function(callback){
      if(timecodesFilePath){
        fs.exists(timecodesFilePath, function(exists){
          if(exists){
            try{
              timecodes = require(timecodesFilePath);
            }
            catch(e){
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

  ], function(error){
    if(error || !videoInfo){
      callback(error);
    }
    else{
      
      // Got timecodes for this video
      if(timecodes){
        
        for(var time in timecodes){
          videoInfo.timecodes[parseInt(time)] = {};
          videoInfo.timecodes[parseInt(time)]['image'] = {
            "small" : '/'+videoInfo.id + "/" + timecodes[time]["image"]+"?thumb=small",
            "large" : '/'+videoInfo.id + "/" + timecodes[time]["image"],
          };
        }
      }
      callback(null, videoInfo);
    }
    
  });
};

/**
 * Removes a video.
 *
 * @method remove
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of removed items
 */
VideoModel.prototype.remove = function(id, callback){
  var self = this;
  async.parallel([

    // Remove video from database
    function(callback){
      self.provider.remove(id, function(error){
        callback(error);
      });
    },

    // Remove video's public directory
    function(callback){
      openVeoAPI.fileSystem.rmdir(path.normalize(process.rootPublish + "/public/publish/videos/" + id), function(error){
        callback(error);
      });
    }

  ], function(error, result){
    if(error)
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
VideoModel.prototype.update = function(id, data, callback){
  var info = {};
  if(data.title) info["title"] = data.title;
  if(data.description) info["description"] = data.description;
  if(data.properties) info["properties"] = data.properties;
  if(data.category) info["category"] = data.category;
  if(data.chapter) info["chapter"] = data.chapter;
  
  this.provider.update(id, info, callback);
};

/**
 * Publishes a video.
 *
 * Change the state of the video to published only if its state if 
 * actually sent.
 *
 * @method publishVideo
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.publishVideo = function(id, callback){
  this.provider.updateVideoState(id, VideoModel.SENT_STATE, VideoModel.PUBLISHED_STATE, callback);
};

/**
 * Unpublishes a video.
 *
 * Change the state of the video to sent only if its state if
 * actually published.
 *
 * @method unpublishVideo
 * @async
 * @param {String} id The id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoModel.prototype.unpublishVideo = function(id, callback){
  this.provider.updateVideoState(id, VideoModel.PUBLISHED_STATE, VideoModel.SENT_STATE, callback);
};

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
function updateVideoProperty(mediaId, propertyName, propertyValue, callback){
  var self = this;
  
  // No pending update operations for now
  if(!this.pendingUpdateOperations){
    this.pendingUpdateOperations = {};
    
    process.nextTick(function(){
      for(var mediaId in self.pendingUpdateOperations){
        self.provider.update(mediaId, self.pendingUpdateOperations[mediaId], callback);
      }
      self.pendingUpdateOperations = null;
    });
  }
  
  // Add update opration to pending operations
  if(!this.pendingUpdateOperations[mediaId])
    this.pendingUpdateOperations[mediaId] = {};

  this.pendingUpdateOperations[mediaId][propertyName] = propertyValue;
}

/**
 * Updates a list of properties for the given video.
 *
 * @example
 *     updateVideoProperties("13545", {
 *       "link" : "/publish/video/13545",
 *       "errorCode" : 2
 *     });
 *
 * @method updateVideoProperties
 * @private
 * @async
 * @param {Number} id The id of the video to update
 * @param {Object} properties A key value of properties to update
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
function updateVideoProperties(id, properties, callback){
  if(properties && typeof properties === "object")
    self.provider.update(id, properties, callback);
}