'use strict';

/**
 * Defines the ArchiveFormat factory.
 *
 * @module publish/packages/archiveFormatFactory
 */

var fs = require('fs');
var path = require('path');

/**
 * Gets an instance of ArchiveFormat depending on archive version.
 *
 * If file .session exists in the package then it is considered a version 1 format.
 * If file info.json exists in the package then it is considered a version 2 format.
 *
 * @param {String} mediaPackagePath The directory where to find archive extracted files
 * @return {module:publish/packages/archiveFormatFactory~getCallback} A function to call when its done
 */
module.exports.get = function(mediaPackagePath, callback) {
  fs.access(path.join(mediaPackagePath, 'info.json'), function(error) {
    if (!error) {
      var ArchiveFormatVersion2 = process.requirePublish('app/server/packages/ArchiveFormatVersion2.js');
      return callback(null, new ArchiveFormatVersion2(mediaPackagePath));
    }

    fs.access(path.join(mediaPackagePath, '.session'), function(error) {
      if (!error) {
        var ArchiveFormatVersion1 = process.requirePublish('app/server/packages/ArchiveFormatVersion1.js');
        return callback(null, new ArchiveFormatVersion1(mediaPackagePath));
      }

      callback(new Error('Archive is not valid (' + mediaPackagePath + ')'));
    });
  });
};

/**
 * @callback module:publish/packages/archiveFormatFactory~getCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {ArchiveFormat} format The ArchiveFormat of the package
 */
