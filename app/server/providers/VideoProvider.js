"use scrict"

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");

/**
 * Creates a VideoProvider.
 * @param Database database The database to interact with
 */
function VideoProvider(database){
  openVeoAPI.EntityProvider.prototype.init.call(this, database, "videos");
}

module.exports = VideoProvider;
util.inherits(VideoProvider, openVeoAPI.EntityProvider);

/**
 * Removes a video.
 * @param String id The id of the video
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
VideoProvider.prototype.remove = function(id, callback){
  this.database.remove(this.collection, {id : parseInt(id)}, callback);
};

/**
 * Updates a video.
 * @param String id The id of the video
 * @param Object data The video data
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
VideoProvider.prototype.update = function(id, data, callback){
  this.database.update(this.collection, {id : parseInt(id)}, data, function(error){
    if(callback)
      callback(error);
  });
};

/**
 * Updates video state.
 * @param String id The id of the video
 * @param String oldState The actual state of the video
 * @param String newState The new state of the video
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
VideoProvider.prototype.updateVideoState = function(id, oldState, newState, callback){
  this.database.update(this.collection, {id : parseInt(id), state : oldState}, {state : newState}, function(error){
    if(callback)
      callback(error);
  });
};