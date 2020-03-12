'use strict';

/**
 * @module providers
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var shortid = require('shortid');
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
 */
function VideoProvider(database) {
  VideoProvider.super_.call(this, database, 'publish_videos');

  Object.defineProperties(this, {

    /**
     * List of pending updates.
     *
     * @property updateQueue
     * @type Array
     * @final
     */
    updateQueue: {value: []},

    /**
     * Indicates if an update is actually running.
     *
     * @property pendingUpdate
     * @type Boolean
     * @final
     */
    pendingUpdate: {value: false, writable: true}

  });

}

module.exports = VideoProvider;
util.inherits(VideoProvider, openVeoApi.providers.EntityProvider);

/**
 * Removes a list of directories.
 *
 * @method removeDirectories
 * @private
 * @async
 * @param {Array} directories The list of directory paths
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
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
 * @method removeAllDataRelatedToVideo
 * @private
 * @async
 * @param {Array} videosToRemove The list of videos to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
function removeAllDataRelatedToVideo(videosToRemove, callback) {
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
      });
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
 * @method updateMedia
 * @private
 * @param {String} id The media id
 * @param {Object} modifier Database modifier
 * @param {Function} [callback] Function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
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
 * Resolves media point of interest file path.
 *
 * @method getPoiFilePath
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
 * @method getOne
 * @async
 * @param {ResourceFilter} [filter] Rules to filter medias
 * @param {Object} [fields] Fields to be included or excluded from the response, by default all
 * fields are returned. Only "exclude" or "include" can be specified, not both
 * @param {Array} [fields.include] The list of fields to include in the response, all other fields are excluded
 * @param {Array} [fields.exclude] The list of fields to exclude from response, all other fields are included. Ignored
 * if include is also specified.
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The media
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
 * @method add
 * @async
 * @param {Array} medias The list of medias to store with for each media:
 *   - **String** id The media id
 *   - **Boolean** [available] true if the media is available, false otherwise
 *   - **String** [title] The media title
 *   - **String** [leadParagraph] The media lead paragraph
 *   - **String** [description] The media description
 *   - **Number** [state] The media state (see STATES class from module packages)
 *   - **Date** [date] The media date
 *   - **String** [type] The id of the associated media platform
 *   - **Object** [metadata] Information about the media as a content
 *   - **String** [metadata.user] The id of the user the media belongs to
 *   - **Array** [metadata.groups] The list of groups the media belongs to
 *   - **Number** [errorCode] The media error code (see ERRORS class from module packages)
 *   - **String** [category] The id of the category the media belongs to
 *   - **Array** [properties] The list of properties values for this media
 *   - **String** [packageType] The type of package
 *   - **String** [lastState] The last media state in publication process
 *   - **String** [lastTransition] The last media transition in publication process
 *   - **String** [originalPackagePath] Absolute path of the original package
 *   - **String** [originalFileName] Original package name without the extension
 *   - **Array** [mediaId] The list of medias in the media platform. Could have several media ids if media has
 *     multiple sources
 *   - **Array** [timecodes] The list of media timecodes
 *   - **Array** [chapters] The list of media chapters
 *   - **Array** [tags] The list of media tags
 *   - **Array** [cut] Media begin and end cuts
 *   - **Array** [sources] The list of media sources
 *   - **Number** [views=0] The statistic number of views
 *   - **String** [thumbnail] The media thumbnail URI
 *   - **String** [link] The media link in OpenVeo
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total amount of medias inserted
 *   - **Array** The list of added medias
 */
