'use strict';

var async = require('async');
var openVeoAPI = require('@openveo/api');
var db = openVeoAPI.applicationStorage.getDatabase();


module.exports.update = function(callback) {
  process.logger.info('Publish 2.0.0 migration launched.');

  async.series([

    // Prefix collection with the module name : publish
    function(callback) {
      db.renameCollection('properties', 'publish_properties', function(error, value) {
        callback(error);
      });
    },
    function(callback) {
      db.renameCollection('configurations', 'publish_configurations', function(error, value) {
        callback(error);
      });
    },
    function(callback) {
      db.renameCollection('videos', 'publish_videos', function(error, value) {
        callback(error);
      });
    },

    // Rename permissions names
    function(callback) {
      db.get('core_roles', {}, null, null, function(error, value) {
        if (error) {
          callback(error);
          return;
        }

        // No need to change anything
        if (!value || !value.length) callback();

        var permissions = [];

        value.forEach(function(role) {
          if (role.permissions) {
            permissions = [];
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

            async.series([
              function(callback) {
                db.update('core_roles', {id: role.id}, {permissions: permissions}, function(error) {
                  callback(error);
                });
              }
            ], callback);
          }
        });
      });
    },

    // Update publish properties collection
    function(callback) {
      db.get('publish_videos', {}, null, null, function(error, value) {
        if (error) {
          callback(error);
          return;
        }

        // No need to change anything
        if (!value || !value.length) callback();

        else {

          value.forEach(function(video) {
            async.series([
              function(callback) {
                // backup files property in sources property
                if (video.files && !video.sources) {
                  db.update('publish_videos', {id: video.id}, {sources: {files: video.files}}, function(error) {
                    callback(error);
                  });
                } else {
                  callback();
                }
              },
              function(callback) {
                // delete files property
                if (video.files) {
                  db.removeProp('publish_videos', 'files', {id: video.id}, function(error) {
                    callback(error);
                  });
                } else {
                  callback();
                }
              },
              function(callback) {
                // prefix thumbnail video url with publish
                if (video.thumbnail && video.thumbnail.indexOf('/publish/') == -1) {
                  db.update('publish_videos', {id: video.id}, {thumbnail: '/publish/' + video.thumbnail},
                  function(error) {
                    callback(error);
                  });
                } else {
                  callback();
                }
              }
            ], callback);
          });
        }
      });
    }
  ], function(err) {
    if (err) {
      callback(err);
      return;
    }
    process.logger.info('Publish 2.0.0 migration done.');
    callback();
  });
};
