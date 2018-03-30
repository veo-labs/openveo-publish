'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 5.0.2 migration launched.');
  var roleProvider = process.api.getCoreApi().roleProvider;

  async.series([

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
  ], function(error) {
    if (error) return callback(error);
    process.logger.info('Publish 5.0.2 migration done.');
    callback();
  });
};
