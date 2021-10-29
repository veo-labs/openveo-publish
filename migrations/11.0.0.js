'use strict';

var path = require('path');
var async = require('async');
var nanoid = require('nanoid').nanoid;
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PoiProvider = process.requirePublish('app/server/providers/PoiProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 11.0.0 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());
  var poiProvider = new PoiProvider(process.api.getCoreApi().getDatabase());
  var propertyProvider = new PropertyProvider(process.api.getCoreApi().getDatabase());

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
                  if (poi.file)
                    poi.file.path = path.join(poiFileDestinationPath, poi.file.fileName);

                  if (poi.description)
                    poi.descriptionText = openVeoApi.util.removeHtmlFromText(poi.description);

                  if (!poi.id)
                    poi.id = nanoid();

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
     * Re-creates text indexes of all collections with the language defined in OpenVeo Core.
     */
    function(callback) {
      async.series([

        // Drop querySearch index
        function(callback) {
          async.parallel([

            // Drop text index from video and property collection
            function(callback) {
              var asyncFunctions = [];

              [videoProvider, propertyProvider].forEach(function(provider) {
                asyncFunctions.push(function(callback) {
                  provider.dropIndex('querySearch', function(error) {
                    if (error) {
                      process.logger.warn(
                        'Dropping "querySearch" index failed on collection ' +
                        provider.location + ' with message: ' + error.message
                      );
                    }
                    callback();
                  });
                });
              });
              async.parallel(asyncFunctions, callback);
            }

          ], callback);
        },

        // Re-create querySearch index
        function(callback) {
          async.series([

            // Re-create text index of the video collection
            function(callback) {
              videoProvider.createIndexes(callback);
            },

            // Re-create text index of the property collection
            function(callback) {
              propertyProvider.createIndexes(callback);
            }

          ], callback);
        }

      ], callback);
    },

    /**
     * Updates transitional videos lastState and lastTransition.
     *
     * Transition "preparePublicDirectory" and associated state "publicDirectoryPrepared" have been removed and should
     * be replaced respectively by "uploadMedia" and "metadataRetrieved".
     * Also the "group" transition and its associated state "grouped" have been renamed into "merge" and "merged".
     *
     * All videos with these transitions / states have to be migrated.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'lastState', 'lastTransition']
        },
        {id: 'desc'},
        function(error, medias) {
          if (error) return callback(error);

          // No medias
          // No need to change anything
          if (!medias || !medias.length) return callback();

          var asyncActions = [];

          medias.forEach(function(media) {
            var data = {};

            if (media.lastState === 'grouped') {
              data.lastState = 'merged';
            } else if (media.lastState === 'publicDirectoryPrepared') {
              data.lastState = VideoPackage.STATES.METADATA_RETRIEVED;
            }

            if (media.lastTransition === 'group') {
              data.lastTransition = 'merge';
            } else if (media.lastTransition === 'preparePublicDirectory') {
              data.lastTransition = Package.TRANSITIONS.UPLOAD_MEDIA;
            }

            if (!data.lastState && !data.lastTransition) {
              return;
            }

            asyncActions.push(function(callback) {
              videoProvider.updateOne(
                new ResourceFilter().equal('id', media.id),
                data,
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
    process.logger.info('Publish 11.0.0 migration done.');
    callback();
  });
};
