'use strict';

var async = require('async');
var path = require('path');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 2.1.2 migration launched.');

  var database = process.api.getCoreApi().getDatabase();
  var videoProvider = new VideoProvider(database);

  async.series([

    function(callback) {
      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();

        var series = [];
        medias.forEach(function(media) {
          if (!media.metadata || !media.metadata.indexes) {
            var timecodesFilePath = path.normalize(process.rootPublish +
             '/assets/player/videos/' + media.id + '/synchro.json');
            var metadata = media.metadata || {};
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
              database.updateOne(
                videoProvider.location,
                new ResourceFilter().equal('id', media.id),
                {metadata: metadata},
                callback
              );
            });
          }
        });

        async.series(series, callback);
      });
    }

  ], function(error) {
    if (error) return callback(error);
    process.logger.info('Publish 2.1.2 migration done.');
    callback();
  });
};
