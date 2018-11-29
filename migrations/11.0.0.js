'use strict';

var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var configDir = openVeoApi.fileSystem.getConfDir();
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 11.0.0 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

  async.series([

    /**
     * Replaces small images URLs of videos timecodes by sprites.
     *
     * Small image of a timecode used to be the URL of the large image with a style (style=publish-thumb-200).
     * Small images of a video are now aggregated into a sprite, thus small images are expressed using a sprite object
     * with the URL of the sprite and the coordinates of the image inside the sprite.
     */
    function(callback) {
      videoProvider.getAll(null, {include: ['timecodes']}, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No medias
        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncActions = [];

        medias.forEach(function(media) {

          // No timecodes
          // Nothing to do
          if (!media.timecodes) return;

          var mediaPublicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/' + media.id);

          asyncActions.push(function(callback) {

            async.waterfall([

              // Generate sprite of small images
              function(callback) {
                var timecodesImages = media.timecodes.map(function(timecode) {
                  return timecode.image.large;
                });

                // Generate one or more sprite of 740x400 containing all video images
                openVeoApi.imageProcessor.generateSprites(
                  timecodesImages,
                  path.join(mediaPublicDirectory, 'points-of-interest-images.jpg'),
                  148,
                  80,
                  5,
                  5,
                  90,
                  publishConf.videoTmpDir,
                  function(error, imagesReferences) {
                    callback(error, imagesReferences);
                  }
                );
              },

              // Update timecodes
              function(imagesReferences, callback) {
                media.timecodes.forEach(function(timecode) {

                  // Find image in sprite
                  var imageReference;
                  for (var i = 0; i < imagesReferences.length; i++) {
                    if (timecode.image.large === imagesReferences[i].image) {
                      imageReference = imagesReferences[i];
                      break;
                    }
                  }

                  // Get the name of the sprite file
                  var spriteFileName = imageReference.sprite.match(/\/([^/]*)$/)[1];

                  timecode.image.small = {
                    url: '/publish/' + media.id + '/' + spriteFileName,
                    x: imageReference.x,
                    y: imageReference.y
                  };
                });

                videoProvider.updateOne(
                  new ResourceFilter().equal('id', media.id),
                  {
                    timecodes: media.timecodes
                  },
                  callback
                );
              }
            ], callback);
          });
        });

        async.parallel(asyncActions, callback);
      });
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 11.0.0 migration done.');
    callback();
  });
};
