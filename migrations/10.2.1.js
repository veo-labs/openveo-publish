'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 10.2.1 migration launched.');
  var coreApi = process.api.getCoreApi();
  var db = coreApi.getDatabase();
  var videoProvider = new VideoProvider(db);

  async.series([

    /**
     * Removes system paths from Wowza streaming links.
     *
     * Wowza streaming links are constructed based on the streamPath property of the videoPlatformConf.json file.
     * The base path was including in the database for each streaming links.
     * This migration removes all base paths from database.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'sources', 'type']
        },
        {
          id: 'desc'
        },
        function(error, medias) {
          if (error) return callback(error);
          if (!medias || !medias.length) return callback();

          var asyncFunctions = [];

          medias.forEach(function(media) {
            var needUpdate = false;

            if (media.type === TYPES.WOWZA && media.sources && media.sources.length) {
              media.sources.forEach(function(source) {
                if (source.adaptive) {
                  source.adaptive.forEach(function(adaptiveSource) {

                    // Get last two parts of the URL (e.g. MEDIA_ID.mp4/manifest.mpd)
                    var linkChunks = adaptiveSource.link.match(/(.*)\/((?:[^/]*){1}\/(?:[^/]*){1})$/);
                    if (linkChunks && linkChunks[2]) {
                      adaptiveSource.link = linkChunks[2];
                      needUpdate = true;
                    }
                  });

                }
              });
            }

            if (!needUpdate) return;

            asyncFunctions.push(function(updateCallback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  sources: media.sources
                },
                updateCallback
              );
            });

          });

          async.parallel(asyncFunctions, callback);
        }
      );
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 10.2.1 migration done.');
    callback();
  });
};
