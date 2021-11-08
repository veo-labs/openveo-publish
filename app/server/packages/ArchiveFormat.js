'use strict';

var path = require('path');

var openVeoApi = require('@openveo/api');

/**
 * @module publish/packages/ArchiveFormat
 */

/**
 * Defines an ArchiveFormat to manage the content of an archive.
 *
 * An ArchiveFormat must contain:
 *  - A video file
 *  - A file containing archive metadatas
 *
 *  Archive metadatas may contain:
 *  - A property containing the date of the archive
 *  - A property containing the name of the archive
 *
 * @class ArchiveFormat
 * @constructor
 * @param {String} mediaPackagePath The directory where to find extracted files of the archive
 * @param {String} metadatasFileName The name of the metadatas file in the archive
 * @param {String} metadataDateProperty The name of the property in metadatas containing the date of the archive
 * @param {String} metadataNameProperty The name of the property in metadatas containing the name of the archive
 */
function ArchiveFormat(mediaPackagePath, metadatasFileName, metadataDateProperty, metadataNameProperty) {

  Object.defineProperties(this,

    /** @lends module:publish/packages/ArchiveFormat~ArchiveFormat */
    {

      /**
       * The metadatas file path.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      descriptionFilePath: {value: path.join(mediaPackagePath, metadatasFileName)},

      /**
       * The archive metadatas.
       *
       * @type {Object}
       * @instance
       */
      metadatas: {value: null, writable: true},

      /**
       * The name of the property in metadatas containing the date of the archive.
       *
       * @type {Object}
       * @instance
       */
      metadataDateProperty: {value: metadataDateProperty},

      /**
       * The name of the property in metadatas containing the name of the archive.
       *
       * @type {Object}
       * @instance
       */
      metadataNameProperty: {value: metadataNameProperty},

      /**
       * The path of the media package.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      mediaPackagePath: {value: mediaPackagePath}

    }

  );

}

module.exports = ArchiveFormat;

/**
 * Gets archive metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getMetadatasCallback} Function to call when its done
 */
ArchiveFormat.prototype.getMetadatas = function(callback) {
  var self = this;

  if (this.metadatas) return callback(null, this.metadatas);

  openVeoApi.fileSystem.getJSONFileContent(this.descriptionFilePath, function(error, packageInformation) {
    if (error) return callback(error);
    self.metadatas = packageInformation;
    callback(null, self.metadatas);
  });
};

/**
 * Gets archive date from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getDateCallback} Function to call when its done
 */
ArchiveFormat.prototype.getDate = function(callback) {
  this.getProperty(this.metadataDateProperty, function(error, date) {
    if (error) return callback(error);
    callback(null, date * 1000);
  });
};

/**
 * Gets archive name from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getNameCallback} Function to call when its done
 */
ArchiveFormat.prototype.getName = function(callback) {
  this.getProperty(this.metadataNameProperty, callback);
};

/**
 * Gets property value from metadatas.
 *
 * @param {String} property The path of the property to look for in metadatas
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getPropertyCallback} Function to call when its done
 */
ArchiveFormat.prototype.getProperty = function(property, callback) {
  var self = this;

  if (this.metadatas) {
    return callback(null, openVeoApi.util.evaluateDeepObjectProperties(property, this.metadatas));
  }

  this.getMetadatas(function(error, metadatas) {
    if (error) return callback(error);
    callback(null, openVeoApi.util.evaluateDeepObjectProperties(property, self.metadatas));
  });
};

/**
 * Gets medias files names from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getMediasCallback} Function to call when its done
 */
ArchiveFormat.prototype.getMedias = function(callback) {
  throw new Error('getMedias method not implemented for this ArchiveFormat');
};

/**
 * Gets points of interest from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getPointsOfInterestCallback} Function to call when its
 * done
 */
ArchiveFormat.prototype.getPointsOfInterest = function(callback) {
  throw new Error('getPointsOfInterest method not implemented for this ArchiveFormat');
};

/**
 * Validates the archive.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~validateCallback} Function to call when its done
 */
ArchiveFormat.prototype.validate = function(callback) {
  throw new Error('validate method not implemented for this ArchiveFormat');
};

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getDateCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Number} date Archive timestamp in milliseconds
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getMediasCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Array} medias The list of medias files names in the archive
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getMetadatasCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} metadatas Archive metadatas
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getNameCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {String} name Archive name
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getPointsOfInterestCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Array} pointsOfInterest The list of points of interest
 * @param {String} pointsOfInterest[].type Points of interest type
 * @param {String} pointsOfInterest[].timecode Points of interest time in milliseconds from the beginning of the media
 * @param {Object} pointsOfInterest[].data Points of interest additional data depending on its type
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~getPropertyCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {*} value The property value from archive metadatas
 */

/**
 * @callback module:publish/packages/ArchiveFormat~ArchiveFormat~validateCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Boolean} isValid true if valid, false otherwise
 */
