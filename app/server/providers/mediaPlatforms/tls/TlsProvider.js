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
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var TlsClient = process.requirePublish('app/server/providers/mediaPlatforms/tls/TlsClient.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

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

/**
 * Updates a media resources on the platform.
 *
 * If media has several resources on the platform, the same update will be performed for all resources.
 * Actually only the media title and media custom properties are synchronized with TLS.
 *
 * @method update
 * @async
 * @param {Object} media The media
 * @param {Array} media.mediaId The list of media resource ids
 * @param {Object} data The datas to update
 * @param {String} [data.title] The media title
 * @param {Object} [data.properties] The media custom properties with id / value pairs, custom properties corresponding
 * to the one in TLS configuration will be updated, others won't
 * @param {Boolean} force true to force the update even if title and properties haven't changed, false otherwise
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
TlsProvider.prototype.update = function(media, data, force, callback) {
  if (!data.title && (!data.properties || !Object.keys(data.properties).length)) return callback();

  var self = this;
  var asyncFunctions = [];
  var properties = {};
  var settings;

  // Get TLS settings
  asyncFunctions.push(function(callback) {
    process.api.getCoreApi().settingProvider.getOne(
      new ResourceFilter().equal('id', 'publish-tls'),
      null,
      function(error, tlsSettings) {
        settings = tlsSettings && tlsSettings.value && tlsSettings.value.properties;
        callback(error);
      }
    );
  });

  // Get more information about the custom properties being updated
  asyncFunctions.push(function(callback) {
    if (!data.properties || !settings || !settings.length) return callback();

    var propertyProvider = new PropertyProvider(process.api.getCoreApi().getDatabase());

    propertyProvider.getAll(
      new ResourceFilter().in('id', Object.keys(data.properties)),
      ['id', 'name', 'type'],
      {id: 'desc'},
      function(error, fetchedProperties) {
        if (error) return callback(error);

        // TLS expects the name of the custom property associated to its value
        // Find the name of each custom property being updated
        for (var id in data.properties) {
          for (var j = 0; j < fetchedProperties.length; j++) {
            var fetchedProperty = fetchedProperties[j];

            if (fetchedProperty.id === id) {

              // Property found

              // Only custom properties defined in TLS settings can be updated
              if (settings.indexOf(id) === -1) break;

              var actualValue = media.properties && media.properties[id];

              // Make sure property value has changed before doing anything (force by passes this verification)
              if (fetchedProperty.type === PropertyProvider.TYPES.LIST && !force) {
                actualValue = media.properties ? media.properties[id] || [] : [];
                if (openVeoApi.util.intersectArray(data.properties[id], actualValue).length)
                  break;
              } else if (data.properties[id] === actualValue && !force)
                break;

              // TLS expects dates in their literal forms, not a timestamp
              // Convert values of custom properties of type DATE_TIME into date literals
              if (fetchedProperty.type === PropertyProvider.TYPES.DATE_TIME)
                properties[fetchedProperty.name] = new Date(data.properties[id]);
              else
                properties[fetchedProperty.name] = data.properties[id];

              break;
            }

          }
        }

        callback(error);
      }
    );
  });

  // Update resources on TLS platform
  media.mediaId.forEach(function(mediaId) {
    asyncFunctions.push(function(callback) {
      var modifications = {};
      var callbackHasBeenCalled = false;

      // Make sure that title has changed if defined (force by passes this verification)
      // If neither title nor properties have changed, there is nothing more to do
      if ((!data.title || (data.title === media.title && !force)) &&
        !Object.keys(properties).length) {
        return callback();
      }

      if (data.title) modifications.title = data.title;
      Object.assign(modifications, properties);

      self.client.patch('videos/' + mediaId, modifications).then(function() {
        if (!callbackHasBeenCalled) (callbackHasBeenCalled = true) && callback();
      }).catch(function(error) {
        if (!callbackHasBeenCalled)
          (callbackHasBeenCalled = true) && callback(error);
        else throw error;
      });
    });
  });

  async.series(asyncFunctions, function(error) {
    callback(error);
  });
};
