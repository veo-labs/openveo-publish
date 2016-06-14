'use strict';

var async = require('async');
var openVeoAPI = require('@openveo/api');
var db = openVeoAPI.applicationStorage.getDatabase();


module.exports.update = function(callback) {
  process.logger.info('Publish 2.0.2 migration launched.');

  async.series([

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
          var series = [];
          value.forEach(function(video) {
            var metadata = video.metadata || {};
            metadata.user = metadata && metadata.user || openVeoAPI.applicationStorage.getAnonymousUserId();
            metadata.groups = metadata && metadata.groups || [];

            series.push(
              function(callback) {
                db.update('publish_videos', {id: video.id}, {metadata: metadata}, function(error) {
                  callback(error);
                });
              }
            );
          });

          async.series(series, callback);
        }
      });
    }
  ], function(err) {
    if (err) {
      callback(err);
      return;
    }
    process.logger.info('Publish 2.0.2 migration done.');
    callback();
  });
};
