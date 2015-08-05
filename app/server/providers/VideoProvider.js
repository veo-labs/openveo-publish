"use strict"

/**
 * @module publish-providers
 */

// Module dependencies
var util = require("util");
var openVeoAPI = process.requireModule("openveo-api");

/**
 * Defines a VideoProvider class to get and save videos.
 *
 * @class VideoProvider
 * @constructor
 * @extends EntityProvider
 * @param {Database} database The database to interact with
 */
function VideoProvider(database){
  openVeoAPI.EntityProvider.prototype.init.call(this, database, "videos");
}

module.exports = VideoProvider;
util.inherits(VideoProvider, openVeoAPI.EntityProvider);

/**
 * Updates video state.
 *
 * @method updateVideoState
 * @async
 * @param {String} id The id of the video
 * @param {String} oldState The actual state of the video
 * @param {String} newState The new state of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
VideoProvider.prototype.updateVideoState = function(id, oldState, newState, callback){
  this.database.updateMany(this.collection, {id : {$in : id}, state : oldState}, {state : newState}, function(error){
    if(callback)
      callback(error);
  });
};