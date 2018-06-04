'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var async = require('async');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Defines a LocalProvider class to interact with local platform.
 *
 * @class LocalProvider
 * @extends MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf Local configuration
 * @param {String} providerConf.vodFilePath The absolute directory path where to store medias
 * @param {String} providerConf.streamPath The URI of the media
 */
function LocalProvider(providerConf) {
  LocalProvider.super_.call(this, providerConf);
}

module.exports = LocalProvider;
util.inherits(LocalProvider, MediaPlatformProvider);

/**
 * Uploads a media to the Local platform.
 *
 * @method upload
 * @async
 * @param {String} mediaFilePath The absolute system path of the media to upload
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **String** The media id on the Local platform
 */
LocalProvider.prototype.upload = function(mediaFilePath, callback) {
  var self = this;
  var mediaId = shortid.generate();

  var mediaFinalPath = path.join(self.conf.vodFilePath, mediaId, '/video.mp4');
  openVeoApi.fileSystem.copy(mediaFilePath, mediaFinalPath, function(error) {
    if (error) {
      process.logger.warn(error.message, {
        action: 'LocalProvider.upload',
        mediaId: mediaId
      });

      callback(error);
    } else {
      callback(null, mediaId);
    }
  });
};

/**
 * Gets information about a media hosted by Local.
 *
 * @method getMediaInfo
 * @async
 * @param {String} mediaId The local id of the media
 * @param {String} expectedDefintion The expected media definition, not used for this provider
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media
 */
LocalProvider.prototype.getMediaInfo = function(mediaIds, expectedDefinition, callback) {
  var self = this;
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  var infos = {sources: [], available: true};
  mediaIds.forEach(function(mediaId) {
    var info = {};
    var basePath = self.conf.streamPath + '/' + mediaId + '/video.mp4';
    info.files = [{
      quality: 2, // 0 = mobile, 1 = sd, 2 = hd
      height: expectedDefinition,
      link: basePath
    }];
    infos.sources.push(info);
  });

  callback(null, infos);
};

/**
 * Removes a media from the Local platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Local media ids to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
LocalProvider.prototype.remove = function(mediaIds, callback) {
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var self = this;
  var series = [];

  mediaIds.forEach(function(mediaId) {
    series.push(function(callback) {
      var mediaFinalPath = path.join(self.conf.vodFilePath, mediaId);
      openVeoApi.fileSystem.rmdir(mediaFinalPath, function(error) {
        if (error) {
          process.logger.warn(error.message, {
            action: 'LocalProvider.remove',
            path: mediaFinalPath
          });
          callback(error);
        } else {
          callback();
        }
      });
    });
  });

  async.series(series, function(error) {
    callback(error);
  });
};
