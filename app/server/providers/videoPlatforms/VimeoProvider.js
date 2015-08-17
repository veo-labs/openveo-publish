"use strict"

/**
 * @module publish-providers
 */

// Module dependencies
var path = require("path");
var util = require("util");
var fs = require("fs");
var vimeoAPI = require("vimeo");
var async = process.requireModule("async");
var VideoPlatformProvider = process.requirePublish("app/server/providers/VideoPlatformProvider.js");

/**
 * Defines a VimeoProvider class to interact with vimeo platform
 * (https://vimeo.com/).
 *
 * @example
 *     // providerConf example
 *     {
 *       "clientId" : "****",
 *       "clientSecret" : "****",
 *       "accessToken" : "****"
 *     }
 *
 * @class VimeoProvider
 * @constructor
 * @extends VideoPlatformProvider
 * @param {Object} providerConf A vimeo configuration object
 */
function VimeoProvider(providerConf){
  VideoPlatformProvider.call(this, providerConf);
  
  this.vimeo = new vimeoAPI.Vimeo(this.conf.clientId, this.conf.clientSecret, this.conf.accessToken);

  this.qualitiesMap = {
    sd : VideoPlatformProvider.SD_QUALITY,
    mobile : VideoPlatformProvider.MOBILE_QUALITY,
    hd : VideoPlatformProvider.HD_QUALITY
  };
}

module.exports = VimeoProvider;
util.inherits(VimeoProvider, VideoPlatformProvider);

