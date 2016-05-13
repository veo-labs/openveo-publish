'use strict';

var async = require('async');
var openVeoAPI = require('@openveo/api');
var db = openVeoAPI.applicationStorage.getDatabase();


module.exports.update = function(callback) {
  process.logger.info('Publish 2.0.0 migration launched.');

  // Prefix collection with the module name : publish
  db.renameCollection('properties', 'publish_properties', function(error, value) {
    if (error) {
      callback(error);
      return;
    }
  });
  db.renameCollection('configurations', 'publish_configurations', function(error, value) {
    if (error) {
      callback(error);
      return;
    }
  });
  db.renameCollection('videos', 'publish_videos', function(error, value) {
    if (error) {
      callback(error);
      return;
    }
  });

  // Rename permissions names
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
          switch(permission) {
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

        db.update('core_roles', {id: role.id}, {permissions: permissions}, function(error) {
          if (error) {
            callback(error);
            return;
          }
        });
      }
    });
  });
  
  db.get('publish_videos', {}, null, null, function(error, value) {
    if (error) {
      callback(error);
      return;
    }

    // No need to change anything
    if (!value || !value.length) callback();

    else {
      var series = [];

      value.forEach(function(video) {
        if (video.files) {

          // backup files property in sources property
          if (!video.sources) {
            series.push(function(callback) {
              db.update('publish_videos', {id: video.id}, {sources: {files: video.files}}, function(error) {
                callback(error);
              });
            });
          }

          // delete files property
          if (video.files) {
            series.push(function(callback) {
              db.removeProp('publish_videos', 'files', {id: video.id}, function(error) {
                callback(error);
              });
            });
          }
        }

        // prefix thumbnail video url with publish
        if (video.thumbnail && video.thumbnail.indexOf('/publish/') == -1) {
          series.push(function(callback) {
            db.update('publish_videos', {id: video.id}, {thumbnail: '/publish/' + video.thumbnail}, function(error) {
              callback(error);
            });
          });
        }
      });

      async.series(series, function(error) {
        if (error) {
          callback(error);
          return;
        }
        process.logger.info('Publish 2.0.0 migration done.');
        callback();
      });
    }
  });
};
