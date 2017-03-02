'use strict';

/**
 * @module providers
 */

var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');

/**
 * Defines a factory to create video platforms' providers.
 *
 * @class videoPlatformFactory
 * @static
 */

/**
 * Gets an instance of a VideoPlatformProvider giving a type and a
 * configuration object.
 *
 * @method get
 * @static
 * @param {String} type The type of the provider platform to instanciate
 * @param {Object} providerConf A video platform configuration object,
 * it's structure depend on the provider's type, see extended objects
 * for more information
 * @return {VideoPlatformProvider} An instance of a VideoPlatformProvider sub class
 * @throws {Error} The configuration doesn't satisfy the provider or given type is not available
 */
module.exports.get = function(type, providerConf) {
  if (type && providerConf) {
    switch (type) {
      case TYPES.VIMEO:
        var VimeoProvider = process.requirePublish('app/server/providers/videoPlatforms/VimeoProvider.js');
        return new VimeoProvider(providerConf);
      case TYPES.YOUTUBE:
        var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
        var ConfigurationProvider = process.requirePublish('app/server/providers/ConfigurationProvider.js');
        var YoutubeProvider = process.requirePublish('app/server/providers/videoPlatforms/youtube/YoutubeProvider.js');
        var GoogleOAuthHelper = process.requirePublish(
          'app/server/providers/videoPlatforms/youtube/GoogleOAuthHelper.js'
        );
        var coreApi = process.api.getCoreApi();
        var configurationModel = new ConfigurationModel(new ConfigurationProvider(coreApi.getDatabase()));
        return new YoutubeProvider(providerConf, new GoogleOAuthHelper(configurationModel));
      case TYPES.WOWZA:
        var WowzaProvider = process.requirePublish('app/server/providers/videoPlatforms/WowzaProvider.js');
        return new WowzaProvider(providerConf);
      case TYPES.LOCAL:
        var LocalProvider = process.requirePublish('app/server/providers/videoPlatforms/LocalProvider.js');
        return new LocalProvider(providerConf);

      default:
        throw new Error('Unknown video plateform type');
    }
  }

  return null;
};
