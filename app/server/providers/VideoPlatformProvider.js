'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * @module publish-providers
 */

/**
 * Defines a VideoPlatformProvider class to interface with video
 * platforms. Use getProvider method to get an instance of the
 * appropriate VideoPlatformProvider.
 *
 * @class VideoPlatformProvider
 * @extends EventEmitter
 * @constructor
 * @param {Object} providerConf A video platform configuration object
 * it's structure depend on the provider's type, see extended objects
 * for more information
 */
function VideoPlatformProvider(providerConf) {
  EventEmitter.call(this);

  this.conf = providerConf;

  if (!this.conf)
    throw new Error('No provider configuration');
}

module.exports = VideoPlatformProvider;
util.inherits(VideoPlatformProvider, EventEmitter);

// Video qualities
VideoPlatformProvider.MOBILE_QUALITY = 0;
VideoPlatformProvider.SD_QUALITY = 1;
VideoPlatformProvider.HD_QUALITY = 2;

/**
 * Gets an instance of a VideoPlatformProvider giving a type and a
 * configuration object.
 *
 * @method getProvider
 * @static
 * @param {String} type The type of the provider platform to instanciate
 * @param {Object} providerConf A video platform configuration object,
 * it's structure depend on the provider's type, see extended objects
 * for more information
 * @return {VideoPlatformProvider} An instance of a
 * VideoPlatformProvider sub class
 */
VideoPlatformProvider.getProvider = function(type, providerConf) {

  if (type && providerConf) {

    switch (type) {

      case 'vimeo':
        var VimeoProvider = process.requirePublish('app/server/providers/videoPlatforms/VimeoProvider.js');
        return new VimeoProvider(providerConf);
      case 'youtube':
        var YoutubeProvider = process.requirePublish('app/server/providers/videoPlatforms/youtube/YoutubeProvider.js');
        return new YoutubeProvider(providerConf);
      case 'wowza':
        var WowzaProvider = process.requirePublish('app/server/providers/videoPlatforms/WowzaProvider.js');
        return new WowzaProvider(providerConf);

      default:
        throw new Error('Unknown video plateform type');
    }

  }

};

/**
 * Uploads a video to the platform.
 *
 * @method upload
 * @async
 * @param {String} videoFilePath System path of the video to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.upload = function() {
  throw new Error('upload method not implemented for this video platform provider');
};

/**
 * Configure video on the platform.
 *
 * Depending on the platform, some video properties must be set after the
 * upload of the video.
 *
 * @method configure
 * @async
 * @param {String} mediaId The id of the video
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.configure = function(mediaId, callback) {
  callback();
};

/**
 * Gets information about a video from video platform.
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
 * @param {String} mediaId The platform id of the video
 * @param {String} expectedDefintion The expected video definition (e.g. 720, 1080)
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
VideoPlatformProvider.prototype.getVideoInfo = function() {
  throw new Error('getVideoInfo method not implemented for this video platform provider');
};
