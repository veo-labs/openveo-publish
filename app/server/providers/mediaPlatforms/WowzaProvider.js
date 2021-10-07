'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var async = require('async');
var FTPS = require('ftps');
var nanoid = require('nanoid').nanoid;
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Defines a WowzaProvider class to interact with [wowza platform](https://wowza.com/).
 *
 * @class WowzaProvider
 * @extends MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf A wowza configuration object
 * @param {String} providerConf.host Server host
 * @param {String} providerConf.user Wowza user
 * @param {String} providerConf.pwd Wowza user password
 * @param {String} [providerConf.protocol=ftp] Server protocol (ftp, frtp, sftp or ftps)
 * @param {Number} [providerConf.port] Server port
 */
function WowzaProvider(providerConf) {
  WowzaProvider.super_.call(this, providerConf);

  Object.defineProperties(this, {

    /**
     * FTPS client.
     *
     * @property ftps
     * @type FTPS
     * @final
     */
    ftps: {
      value: new FTPS({
        host: this.conf.host,
        username: this.conf.user,
        password: this.conf.pwd,
        protocol: this.conf.protocol,
        port: this.conf.port,

        // Optional, used for escaping shell characters (space, $, etc.), default: true
        escape: true,

        // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
        retries: 2,
        timeout: 10,

        // Optional, defaults to true
        requiresPassword: true,

        // Optional, is used to auto confirm SSL questions on sftp or fish protocols, defaults to false
        autoConfirm: false
      })
    }

  });
}

module.exports = WowzaProvider;
util.inherits(WowzaProvider, MediaPlatformProvider);

/**
 * Uploads a media to the Wowza platform.
 *
 * @method upload
 * @async
 * @param {String} mediaFilePath THe absolute system path of the media to upload
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **String** The media id on the Vimeo platform
 */
WowzaProvider.prototype.upload = function(mediaFilePath, callback) {
  var self = this;
  var mediaId = nanoid();

  async.series([

    // Checks user quota
    function(callback) {
      self.ftps.put(mediaFilePath, path.join(self.conf.vodFilePath, mediaId + path.extname(mediaFilePath))).exec(
        function(error, response) {
          if (response && response.error)
            return callback(new Error(response.error));

          callback();
        }
      );
    }
  ], function(error) {
    callback(error, mediaId);
  });
};

/**
 * Gets information about a media hosted by Wowza.
 *
 * @method getMediaInfo
 * @async
 * @param {String} mediaId The Wowza id of the media
 * @param {String} expectedDefintion The expected media definition, not used for this provider
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media
 */
WowzaProvider.prototype.getMediaInfo = function(mediaIds, expectedDefinition, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  var infos = {sources: [], available: true};
  mediaIds.forEach(function(mediaId) {
    var info = {};
    info.adaptive = [
      {
        mimeType: 'application/dash+xml',
        link: mediaId + '.mp4/manifest.mpd'
      },
      {
        mimeType: 'application/x-mpegURL',
        link: mediaId + '.mp4/playlist.m3u8'
      },
      {
        mimeType: 'application/f4m+xml',
        link: mediaId + '.mp4/manifest.f4m'
      }
    ];
    infos.sources.push(info);
  });

  callback(null, infos);
};

/**
 * Removes a media from the Wowza platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Wowza media ids to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
WowzaProvider.prototype.remove = function(mediaIds, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;
  var series = [];
  var mediaFinalPath = path.normalize(self.conf.vodFilePath);

  mediaIds.forEach(function(mediaId) {
    series.push(function(callback) {
      self.ftps.rm(path.join(mediaFinalPath, mediaId + '.mp4')).exec(function(error, response) {
        if (error || response.error) {
          process.logger.warn((error && error.message) || response.error, {
            action: 'WowzaProvider.remove',
            path: mediaFinalPath
          });
          callback(error || new Error(response.error));
        } else {
          callback(null);
        }
      });
    });
  });

  async.series(series, function(error) {
    callback(error);
  });
};
