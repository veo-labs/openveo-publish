'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 9.0.0 migration launched.');
  var settingProvider = process.api.getCoreApi().settingProvider;

  async.series([

    /**
     * Renames publish-medias setting into publish-watcher.
     */
    function(callback) {

      // Get actual settings
      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-medias'),
        null,
        function(error, settings) {
          if (error) return callback(error);
          if (!settings) return callback();

          // Add actual settings to publish-watcher settings
          settingProvider.add([
            {
              id: 'publish-watcher',
              value: {
                owner: settings.value.owner,
                group: settings.value.group
              }
            }
          ], function(error, total, addedSettings) {
            if (error) return callback(error);

            // Remove publish-medias settings
            settingProvider.remove(new ResourceFilter().equal('id', 'publish-medias'), callback);
          });
        }
      );
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 9.0.0 migration done.');
    callback();
  });
};
