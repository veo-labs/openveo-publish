'use strict';

/**
 * @module publish-providers
 */

// Module dependencies
var path = require('path');
var util = require('util');
var async = require('async');
var FTPS = require('ftps');
var shortid = require('shortid');
var VideoPlatformProvider = process.requirePublish('app/server/providers/VideoPlatformProvider.js');

/**
 * Defines a WowzaProvider class to interact with wowza platform
 * (https://wowza.com/).
 *
 * @example
 *     // providerConf example
 *     {
 *       "clientId" : "****",
 *       "clientSecret" : "****",
 *       "accessToken" : "****"
 *     }
 *
 * @class WowzaProvider
 * @constructor
 * @extends VideoPlatformProvider
 * @param {Object} providerConf A wowza configuration object
 */
function WowzaProvider(providerConf) {
  VideoPlatformProvider.call(this, providerConf);

  this.wowzaConf = providerConf;

  this.ftps = new FTPS({
    host: providerConf.host, // required
    username: providerConf.user, // required
    password: providerConf.pwd, // required
    protocol: providerConf.protocol, // optional, values : 'ftp', 'sftp', 'ftps',... default is 'ftp'
    // protocol is added on beginning of host, ex : sftp://domain.com in this case
    port: providerConf.port, // optional
    // port is added to the end of the host, ex: sftp://domain.com:22 in this case
    escape: true, // optional, used for escaping shell characters (space, $, etc.), default: true
    retries: 2, // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
    timeout: 10,
    requiresPassword: true, // Optional, defaults to true
    autoConfirm: false // Optional, is used to auto confirm ssl questions on sftp or fish protocols, defaults to false
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
      self.ftps.put(videoFilePath, self.wowzaConf.vodFilePath + tmpId + path.extname(videoFilePath))
              .exec(function(err, res) {

                // err will be null (to respect async convention)
                // res is an hash with { error: stderr || null, data: stdout }
                if (res.error)
                  callback(res.error);
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
    var basePath = self.wowzaConf.streamPath + '/' + mediaId;
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
