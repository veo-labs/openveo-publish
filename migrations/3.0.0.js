'use strict';

var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var configDir = openVeoApi.fileSystem.getConfDir();

module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.0 migration launched.');
  var db = process.api.getCoreApi().getDatabase();

  async.series([

    /**
     * Updates all videos owned by anonymous.
     *
     * The id of anonymous is not configurable anymore. User anonymous id is now "1".
     * As the anonymous user id was configurable, existing videos may belong to anonymous with a different id.
     */
    function(callback) {
      var conf = require(path.join(configDir, 'core/conf.json'));

      // Anonymous user id is not in configuration or is '1'
      // Nothing to do
      if (!conf.anonymousUserId || conf.anonymousUserId === '1')
        return callback();

      db.get('publish_videos', null, null, null, function(error, videos) {
        if (error)
          return callback(error);

        // No need to change anything
        if (!videos || !videos.length)
          return callback();
        else {
          var asyncActions = [];

          videos.forEach(function(video) {
            if (
              video.metadata &&
              video.metadata.user === conf.anonymousUserId
            ) {
              asyncActions.push(function(callback) {
                db.update(
                  'publish_videos',
                  {
                    id: video.id
                  },
                  {
                    'metadata.user': '1'
                  },
                  function(error) {
                    callback(error);
                  }
                );
              });
            }
          });

          async.parallel(asyncActions, callback);
        }
      });
    }

  ], function(error, results) {
    if (error)
      return callback(error);

    process.logger.info('Publish 3.0.0 migration done.');
    callback();
  });
};
