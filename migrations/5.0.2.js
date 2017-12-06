'use strict';

var async = require('async');

module.exports.update = function(callback) {
  process.logger.info('Publish 5.0.2 migration launched.');
  var db = process.api.getCoreApi().getDatabase();

  async.series([

    // Rename permissions names
    function(callback) {
      db.get('core_roles', {}, null, null, function(error, value) {
        if (error) {
          callback(error);
          return;
        }

        // No need to change anything
        if (!value || !value.length) return callback();

        var asyncActions = [];

        value.forEach(function(role) {
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
              db.update('core_roles', {id: role.id}, {permissions: permissions}, function(error) {
                callback(error);
              });
            });
          }
        });

        async.series(asyncActions, callback);
      });
    }
  ], function(err) {
    if (err) {
      callback(err);
      return;
    }
    process.logger.info('Publish 5.0.2 migration done.');
    callback();
  });
};
