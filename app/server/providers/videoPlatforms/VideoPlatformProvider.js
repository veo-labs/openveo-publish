'use strict';

/**
 * @module providers
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Defines a VideoPlatformProvider to interact with media platforms. Use factory to get an instance of the appropriate
 * VideoPlatformProvider.
 *
 * @class VideoPlatformProvider
 * @extends EventEmitter
 * @constructor
 * @param {Object} providerConf A media platform configuration object, it's structure depend on the provider's type, see
 * extended objects for more information
 */
function VideoPlatformProvider(providerConf) {
  VideoPlatformProvider.super_.call(this);

  Object.defineProperties(this, {

    /**
     * The media platform's configuration.
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

// Media qualities
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
 * Uploads a media to the platform.
 *
 * @method upload
 * @async
 * @param {String} mediaFilePath The absolute path of the media to upload
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **String** The media id on the platform
 */
VideoPlatformProvider.prototype.upload = function() {
  throw new Error('upload method not implemented for this media platform provider');
};

/**
 * Removes a media from the platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Platform media ids to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.remove = function() {
  throw new Error('upload method not implemented for this media platform provider');
};

/**
 * Configures a media on the platform.
 *
 * Depending on the platform, some media properties must be set after the upload of the media.
 *
 * @method configure
 * @async
 * @param {String} mediaId The id of the media
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.configure = function(mediaId, callback) {
  callback();
};

/**
 * Gets information about a media from the platform.
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The platform id of the media
 * @param {String} expectedDefintion The expected media definition
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media
 */
VideoPlatformProvider.prototype.getVideoInfo = function() {
  throw new Error('getVideoInfo method not implemented for this media platform provider');
};
