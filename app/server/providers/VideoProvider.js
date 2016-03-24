'use strict';

/**
 * @module publish-providers
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a VideoProvider class to get and save videos.
 *
 * @class VideoProvider
 * @constructor
 * @extends EntityProvider
 * @param {Database} database The database to interact with
 */
function VideoProvider(database) {
  openVeoAPI.EntityProvider.prototype.init.call(this, database, 'videos');
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
VideoProvider.prototype.updateVideoState = function(id, oldState, newState, callback) {
  this.database.update(this.collection,
    {
      id: {
        $in: id
      },
      state: oldState
    },
    {
      state: newState
    },
    function(error) {
      if (callback)
        callback(error);
    });
};

/**
 * Fetches a list of videos with pagination.
 *
 * @method getPaginatedFilteredEntities
 * @async
 * @param {Object} filter Collection of filters formatted like MongoDB filters
 * @param {Number} limit The expected number of videos per page
 * @param {Number} page The index of the page to retrieve
 * @param {Object} sort Collection of keys to sort with the order value (-1 : desc, 1 asc) e.g. {"name":-1, age:"1"}
 * @param {Function} callback Function to call when its done with :
 *  - **Error** The error if an error occurred, null otherwise
 *  - **Array** The list of videos
 */
VideoProvider.prototype.getPaginatedFilteredEntities = function(filter, limit, page, sort, callback) {
  this.database.search(this.collection, filter, {
    _id: 0,
    originalPackagePath: 0,
    packageType: 0,
    lastState: 0,
    lastTransition: 0
  }, limit, page, sort, callback);
};

/**
 * Gets an entity.
 *
 * @method getOne
 * @async
 * @param {String} id The entity id
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The entity
 */
VideoProvider.prototype.getOne = function(id, callback) {
  this.database.get(this.collection, {
    id: id
  },
    {
      _id: 0,
      originalPackagePath: 0,
      packageType: 0,
      lastState: 0,
      lastTransition: 0
    },
  1, function(error, entities) {
    if (entities && entities.length)
      callback(error, entities[0]);
    else
      callback(error);
  });
};

/**
 * Creates videos indexes.
 *
 * @method createIndexes
 * @async
 * @param {Function} callback Function to call when it's done with :
 *  - **Error** An error if something went wrong, null otherwise
 */
VideoProvider.prototype.createIndexes = function(callback) {
  this.database.createIndexes(this.collection, [
    {key: {title: 'text', description: 'text'}, weights: {title: 2}, name: 'querySearch'}
  ], function(error, result) {
    if (result && result.note)
      process.logger.debug('Create videos indexes : ' + result.note);

    callback(error);
  });
};
