'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');

var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');

var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 14.0.1 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

  async.series([

    /**
     * Updates medias expected heights.
     *
     * Media videos height is particulary useful for Vimeo provider to make sure the original videos are available on
     * the platform.
     * Prior to version 13.0.0 the expected height of all videos in a multi-sources media was the same making the
     * assumption that all videos have the same height.
     * Starting from version 13.0.0 we suppose that each video of a multi-sources media can have different definitions
     * and we store all video heights in mediasHeights property in the same order as video ids in mediaId property.
     *
     * All medias made before version 13.0.0 have to be migrated to move the height of videos from
     * metadata['profile-settings']['video-height'] to mediasHeights property using the same height for each video in
     * the media.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'mediaId', 'metadata']
        },
        {id: 'desc'},
        function(error, medias) {
          if (error) return callback(error);

          // No medias
          // No need to change anything
          if (!medias || !medias.length) return callback();

          var asyncActions = [];

          medias.forEach(function(media) {
            if (!media.metadata['profile-settings']) return;

            asyncActions.push(function(callback) {
              var mediaIds = !Array.isArray(media.mediaId) ? [media.mediaId] : media.mediaId;

              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                {
                  mediasHeights: Array(mediaIds.length).fill(media.metadata['profile-settings']['video-height'])
                },
                callback
              );
            });
          });

          async.parallel(asyncActions, callback);
        }
      );
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 14.0.1 migration done.');
    callback();
  });
};

