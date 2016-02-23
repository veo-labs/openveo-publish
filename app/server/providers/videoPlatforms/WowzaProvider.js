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
 * Defines a VimeoProvider class to interact with wowza platform
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
    protocol: 'sftp', // optional, values : 'ftp', 'sftp', 'ftps',... default is 'ftp'
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
 * Uploads a video to the Vimeo platform.
 *
 * TODO Find a way to avoid sending default preset request on Vimeo
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
 * Gets information about a video hosted by Vimeo.
 *
 * Video is considered available if the expected video definition has been transcoded by the video platform.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
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
 * @param {String} expectedDefintion The expected video definition (e.g. 720, 1080)
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
WowzaProvider.prototype.getVideoInfo = function(mediaId, expectedDefinition, callback) {
  var self = this;

  if (!mediaId) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  // Ask Vimeo for video information
  var info = {};
  var basePath = self.wowzaConf.streamPath + '/' + mediaId;
  info.sources = {
    adaptive: [
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
    ]
  };
  info.available = true;

  callback(null, info);
};
