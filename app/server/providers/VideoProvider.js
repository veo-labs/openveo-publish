'use strict';

/**
 * @module publish/providers/VideoProvider
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var nanoid = require('nanoid').nanoid;
var mediaPlatformFactory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
var configDir = openVeoApi.fileSystem.getConfDir();
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var ResourceFilter = openVeoApi.storages.ResourceFilter;

/**
 * Defines a VideoProvider to get and save videos.
 *
 * @class VideoProvider
 * @extends EntityProvider
 * @constructor
 * @param {Database} database The database to interact with
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about EntityProvider or Database
 */
function VideoProvider(database) {
  VideoProvider.super_.call(this, database, 'publish_videos');

  Object.defineProperties(this,

    /** @lends module:publish/providers/VideoProvider~VideoProvider*/
    {

      /**
       * List of pending updates.
       *
       * @type {Array}
       * @instance
       * @readonly
       */
      updateQueue: {value: []},

      /**
       * Indicates if an update is actually running.
       *
       * @type {Boolean}
       * @instance
       * @default false
       */
      pendingUpdate: {value: false, writable: true}

    }

  );

}

module.exports = VideoProvider;
util.inherits(VideoProvider, openVeoApi.providers.EntityProvider);

/**
 * Removes a list of directories.
 *
 * @memberof module:publish/providers/VideoProvider~VideoProvider
 * @private
 * @param {Array} directories The list of directory paths
 * @param {callback} callback The function to call when it's done
 */
function removeDirectories(directories, callback) {

  /**
   * Gets the closure to remove the given directory.
   *
   * @param {String} directory The path of the directory to remove
   * @return {Function} A dedicated function to remove the directory
   */
  function removeDirClosure(directory) {
    return function(callback) {
      openVeoApi.fileSystem.rmdir(directory, function(error) {
        callback(error);
      });
    };
  }

  var actions = [];
  for (var i = 0; i < directories.length; i++)
    actions.push(removeDirClosure(directories[i]));

  async.parallel(actions, function(error) {
    callback(error);
  });
}

/**
 * Removes all data related to a list of videos.
 *
 * @memberof module:publish/providers/VideoProvider~VideoProvider
 * @private
 * @param {Array} videosToRemove The list of videos to remove
 * @param {Boolean} keepRemote true to keep the video in the videos platform
 * @param {callback} callback The function to call when it's done
 */
function removeAllDataRelatedToVideo(videosToRemove, keepRemote, callback) {
  var parallel = [];

  // Remove videos public directories
  parallel.push(function(callback) {
    var directories = [];

    for (var i = 0; i < videosToRemove.length; i++)
      directories.push(path.normalize(process.rootPublish + '/assets/player/videos/' + videosToRemove[i].id));

    removeDirectories(directories, function(error) {
      callback(error);
    });
  });

  // Remove videos temporary directories
  parallel.push(function(callback) {
    var directories = [];

    for (var i = 0; i < videosToRemove.length; i++)
      directories.push(path.join(publishConf.videoTmpDir, videosToRemove[i].id));

    removeDirectories(directories, function(error) {
      callback(error);
    });
  });

  videosToRemove.forEach(function(video) {
    if (keepRemote) return;

    parallel.push(
      function(callback) {
        var mediaId = [];

        // compatibility with old mediaId format
        if (video.mediaId) {
          mediaId = !Array.isArray(video.mediaId) ? [video.mediaId] : video.mediaId;
        }

        // verify that media is uploaded before retreiving platformProvider
        if (mediaId.length) {
          var mediaPlatformProvider = mediaPlatformFactory.get(video.type, videoPlatformConf[video.type]);

          if (mediaPlatformProvider)
            mediaPlatformProvider.remove(mediaId, function(error) {
              if (error) {
                callback(error);
                return;
              }
              callback();
            });
          else callback();
        } else callback();
      }
    );
  });

  async.parallel(parallel, function(error) {
    if (error)
      callback(error);
    else
      callback(null);
  });
}

