'use strict';

/**
 * @module providers
 */

var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');

/**
 * Defines a factory to create media platforms' providers.
 *
 * @class mediaPlatformFactory
 * @static
 */

/**
 * Gets an instance of a MediaPlatformProvider giving a type and a configuration object.
 *
 * @method get
 * @static
 * @param {String} type The type of the provider platform to instanciate
 * @param {Object} providerConf A media platform configuration object, it's structure depend on the provider's type,
 * see extended objects for more information
 * @return {MediaPlatformProvider} An instance of a MediaPlatformProvider sub class
 * @throws {Error} The configuration doesn't satisfy the provider or given type is not available
 */
module.exports.get = function(type, providerConf) {
  if (type && providerConf) {
    switch (type) {
      case TYPES.VIMEO:
        var VimeoProvider = process.requirePublish('app/server/providers/mediaPlatforms/VimeoProvider.js');
        return new VimeoProvider(providerConf);
      case TYPES.YOUTUBE:
        var YoutubeProvider = process.requirePublish('app/server/providers/mediaPlatforms/youtube/YoutubeProvider.js');
        var GoogleOAuthHelper = process.requirePublish(
          'app/server/providers/mediaPlatforms/youtube/GoogleOAuthHelper.js'
        );
        return new YoutubeProvider(providerConf, new GoogleOAuthHelper());
      case TYPES.WOWZA:
        var WowzaProvider = process.requirePublish('app/server/providers/mediaPlatforms/WowzaProvider.js');
        return new WowzaProvider(providerConf);
      case TYPES.LOCAL:
        var LocalProvider = process.requirePublish('app/server/providers/mediaPlatforms/LocalProvider.js');
        return new LocalProvider(providerConf);

      default:
        throw new Error('Unknown media plateform type');
    }
  }

  return null;
};
