'use strict';

/**
 * @module providers
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Defines a VideoPlatformProvider to interact with video
 * platforms. Use videoPlatformFactory to get an instance of the
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
  VideoPlatformProvider.super_.call(this);

  Object.defineProperties(this, {

    /**
     * The video platform's configuration.
     *
     * @property conf
     * @type Object
     * @final
     */
    conf: {value: providerConf}

  });

  if (!this.conf)
    throw new Error('No provider configuration');
}

module.exports = VideoPlatformProvider;
util.inherits(VideoPlatformProvider, EventEmitter);

// Video qualities
/**
 * @property QUALITIES
 * @type Object
 * @static
 * @final
 */
VideoPlatformProvider.QUALITIES = {
  MOBILE: 0,
  SD: 1,
  HD: 2
};
Object.freeze(VideoPlatformProvider.QUALITIES);

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
 * Removes a video from the platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Video media IDs array of videos to remove
 * @param {Function} callback The function to call when the remove
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.remove = function() {
  throw new Error('upload method not implemented for this video platform provider');
};

/**
 * Configures a video on the platform.
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
 *       sources: {
 *         files : [
 *           {
 *             quality : 0, // 0 = mobile, 1 = sd, 2 = hd
 *             width : 640,
 *             height : 360,
 *             link : "https://player.vimeo.com/external/135956519.sd.mp4?s=01ffd473e33e1af14c86effe71464d15&profile_id=112&oauth2_token_id=80850094"
 *           },
 *           ...
 *         ],
 *         adaptive : [
 *           {
 *            link : 'http://streaming/platform/mp4:video.mp4/manifest.mpd'
 *            mimeType : 'application/dash+xml'
 *           },
 *           ...
 *         ]
 *       }
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
