'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var Package = process.requirePublish('app/server/packages/Package.js');

module.exports.update = function(callback) {
  process.logger.info('Publish 7.0.0 migration launched.');
  var settingProvider = process.api.getCoreApi().settingProvider;
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

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
    },

    /**
     * Renames mediaConfigured state and configureMedia transition.
     *
     * Transition configureMedia and its associated state mediaConfigured have been respectively renamed into
     * synchronizeMedia and mediaSynchronized.
     * Videos with lastState set to mediaConfigured or lastTransition to configureMedia have to be migrated.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'lastState', 'lastTransition']
        },
        {id: 'desc'},
        function(error, medias) {
          if (error) return callback(error);

          // No medias
          // No need to change anything
          if (!medias || !medias.length) return callback();

          var asyncActions = [];

          medias.forEach(function(media) {
            if (media.lastState !== 'mediaConfigured' && media.lastTransition !== 'configureMedia') {
              return;
            }

            var data = {};
            if (media.lastState === 'mediaConfigured') {
              data.lastState = Package.STATES.MEDIA_SYNCHRONIZED;
            }

            if (media.lastTransition === 'configureMedia') {
              data.lastTransition = Package.TRANSITIONS.SYNCHRONIZE_MEDIA;
            }

            asyncActions.push(function(callback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                data,
                callback
              );
            });
          });

          async.parallel(asyncActions, callback);
        }
      );
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 7.0.0 migration done.');
    callback();
  });
};
