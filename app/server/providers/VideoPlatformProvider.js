"use strict"

/**
 * @module publish-providers
 */

/** 
 * Saves provider configuration.
 *
 * Defines a VideoPlatformProvider class to interface with video
 * platforms. Use getProvider method to get an instance of the
 * appropriate VideoPlatformProvider.
 *
 * @class VideoPlatformProvider
 * @constructor
 * @extends EntityProvider
 * @param {Object} providerConf A video platform configuration object
 * it's structure depend on the provider's type, see extended objects
 * for more information
 */
function VideoPlatformProvider(providerConf){
  this.conf = providerConf;

  if(!this.conf)
    throw new Error("No provider configuration");
}

module.exports = VideoPlatformProvider;

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
 *
 * @method upload
 * @async
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoPlatformProvider.prototype.upload = function(callback){throw new Error("upload method not implemented for this video platform provider");}

/**
 * Gets information about a video from video platform.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       pictures : [
 *         {
 *           width : 100,
 *           height : 75,
 *           link : "https://i.vimeocdn.com/video/530303243_100x75.jpg"
 *         },
 *         ...
 *       ],
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
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
VideoPlatformProvider.prototype.getVideoInfo = function(callback){throw new Error("getVideoInfo method not implemented for this video platform provider");}