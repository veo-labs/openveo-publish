'use strict';

var async = require('async');
var nanoid = require('nanoid').nanoid;
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.1 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

  async.series([

    /**
     * Updates all videos using old package format.
     *
     * synchro.json file is no longer supported and will no longer be read.
     * Saves timecodes from synchro.json file into database.
     */
    function(callback) {
      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncActions = [];

        medias.forEach(function(media) {
          if (media.metadata && media.metadata.indexes && !media.timecodes) {
            media.timecodes = [];
            for (var i = 0; i < media.metadata.indexes.length; i++) {
              var timecode = media.metadata.indexes[i];
              media.timecodes.push({
                id: nanoid(),
                timecode: timecode.timecode,
                image: {
                  small: '/publish/' + media.id + '/' + timecode.data.filename + '?thumb=small',
                  large: '/publish/' + media.id + '/' + timecode.data.filename
                }
              });
            }

            asyncActions.push(function(callback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  timecodes: media.timecodes
                },
                callback
              );
            });
          }
        });

        async.parallel(asyncActions, callback);
      });
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 3.0.1 migration done.');
    callback();
  });
};
