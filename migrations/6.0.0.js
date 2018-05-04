'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var databaseErrors = openVeoApi.storages.databaseErrors;

module.exports.update = function(callback) {
  process.logger.info('Publish 6.0.0 migration launched.');
  var coreApi = process.api.getCoreApi();
  var db = coreApi.getDatabase();
  var videoProvider = new VideoProvider(db);
  var settingProvider = coreApi.settingProvider;
  var roleProvider = coreApi.roleProvider;

  async.series([

    /**
     * Updates image processing URL parameter on videos timecodes.
     *
     * Image processing now expects the parameter "style" in the URL of the image, instead of the
     * parameter "thumb". Furthermore the id of the style, for small timecodes, has been renamed
     * from "small" to "publish-thumb-200".
     * Therefore image processing is now launched using style=publish-thumb-200 instead of thumb=small.
     */
    function(callback) {
      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();
        var asyncActions = [];

        medias.forEach(function(media) {
          if (media.timecodes) {
            var needUpdate = false;

            media.timecodes.forEach(function(timecode) {
              if (timecode.image && timecode.image.small) {
                timecode.image.small = timecode.image.small.replace('thumb=small', 'style=publish-thumb-200');
                needUpdate = true;
              }
            });

            if (!needUpdate) return;

            asyncActions.push(function(callback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  timecodes: media.timecodes
                },
                callback
              );
            });
          }
        });

        async.parallel(asyncActions, callback);
      });
    },

    /**
     * Migrates publish configuration to core settings.
     *
     * OpenVeo Core now offers a setting provider for its own use and for plugins.
     * OpenVeo Publish defines two configurations:
     *   - The configuration to set default owner and group for a media detected by the watcher
     *   - The Google authentication tokens when a Youtube account is associated to OpenVeo
     * This two settings are now stored by OpenVeo Core, thus existing publish configurations have to be migrated to
     * OpenVeo Core settings.
     */
    function(callback) {
      db.get('publish_configurations', null, null, 2, null, null, function(error, configurations) {
        var settings = [];
        if (error) return callback(error);

        configurations.forEach(function(configuration) {
          if (configuration.googleOAuthTokens) {
            settings.push(
              {
                id: 'publish-googleOAuthTokens',
                value: configuration.googleOAuthTokens
              }
            );
          } else if (configuration.publishDefaultUpload) {
            settings.push(
              {
                id: 'publish-defaultUpload',
                value: configuration.publishDefaultUpload
              }
            );
          }
        });

        settingProvider.add(settings, callback);
      });
    },

    /**
     * Removes collection "publish_configurations".
     *
     * OpenVeo Publish configuration is now in OpenVeo Core settings, collection "publish_configurations" is not
     * used anymore.
     */
    function(callback) {
      db.removeCollection('publish_configurations', function(error) {
        if (error && error.code === databaseErrors.REMOVE_COLLECTION_NOT_FOUND_ERROR) return callback();
        callback(error);
      });
    },

    /**
     * Removes system paths from media tags.
     *
     * Tags associated to medias could have related files. These related files references was full system paths.
     * This migration removes all tags system paths from database.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'tags']
        },
        {
          id: 'desc'
        },
        function(error, medias) {
          if (error) return callback(error);
          if (!medias || !medias.length) return callback();

          var asyncFunctions = [];

          medias.forEach(function(media) {
            var needUpdate = false;

            if (media.tags && media.tags.length) {
              media.tags.forEach(function(tag) {
                if (tag.file) {
                  delete tag.file.path;
                  delete tag.file.destination;
                  needUpdate = true;
                }
              });
            }

            if (!needUpdate) return;

            asyncFunctions.push(function(updateCallback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  tags: media.tags
                },
                updateCallback
              );
            });

          });

          async.parallel(asyncFunctions, callback);
        }
      );
    },

    // Rename permission "publish-chapter-videos" into "publish-editor-videos"
    function(callback) {
      roleProvider.getAll(null, null, {id: 'desc'}, function(error, roles) {
        if (error) return callback(error);

        // No need to change anything
        if (!roles || !roles.length) return callback();

        var asyncActions = [];

        roles.forEach(function(role) {
          if (role.permissions) {
            var permissions = [];
            role['permissions'].forEach(function(permission) {
              switch (permission) {
                case 'publish-chapter-videos':
                  permissions.push('publish-editor-videos');
                  break;
                default:
                  permissions.push(permission);
                  break;
              }
            });

            asyncActions.push(function(callback) {
              roleProvider.updateOne(
                new ResourceFilter().equal('id', role.id),
                {permissions: permissions},
                callback
              );
            });
          }
        });

        async.series(asyncActions, callback);
      });
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 6.0.0 migration done.');
    callback();
  });
};
