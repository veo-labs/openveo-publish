'use strict';

var path = require('path');
var async = require('async');
var nanoid = require('nanoid').nanoid;
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var configDir = openVeoApi.fileSystem.getConfDir();
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 3.0.0 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

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
      if (!conf.anonymousUserId || conf.anonymousUserId === '1') return callback();

      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncActions = [];

        medias.forEach(function(media) {
          if (media.metadata && media.metadata.user === conf.anonymousUserId) {
            asyncActions.push(function(callback) {
              videoProvider.updateOne(new ResourceFilter().equal('id', media.id), {user: '1'}, callback);
            });
          }
        });

        async.parallel(asyncActions, callback);
      });
    },

    /**
     * Adds ids to medias chapters.
     *
     * Each media chapter has now an id. Add an id to chapters missing it.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'chapters']
        },
        {
          id: 'desc'
        },
        function(error, medias) {
          if (error) return callback(error);

          // No need to change anything
          if (!medias || !medias.length) return callback();

          var asyncFunctions = [];

          medias.forEach(function(media) {
            var needUpdate = false;

            if (media.chapters && media.chapters.length) {
              media.chapters.forEach(function(chapter) {
                if (!chapter.id) {
                  chapter.id = nanoid();
                  needUpdate = true;
                }
              });
            }

            if (!needUpdate) return;

            asyncFunctions.push(function(updateCallback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  chapters: media.chapters
                },
                updateCallback
              );
            });
          });

          async.parallel(asyncFunctions, callback);
        }
      );
    },

    /**
     * Transforms property "sources" of videos into an Array instead of an Object.
     */
    function(callback) {
      videoProvider.getAll(null, {include: ['sources', 'id']}, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);
        if (!medias || !medias.length) return callback();

        var asyncUpdateActions = [];

        medias.forEach(function(media) {
          if (!media.sources || Object.prototype.toString.call(media.sources) !== '[object Object]') return;

          asyncUpdateActions.push(function(callback) {
            videoProvider.updateOne(
              new ResourceFilter().equal('id', media.id),
              {
                sources: [media.sources]
              },
              function(error) {
                if (error) return callback(error);
                process.logger.debug('Media "' + media.id + '" updated\n');
                callback();
              }
            );
          });
        });

        async.parallel(asyncUpdateActions, callback);
      });
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 3.0.0 migration done.');
    callback();
  });
};