VideoProvider.prototype.add = function(medias, callback) {
  var mediasToAdd = [];
  var anonymousId = process.api.getCoreApi().getAnonymousUserId();

  for (var i = 0; i < medias.length; i++) {
    var media = medias[i];

    var data = {
      id: media.id ? String(media.id) : shortid.generate(),
      available: media.available,
      title: media.title,
      leadParagraph: media.leadParagraph,
      description: media.description,
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
      link: media.link
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
 * @method updateState
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The state of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateState = function(id, state, callback) {
  updateMedia.call(this, id, {state: state}, callback);
};

/**
 * Updates last video state.
 *
 * @method updateLastState
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The last state of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateLastState = function(id, state, callback) {
  updateMedia.call(this, id, {lastState: state}, callback);
};

/**
 * Updates last video transition.
 *
 * @method updateLastTransition
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} state The last transition of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateLastTransition = function(id, state, callback) {
  updateMedia.call(this, id, {lastTransition: state}, callback);
};

/**
 * Updates video error code.
 *
 * @method updateErrorCode
 * @async
 * @param {Number} id The id of the video to update
 * @param {Number} errorCode The error code of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateErrorCode = function(id, errorCode, callback) {
  updateMedia.call(this, id, {errorCode: errorCode}, callback);
};

/**
 * Updates video link.
 *
 * @method updateLink
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} link The link of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateLink = function(id, link, callback) {
  updateMedia.call(this, id, {link: link}, callback);
};

/**
 * Updates media id for media platform.
 *
 * @method updateMediaId
 * @async
 * @param {String} id The id of the media to update
 * @param {String} idMediaPlatform The id of the media in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateMediaId = function(id, idMediaPlatform, callback) {
  updateMedia.call(this, id, {mediaId: idMediaPlatform}, callback);
};

/**
 * Updates video metadata for video platform.
 *
 * @method updateMetadata
 * @async
 * @param {Number} id The id of the video to update
 * @param {Object} metadata The metadata of the video in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateMetadata = function(id, metadata, callback) {
  updateMedia.call(this, id, {metadata: metadata}, callback);
};

/**
 * Updates video date timestamp.
 *
 * @method updateDate
 * @async
 * @param {Number} id The id of the video to update
 * @param {Number} date The date of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateDate = function(id, date, callback) {
  updateMedia.call(this, id, {date: date}, callback);
};

/**
 * Updates video category for video platform.
 *
 * @method updateCategory
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} category The category id of the video in the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateCategory = function(id, categoryId, callback) {
  updateMedia.call(this, id, {category: categoryId}, callback);
};

/**
 * Updates video platform type.
 *
 * @method updateType
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} type The type of the video platform
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateType = function(id, type, callback) {
  updateMedia.call(this, id, {type: type}, callback);
};

/**
 * Updates video thumbnail.
 *
 * @method updateThumbnail
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} path The path of the thumbnail file
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateThumbnail = function(id, path, callback) {
  updateMedia.call(this, id, {thumbnail: path}, callback);
};

/**
 * Updates video title.
 *
 * @method updateTitle
 * @async
 * @param {Number} id The id of the video to update
 * @param {String} title The video title
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
VideoProvider.prototype.updateTitle = function(id, title, callback) {
  updateMedia.call(this, id, {title: title}, callback);
};

/**
 * Removes medias.
 *
 * All datas associated to the deleted medias will also be deleted.
 *
 * @method remove
 * @async
 * @param {ResourceFilter} [filter] Rules to filter medias to remove
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of removed medias
 */
VideoProvider.prototype.remove = function(filter, callback) {
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

      removeAllDataRelatedToVideo(medias, function(removeRelatedError) {
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
};

/**
 * Updates a media.
 *
 * @method updateOne
 * @async
 * @param {ResourceFilter} [filter] Rules to filter the media to update
 * @param {Object} data The modifications to perform
 *   - **String** [data.title] The media title
 *   - **Date** [data.date] The media date
 *   - **String** [data.leadParagraph] The media lead paragraph
 *   - **String** [data.description] The media description
 *   - **Array** [data.properties] The list of properties values for this media
 *   - **String** [data.category] The id of the category the media belongs to
 *   - **Array** [data.cut] Media begin and end cuts
 *   - **Array** [data.timecodes] The list of media timecodes
 *   - **Array** [data.chapters] The list of media chapters
 *   - **Array** [data.tags] The list of media tags
 *   - **Number** [data.views=0] The statistic number of views
 *   - **String** [data.thumbnail] The media thumbnail URI
 *   - **Array** [data.sources] The list of media sources
 *   - **Array** [data.groups] The list of groups ids the media belongs to
 *   - **String** [data.user] The user id the media belongs to
 *   - **Boolean** [available] true if the media is available, false otherwise
 *   - **Number** [state] The media state (see STATES class from module packages)
 *   - **Date** [date] The media date
 *   - **String** [type] The id of the associated media platform
 *   - **Object** [metadata] Information about the media as a content
 *   - **Number** [errorCode] The media error code (see ERRORS class from module packages)
 *   - **String** [packageType] The type of package
 *   - **String** [lastState] The last media state in publication process
 *   - **String** [lastTransition] The last media transition in publication process
 *   - **Array** [mediaId] The list of medias in the media platform. Could have several media ids if media has
 *     multiple sources
 *   - **String** [link] The media link in OpenVeo
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** 1 if everything went fine
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
  if (data.hasOwnProperty('lastState')) modifications.lastState = data.lastState;
  if (data.hasOwnProperty('views')) modifications.views = parseInt(data.views);
  if (data.hasOwnProperty('category')) modifications.category = data.category;
  if (data.hasOwnProperty('leadParagraph')) modifications.leadParagraph = data.leadParagraph;
  if (data.hasOwnProperty('description')) modifications.description = data.description;
  if (data.hasOwnProperty('state')) modifications.state = data.state;
  if (data.hasOwnProperty('errorCode')) modifications.errorCode = data.errorCode;
  if (data.hasOwnProperty('available')) modifications.available = Boolean(data.available);
  if (data.groups) {
    modifications['metadata.groups'] = data.groups.filter(function(group) {
      return group ? true : false;
    });
  }
  if (data.hasOwnProperty('user'))
    modifications['metadata.user'] = data.user || process.api.getCoreApi().getAnonymousUserId();

  VideoProvider.super_.prototype.updateOne.call(self, filter, modifications, function(updateError, total) {
    self.executeCallback(callback, updateError, total);
  });
};

/**
 * Creates videos indexes.
 *
 * @method createIndexes
 * @async
 * @param {Function} callback Function to call when it's done with :
 *  - **Error** An error if something went wrong, null otherwise
 */
VideoProvider.prototype.createIndexes = function(callback) {
  this.storage.createIndexes(this.location, [
    {key: {title: 'text', description: 'text'}, weights: {title: 2}, name: 'querySearch'},
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
