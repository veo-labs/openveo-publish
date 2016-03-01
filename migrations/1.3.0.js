'use strict';

var async = require('async');
var openVeoAPI = require('@openveo/api');
var db = openVeoAPI.applicationStorage.getDatabase();


module.exports.update = function(callback) {
  process.logger.info('Publish 1.3.0 migration launched.');
  db.get('videos', {}, null, null, function(error, value) {
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
              db.update('videos', {id: video.id}, {sources: {files: video.files}}, function(error) {
                callback(error);
              });
            });
          }

          // delete files property
          if (video.files) {
            series.push(function(callback) {
              db.removeProp('videos', 'files', {id: video.id}, function(error) {
                callback(error);
              });
            });
          }
        }
      });

      async.series(series, function(error) {
        if (error) {
          callback(error);
          return;
        }
        process.logger.info('Publish 1.3.0 migration done.');
        callback();
      });
    }
  });
};
