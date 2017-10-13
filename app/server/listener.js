'use strict';

/**
 * @module publish
 */

var async = require('async');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var ConfigurationProvider = process.requirePublish('app/server/providers/ConfigurationProvider.js');

/**
 * Sets event listeners on core and plugins.
 *
 * @class listener
 * @static
 */

/**
 * Handles event when users have been deleted.
 *
 * Videos belonging to these users have to be anonymized.
 * If one of the removed users is the one choosed as the default user for the watcher,
 * it must be reset to the anonymous user.
 *
 * @method onUsersDeleted
 * @static
 * @param {Array} The list of deleted user ids
 * @param {Function} callback Function to call when it's done
 *  - **Error** An error if something went wrong, null otherwise
 */
module.exports.onUsersDeleted = function(ids, callback) {
  var coreApi = process.api.getCoreApi();
  var database = coreApi.getDatabase();
  var videoModel = new VideoModel(null, new VideoProvider(database), new PropertyProvider(database));
  var configurationModel = new ConfigurationModel(new ConfigurationProvider(database));

  async.series([
    function(callback) {
      videoModel.anonymizeByUser(ids, callback);
    },
    function(callback) {

      // Get watcher configuration
      configurationModel.get({publishDefaultUpload: {$ne: null}}, function(error, result) {
        if (error) return callback(error);

        if (result.length) {
          result[0].publishDefaultUpload.owner = {
            name: null,
            value: null
          };
          configurationModel.update(result[0].id, result[0], callback);
        } else
          callback();
      });

    }
  ], function(error, results) {
    callback(error);
  });
};
