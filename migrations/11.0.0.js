'use strict';

var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PoiProvider = process.requirePublish('app/server/providers/PoiProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 11.0.0 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());
  var poiProvider = new PoiProvider(process.api.getCoreApi().getDatabase());

  async.series([

    /**
     * Creates indexes for the new points of interest collection as we are about to add documents to the collection.
     */
    function(callback) {
      poiProvider.createIndexes(callback);
    },

    /**
     * Extracts all tags and chapters of videos in new points of interest collection.
     *
     * Tags and chapters information which used to be stored inside the videos collection in "tags" and "chapters"
     * properties are now extracted in the new points of interest collection. "tags" and "chapters" properties will now
     * contains the list of points of interest ids.
     * Tags and chapters are now both considered as points of interest.
     *
     * It also adds property "descriptionText" for each point of interest.
     * Property "descriptionText" contains the decoded version of the "description" property which may contains HTML.
     */
    function(callback) {
      videoProvider.getAll(null, {include: ['chapters', 'tags', 'id']}, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No medias
        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncActions = [];

        medias.forEach(function(media) {

          // No points of interest for this media
          // Nothing to do
          if ((!media.tags || (media.tags && !media.tags.length)) &&
            (!media.chapters || (media.chapters && !media.chapters.length))) return;

          var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', media.id, 'uploads');
          asyncActions.push(function(callback) {
            async.series([

              // Save points of interest, add descriptionText property and add path to points of interest files
              function(callback) {
                var pois = (media.tags || []).concat(media.chapters || []);
                if (!pois.length) return callback();

                pois.forEach(function(poi) {
                  if (poi.file) {
                    poi.file.path = path.join(poiFileDestinationPath, poi.file.fileName);
                  }
                  if (poi.description)
                    poi.descriptionText = openVeoApi.util.removeHtmlFromText(poi.description);
                });

                poiProvider.add(pois, callback);
              },

              // Update media chapters and tags properties to keep only chapters and tags ids
              function(callback) {
                var data = {};
                if (media.tags) data.tags = media.tags.map(function(tag) {
                  return tag.id;
                });
                if (media.chapters) data.chapters = media.chapters.map(function(chapter) {
                  return chapter.id;
                });

                videoProvider.updateOne(
                  new ResourceFilter().equal('id', media.id),
                  data,
                  callback
                );
              }

            ], callback);
          });
        });

        async.parallel(asyncActions, callback);
      });
    },

    /**
     * Add "descriptionText" property to all documents of the video collection.
     *
     * "descriptionText" holds the decoded version of the "description" property to be indexed by the database.
     * The database can't ignore HTML when performing search so we create a version of the property that doesn't
     * contain HTML.
     */
    function(callback) {
      videoProvider.getAll(null, {include: ['description', 'id']}, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No medias
        // No need to change anything
        if (!medias || !medias.length) return callback();

        var asyncActions = [];

        medias.forEach(function(media) {

          // No description for this media
          // Nothing to do
          if (!media.description) return;

          asyncActions.push(function(callback) {
            videoProvider.updateOne(
              new ResourceFilter().equal('id', media.id),
              {
                description: media.description,
                descriptionText: openVeoApi.util.removeHtmlFromText(media.description)
              },
              callback
            );
          });

        });

        async.parallel(asyncActions, callback);
      });
    },

    /**
     * Re-creates query search index on the video collection.
     */
    function(callback) {
      async.series([

        // Drop querySearch index
        function(callback) {
          videoProvider.dropIndex('querySearch', callback);
        },

        // Re-create querySearch index
        function(callback) {
          videoProvider.createIndexes(callback);
        }

      ], callback);
    }

  ], function(error, results) {
    if (error) return callback(error);
    process.logger.info('Publish 11.0.0 migration done.');
    callback();
  });
};
