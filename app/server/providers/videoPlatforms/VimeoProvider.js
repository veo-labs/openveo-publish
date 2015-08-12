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
VideoPlatformProvider.prototype.upload = function(videoPackage, callback){
  var self = this;
  
  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/openveo-publish/tmp/
  var videoTmpDir = path.dirname(videoPackage.packagePath);
  var presetId, videoId;
  
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
        videoId = path.basename(headers.location);
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
              "path" : "/videos/" + videoId,
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
              "path" : "/videos/" + videoId + "/presets/" + presetId
            }, function(error, body, statusCode, headers){
              callback(error);
            });
          }

        ], function(error, result){
          callback(error);
        });

    }

  ], function(error, results){
    callback(error, videoId);
  });
  
};