/**
 * Executes an update operation on the given media.
 *
 * Only one update operation can be performed at a time. Pending operations
 * are added to the queue and executed sequentially.
 *
 * @memberof module:publish/providers/VideoProvider~VideoProvider
 * @private
 * @param {String} id The media id
 * @param {Object} modifier Database modifier
 * @param {module:publish/providers/VideoProvider~VideoProvider~updateMediaCallback} [callback] Function to call when
 * it's done
 */
function updateMedia(id, modifier, callback) {
  var self = this;

  /**
   * Executes oldest update in the queue.
   */
  function executeOperation() {
    if (!self.updateQueue.length)
      return;

    // Retrieve oldest operation
    var update = self.updateQueue.shift();
    self.pendingUpdate = true;

    // Execute operation
    self.updateOne(
      new ResourceFilter().equal('id', update.id),
      update.modifier,
      function() {
        self.pendingUpdate = false;

        // Execute update callback
        if (update.callback)
          update.callback.apply(null, arguments);

        // Execute next operation in the queue
        executeOperation();

      }
    );
  }

  // Add update operation to queue
  this.updateQueue.push(
    {
      id: id,
      modifier: modifier,
      callback: callback
    }
  );

  // If no update operation is running
  // execute the oldest operation in the queue
  if (!this.pendingUpdate)
    executeOperation();
}

/**
 * Removes medias.
 *
 * All datas associated to the deleted medias will also be deleted.
 *
 * @memberof module:publish/providers/VideoProvider~VideoProvider
 * @private
 * @param {ResourceFilter} [filter] Rules to filter medias to remove
 * @param {Boolean} keepRemote true to keep the video on the videos platform, false to also remove the video from the
 * platform
 * @param {module:publish/providers/VideoProvider~VideoProvider~removeMediaCallback} [callback] The function to call
 * when it's done
 */
function removeMedia(filter, keepRemote, callback) {
  var self = this;
  var medias;
  var totalRemovedMedias = 0;

  async.series([

    // Find medias
    function(callback) {
      VideoProvider.super_.prototype.getAll.call(
        self,
        filter,
        {
          include: ['id', 'mediaId', 'type', 'tags', 'chapters']
        },
        {
          id: 'desc'
        },
        function(getAllError, fetchedMedias) {
          medias = fetchedMedias;
          return self.executeCallback(callback, getAllError);
        }
      );
    },

    // Remove medias
    function(callback) {
      if (!medias || !medias.length) return self.executeCallback(callback);

      // Remove medias
      VideoProvider.super_.prototype.remove.call(self, filter, function(removeError, total) {
        totalRemovedMedias = total;
        return self.executeCallback(callback, removeError);
      });

    },

    // Remove related datas
    function(callback) {
      if (!medias || !medias.length) return self.executeCallback(callback);

      removeAllDataRelatedToVideo(medias, keepRemote, function(removeRelatedError) {
        return self.executeCallback(callback, removeRelatedError);
      });
    },

    // Execute hook
    function(callback) {
      if (!medias || !medias.length) return self.executeCallback(callback);

      var api = process.api.getCoreApi();
      var publishApi = process.api.getApi('publish');
      api.executeHook(
        publishApi.getHooks().MEDIAS_DELETED,
        medias,
        function(hookError) {
          self.executeCallback(callback, hookError);
        }
      );
    }

  ], function(error, results) {
    self.executeCallback(callback, error, !error ? totalRemovedMedias : undefined);
  });
}

/**
 * Resolves media point of interest file path.
 *
 * @param {String} mediaId The media id the point of interest belongs to
 * @param {Object} file The file information
 * @param {String} file.mimeType The file MIME type
 * @param {String} file.fileName The file name
 * @return {String} The resolved file path
 */
VideoProvider.prototype.getPoiFilePath = function(mediaId, file) {
  if (file.mimeType.substr(0, 'image'.length) != 'image')
    return '/publish/player/videos/' + mediaId + '/uploads/' + file.fileName;
  else
    return '/publish/' + mediaId + '/uploads/' + file.fileName;
};

