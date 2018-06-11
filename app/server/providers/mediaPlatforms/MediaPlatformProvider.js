'use strict';

/**
 * @module providers
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Defines a MediaPlatformProvider to interact with media platforms. Use factory to get an instance of the appropriate
 * MediaPlatformProvider.
 *
 * @class MediaPlatformProvider
 * @extends EventEmitter
 * @constructor
 * @param {Object} providerConf A media platform configuration object, it's structure depend on the provider's type, see
 * extended objects for more information
 */
function MediaPlatformProvider(providerConf) {
  MediaPlatformProvider.super_.call(this);

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

module.exports = MediaPlatformProvider;
util.inherits(MediaPlatformProvider, EventEmitter);

// Media qualities
/**
 * @property QUALITIES
 * @type Object
 * @static
 * @final
 */
MediaPlatformProvider.QUALITIES = {
  MOBILE: 0,
  SD: 1,
  HD: 2
};
Object.freeze(MediaPlatformProvider.QUALITIES);

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
MediaPlatformProvider.prototype.upload = function() {
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
MediaPlatformProvider.prototype.remove = function() {
  throw new Error('upload method not implemented for this media platform provider');
};

/**
 * Updates a media on the platform.
 *
 * Depending on the platform and what is supported on it, some media properties might be updated and others not.
 * If media has several resources on the platform, the same update will be performed on all resources.
 *
 * @method update
 * @async
 * @param {Object} media The media
 * @param {Array} media.mediaId The list of media resource ids
 * @param {Object} data The media datas to update
 * @param {Boolean} force true to force the update even if datas haven't changed, false otherwise
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
MediaPlatformProvider.prototype.update = function(media, data, force, callback) {
  callback();
};

/**
 * Gets information about a media from the platform.
 *
 * @method getMediaInfo
 * @async
 * @param {String} mediaId The platform id of the media
 * @param {String} expectedDefintion The expected media definition
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media
 */
MediaPlatformProvider.prototype.getMediaInfo = function() {
  throw new Error('getMediaInfo method not implemented for this media platform provider');
};
