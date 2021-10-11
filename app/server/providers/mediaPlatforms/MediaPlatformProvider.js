'use strict';

/**
 * @module publish/providers/mediaPlatforms/MediaPlatformProvider
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

  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider */
    {

      /**
       * The media platform's configuration.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      conf: {value: providerConf}

    }

  );

  if (!this.conf)
    throw new Error('No provider configuration');
}

module.exports = MediaPlatformProvider;
util.inherits(MediaPlatformProvider, EventEmitter);

// Media qualities
/**
 * @const
 * @type {Objec}
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
 * @param {String} mediaFilePath The absolute path of the media to upload
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~uploadCallback} callback
 * The function to call when it's done
 */
MediaPlatformProvider.prototype.upload = function() {
  throw new Error('upload method not implemented for this media platform provider');
};

/**
 * Removes a media from the platform.
 *
 * @param {Array} mediaIds Platform media ids to remove
 * @param {callback} callback The function to call when it's done
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
 * @param {Object} media The media
 * @param {Array} media.mediaId The list of media resource ids
 * @param {Object} data The media datas to update
 * @param {Boolean} force true to force the update even if datas haven't changed, false otherwise
 * @param {callback} callback The function to call when it's done
 */
MediaPlatformProvider.prototype.update = function(media, data, force, callback) {
  callback();
};

/**
 * Gets information about a media from the platform.
 *
 * @param {String} mediaId The platform id of the media
 * @param {String} expectedDefintion The expected media definition
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~getMediaInfoCallback}
 * callback The function to call when it's done
 */
MediaPlatformProvider.prototype.getMediaInfo = function() {
  throw new Error('getMediaInfo method not implemented for this media platform provider');
};

/**
 * @callback module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~uploadCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {String} id The media id on the platform
 */

/**
 * @callback module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~getMediaInfoCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Object} information Information about the media
 */
