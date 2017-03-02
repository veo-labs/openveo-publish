'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var async = require('async');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var VideoPlatformProvider = process.requirePublish('app/server/providers/videoPlatforms/VideoPlatformProvider.js');

/**
 * Defines a LocalProvider class to interact with local platform.
 *
 * @class LocalProvider
 * @extends VideoPlatformProvider
 * @constructor
 * @param {Object} providerConf A local configuration object
 * @param {String} providerConf.vodFilePath TODO
 * @param {String} providerConf.streamPath TODO
 */
function LocalProvider(providerConf) {
  LocalProvider.super_.call(this, providerConf);
}

module.exports = LocalProvider;
util.inherits(LocalProvider, VideoPlatformProvider);

/**
 * Uploads a video to the Local platform.
 *
 * @method upload
 * @async
 * @param {String} videoFilePath System path of the video to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
LocalProvider.prototype.upload = function(videoFilePath, callback) {
  var self = this;
  var tmpId = shortid.generate();

  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/@openveo/publish/tmp/6xF1eG46/video.mp4
  var videoFinalPath = path.normalize(self.conf.vodFilePath + '/' + tmpId + '/video.mp4');
  openVeoApi.fileSystem.copy(videoFilePath, path.normalize(videoFinalPath), function(error) {
    if (error) {
      process.logger.warn(error.message, {
        action: 'copyVideo',
        mediaId: tmpId
      });

      callback(error);
    } else {
      callback(null, tmpId);
    }
  });
};

/**
 * Gets information about a video hosted by Local.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       sources : {
 *         adaptive:[
 *         {
 *           mimeType : application/dash+xml,
 *           link : "http://192.168.1.20:1935/openveo/mp4:sample.mp4/manifest.mpd"
 *         },
 *         ...
 *       ]
 *     }
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The local id of the video
 * @param {String} expectedDefintion The expected video definition (e.g. 720, 1080) _ not use on local
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
LocalProvider.prototype.getVideoInfo = function(mediaIds, expectedDefinition, callback) {
  var self = this;
  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  var infos = {sources: [], available: true};
  var cdnUrl = process.api.getCoreApi().getCdnUrl();
  mediaIds.forEach(function(mediaId) {
    var info = {};
    var basePath = cdnUrl + self.conf.streamPath + '/' + mediaId + '/video.mp4';
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
 * Remove a video from the Local platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Media Ids array of videos to remove
 * @param {Function} callback The function to call when the remove
 * is done
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
      var videoFinalPath = path.normalize(self.conf.vodFilePath + '/' + mediaId);
      openVeoApi.fileSystem.rmdir(videoFinalPath, function(error) {
        if (error) {
          process.logger.warn(error.message, {
            action: 'RemoveVideo',
            path: videoFinalPath
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
