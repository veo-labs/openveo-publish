'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');

var ERRORS = process.requirePublish('app/server/packages/errors.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');

var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 12.0.0 migration launched.');
  var videoProvider = new VideoProvider(process.api.getCoreApi().getDatabase());

  async.series([

    /**
     * Updates transitional videos lastState and lastTransition.
     *
     * Transition "merge" and associated state "merged" have been split into four transitions: "initMerge", "merge",
     * "finalizeMerge", "removePackage" and four states: "mergeInitialized", "merged", "mergeFinalized",
     * "packageRemoved".
     *
     * If two packages with the same name are merging there are both in state "merging" so resetting both to
     * INITIALIZING_MERGE state will make the first package lock the second one on retry.
     *
     * Modifications on transitions:
     * - "merge" needs to be replaced by initMerge for retrying new merge algorithm
     *
     * Modifications on transition states:
     * - "merged" needs to be replaced by MERGE_INITIALIZED as this is the expected last step for a package that has
     *   absorbed another one
     *
     * Modifications on states:
     * - MERGING (16) doesn't correspond to the same thing anymore, replace by INITIALIZING_MERGE (16)
     *
     * Modifications on errors:
     * - MERGE_CHANGE_MEDIA_STATE (24) has been removed, replace by closest INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME (24)
     * - MERGE_GET_MEDIA_ERROR (25) has been removed, replace by closest INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME (24)
     * - MERGE_WAIT_FOR_MEDIA_ERROR (26) has been removed, replace by closest INIT_MERGE_WAIT_FOR_MEDIA (25)
     * - MERGE_CHANGE_OTHER_MEDIA_STATE (27) has been removed, replace by closest INIT_MERGE_LOCK_PACKAGE (26)
     * - MERGE_MEDIAS (28) has been removed, replace by INIT_MERGE_LOCK_PACKAGE (26) to force retry merge
     * - MERGE_REMOVE_NOT_CHOSEN (29) has been removed, replace by INIT_MERGE_LOCK_PACKAGE (26) to force retry merge
     *
     * All videos with these transitions / states have to be migrated.
     */
    function(callback) {
      videoProvider.getAll(
        null,
        {
          include: ['id', 'lastState', 'lastTransition', 'errorCode', 'state']
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

            switch (media.errorCode) {
              case 24:
              case 25:
                data.errorCode = ERRORS.INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME;
                break;
              case 26:
                data.errorCode = ERRORS.INIT_MERGE_WAIT_FOR_MEDIA;
                break;
              case 27:
              case 28:
              case 29:
                data.errorCode = ERRORS.INIT_MERGE_LOCK_PACKAGE;
                break;
              default:
                break;
            }

            if (media.state === 16) {
              data.state = STATES.INITIALIZING_MERGE;
            }

            if (media.lastState === 'merged') {
              data.lastState = Package.STATES.MERGE_INITIALIZED;
            }

            if (media.lastTransition === 'merge') {
              data.lastTransition = Package.TRANSITIONS.INIT_MERGE;
            }

            if (!data.lastState && !data.lastTransition && !data.errorCode && !data.state) {
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
    process.logger.info('Publish 12.0.0 migration done.');
    callback();
  });
};