/**
 * Fetches a media.
 *
 * If filter corresponds to more than one media, the first found media will be the returned one.
 * If the media point of interest are in percents, needPointsOfInterestUnitConversion property will be added
 * to the media.
 *
 * @param {ResourceFilter} [filter] Rules to filter medias
 * @param {Object} [fields] Fields to be included or excluded from the response, by default all
 * fields are returned. Only "exclude" or "include" can be specified, not both
 * @param {Array} [fields.include] The list of fields to include in the response, all other fields are excluded
 * @param {Array} [fields.exclude] The list of fields to exclude from response, all other fields are included. Ignored
 * if include is also specified.
 * @param {module:publish/providers/VideoProvider~VideoProvider~getOneCallback} callback The function to call when it's
 * done
 */
VideoProvider.prototype.getOne = function(filter, fields, callback) {
  VideoProvider.super_.prototype.getOne.call(this, filter, fields, function(getOneError, media) {
    if (getOneError) return callback(getOneError);
    if (!media) return callback();

    var last;

    // Order points of interest by (time) value
    // instead of creation order
    var ordering = function(a, b) {
      switch (true) {
        case a.value < b.value:
          return -1;

        case a.value > b.value:
          return 1;

        default:
          return 0;
      }
    };

    var pointsOfInterest = [media.chapters, media.tags, media.cut];
    var poi;
    for (var i = 0; i < pointsOfInterest.length; i++) {
      poi = pointsOfInterest[i];

      if (!poi || poi.length === 0) {
        continue;
      }

      poi.sort(ordering);
      last = poi[poi.length - 1];

      media.needPointsOfInterestUnitConversion = last.value <= 1 && last.value !== 0;
      break;
    }

    callback(null, media);
  });
};

/**
 * Adds medias.
 *
 * @param {Array} medias The list of medias to store
 * @param {String} medias[].id The media id
 * @param {Boolean} [medias[].available] true if the media is available, false otherwise
 * @param {String} [medias[].title] The media title
 * @param {String} [medias[].leadParagraph] The media lead paragraph
 * @param {String} [medias[].description] The media description
 * @param {Number} [medias[].state] The media state (see STATES class from module packages)
 * @param {Date} [medias[].date] The media date
 * @param {String} [medias[].type] The id of the associated media platform
 * @param {Object} [medias[].metadata] Information about the media as a content
 * @param {String} [medias[].metadata.user] The id of the user the media belongs to
 * @param {Array} [medias[].metadata.groups] The list of groups the media belongs to
 * @param {Boolean} [data.mergeRequired] Indicate that the media is being merged with another one
 * @param {Number} [medias[].errorCode] The media error code (see ERRORS class from module packages)
 * @param {String} [medias[].category] The id of the category the media belongs to
 * @param {Array} [medias[].properties] The list of properties values for this media
 * @param {String} [medias[].packageType] The type of package
 * @param {String} [medias[].lastState] The last media state in publication process
 * @param {String} [medias[].lastTransition] The last media transition in publication process
 * @param {String} [medias[].lockedByPackage] The id of the package which has locked this package for merge
 * @param {String} [medias[].originalPackagePath] Absolute path of the original package
 * @param {String} [medias[].originalFileName] Original package name without the extension
 * @param {Array} [medias[].mediaId] The list of medias in the media platform. Could have several media ids if media has
 * @param {ltiple sources
 * @param {Array} [medias[].timecodes] The list of media timecodes
 * @param {Array} [medias[].chapters] The list of media chapters
 * @param {Array} [medias[].tags] The list of media tags
 * @param {Array} [medias[].cut] Media begin and end cuts
 * @param {Array} [medias[].sources] The list of media sources
 * @param {Number} [medias[].views=0] The statistic number of views
 * @param {String} [medias[].thumbnail] The media thumbnail URI
 * @param {String} [medias[].link] The media link in OpenVeo
 * @param {String} [medias[].temporarySubDirectory] The sub path of package files in its temporary directory
 *
 * @param {module:publish/providers/VideoProvider~VideoProvider~addCallback} [callback] The function to call when it's
 * done
 */