/**
 * Uploads a video to the Vimeo platform.
 *
 * TODO Find a way to avoid sending default preset request on Vimeo
 * for each upload.
 *
 * @example
 *     // videoPackage example
 *     {
 *       "id" : 1422731934859,
 *       "type" : "vimeo",
 *       "path" : "C:/Temp/",
 *       "originalPackagePath" : "C:/Temp/video-package.tar",
 *       "packagePath" : "E:/openveo/node_modules/openveo-publish/tmp/1422731934859.tar",
 *       "metadata" : {
 *         "profile": "2",
 *         "audio-input": "analog-top",
 *         "date": "13/01/1970 20:36:15",
 *         "format": "mix-pip",
 *         "rich-media": true,
 *         "profile-settings": {
 *           "video-bitrate": 1000000,
 *           "id": "2",
 *           "video-height": 720,
 *           "audio-bitrate": 128000,
 *           "name": "Haute définition"
 *         },
 *         "id": "1970-01-13_20-36-15",
 *         "format-settings": {
 *           "source": "mix-raw",
 *           "id": "mix-pip",
 *           "name": "Mélangé caméra incrustée",
 *           "template": "pip"
 *         },
 *         "date-epoch": 1107375,
 *         "storage-directory": "/data/1970-01-13_20-36-15",
 *         "filename": "video.mp4",
 *         "duration": 20
 *       }
 *     }
 *
 * @method upload
 * @async
 * @param {Object} videoPackage Video package to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VimeoProvider.prototype.upload = function(videoPackage, callback){
  var self = this;
  
  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/openveo-publish/tmp/
  var videoTmpDir = path.dirname(videoPackage.packagePath);
  var presetId, mediaId;
  
  // Get video file path
  // e.g E:/openveo/node_modules/openveo-publish/tmp/1422731934859/video.mp4
  var videoFilePath = path.join(videoTmpDir, "/" + videoPackage.id, "/" + videoPackage.metadata.filename);

  async.series([

    // Checks user quota
    function(callback){

      self.vimeo.request({method : "GET", path : "/me"}, function(error, body, statusCode, headers){

        if(!error){

          if(!body.upload_quota){

            // User does not have permission to upload
            callback(new Error("User does not have permission to upload on Vimeo"));
          }
          
          // Checks the size of the video to upload
          fs.stat(videoFilePath, function(error, stats){
            if(error)
              callback(error);
            else if(stats.size >= body.upload_quota.space.free)
              callback(new Error("No more space left in Vimeo account"));
            else
              callback();
          });

        }

      });
      
    },
    
    // Get default preset
    function(callback){
      
      self.vimeo.request({
        "method" : "GET",
        "path" : "/me/presets"
      }, function(error, body, statusCode, headers){
        if(!error){

          if(body.data.length)
            presetId = /^.*\/(.*)$/.exec(body.data[0].uri)[1];
        }
        
        callback(error);
      });
      
    },
    
    // Upload video
    function(callback){
      self.vimeo.streamingUpload(videoFilePath, function(error, body, statusCode, headers){

        if(error){
          callback(error);
          return;
        }

        // {
        //   "date" : "Thu, 15 Jan 2015 11:00:27 GMT",
        //   "server" : "Apache",
        //   "vary" : "Accept,Vimeo-Client-Id,Accept-Encoding",
        //   "cache-control" : "no-cache, max-age=315360000",
        //   "location" : "/videos/116849110",
        //   "expires" : "Sun, 12 Jan 2025 11:00:27 GMT",
        //   "content-length" : "0",
        //   "keep-alive" : "timeout=100, max=94",
        //   "connection" : "Keep-Alive",
        //   "content-type" : "text/html; charset=UTF-8",
        //   "via" : "1.1 fra1-10"
        // }
        mediaId = path.basename(headers.location);
        callback();
      });
    },
    
    // Set video metadata and preset
    function(callback){
      
      async.parallel([

          // Update video metadata on Vimeo
          // TODO Replace name and description when available in video package
          function(callback){
            self.vimeo.request({
              "method" : "PATCH",
              "path" : "/videos/" + mediaId,
              "query" : {
                "name" : "Video name",
                "description" : "Video description",
                "license" : "by",
                "privacy.view" : "nobody",
                "privacy.embed" : "private",
                "review_link" : false
              }
            }, function(error, body, statusCode, headers){
              callback(error);
            });
          },

          // Add preset to the video
          function(callback){
            self.vimeo.request({
              "method" : "PUT",
              "path" : "/videos/" + mediaId + "/presets/" + presetId
            }, function(error, body, statusCode, headers){
              callback(error);
            });
          }

        ], function(error, result){
          callback(error);
        });

    }

  ], function(error, results){
    callback(error, mediaId);
  });
  
};

/**
 * Gets information about a video hosted by Vimeo.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       pictures : [
 *         {
 *           width : 100,
 *           height : 75,
 *           link : "https://i.vimeocdn.com/video/530303243_100x75.jpg"
 *         },
 *         ...
 *       ],
 *       files : [
 *         {
 *           quality : 0, // 0 = mobile, 1 = sd, 2 = hd
 *           width : 640,
 *           height : 360,
 *           link : "https://player.vimeo.com/external/135956519.sd.mp4?s=01ffd473e33e1af14c86effe71464d15&profile_id=112&oauth2_token_id=80850094"
 *         },
 *         ...
 *       ]
 *     }
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The Vimeo id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
VimeoProvider.prototype.getVideoInfo = function(mediaId, callback){
  if(mediaId){
    var self = this;

    // Ask Vimeo for video information
    this.vimeo.request({method : "GET", path : "/videos/" + mediaId}, function(error, body, statusCode, headers){
      var info = null;

      if(!error){
        info = { available : (body.status === "available") };

        // Got video thumbnail in several formats
        // Keep only essential information (width, height and url)
        if(body.pictures && body.pictures.sizes){
          var pictures = [];
          for(var i = 0 ; i < body.pictures.sizes.length ; i++){
            var picture = body.pictures.sizes[i];
            pictures.push({
              width : picture.width,
              height : picture.height,
              link : picture.link
            });
          }
          info["pictures"] = pictures;
        }

        // Got direct access to video files and formats
        // Keep only files with supported quality (see qualitiesMap)
        if(body.files){
          var files = [];
          for(var i = 0 ; i < body.files.length ; i++){
            var file = body.files[i];

            if(self.qualitiesMap[file.quality] != undefined){
              files.push({
                quality : self.qualitiesMap[file.quality],
                width : file.width,
                height : file.height,
                link : file.link_secure
              });
            }
          }
          info["files"] = files;
        }
      }

      callback(error, info);
    });
  }
};