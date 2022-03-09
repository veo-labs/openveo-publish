'use strict';

/**
 * @module publish/providers/mediaPlatforms/LocalProvider
 */

var path = require('path');
var util = require('util');
var async = require('async');
var nanoid = require('nanoid').nanoid;
var openVeoApi = require('@openveo/api');
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Defines a LocalProvider class to interact with local platform.
 *
 * @class LocalProvider
 * @extends module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider
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
 * @param {String} mediaFilePath The absolute system path of the media to upload
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~uploadCallback} callback
 * The function to call when it's done
 */
LocalProvider.prototype.upload = function(mediaFilePath, callback) {
  var self = this;
  var mediaId = nanoid();

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
 * Gets information about medias hosted by Local.
 *
 * @param {Array} mediasIds The local ids of the medias
 * @param {Array} expectedMediasHeights The expected medias heights in the same order as medias ids. This is not used
 * for local provider as local doesn't transcode medias
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~getMediaInfoCallback}
 * callback The function to call when it's done
 */
LocalProvider.prototype.getMediasInfo = function(mediasIds, expectedMediasHeights, callback) {
  var self = this;

  var infos = {sources: [], available: true};
  mediasIds.forEach(function(mediaId, index) {
    var basePath = self.conf.streamPath + '/' + mediaId + '/video.mp4';
    var expectedMediaHeight = expectedMediasHeights[index];
    var info = {};
    info.files = [{
      quality: 2, // 0 = mobile, 1 = sd, 2 = hd
      height: expectedMediaHeight,
      link: basePath
    }];
    infos.sources.push(info);
  });

  callback(null, infos);
};

/**
 * Removes a media from the Local platform.
 *
 * @param {Array} mediaIds Local media ids to remove
 * @param {callback} callback The function to call when it's done
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