VideoProvider.prototype.add = function(medias, callback) {
  var mediasToAdd = [];
  var anonymousId = process.api.getCoreApi().getAnonymousUserId();

  for (var i = 0; i < medias.length; i++) {
    var media = medias[i];

    var data = {
      id: media.id ? String(media.id) : nanoid(),
      available: media.available,
      title: media.title,
      leadParagraph: media.leadParagraph,
      description: media.description,
      descriptionText: media.description && openVeoApi.util.removeHtmlFromText(media.description),
      state: media.state,
      date: media.date,
      type: media.type,
      metadata: media.metadata || {},
      errorCode: media.errorCode,
      category: media.category,
      properties: media.properties || {},
      packageType: media.packageType,
      lastState: media.lastState,
      lastTransition: media.lastTransition,
      lockedByPackage: media.lockedByPackage,
      mergeRequired: media.mergeRequired,
      originalPackagePath: media.originalPackagePath,
      originalFileName: media.originalFileName,
      mediaId: media.mediaId,
      timecodes: media.timecodes,
      chapters: media.chapters,
      tags: media.tags,
      cut: media.cut || [],
      sources: media.sources || [],
      views: media.views || 0,
      thumbnail: media.thumbnail,
      link: media.link,
      temporarySubDirectory: media.temporarySubDirectory
    };

    data.metadata.user = media.user || anonymousId;
    data.metadata.groups = media.groups || [];

    mediasToAdd.push(data);
  }

  VideoProvider.super_.prototype.add.call(this, mediasToAdd, callback);
};

/**
 * Updates video state.
 *
 * @param {Number} id The id of the video to update
 * @param {String} state The state of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateState = function(id, state, callback) {
  updateMedia.call(this, id, {state: state}, callback);
};

/**
 * Updates last video state.
 *
 * @param {Number} id The id of the video to update
 * @param {String} state The last state of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateLastState = function(id, state, callback) {
  updateMedia.call(this, id, {lastState: state}, callback);
};

/**
 * Updates last video transition.
 *
 * @param {Number} id The id of the video to update
 * @param {String} state The last transition of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateLastTransition = function(id, state, callback) {
  updateMedia.call(this, id, {lastTransition: state}, callback);
};

/**
 * Updates video error code.
 *
 * @param {Number} id The id of the video to update
 * @param {Number} errorCode The error code of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateErrorCode = function(id, errorCode, callback) {
  updateMedia.call(this, id, {errorCode: errorCode}, callback);
};

/**
 * Updates video link.
 *
 * @param {Number} id The id of the video to update
 * @param {String} link The link of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateLink = function(id, link, callback) {
  updateMedia.call(this, id, {link: link}, callback);
};

/**
 * Updates media id for media platform.
 *
 * @param {String} id The id of the media to update
 * @param {String} idMediaPlatform The id of the media in the video platform
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateMediaId = function(id, idMediaPlatform, callback) {
  updateMedia.call(this, id, {mediaId: idMediaPlatform}, callback);
};

/**
 * Updates video metadata for video platform.
 *
 * @param {Number} id The id of the video to update
 * @param {Object} metadata The metadata of the video in the video platform
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateMetadata = function(id, metadata, callback) {
  updateMedia.call(this, id, {metadata: metadata}, callback);
};

/**
 * Updates video date timestamp.
 *
 * @param {Number} id The id of the video to update
 * @param {Number} date The date of the video
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateDate = function(id, date, callback) {
  updateMedia.call(this, id, {date: date}, callback);
};

/**
 * Updates video category for video platform.
 *
 * @param {Number} id The id of the video to update
 * @param {String} category The category id of the video in the video platform
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateCategory = function(id, categoryId, callback) {
  updateMedia.call(this, id, {category: categoryId}, callback);
};

/**
 * Updates video platform type.
 *
 * @param {Number} id The id of the video to update
 * @param {String} type The type of the video platform
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateType = function(id, type, callback) {
  updateMedia.call(this, id, {type: type}, callback);
};

/**
 * Updates video thumbnail.
 *
 * @param {Number} id The id of the video to update
 * @param {String} path The path of the thumbnail file
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateThumbnail = function(id, path, callback) {
  updateMedia.call(this, id, {thumbnail: path}, callback);
};

/**
 * Updates video title.
 *
 * @param {Number} id The id of the video to update
 * @param {String} title The video title
 * @param {module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback} callback The function to call
 * when it's done
 */
