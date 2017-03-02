'use strict';

var async = require('async');
var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');

/**
 * Updates local videos urls and thumbnails urls to make it absolute using CDN path.
 */
module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.0 migration launched.');

  var db = process.api.getCoreApi().getDatabase();
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

      async.parallel(asyncActions, function(asyncError) {
        if (asyncError)
          return callback(asyncError);

        process.logger.info('Publish 3.0.0 migration done.');
        callback();
      });
    }
  });
};
