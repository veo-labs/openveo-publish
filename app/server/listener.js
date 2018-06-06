'use strict';

/**
 * @module publish
 */

var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

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
  var settingProvider = coreApi.settingProvider;
  var videoProvider = new VideoProvider(database);

  async.series([
    function(callback) {
      var updateFunctions = [];

      videoProvider.getAll(
        new ResourceFilter().in('metadata.user', ids),
        {
          include: ['id']
        },
        {
          id: 'desc'
        },
        function(getAllError, medias) {
          if (getAllError) return callback(getAllError);

          medias.forEach(function(media) {
            updateFunctions.push(function(callback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  'metadata.user': null
                },
                callback
              );
            });
          });

          async.parallel(updateFunctions, callback);
        }
      );
    },
    function(callback) {

      // Get watcher configuration
      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-medias'),
        null,
        function(error, mediasSettings) {
          if (error) return callback(error);

          if (mediasSettings &&
              mediasSettings.value &&
              ids.indexOf(mediasSettings.value.owner) >= 0) {
            mediasSettings.value.owner = null;
            settingProvider.updateOne(
              new ResourceFilter().equal('id', 'publish-medias'),
              {
                value: mediasSettings.value
              },
              callback
            );
          } else
            callback();
        }
      );
    }
  ], function(error, results) {
    callback(error);
  });
};

/**
 * Handles event when custom properties have been deleted.
 *
 * Remove custom properties referenced in videos.
 *
 * @method onPropertiesDeleted
 * @static
 * @param {Array} The list of deleted properties ids
 * @param {Function} callback Function to call when it's done
 *  - **Error** An error if something went wrong, null otherwise
 *  - **Number** The number of updated medias
 */
module.exports.onPropertiesDeleted = function(ids, callback) {
  var asyncFunctions = [];
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

  ids.forEach(function(id) {
    asyncFunctions.push(function(callback) {
      videoProvider.removeField('properties.' + id, null, callback);
    });
  });

  async.series(asyncFunctions, callback);
};

/**
 * Handles event when groups have been deleted.
 *
 * If one of the removed groups is the one choosed as the default group for the watcher,
 * it must be reset.
 *
 * @method onGroupsDeleted
 * @static
 * @param {Array} The list of deleted groups ids
 * @param {Function} callback Function to call when it's done
 *  - **Error** An error if something went wrong, null otherwise
 */
module.exports.onGroupsDeleted = function(ids, callback) {
  var settingProvider = process.api.getCoreApi().settingProvider;

  settingProvider.getOne(
    new ResourceFilter().equal('id', 'publish-medias'),
    null,
    function(error, mediasSettings) {
      if (error) return callback(error);

      if (mediasSettings &&
          mediasSettings.value &&
          ids.indexOf(mediasSettings.value.group) >= 0) {
        mediasSettings.value.group = null;
        settingProvider.updateOne(
          new ResourceFilter().equal('id', 'publish-medias'),
          {
            value: mediasSettings.value
          },
          callback
        );
      } else
        callback();
    }
  );
};