VideoProvider.prototype.updateTitle = function(id, title, callback) {
  updateMedia.call(this, id, {title: title}, callback);
};

/**
 * Removes medias.
 *
 * All datas associated to the deleted medias will also be deleted.
 *
 * @param {ResourceFilter} [filter] Rules to filter medias to remove
 * @param {module:publish/providers/VideoProvider~VideoProvider~removeCallback} callback The function to call when it's
 * done
 */
VideoProvider.prototype.remove = function(filter, callback) {
  removeMedia.call(this, filter, false, callback);
};

/**
 * Removes medias from OpenVeo but keep videos on the videos platform.
 *
 * All datas associated to the deleted medias will also be deleted.
 *
 * @param {ResourceFilter} [filter] Rules to filter medias to remove
 * @param {module:publish/providers/VideoProvider~VideoProvider~removeCallback} callback The function to call when it's
 * done
 */
VideoProvider.prototype.removeLocal = function(filter, callback) {
  removeMedia.call(this, filter, true, callback);
};

/**
 * Updates a media.
 *
 * @param {ResourceFilter} [filter] Rules to filter the media to update
 * @param {Object} data The modifications to perform
 * @param {String} [data.title] The media title
 * @param {Date} [data.date] The media date
 * @param {String} [data.leadParagraph] The media lead paragraph
 * @param {String} [data.description] The media description
 * @param {Array} [data.properties] The list of properties values for this media
 * @param {String} [data.category] The id of the category the media belongs to
 * @param {Array} [data.cut] Media begin and end cuts
 * @param {Array} [data.timecodes] The list of media timecodes
 * @param {Array} [data.chapters] The list of media chapters
 * @param {Array} [data.tags] The list of media tags
 * @param {Number} [data.views=0] The statistic number of views
 * @param {String} [data.thumbnail] The media thumbnail URI
 * @param {Array} [data.sources] The list of media sources
 * @param {Array} [data.groups] The list of groups ids the media belongs to
 * @param {String} [data.user] The user id the media belongs to
 * @param {Boolean} [data.available] true if the media is available, false otherwise
 * @param {Number} [data.state] The media state (see STATES class from module packages)
 * @param {Date} [data.date] The media date
 * @param {String} [data.type] The id of the associated media platform
 * @param {Object} [data.metadata] Information about the media as a content
 * @param {Boolean} [data.mergeRequired] Indicate that the media is being merged with another one
 * @param {Number} [data.errorCode] The media error code (see ERRORS class from module packages)
 * @param {String} [data.packageType] The type of package
 * @param {String} [data.lastState] The last media state in publication process
 * @param {String} [data.lastTransition] The last media transition in publication process
 * @param {String} [data.lockedByPackage] The id of the package which has locked this package for merge
 * @param {Array} [data.mediaId] The list of medias in the media platform. Could have several media ids if media has
 * @param {ltiple sources
 * @param {String} [data.link] The media link in OpenVeo
 * @param {String} [data.temporarySubDirectory] The sub path of package files in its temporary directory
 * @param {module:publish/providers/VideoProvider~VideoProvider~updateOneCallback} [callback] The function to call when
 * it's done
 */
