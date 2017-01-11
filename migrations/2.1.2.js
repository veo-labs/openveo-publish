'use strict';

var async = require('async');
var path = require('path');
var openVeoAPI = require('@openveo/api');
var db = openVeoAPI.applicationStorage.getDatabase();


module.exports.update = function(callback) {
  process.logger.info('Publish 2.1.2 migration launched.');

  db.get('publish_videos', {}, null, null, function(error, value) {
    if (error) {
      callback(error);
      return;
    }

    // No need to change anything
    if (!value || !value.length) return callback();

    else {
      var series = [];
      value.forEach(function(video) {
        if (!video.metadata || !video.metadata.indexes) {
          var timecodesFilePath = path.normalize(process.rootPublish +
           '/assets/player/videos/' + video.id + '/synchro.json');
          var metadata = video.metadata || {};
          metadata.indexes = [];
          var timecodes;
          try {
            timecodes = require(timecodesFilePath);
          } catch (e) {
            return;
          }

          for (var i = 0; i < timecodes.length; i++) {
            var currentTc = timecodes[i];
            metadata.indexes.push({
              timecode: currentTc.timecode,
              type: 'image',
              data: {
                filename: currentTc.image
              }
            });
          }

          series.push(function(callback) {
            db.update('publish_videos', {id: video.id}, {metadata: metadata}, function(error) {
              callback(error);
            });
          });
        }
      });

      async.series(series, function(err) {
        if (err) {
          callback(err);
          return;
        }
        process.logger.info('Publish 2.1.2 migration done.');
        callback();
      });
    }
  });
};
