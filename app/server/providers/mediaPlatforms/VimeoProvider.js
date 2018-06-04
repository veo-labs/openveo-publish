'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var fs = require('fs');
var vimeoAPI = require('vimeo');
var async = require('async');
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Defines a VimeoProvider class to interact with [vimeo platform](https://vimeo.com/).
 *
 * @class VimeoProvider
 * @extends MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf A vimeo configuration object
 * @param {String} providerConf.clientId Vimeo client id
 * @param {String} providerConf.clientSecret Vimeo client secret
 * @param {String} providerConf.accessToken Vimeo client access token
 */
function VimeoProvider(providerConf) {
  VimeoProvider.super_.call(this, providerConf);

  Object.defineProperties(this, {

    /**
     * Vimeo client library.
     *
     * @property vimeo
     * @type Vimeo
     * @final
     */
    vimeo: {value: new vimeoAPI.Vimeo(this.conf.clientId, this.conf.clientSecret, this.conf.accessToken)},

    /**
     * List of accepted media qualities.
     *
     * @property qualitiesMap
     * @type Object
     * @final
     */
    qualitiesMap: {
      value: {
        sd: MediaPlatformProvider.QUALITIES.SD,
        mobile: MediaPlatformProvider.QUALITIES.MOBILE,
        hd: MediaPlatformProvider.QUALITIES.HD
      }
    }

  });
}

module.exports = VimeoProvider;
util.inherits(VimeoProvider, MediaPlatformProvider);

/**
 * Uploads a media to the Vimeo platform.
 *
 * @method upload
 * @async
 * @param {String} mediaFilePath The absolute system path of the media to upload
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **String** The media id on the Vimeo platform
 */
VimeoProvider.prototype.upload = function(mediaFilePath, callback) {
  var self = this;
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

        // Checks the size of the media to upload
        fs.stat(mediaFilePath, function(error, stats) {
          if (error)
            callback(error);
          else if (stats.size >= body.upload_quota.space.free)
            callback(new Error('No more space left in Vimeo account'));
          else
            callback();
        });

      });

    },

    // Upload media
    function(callback) {
      self.vimeo.streamingUpload(mediaFilePath, function(error, body, statusCode, headers) {
        if (error) {
          callback(error);
          return;
        }

        mediaId = path.basename(headers.location);
        callback();
      });
    }

  ], function(error) {
    callback(error, mediaId);
  });

};

/**
 * Gets information about a media hosted by Vimeo.
 *
 * Media is considered available if the expected media definition has been transcoded by the media platform.
 *
 * @method getMediaInfo
 * @async
 * @param {String} mediaId The Vimeo id of the media
 * @param {String} expectedDefintion The expected media definition
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media
 */
VimeoProvider.prototype.getMediaInfo = function(mediaIds, expectedDefinition, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;

  var parallel = [];
  var infos = {sources: [], available: true};
  mediaIds.forEach(function(mediaId) {
    parallel.push(function(cb) {

      // Ask Vimeo for media information
      self.vimeo.request({method: 'GET', path: '/videos/' + mediaId}, function(error, body) {
        var available = !expectedDefinition ? true : false;

        if (!error) {
          var info = {};

          // Got direct access to media files and formats
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

                // Vimeo set the media as "available" as soon as any definition has been transcoded not when all
                // definitions have been transcoded
                // Set the media as "available" as soon as the expected definition has been transcoded
                // If media height is not standard, Vimeo eventually change its definition to something close, thus
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
 * Removes a media from the Vimeo platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Vimeo media ids to remove
 * @param {Function} callback The function to call when it's done
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
