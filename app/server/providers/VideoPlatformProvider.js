"use strict"

/** 
 * Saves provider configuration.
 * Use function VideoPlatformProvider.getProvider to get an instance of
 * the appropriate video platform provider.
 * @param Object providerConf A video platform configuration object
 * it's structure depend on the provider's type, see extended objects for
 * more information
 */
function VideoPlatformProvider(providerConf){
  this.conf = providerConf;

  if(!this.conf)
    throw new Error("No provider configuration");
}

module.exports = VideoPlatformProvider;

/**
 * Gets an instance of a VideoPlatformProvider giving a type and a 
 * configuration object.
 * @param String type The type of the provider platform to instanciate
 * @param Object providerConf A video platform configuration object,
 * it's structure depend on the provider's type, see extended objects for
 * more information
 * @return VideoPlatformProvider An instance of a VideoPlatformProvider
 * sub object
 */
VideoPlatformProvider.getProvider = function(type, providerConf){

  if(type && providerConf){

    switch(type){
        
      case "vimeo":
        var VimeoProvider = process.requirePublish("app/server/providers/videoPlatforms/VimeoProvider.js");
        return new VimeoProvider(providerConf);
      break;
        
      default: 
        throw new Error("Unknown video plateform type");
    }

  }

};

/**
 * Uploads a video to the platform.
 * @param Function callback The function to call when the upload is done
 *   - Error The error if an error occurred, null otherwise 
 */
VideoPlatformProvider.prototype.upload = function(callback){throw new Error("upload method not implemented for this video platform provider");}