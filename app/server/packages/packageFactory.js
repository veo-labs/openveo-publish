'use strict';

/**
 * Defines the package factory.
 *
 * @module publish/packages/packageFactory
 */

var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PoiProvider = process.requirePublish('app/server/providers/PoiProvider.js');
var fileSystem = openVeoApi.fileSystem;

/**
 * Gets an instance of a Package depending on package file type (factory).
 *
 * @param {String} type The type of the package platform to instanciate
 * @param {Object} mediaPackage Information about the media
 * @return {module:publish/packages/Package~Package} An instance of a Package sub class
 */
module.exports.get = function(type, mediaPackage) {
  if (type) {
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    var poiProvider = new PoiProvider(coreApi.getDatabase());

    switch (type) {
      case fileSystem.FILE_TYPES.TAR:
        var TarPackage = process.requirePublish('app/server/packages/TarPackage.js');
        return new TarPackage(mediaPackage, videoProvider, poiProvider);

      case fileSystem.FILE_TYPES.MP4:
        var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');
        return new VideoPackage(mediaPackage, videoProvider, poiProvider);

      default:
        throw new Error('Package type is not valid (' + mediaPackage.packageType + ')');
    }
  }
};
