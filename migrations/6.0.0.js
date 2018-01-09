'use strict';

var async = require('async');

module.exports.update = function(callback) {
  process.logger.info('Publish 6.0.0 migration launched.');
  var db = process.api.getCoreApi().getDatabase();

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
      db.get('publish_videos', null, null, null, function(error, videos) {
        if (error)
          return callback(error);

        // No need to change anything
        if (!videos || !videos.length)
          return callback();
        else {
          var asyncActions = [];

          videos.forEach(function(video) {
            if (video.timecodes) {
              video.timecodes.forEach(function(timecode) {
                if (timecode.image && timecode.image.small)
                  timecode.image.small = timecode.image.small.replace('thumb=small', 'style=publish-thumb-200');
              });

              asyncActions.push(function(callback) {
                db.update(
                  'publish_videos',
                  {
                    id: video.id
                  },
                  {
                    timecodes: video.timecodes
                  },
                  function(error) {
                    if (!error)
                      process.logger.info('Timecodes of video "' + video.id + '" updated');

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

    process.logger.info('Publish 6.0.0 migration done.');
    callback();
  });
};
