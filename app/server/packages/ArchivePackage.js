'use strict';

/**
 * @module publish/packages/ArchivePackage
 */

var fs = require('fs');
var path = require('path');
var util = require('util');

var async = require('async');
var xml2js = require('xml2js');
var openVeoApi = require('@openveo/api');

var Package = process.requirePublish('app/server/packages/Package.js');
var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var ArchivePackageError = process.requirePublish('app/server/packages/ArchivePackageError.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

var nanoid = require('nanoid').nanoid;

/**
 * Defines an ArchivePackage to manage publication of an archive.
 *
 * An archive file may contain:
 *  - A video file
 *  - A list of image files
 *  - A .session file describing the package content
 *
 * @example
 * // archive package object example
 * {
 *   "id": "13465465", // Id of the package
 *   "type": "vimeo", // Platform type
 *   "title": "2015-03-09_16-53-10_rich-media", // Package title
 *   "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 * }
 *
 * @example
 * // ".session" file example contained in an archive package
 * {
 *   "date": 1425916390, // Unix epoch time of the video record
 *   "rich-media": true, // true if package contains presentation images
 *   "filename": "video.mp4", // The name of the video file in the package
 *   "duration": 30, // Duration of the video in seconds
 *   "indexes": [ // The list of indexes in the video
 *     {
 *       "type": "image", // Index type (could be "image" or "tag")
 *       "timecode": 0, // Index time (in ms) from the beginning of the video
 *       "data": { // Index data (only for "image" type)
 *         "filename": "slide_00000.jpeg" // The name of the image file in the archive
 *       }
 *     },
 *     {
 *       "type": "tag", // Index type (could be "image" or "tag")
 *       "timecode": 3208 // Index time (in ms) from the beginning of the video
 *     },
 *     ...
 *   ]
 * }
 *
 * @class ArchivePackage
 * @extends module:publish/packages/Package~Package
 * @constructor
 * @param {Object} mediaPackage The media description object
 * @param {module:publish/providers/VideoProvider~VideoProvider} videoProvider A video provider
 * @param {module:publish/providers/PoiProvider~PoiProvider} poiProvider Points of interest provider
 */
function ArchivePackage(mediaPackage, videoProvider, poiProvider) {
  ArchivePackage.super_.call(this, mediaPackage, videoProvider, poiProvider);

  // Validate package metadata file name
  if (!this.publishConf.metadataFileName || (typeof this.publishConf.metadataFileName !== 'string'))
    this.emit('error', new ArchivePackageError('metadataFileName in publishConf.json must be a String'),
      ERRORS.INVALID_CONFIGURATION);

}

module.exports = ArchivePackage;
util.inherits(ArchivePackage, VideoPackage);

/**
 * Process states for archives packages.
 *
 * @const
 * @type {Object}
 */
ArchivePackage.STATES = {
  PACKAGE_EXTRACTED: 'packageExtracted',
  PACKAGE_VALIDATED: 'packageValidated',
  POINTS_OF_INTEREST_SAVED: 'pointsOfInterestSaved'
};
Object.freeze(ArchivePackage.STATES);

/**
 * Archive package process transitions (from one state to another).
 *
 * @const
 * @type {Object}
 */
ArchivePackage.TRANSITIONS = {
  EXTRACT_PACKAGE: 'extractPackage',
  VALIDATE_PACKAGE: 'validatePackage',
  SAVE_POINTS_OF_INTEREST: 'savePointsOfInterest'
};
Object.freeze(ArchivePackage.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for an ArchivePackage.
 *
 * @const
 * @type {Object}
 */
ArchivePackage.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  ArchivePackage.TRANSITIONS.EXTRACT_PACKAGE,
  ArchivePackage.TRANSITIONS.VALIDATE_PACKAGE,
  VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
  VideoPackage.TRANSITIONS.GENERATE_THUMB,
  VideoPackage.TRANSITIONS.GET_METADATA,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.SYNCHRONIZE_MEDIA,
  ArchivePackage.TRANSITIONS.SAVE_POINTS_OF_INTEREST,
  VideoPackage.TRANSITIONS.COPY_IMAGES,
  Package.TRANSITIONS.CLEAN_DIRECTORY,
  VideoPackage.TRANSITIONS.MERGE
];
Object.freeze(ArchivePackage.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @const
 * @type {Object}
 */
ArchivePackage.stateMachine = VideoPackage.stateMachine.concat([
  {
    name: ArchivePackage.TRANSITIONS.EXTRACT_PACKAGE,
    from: Package.ORIGINAL_PACKAGE_REMOVED_STATE,
    to: ArchivePackage.STATES.PACKAGE_EXTRACTED
  },
  {
    name: VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
    from: ArchivePackage.STATES.PACKAGE_VALIDATED,
    to: VideoPackage.STATES.MP4_DEFRAGMENTED
  },
  {
    name: ArchivePackage.TRANSITIONS.VALIDATE_PACKAGE,
    from: ArchivePackage.STATES.PACKAGE_EXTRACTED,
    to: ArchivePackage.STATES.PACKAGE_VALIDATED
  },
  {
    name: Package.TRANSITIONS.UPLOAD_MEDIA,
    from: VideoPackage.STATES.METADATA_RETRIEVED,
    to: Package.STATES.MEDIA_UPLOADED
  },
  {
    name: ArchivePackage.TRANSITIONS.SAVE_POINTS_OF_INTEREST,
    from: Package.STATES.MEDIA_SYNCHRONIZED,
    to: ArchivePackage.STATES.POINTS_OF_INTEREST_SAVED
  },
  {
    name: VideoPackage.TRANSITIONS.COPY_IMAGES,
    from: ArchivePackage.STATES.POINTS_OF_INTEREST_SAVED,
    to: VideoPackage.STATES.COPIED_IMAGES
  }
]);
Object.freeze(ArchivePackage.stateMachine);

/**
 * Validates package content.
 *
 * An archive package must contain, at least a valid package information file and a video file.
 *
 * @example
 * // mediaPackage example
 * {
 *   "id" : 1422731934859, // Internal video id
 *   "type" : "vimeo", // The video platform to use
 *   "path" : "/tmp", // The path of the hot folder
 *   "originalPackagePath" : "/tmp/video-package.tar", // The original package path in hot folder
 * }
 *
 * @memberof module:publish/packages/ArchivePackage~ArchivePackage
 * @this module:publish/packages/ArchivePackage~ArchivePackage
 * @private
 * @param {module:publish/packages/ArchivePackage~ArchivePackage~validatePackageCallack} callback The function to call
 * when done
 */
function validatePackage(callback) {
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));

  // Read package information file
  openVeoApi.fileSystem.getJSONFileContent(path.join(extractDirectory, this.publishConf.metadataFileName),
    function(error, packageInformation) {

      // Failed reading file or parsing JSON
      if (error) {
        callback(new Error(error.message));
      } else if (packageInformation.filename) {

        // Got the name of the video file
        // Test if video file really exists in package
        fs.access(path.join(extractDirectory, packageInformation.filename), function(error) {

          if (!error)
            callback(null, packageInformation);
          else
            callback(new Error('Missing file ' + packageInformation.filename));

        });

      } else {

        // No video file name in metadata, package is not valid
        callback(new Error('No video file name found in metadata file'));

      }

    });

}

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
 * @memberof module:publish/packages/ArchivePackage~ArchivePackage
 * @this module:publish/packages/ArchivePackage~ArchivePackage
 * @private
 * @param {String} xmlPointsOfInterestFilePath The path of the XML file containing points of interest
 * @param {module:publish/packages/ArchivePackage~ArchivePackage~getXmlPointsOfInterestCallback} callback The function
 * to call when it's done
 */
