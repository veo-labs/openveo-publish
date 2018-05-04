'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var databaseErrors = openVeoApi.storages.databaseErrors;

module.exports.update = function(callback) {
  process.logger.info('Publish 2.0.0 migration launched.');
  var coreApi = process.api.getCoreApi();
  var db = coreApi.getDatabase();
  var roleProvider = coreApi.roleProvider;
  var videoProvider = new VideoProvider(db);

  async.series([

    // Prefix collection with the module name : publish
    function(callback) {
      db.renameCollection('properties', 'publish_properties', function(error) {
        if (error && error.code === databaseErrors.RENAME_COLLECTION_NOT_FOUND_ERROR) return callback();
        callback(error);
      });
    },
    function(callback) {
      db.renameCollection('configurations', 'publish_configurations', function(error) {
        if (error && error.code === databaseErrors.RENAME_COLLECTION_NOT_FOUND_ERROR) return callback();
        callback(error);
      });
    },
    function(callback) {
      db.renameCollection('videos', 'publish_videos', function(error) {
        if (error && error.code === databaseErrors.RENAME_COLLECTION_NOT_FOUND_ERROR) return callback();
        callback(error);
      });
    },

    // Rename permissions names
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
                case 'create-property':
                  permissions.push('publish-add-properties');
                  break;
                case 'update-property':
                  permissions.push('publish-update-properties');
                  break;
                case 'delete-property':
                  permissions.push('publish-delete-properties');
                  break;
                case 'create-video':
                  permissions.push('publish-add-videos');
                  break;
                case 'update-video':
                  permissions.push('publish-update-videos');
                  break;
                case 'delete-video':
                  permissions.push('publish-delete-videos');
                  break;
                case 'access-videos-page':
                  permissions.push('publish-access-videos-page');
                  break;
                case 'access-properties-page':
                  permissions.push('publish-access-properties-page');
                  break;
                case 'access-categories-page':
                  permissions.push('publish-access-categories-page');
                  break;
                case 'access-watcher-page':
                  permissions.push('publish-access-watcher-page');
                  break;
                case 'manage-watcher':
                  permissions.push('publish-manage-watcher');
                  break;
                case 'access-conf-page':
                  permissions.push('publish-access-conf-page');
                  break;
                case 'manage-publish-config':
                  permissions.push('publish-manage-publish-config');
                  break;
                case 'publish-video':
                  permissions.push('publish-publish-videos');
                  break;
                case 'chapter-video':
                  permissions.push('publish-chapter-videos');
                  break;
                case 'retry-video':
                  permissions.push('publish-retry-videos');
                  break;
                case 'upload-video':
                  permissions.push('publish-upload-videos');
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
                function(error) {
                  callback(error);
                }
              );
            });
          }
        });

        async.series(asyncActions, callback);
      });
    },

    // Update publish properties collection
    function(callback) {
      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncFunctions = [];

        medias.forEach(function(media) {
          asyncFunctions.push(function(mediaCallback) {
            async.series([
              function(updateCallback) {
                var modifications = {};

                if (media.files && !media.sources)
                  modifications.sources = {files: media.files};

                if (media.thumbnail && media.thumbnail.indexOf('/publish/') == -1)
                  modifications.thumbnail = '/publish/' + media.thumbnail;

                if (modifications.sources || modifications.thumbnail)
                  videoProvider.updateOne(new ResourceFilter().equal('id', media.id), modifications, updateCallback);
                else
                  updateCallback();
              },
              function(updateCallback) {
                // delete files property
                if (media.files)
                  videoProvider.removeField('files', new ResourceFilter().equal('id', media.id), updateCallback);
                else
                  updateCallback();

              }
            ], mediaCallback);
          });
        });

        async.parallel(asyncFunctions, callback);
      });
    }
  ], function(error) {
    if (error) return callback(error);
    process.logger.info('Publish 2.0.0 migration done.');
    callback();
  });
};
