'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');

var async = require('async');

var ArchiveFormat = process.requirePublish('app/server/packages/ArchiveFormat.js');

/**
 * @module publish/packages/ArchiveFormatVersion2
 */

/**
 * Defines an ArchiveFormatVersion2 to manage the content of an archive in version 2 format.
 *
 * An ArchiveFormatVersion2 must contain:
 *  - At least a video file referenced in info.json file
 *  - An info.json file containing archive metadatas
 *
 * @class ArchiveFormatVersion2
 * @extends module:publish/packages/ArchiveFormat~ArchiveFormat
 * @constructor
 * @param {String} mediaPackagePath The directory where to find extracted files of the archive
 */
function ArchiveFormatVersion2(mediaPackagePath) {
  ArchiveFormatVersion2.super_.call(this, mediaPackagePath, 'info.json', 'creationTime', 'name');
}

module.exports = ArchiveFormatVersion2;
util.inherits(ArchiveFormatVersion2, ArchiveFormat);

/**
 * Gets medias files names from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getMediasCallback} Function to call when its done
 */
ArchiveFormatVersion2.prototype.getMedias = function(callback) {
  this.getProperty('medias', function(error, medias) {
    if (error) return callback(error);
    callback(null, medias.map(function(media) {
      return media.filename;
    }));
  });
};

/**
 * Gets points of interest.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getPointsOfInterestCallback} Function to call when its
 * done
 */
ArchiveFormatVersion2.prototype.getPointsOfInterest = function(callback) {
  this.getMetadatas(function(error, metadatas) {
    if (error) return callback(error);

    callback(null, metadatas.tags.map(function(tag) {
      return {
        type: 'tag',
        timecode: tag.timestamp * 1000,
        data: {
          tagname: tag.text,
          category: metadatas.categories && metadatas.categories[tag.category].label
        }
      };
    }));
  });
};

/**
 * Validates the archive.
 *
 * The archive should contain videos files referenced in metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~validateCallback} Function to call when its done
 */
ArchiveFormatVersion2.prototype.validate = function(callback) {
  var self = this;

  this.getMedias(function(error, mediasFilesPaths) {
    if (error) return callback(error);
    if (!mediasFilesPaths || !mediasFilesPaths.length) {
      process.logger.debug('No medias referenced in metadatas file of archive version 2 format');
      return callback(null, false);
    }

    var accessFunctions = [];

    mediasFilesPaths.forEach(function(mediaFilePath) {
      accessFunctions.push(function(callback) {
        fs.access(path.join(self.mediaPackagePath, mediaFilePath), function(error) {
          if (error) {
            process.logger.debug('Missing file ' + mediaFilePath + ' into archive version 2 format');
            return callback(null, false);
          }

          callback(null, true);
        });
      });
    });

    async.parallel(accessFunctions, function(error, results) {
      if (error) return callback(error);

      callback(null, results.every(function(isValid) {
        return isValid === true;
      }));
    });
  });
};