function getXmlPointsOfInterest(xmlPointsOfInterestFilePath, callback) {
  var formattedPointsOfInterest = [];

  async.series([
    function(callback) {

      // Check if XML file exists
      fs.access(xmlPointsOfInterestFilePath, function(error) {

        if (!error)
          callback();
        else
          callback(new Error('Missing XML points of interest file ' + xmlPointsOfInterestFilePath));

      });
    },
    function(callback) {

      // Transcode XML to JSON
      fs.readFile(xmlPointsOfInterestFilePath, function(error, data) {

        if (error)
          callback(error);
        else {
          xml2js.parseString(data, {
            mergeAttrs: true
          },
          function(error, pointsOfInterest) {
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
        }

      });

    }
  ], function(error) {
    callback(error, formattedPointsOfInterest);
  });
}

/**
 * Gets the stack of transitions corresponding to the package.
 *
 * @return {Array} The stack of transitions
 */
ArchivePackage.prototype.getTransitions = function() {
  return ArchivePackage.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 */
ArchivePackage.prototype.getStateMachine = function() {
  return ArchivePackage.stateMachine;
};

/**
 * Extracts package into temporary directory.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.extractPackage = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    async.series([

      // Update state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.EXTRACTING, callback);
      },

      // Extract archive
      function(callback) {
        var extractDirectory = path.join(self.publishConf.videoTmpDir, String(self.mediaPackage.id));
        var packagePath = path.join(extractDirectory, self.mediaPackage.id + '.' + self.mediaPackage.packageType);

        process.logger.debug('Extract package ' + packagePath + ' to ' + extractDirectory);
        openVeoApi.fileSystem.extract(packagePath, extractDirectory, callback);
      }

    ], function(error) {
      if (error) reject(new ArchivePackageError(error.message, ERRORS.EXTRACT));
      else resolve();
    });

  });
};

/**
 * Validates the package by analyzing its content.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.validatePackage = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    process.logger.debug('Validate package ' + self.mediaPackage.originalPackagePath);

    self.updateState(self.mediaPackage.id, STATES.VALIDATING, function() {

      // Validate package content
      if (self.mediaPackage.metadata && self.mediaPackage.metadata.indexes)
        resolve();
      else validatePackage.call(self, function(error, metadata) {
        if (error) return reject(new ArchivePackageError(error.message, ERRORS.VALIDATION));

        if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};

        openVeoApi.util.merge(self.mediaPackage.metadata, metadata);

        async.parallel([
          function(callback) {
            self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, callback);
          },
          function(callback) {
            if (self.mediaPackage.metadata.date) {
              self.mediaPackage.date = self.mediaPackage.metadata.date * 1000;
              self.videoProvider.updateDate(self.mediaPackage.id, self.mediaPackage.date, callback);
            } else callback();
          },
          function(callback) {
            var pathDescriptor = path.parse(self.mediaPackage.originalPackagePath);
            if (self.mediaPackage.metadata.name && self.mediaPackage.title === pathDescriptor.name) {
              self.mediaPackage.title = self.mediaPackage.metadata.name;
              self.videoProvider.updateTitle(self.mediaPackage.id, self.mediaPackage.title, callback);
            } else callback();
          }
        ], function() {
          resolve();
        });
      });

    });
  });
};

/**
 * Saves package points of interest.
 *
 * It expects package metadata to have a property "indexes" containing a list of points of interest with for each one:
 *  - **String** type The type of the point of interest, either "image" or "tag"
 *  - **Number** timecode The time of the point of interest in the video (in milliseconds)
 *  - **Object** data Information about the point of interest depending on its type, see below
 *
 * "data" property of a point of interest of type "image":
 *  - **String** filename The name of the image file in the package
 *
 * "data" property of a point of interest of type "tag":
 *  - **String** tagname The name of the tag
 *
 * Instead of defining the points of interest in package metadata, it is possible to define them in a "synchro.xml"
 * file at the root of the package with the following content:
 * ```html
 * <pre>
 *   <?xml version="1.0"?>
 *   <player>
 *     <synchro id="slide_00000.jpeg" timecode="0"/>
 *     <synchro id="slide_00001.jpeg" timecode="1400"/>
 *     ...
 *   </player>
 * </pre>
 * ```
 *
 * However using "synchro.xml" is deprecated and should not be used anymore. Also note that it is not possible to
 * define points of interest of type "tag" using this method.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.savePointsOfInterest = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var extractDirectory = path.join(self.publishConf.videoTmpDir, String(self.mediaPackage.id));

    process.logger.debug('Save points of interests');

    async.waterfall([

      // Update state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.SAVING_POINTS_OF_INTEREST, function(error) {
          callback(error);
        });
      },

      // Retrieve points of interest either from metadata or "synchro.xml" file
      function(callback) {
        var pointsOfInterest;

        if (self.mediaPackage.metadata && self.mediaPackage.metadata.indexes) {
          pointsOfInterest = self.mediaPackage.metadata.indexes;
          callback(null, pointsOfInterest);
        } else {
          getXmlPointsOfInterest.call(
            self,
            path.join(extractDirectory, 'synchro.xml'),
            function(error, pointsOfInterestFromXml) {
              if (error && self.mediaPackage.metadata['rich-media'])
                callback(error);
              else {
                pointsOfInterest = pointsOfInterestFromXml;

                if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};
                openVeoApi.util.merge(self.mediaPackage.metadata, {indexes: pointsOfInterestFromXml});

                self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, function(error) {
                  callback(error, pointsOfInterest);
                });
              }
            }
          );
        }
      },

      // Generate sprites for the points of interest of type "image"
      function(pointsOfInterest, callback) {
        if (!pointsOfInterest) return callback(null, null, pointsOfInterest);

        // Gets points of interest of type "image"
        var poiImagesPaths = pointsOfInterest.reduce(function(filtered, pointOfInterest) {
          if (pointOfInterest.type === 'image' && pointOfInterest.data)
            filtered.push(path.join(extractDirectory, pointOfInterest.data.filename));
          return filtered;
        }, []);

        if (!poiImagesPaths.length) return callback(null, pointsOfInterest, pointsOfInterest);

        // Generate one or more sprite of 740x400 containing all video images
        openVeoApi.imageProcessor.generateSprites(
          poiImagesPaths,
          path.join(extractDirectory, 'points-of-interest-images.jpg'),
          142,
          80,
          5,
          5,
          90,
          extractDirectory,
          function(error, spriteReferences) {
            callback(error, pointsOfInterest, spriteReferences);
          }
        );
      },

      // Format points of interest
      function(pointsOfInterest, spriteReferences, callback) {
        var countTagsWithoutName = 0;
        var tags = [];
        var timecodes = [];

        if (!pointsOfInterest) return callback();

        // Got points of interest for this video
        // Dissociate points of interest regarding types

        for (var i = 0; i < pointsOfInterest.length; i++) {
          var pointOfInterest = pointsOfInterest[i];

          switch (pointOfInterest.type) {
            case 'image':
              if (!pointOfInterest.data || !pointOfInterest.data.filename) break;

              // Find image in sprite
              var imageReference;
              for (var j = 0; j < spriteReferences.length; j++) {
                if (path.join(extractDirectory, pointOfInterest.data.filename) === spriteReferences[j].image) {
                  imageReference = spriteReferences[j];
                  break;
                }
              }

              // Get the name of the sprite file
              var spriteFileName = imageReference.sprite.match(/\/([^/]*)$/)[1];

              timecodes.push({
                id: nanoid(),
                timecode: pointOfInterest.timecode,
                image: {
                  small: {
                    url: '/publish/' + self.mediaPackage.id + '/' + spriteFileName,
                    x: imageReference.x,
                    y: imageReference.y
                  },
                  large: '/publish/' + self.mediaPackage.id + '/' + pointOfInterest.data.filename
                }
              });
              break;

            case 'tag':
              tags.push({
                value: pointOfInterest.timecode,
                name: (pointOfInterest.data && (pointOfInterest.data.tagname || pointOfInterest.data.category)) ||
                'Tag' + (++countTagsWithoutName)
              });
              break;
            default:
          }
        }
        callback(null, timecodes, tags);
      },

      // Save points of interest
      function(timecodes, tags, callback) {
        self.poiProvider.add(tags, function(error, total, addedTags) {
          if (error) return callback(error);

          callback(null, timecodes, addedTags);
        });
      },

      // Save timecodes and tags into the media
      function(timecodes, tags, callback) {
        self.mediaPackage.timecodes = timecodes;
        self.mediaPackage.tags = (tags || []).map(function(tag) {
          return tag.id;
        });
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            tags: self.mediaPackage.tags,
            timecodes: self.mediaPackage.timecodes
          },
          callback
        );
      }

    ], function(error) {
      if (error) reject(new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST));
      else resolve();
    });
  });
};

/**
 * Gets the media file path of the package.
 *
 * @return {String} System path of the media file
 */
ArchivePackage.prototype.getMediaFilePath = function() {
  return path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id), this.mediaPackage.metadata.filename);
};

/**
 * Selects the media to use as the base media in multi-sources scenario.
 *
 * Finds which media has the most timecodes / tags.
 *
 * @param {Object} media1 A media
 * @param {Object} media2 A media
 * @return {Object} Either media1 or media2
 */
ArchivePackage.prototype.selectMultiSourcesMedia = function(media1, media2) {
  var media1TotalTimecodes = media1.timecodes ? media1.timecodes.length : 0;
  var media2TotalTimecodes = media2.timecodes ? media2.timecodes.length : 0;

  if ((!media1TotalTimecodes && !media2TotalTimecodes) || media1TotalTimecodes === media2TotalTimecodes) {
    var media1TotalTags = media1.tags ? media1.tags.length : 0;
    var media2TotalTags = media2.tags ? media2.tags.length : 0;
    return (media1TotalTags > media2TotalTags) ? media1 : media2;
  }

  return (media1TotalTimecodes > media2TotalTimecodes) ? media1 : media2;
};

/**
 * @callback module:publish/packages/ArchivePackage~ArchivePackage~validatePackageCallack
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} package The package information object
 */

/**
 * @callback module:publish/packages/ArchivePackage~ArchivePackage~getXmlPointsOfInterestCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Array} pointsOfInterest The list of points of interest of type image
 * @param {Number} pointsOfInterest[].timecode Point of interest timecode
 * @param {String} pointsOfInterest[].type Point of interest type (alway "image")
 * @param {Object} pointsOfInterest[].data Point of interest data
 * @param {String} pointsOfInterest[].data.filename Point of interest image file path in the archive
 */
