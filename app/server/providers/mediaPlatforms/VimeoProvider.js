'use strict';

/**
 * @module publish/providers/mediaPlatforms/VimeoProvider
 */

var util = require('util');
var fs = require('fs');
var vimeoAPI = require('vimeo');
var async = require('async');
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Defines a VimeoProvider class to interact with [vimeo platform](https://vimeo.com/).
 *
 * @class VimeoProvider
 * @extends module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf A vimeo configuration object
 * @param {String} providerConf.clientId Vimeo client id
 * @param {String} providerConf.clientSecret Vimeo client secret
 * @param {String} providerConf.accessToken Vimeo client access token
 */
function VimeoProvider(providerConf) {
  VimeoProvider.super_.call(this, providerConf);

  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/VimeoProvider~VimeoProvider */
    {

      /**
       * Vimeo client library.
       *
       * @type {Vimeo}
       * @instance
       * @readonly
       */
      vimeo: {value: new vimeoAPI.Vimeo(this.conf.clientId, this.conf.clientSecret, this.conf.accessToken)},

      /**
       * List of accepted media qualities.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      qualitiesMap: {
        value: {
          sd: MediaPlatformProvider.QUALITIES.SD,
          mobile: MediaPlatformProvider.QUALITIES.MOBILE,
          hd: MediaPlatformProvider.QUALITIES.HD
        }
      }

    }

  );
}

module.exports = VimeoProvider;
util.inherits(VimeoProvider, MediaPlatformProvider);

/**
 * Uploads a media to the Vimeo platform.
 *
 * @param {String} mediaFilePath The absolute system path of the media to upload
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~uploadCallback} callback
 * The function to call when it's done
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
          return callback(new Error('User does not have permission to upload on Vimeo'));

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
      self.vimeo.upload(
        mediaFilePath,
        function(uri) {
          mediaId = uri.match(/\/videos\/(.*)$/)[1];
          callback();
        },
        function(bytesUploaded, bytesTotal) {},
        function(error) {
          callback(error);
        }
      );
    }

  ], function(error) {
    callback(error, mediaId);
  });

};

/**
 * Gets information about medias hosted by Vimeo.
 *
 * Media is considered available if the expected media height has been transcoded by the media platform.
 *
 * @param {Array} mediasIds The Vimeo ids of the medias
 * @param {Array} expectedMediasHeights The expected medias heights in the same order as medias ids
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~getMediaInfoCallback}
 * callback The function to call when it's done
 */
VimeoProvider.prototype.getMediasInfo = function(mediasIds, expectedMediasHeights, callback) {
  var self = this;

  var parallel = [];
  var infos = {sources: [], available: true};
  mediasIds.forEach(function(mediaId, index) {
    parallel.push(function(cb) {

      // Ask Vimeo for media information
      self.vimeo.request({method: 'GET', path: '/videos/' + mediaId}, function(error, body) {
        var available = false;
        var expectedMediaHeight = expectedMediasHeights[index];

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
                  link: file.link
                });

                // Vimeo set the media as "available" as soon as any definition has been transcoded not when all
                // definitions have been transcoded
                // Set the media as "available" as soon as the expected definition has been transcoded
                // If media height is not standard, Vimeo eventually change its definition to something close, thus
                // we add a factor error of 22% of the expected definition to deal with those cases
                if (Math.abs(file.height - expectedMediaHeight) < (expectedMediaHeight * 0.22))
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
 * @param {Array} mediaIds Vimeo media ids to remove
 * @param {callback} callback The function to call when it's done
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

/**
 * Updates a media resources on the platform.
 *
 * If media has several resources on the platform, the same update will be performed for all resources.
 * Actually only the media title is synchronized with Vimeo.
 *
 * @param {Object} media The media
 * @param {Array} media.mediaId The list of media resource ids
 * @param {Object} data The datas to update
 * @param {String} [data.title] The media title. Be careful only the first 128 characters will be used. Also HTML tags
 * will be removed
 * @param {Boolean} force true to force the update even if title hasn't changed, false otherwise
 * @param {callback} callback The function to call when it's done
 */
VimeoProvider.prototype.update = function(media, data, force, callback) {
  if (!data.title || (data.title === media.title && !force)) return callback();

  var self = this;
  var parallel = [];

  media.mediaId.forEach(function(mediaId) {
    parallel.push(function(callback) {
      self.vimeo.request(
        {
          method: 'PATCH',
          path: '/videos/' + mediaId,
          query: {
            name: data.title.substring(0, 128)
          }
        },
        callback
      );
    });
  });

  async.parallel(parallel, function(error) {
    callback(error);
  });
};
