'use strict';

/**
 * @module publish-providers
 */

// Module dependencies
var path = require('path');
var util = require('util');
var fs = require('fs');
var vimeoAPI = require('vimeo');
var async = require('async');
var VideoPlatformProvider = process.requirePublish('app/server/providers/VideoPlatformProvider.js');

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
function VimeoProvider(providerConf) {
  VideoPlatformProvider.call(this, providerConf);

  /**
   * Vimeo client library.
   *
   * @property vimeo
   * @type Vimeo
   */
  this.vimeo = new vimeoAPI.Vimeo(this.conf.clientId, this.conf.clientSecret, this.conf.accessToken);

  /**
   * List of accepted video qualities.
   *
   * @property qualitiesMap
   * @type Object
   */
  this.qualitiesMap = {
    sd: VideoPlatformProvider.SD_QUALITY,
    mobile: VideoPlatformProvider.MOBILE_QUALITY,
    hd: VideoPlatformProvider.HD_QUALITY
  };
}

module.exports = VimeoProvider;
util.inherits(VimeoProvider, VideoPlatformProvider);

/**
 * Uploads a video to the Vimeo platform.
 *
 * @method upload
 * @async
 * @param {String} videoFilePath System path of the video to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VimeoProvider.prototype.upload = function(videoFilePath, callback) {
  var self = this;

  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/@openveo/publish/tmp/
  var mediaId;

  async.series([

    // Checks user quota
    function(callback) {

      self.vimeo.request({
        method: 'GET',
        path: '/me'
      },
      function(error, body) {
        if (error)
          return callback(error);

        // User does not have permission to upload
        if (!body.upload_quota)
          callback(new Error('User does not have permission to upload on Vimeo'));

        // Checks the size of the video to upload
        fs.stat(videoFilePath, function(error, stats) {
          if (error)
            callback(error);
          else if (stats.size >= body.upload_quota.space.free)
            callback(new Error('No more space left in Vimeo account'));
          else
            callback();
        });

      });

    },

    // Upload video
    function(callback) {
      self.vimeo.streamingUpload(videoFilePath, function(error, body, statusCode, headers) {

        if (error) {
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
    }

  ], function(error) {
    callback(error, mediaId);
  });

};

/**
 * Gets information about a video hosted by Vimeo.
 *
 * Video is considered available if the expected video definition has been transcoded by the video platform.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       sources : {
 *         files : [
 *           {
 *             quality : 0, // 0 = mobile, 1 = sd, 2 = hd
 *             width : 640,
 *             height : 360,
 *             link : "https://player.vimeo.com/external/135956519.sd.mp4?s=01ffd473e33e1af14c86effe71464d15&profile_id=112&oauth2_token_id=80850094"
 *           },
 *           ...
 *         ]
 *       }
 *     }
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The Vimeo id of the video
 * @param {String} expectedDefintion The expected video definition (e.g. 720, 1080)
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
VimeoProvider.prototype.getVideoInfo = function(mediaIds, expectedDefinition, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;

  var parallel = [];
  var infos = {sources: [], available: true};
  mediaIds.forEach(function(mediaId) {
    parallel.push(function(cb) {

      // Ask Vimeo for video information
      self.vimeo.request({method: 'GET', path: '/videos/' + mediaId}, function(error, body) {
        var available = !expectedDefinition ? true : false;

        if (!error) {
          var info = {};

          // Got direct access to video files and formats
          // Keep only files with supported quality (see qualitiesMap)
          if (body.files) {
            var files = [];
            for (var j = 0; j < body.files.length; j++) {
              var file = body.files[j];

              if (self.qualitiesMap[file.quality] != undefined) {
                files.push({
                  quality: self.qualitiesMap[file.quality],
                  width: file.width,
                  height: file.height,
                  link: file.link_secure
                });

                // Vimeo set the video as "available" as soon as any definition has been transcoded not when all
                // definitions have been transcoded
                // Set the video as "available" as soon as the expected definition has been transcoded
                // If video height is not standard, Vimeo eventually change its definition to something close, thus
                // we add a factor error of 64 to deal with those cases
                if (Math.abs(file.height - expectedDefinition) < 64)
                  available = true;
              }
            }
            info.files = files;
          }

          info.available = (body.status === 'available') && available;
          infos.sources.push(info);
        }

        cb(error);
      });
    });
  });

  async.parallel(parallel, function(error) {
    if (error)
      callback(error);
    else {
      for (var i = 0; i < infos.sources.length; i++) {
        infos.available = infos.available && infos.sources[i].available;
      }
      callback(null, infos);
    }
  });
};


/**
 * Removes a video from the Vimeo platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Media Ids array of videos to remove
 * @param {Function} callback The function to call when the remove
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VimeoProvider.prototype.remove = function(mediaIds, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;
  var parallel = [];

  mediaIds.forEach(function(mediaId) {
    parallel.push(function(callback) {
      self.vimeo.request({method: 'DELETE', path: '/videos/' + mediaId}, function(error, body, statusCode, headers) {
        if (error) {
          callback(error);
          return;
        } else if (statusCode != 204) {
          callback(new Error(statusCode));
          return;
        }
        callback();
      });
    });
  });

  async.parallel(parallel, function(error) {
    callback(error);
  });
};
