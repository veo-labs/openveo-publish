'use strict';

/**
 * @module providers
 */

var path = require('path');
var util = require('util');
var shortid = require('shortid');
var async = require('async');
var openVeoApi = require('@openveo/api');
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');
var TlsClient = process.requirePublish('app/server/providers/mediaPlatforms/tls/TlsClient.js');

/**
 * Defines a TlsProvider to interact with TLS platform.
 *
 * @class TlsProvider
 * @extends MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf TLS configuration
 * @param {String} providerConf.nfsPath The absolute path of the NFS directory shared with TLS
 * @param {String} providerConf.mediaDirectoryPath The path of the directory where to store TLS medias. This is
 * relative to nfsPath
 * @param {String} providerConf.accessToken The TLS API authentication token
 * @param {String} providerConf.url The TLS web service URL
 * @param {String} [providerConf.certificate] The absolute path of the full certificate chain if the top level
 * authority is not part of system well known authorities
 */
function TlsProvider(providerConf) {
  TlsProvider.super_.call(this, providerConf);

  if (!providerConf.nfsPath || typeof providerConf.nfsPath !== 'string')
    throw new TypeError('Invalid NFS path: ' + providerConf.nfsPath);

  Object.defineProperties(this, {

    /**
     * The TLS client to interact with TLS web service.
     *
     * @property client
     * @type TlsClient
     * @final
     */
    client: {
      value: new TlsClient(providerConf.url, providerConf.accessToken, providerConf.certificate)
    },

    /**
     * The absolute path to the directory containing medias.
     *
     * @property mediaDirectoryPath
     * @type String
     * @final
     */
    mediaDirectoryPath: {
      value: path.join(providerConf.nfsPath, providerConf.mediaDirectoryPath || '')
    }

  });
}

module.exports = TlsProvider;
util.inherits(TlsProvider, MediaPlatformProvider);

/**
 * Uploads a media to the TLS platform.
 *
 * Media is uploaded on a local directory as OpenVeo and TLS share a common directory through NFS.
 *
 * @method upload
 * @async
 * @param {String} mediaFilePath The absolute path of the media to upload
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **String** The media id
 */
TlsProvider.prototype.upload = function(mediaFilePath, callback) {
  var self = this;
  var mediaId = shortid.generate();
  var mediaFileName = 'video.mp4';
  var mediaFinalPath = path.join(this.mediaDirectoryPath, mediaId, mediaFileName);

  // Create media directory and copy media file to its final directory
  openVeoApi.fileSystem.copy(mediaFilePath, mediaFinalPath, function(error) {
    if (error) return callback(error);

    // Send media information to TLS
    self.client.put('videos/' + mediaId, {
      path: path.join(self.conf.mediaDirectoryPath, mediaId, mediaFileName)
    }).then(function(response) {
      callback(null, mediaId);
    }).catch(function(error) {

      // Something went wrong, remove the media directory
      openVeoApi.fileSystem.rm(path.join(self.mediaDirectoryPath, mediaId), function(rmError) {
        callback(rmError || error);
      });

    });
  });
};

/**
 * Gets information about a media hosted by TLS.
 *
 * @method getMediaInfo
 * @async
 * @param {Array} mediaIds The list of media ids
 * @param {String} expectedDefintion The expected media definition. This is not use for TLS provider as TLS
 * doesn't transcode medias
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the media and its resources
 */
TlsProvider.prototype.getMediaInfo = function(mediaIds, expectedDefinition, callback) {
  var self = this;
  var parallel = [];
  var infos = {sources: [], available: true};

  mediaIds.forEach(function(mediaId) {
    parallel.push(function(callback) {

      // Get media information from TLS
      return self.client.get('videos/' + mediaId).then(function(response) {
        if (!response.available) infos.available = false;

        infos.sources.push({
          adaptive: [
            {
              mimeType: 'application/x-mpegURL',
              link: response.link
            }
          ]
        });

        callback();
      }).catch(callback);
    });
  });

  async.parallel(parallel, function(error) {
    if (error) return callback(error);
    callback(null, infos);
  });
};

/**
 * Removes medias from TLS platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds TLS media ids to remove
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
TlsProvider.prototype.remove = function(mediaIds, callback) {
  var self = this;
  var asyncFunctions = [];

  mediaIds.forEach(function(mediaId) {
    asyncFunctions.push(function(callback) {

      // First send remove instruction to TLS
      self.client.delete('videos/' + mediaId).then(function(reponse) {

        // Secondly remove media from local file system
        openVeoApi.fileSystem.rm(path.join(self.mediaDirectoryPath, mediaId), callback);

      }).catch(callback);

    });
  });

  async.series(asyncFunctions, function(error) {
    callback(error);
  });
};
