'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');

var async = require('async');
var xml2js = require('xml2js');

var ArchiveFormat = process.requirePublish('app/server/packages/ArchiveFormat.js');

/**
 * @module publish/packages/ArchiveFormatVersion1
 */

/**
 * Defines an ArchiveFormatVersion1 to manage the content of an archive in version 1 format.
 *
 * An ArchiveFormatVersion1 must contain:
 *  - A video file
 *  - A .session file containing archive metadatas
 *
 * An ArchiveFormatVersion1 may contain:
 *  - A list of file images referenced in .session file
 *  - A synchro.xml file (deprecated) referencing the list of file images if not referenced in .session file
 *
 * @class ArchiveFormatVersion1
 * @extends module:publish/packages/ArchiveFormat~ArchiveFormat
 * @constructor
 * @param {String} mediaPackagePath The directory where to find extracted files of the archive
 */
function ArchiveFormatVersion1(mediaPackagePath) {
  ArchiveFormatVersion1.super_.call(this, mediaPackagePath, '.session', 'date', 'name');
}

module.exports = ArchiveFormatVersion1;
util.inherits(ArchiveFormatVersion1, ArchiveFormat);

/**
 * Gets points of interest from the given XML file.
 *
 * This will check if the file exists first.
 *
 * 1. Test if XML file exists
 * 2. Transcode XML file to a JSON equivalent
 *
 * @example
 * // Transform XML points of interest into JSON
 * // From:
 * <player>
 *   <synchro id="slide_00000.jpeg" timecode="0"/>
 *   <synchro id="slide_00001.jpeg" timecode="1200"/>
 * </player>
 *
 * // To:
 * [
 *   {
 *     "timecode": 0,
 *     "type": "image"
 *     "data": {
 *       "filename": "slide_00000.jpeg"
 *     }
 *   },
 *   {
 *     "timecode": 1200,
 *     "type": "image"
 *     "data": {
 *       "filename": "slide_00001.jpeg"
 *     }
 *   }
 * ]
 *
 * @memberof module:publish/packages/ArchiveFormatVersion1~ArchiveFormatVersion1
 * @this module:publish/packages/ArchiveFormatVersion1~ArchiveFormatVersion1
 * @private
 * @param {String} xmlFilePath The path of the XML file containing points of interest
 * @param
 * {module:publish/packages/ArchiveFormatVersion1~ArchiveFormatVersion1~getImagesPointsOfInterestFromXmlFileCallback}
 * callback The function to call when it's done
 */
function getImagesPointsOfInterestFromXmlFile(xmlFilePath, callback) {
  var formattedPointsOfInterest = [];

  async.series([

    // Check if XML file exists
    function(callback) {
      fs.access(xmlFilePath, function(error) {
        if (!error)
          callback();
        else
          callback(new Error('Missing XML points of interest file ' + xmlFilePath));
      });
    },

    // Transcode XML to JSON
    function(callback) {
      fs.readFile(xmlFilePath, function(error, data) {
        if (error) return callback(error);

        xml2js.parseString(data, {mergeAttrs: true}, function(error, pointsOfInterest) {
          if (pointsOfInterest && pointsOfInterest.player && pointsOfInterest.player.synchro) {

            // Iterate through the list of points of interest
            // Change JSON organization to be more accessible
            pointsOfInterest.player.synchro.forEach(function(pointOfInterestInfo) {
              if (pointOfInterestInfo['id'] && pointOfInterestInfo['id'].length) {
                formattedPointsOfInterest.push({
                  timecode: parseInt(pointOfInterestInfo['timecode'][0]),
                  type: 'image',
                  data: {
                    filename: pointOfInterestInfo['id'][0]
                  }
                });
              }
            });
          }
          callback(error);
        });
      });
    }
  ], function(error) {
    callback(error, formattedPointsOfInterest);
  });
}

/**
 * Gets medias file names from metadatas.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getMediasCallback} Function to call when its done
 */
ArchiveFormatVersion1.prototype.getMedias = function(callback) {
  this.getProperty('filename', function(error, fileName) {
    if (error) return callback(error);
    callback(null, [fileName]);
  });
};

/**
 * Gets points of interest.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~getPointsOfInterestCallback} Function to call when its
 * done
 */
ArchiveFormatVersion1.prototype.getPointsOfInterest = function(callback) {
  var pointsOfInterest;
  var self = this;

  async.series([

    // Get points of interest from metadatas
    function(callback) {
      self.getProperty('indexes', function(error, indexes) {
        if (error) return callback(error);
        pointsOfInterest = indexes;
        callback();
      });
    },

    // Points of interest were not found in metadatas file, try to get them from deprecated synchro.xml file
    function(callback) {
      if (pointsOfInterest) return callback();

      getImagesPointsOfInterestFromXmlFile.call(
        self,
        path.join(self.mediaPackagePath, 'synchro.xml'),
        function(error, pointsOfInterestFromXml) {
          if (error) return callback(error);

          pointsOfInterest = pointsOfInterestFromXml;
          callback();
        }
      );
    }

  ], function(error) {
    if (error) return callback(error);
    callback(null, pointsOfInterest);
  });
};

/**
 * Validates the archive.
 *
 * The archive should contain video file referenced in metadatas file.
 *
 * @return {module:publish/packages/ArchiveFormat~ArchiveFormat~validateCallback} Function to call when its done
 */
ArchiveFormatVersion1.prototype.validate = function(callback) {
  var self = this;

  this.getProperty('filename', function(error, mediaFileName) {
    if (error) return callback(error);
    if (!mediaFileName) {
      process.logger.debug(
        'Missing "filename" property in metadatas file of archive version 1 format'
      );
      return callback(null, false);
    }

    // Got the name of the video file
    // Test if video file really exists in package
    fs.access(path.join(self.mediaPackagePath, mediaFileName), function(error) {
      if (error) {
        process.logger.debug('Missing file ' + mediaFileName + ' into archive version 1 format');
        return callback(null, false);
      }

      callback(null, true);
    });
  });
};

/**
 * @callback
 * module:publish/packages/ArchiveFormatVersion1~ArchiveFormatVersion1~getImagesPointsOfInterestFromXmlFileCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Array} pointsOfInterest The list of points of interest of type image
 * @param {Number} pointsOfInterest[].timecode Point of interest timecode
 * @param {String} pointsOfInterest[].type Point of interest type (alway "image")
 * @param {Object} pointsOfInterest[].data Point of interest data
 * @param {String} pointsOfInterest[].data.filename Point of interest image file path in the archive
 */
