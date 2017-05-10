'use strict';

var async = require('async');
var shortid = require('shortid');

module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.1 migration launched.');
  var db = process.api.getCoreApi().getDatabase();

  async.series([

    /**
     * Updates all videos using old package format.
     *
     * synchro.json file is no longer supported and will no longer be read.
     * Saves timecodes from synchro.json file into database.
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
            if (video.metadata && video.metadata.indexes && !video.timecodes) {
              video.timecodes = [];
              for (var i = 0; i < video.metadata.indexes.length; i++) {
                var timecode = video.metadata.indexes[i];
                video.timecodes.push({
                  id: shortid.generate(),
                  timecode: timecode.timecode,
                  image: {
                    small: '/publish/' + video.id + '/' + timecode.data.filename + '?thumb=small',
                    large: '/publish/' + video.id + '/' + timecode.data.filename
                  }
                });
              }

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

    process.logger.info('Publish 3.0.1 migration done.');
    callback();
  });
};