VideoProvider.prototype.updateOne = function(filter, data, callback) {
  var self = this;
  var modifications = {};

  if (data.title) modifications.title = data.title;
  if (data.date) modifications.date = data.date;
  if (data.properties) modifications.properties = data.properties;
  if (data.cut) modifications.cut = data.cut;
  if (data.timecodes) modifications.timecodes = data.timecodes;
  if (data.chapters) modifications.chapters = data.chapters;
  if (data.tags) modifications.tags = data.tags;
  if (data.thumbnail) modifications.thumbnail = data.thumbnail;
  if (data.sources) modifications.sources = data.sources;
  if (data.lastTransition) modifications.lastTransition = data.lastTransition;
  if (data.type) modifications.type = data.type;
  if (data.metadata) modifications.metadata = data.metadata;
  if (data.packageType) modifications.packageType = data.packageType;
  if (data.mediaId) modifications.mediaId = data.mediaId;
  if (data.link) modifications.link = data.link;
  if (data.temporarySubDirectory) modifications.temporarySubDirectory = data.temporarySubDirectory;
  if (Object.prototype.hasOwnProperty.call(data, 'lastState')) modifications.lastState = data.lastState;
  if (Object.prototype.hasOwnProperty.call(data, 'views')) modifications.views = parseInt(data.views);
  if (Object.prototype.hasOwnProperty.call(data, 'category')) modifications.category = data.category;
  if (Object.prototype.hasOwnProperty.call(data, 'leadParagraph')) modifications.leadParagraph = data.leadParagraph;
  if (Object.prototype.hasOwnProperty.call(data, 'state')) modifications.state = data.state;
  if (Object.prototype.hasOwnProperty.call(data, 'errorCode')) modifications.errorCode = data.errorCode;
  if (Object.prototype.hasOwnProperty.call(data, 'available')) modifications.available = Boolean(data.available);
  if (Object.prototype.hasOwnProperty.call(data, 'lockedByPackage')) {
    modifications.lockedByPackage = data.lockedByPackage;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'mergeRequired')) modifications.mergeRequired = data.mergeRequired;
  if (Object.prototype.hasOwnProperty.call(data, 'description')) {
    modifications.description = data.description;
    modifications.descriptionText = data.description ? openVeoApi.util.removeHtmlFromText(data.description) : null;
  }
  if (data.groups) {
    modifications['metadata.groups'] = data.groups.filter(function(group) {
      return group ? true : false;
    });
  }
  if (Object.prototype.hasOwnProperty.call(data, 'user'))
    modifications['metadata.user'] = data.user || process.api.getCoreApi().getAnonymousUserId();

  VideoProvider.super_.prototype.updateOne.call(self, filter, modifications, function(updateError, total) {
    self.executeCallback(callback, updateError, total);
  });
};

/**
 * Creates videos indexes.
 *
 * @param {callback} callback Function to call when it's done
 */
VideoProvider.prototype.createIndexes = function(callback) {
  var language = process.api.getCoreApi().getContentLanguage();

  this.storage.createIndexes(this.location, [

    {
      key: {title: 'text', descriptionText: 'text'},
      weights: {title: 2},

      // eslint-disable-next-line camelcase
      default_language: language,

      name: 'querySearch'
    },

    {key: {tags: 1}, name: 'byTags'},
    {key: {chapters: 1}, name: 'byChapters'},
    {key: {'metadata.groups': 1}, name: 'byGroups'},
    {key: {'metadata.user': 1}, name: 'byOwner'}
  ], function(error, result) {
    if (result && result.note)
      process.logger.debug('Create videos indexes : ' + result.note);

    callback(error);
  });
};

/**
 * Drops an index from database collection.
 *
 * @param {String} indexName The name of the index to drop
 * @param {callback} callback Function to call when it's done
 */
VideoProvider.prototype.dropIndex = function(indexName, callback) {
  this.storage.dropIndex(this.location, indexName, function(error, result) {
    if (result && result.ok)
      process.logger.debug('Index "' + indexName + '" dropped');

    callback(error);
  });
};

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~updateMediaCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The number of updated items
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~removeMediaCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The number of removed medias
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~getOneCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Object} media The media
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~getOneCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The total amount of medias inserted
 * @param {Array} medias The list of added medias
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~updatePropertyCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The number of updated items
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~updateOneCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total 1 if everything went fine
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~addCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The total amount of medias inserted
 * @param {Array} medias The list of added medias
 */

/**
 * @callback module:publish/providers/VideoProvider~VideoProvider~removeCallback
 * @param {(Error|null)} error The error if an error occurred, null otherwise
 * @param {Number} total The number of removed medias
 */
