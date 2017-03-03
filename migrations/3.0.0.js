'use strict';

var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');
var configDir = openVeoApi.fileSystem.getConfDir();

module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.0 migration launched.');
  var db = process.api.getCoreApi().getDatabase();

  async.series([

    /**
     * Updates local videos urls and thumbnails urls to make it absolute using CDN path.
     */
    function(callback) {
      db.get('publish_videos', null, null, null, function(error, videos) {
        var cdnUrl = process.api.getCoreApi().getCdnUrl();

        if (error)
          return callback(error);

        if (!cdnUrl)
          return callback(new Error('Missing CDN url'));

        // No need to change anything
        if (!videos || !videos.length) return callback();
        else {
          var asyncActions = [];

          videos.forEach(function(video) {
            asyncActions.push(function(callback) {

              // Local videos are hosted in local and consequently delivered by OpenVeo HTTP server
              // Change files links to absolute urls using CDN url
              if (video.type === TYPES.LOCAL) {
                if (video.sources) {
                  video.sources.forEach(function(source) {
                    if (source.files) {
                      source.files.forEach(function(file) {
                        if (file.link)
                          file.link = cdnUrl + file.link.replace(/^\//, '');
                      });
                    }
                  });
                }
              }

              db.update(
                'publish_videos',
                {
                  id: video.id
                },
                {
                  thumbnail: cdnUrl + video.thumbnail.replace(/^\//, ''),
                  sources: video.sources
                },
                function(error) {
                  callback(error);
                }
              );
            });
          });

          async.parallel(asyncActions, callback);
        }
      });

    },

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
