'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 7.0.0 migration launched.');
  var settingProvider = process.api.getCoreApi().settingProvider;

  async.series([

    /**
     * Renames publish-defaultUpload setting into publish-medias and remove group and owner's names.
     *
     * publish-defaultUpload setting contained something like:
     * <pre>
     * {
     *   owner: {
     *     name: 'Owner name',
     *     value: 'owner-id'
     *   },
     *   group: {
     *     name: 'Group name',
     *     value: 'group-id'
     *   }
     * }
     * </pre>
     *
     * As owner and group's names should not be stored in settings, only the owner and group's ids are kept to finally
     * have:
     *
     * <pre>
     * {
     *   owner: 'owner-id',
     *   group: 'group-id'
     * }
     * </pre>
     */
    function(callback) {

      // Get actual settings
      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-defaultUpload'),
        null,
        function(error, settings) {
          if (error) return callback(error);
          if (!settings) return callback();

          // Add actual settings to publish-medias settings
          settingProvider.add([
            {
              id: 'publish-medias',
              value: {
                owner: settings.value.owner ? settings.value.owner.value : null,
                group: settings.value.group ? settings.value.group.value : null
              }
            }
          ], function(error, total, addedSettings) {
            if (error) return callback(error);

            // Remove publish-defaultUpload settings
            settingProvider.remove(new ResourceFilter().equal('id', 'publish-defaultUpload'), callback);
          });
        }
      );
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 7.0.0 migration done.');
    callback();
  });
};
