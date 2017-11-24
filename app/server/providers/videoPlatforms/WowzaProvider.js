'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var async = require('async');
var FTPS = require('ftps');
var shortid = require('shortid');
var VideoPlatformProvider = process.requirePublish('app/server/providers/videoPlatforms/VideoPlatformProvider.js');

/**
 * Defines a WowzaProvider class to interact with [wowza platform](https://wowza.com/).
 *
 * @class WowzaProvider
 * @extends VideoPlatformProvider
 * @constructor
 * @param {Object} providerConf A wowza configuration object
 * @param {String} providerConf.host Server host
 * @param {String} providerConf.user Wowza user
 * @param {String} providerConf.pwd Wowza user password
 * @param {String} [providerConf.protocol=ftp] Server protocol (ftp, frtp, sftp or ftps), protocol is added on
 * beginning of host, ex : sftp://domain.com in this case
 * @param {Number} [providerConf.port] Server port added to the end of the host, ex: sftp://domain.com:22 in this case
 */
function WowzaProvider(providerConf) {
  WowzaProvider.super_.call(this, providerConf);

  Object.defineProperties(this, {

    ftps: {
      value: new FTPS({
        host: this.conf.host,
        username: this.conf.user,
        password: this.conf.pwd,
        protocol: this.conf.protocol,
        port: this.conf.port,

        // optional, used for escaping shell characters (space, $, etc.), default: true
        escape: true,

        // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
        retries: 2,
        timeout: 10,

        // Optional, defaults to true
        requiresPassword: true,

        // Optional, is used to auto confirm ssl questions on sftp or fish protocols, defaults to false
        autoConfirm: false
      })
    }

  });
}

module.exports = WowzaProvider;
util.inherits(WowzaProvider, VideoPlatformProvider);

/**
 * Uploads a video to the Wowza platform.
 *
 * TODO Find a way to avoid sending default preset request on Wowza
 * for each upload.
 *
 * @method upload
 * @async
 * @param {String} videoFilePath System path of the video to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
WowzaProvider.prototype.upload = function(videoFilePath, callback) {
  var self = this;

  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/@openveo/publish/tmp/
  var mediaId;

  async.series([

    // Checks user quota
    function(callback) {
      var tmpId = shortid.generate();
      self.ftps.put(videoFilePath, self.conf.vodFilePath + tmpId + path.extname(videoFilePath))
              .exec(function(err, res) {

                // err will be null (to respect async convention)
                // res is an hash with { error: stderr || null, data: stdout }
                if (res.error)
                  callback(new Error(res.error));
                else if (err)
                  callback(err);
                else {
                  mediaId = tmpId;
                  callback();
                }
              });
    }
  ], function(error) {
    callback(error, mediaId);
  });
};

/**
 * Gets information about a video hosted by Wowza.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       sources : {
 *         adaptive:[
 *         {
 *           mimeType : application/dash+xml,
 *           link : "http://192.168.1.20:1935/openveo/mp4:sample.mp4/manifest.mpd"
 *         },
 *         ...
 *       ]
 *     }
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The wowza id of the video
 * @param {String} expectedDefintion The expected video definition (e.g. 720, 1080) _ not use on wowza
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
WowzaProvider.prototype.getVideoInfo = function(mediaIds, expectedDefinition, callback) {
  var self = this;

  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  var infos = {sources: [], available: true};
  mediaIds.forEach(function(mediaId) {
    var info = {};
    var basePath = self.conf.streamPath + '/' + mediaId;
    info.adaptive = [
      {
        mimeType: 'application/dash+xml',
        link: basePath + '.mp4/manifest.mpd'
      },
      {
        mimeType: 'application/x-mpegURL',
        link: basePath + '.mp4/playlist.m3u8'
      },
      {
        mimeType: 'application/f4m+xml',
        link: basePath + '.mp4/manifest.f4m'
      }
    ];
    infos.sources.push(info);
  });

  callback(null, infos);
};

/**
 * Removes a video from the wowza platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Media Ids array of videos to remove
 * @param {Function} callback The function to call when the remove
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
WowzaProvider.prototype.remove = function(mediaIds, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;
  var series = [];
  var videoFinalPath = path.normalize(self.conf.vodFilePath);

  mediaIds.forEach(function(mediaId) {
    series.push(function(callback) {
      self.ftps.rm(videoFinalPath + mediaId + '.mp4').exec(function(error, res) {
        if (error || res.error) {
          process.logger.warn((error && error.message) || res.error, {
            action: 'RemoveVideo',
            path: videoFinalPath
          });
          callback(error || new Error(res.error));
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
