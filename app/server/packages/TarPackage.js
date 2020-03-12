'use strict';

/**
 * @module packages
 */

var path = require('path');
var fs = require('fs');
var util = require('util');
var async = require('async');
var xml2js = require('xml2js');
var openVeoApi = require('@openveo/api');
var Package = process.requirePublish('app/server/packages/Package.js');
var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var TarPackageError = process.requirePublish('app/server/packages/TarPackageError.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

var shortid = require('shortid');

/**
 * Defines a TarPackage to manage publication of a tar file.
 *
 * A tar file may contain :
 *  - A video file
 *  - A list of image files
 *  - A .session file describing the package content
 *
 * @example
 *     // tar package object example
 *     {
 *       "id": "13465465", // Id of the package
 *       "type": "vimeo", // Platform type
 *       "title": "2015-03-09_16-53-10_rich-media", // Package title
 *       "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 *     }
 *
 * @example
 *     // ".session" file example contained in a tar package
 *     {
 *       "date": 1425916390, // Unix epoch time of the video record
 *       "rich-media": true, // true if package contains presentation images
 *       "filename": "video.mp4", // The name of the video file in the package
 *       "duration": 30, // Duration of the video in seconds
 *       "indexes": [ // The list of indexes in the video
 *         {
 *           "type": "image", // Index type (could be "image" or "tag")
 *           "timecode": 0, // Index time (in ms) from the beginning of the video
 *           "data": { // Index data (only for "image" type)
 *             "filename": "slide_00000.jpeg" // The name of the image file in the tar
 *           }
 *         },
 *         {
 *           "type": "tag", // Index type (could be "image" or "tag")
 *           "timecode": 3208 // Index time (in ms) from the beginning of the video
 *         },
 *         ...
 *       ]
 *     }
 *
 * @class TarPackage
 * @extends Package
 * @constructor
 * @param {Object} mediaPackage The media description object
 * @param {VideoProvider} videoProvider A video provider
 * @param {PoiProvider} poiProvider Points of interest provider
 */
function TarPackage(mediaPackage, videoProvider, poiProvider) {
  TarPackage.super_.call(this, mediaPackage, videoProvider, poiProvider);

  // Validate package metadata file name
  if (!this.publishConf.metadataFileName || (typeof this.publishConf.metadataFileName !== 'string'))
    this.emit('error', new TarPackageError('metadataFileName in publishConf.json must be a String'),
      ERRORS.INVALID_CONFIGURATION);

}

module.exports = TarPackage;
util.inherits(TarPackage, VideoPackage);

/**
 * Process states for tar packages.
 *
 * @property STATES
 * @type Object
 * @static
 * @final
 */
TarPackage.STATES = {
  PACKAGE_EXTRACTED: 'packageExtracted',
  PACKAGE_VALIDATED: 'packageValidated',
  PUBLIC_DIR_PREPARED: 'publicDirectoryPrepared',
  TIMECODES_SAVED: 'timecodesSaved'
};
Object.freeze(TarPackage.STATES);

/**
 * Tar package process transitions (from one state to another).
 *
 * @property TRANSITIONS
 * @type Object
 * @static
 * @final
 */
TarPackage.TRANSITIONS = {
  EXTRACT_PACKAGE: 'extractPackage',
  VALIDATE_PACKAGE: 'validatePackage',
  PREPARE_PACKAGE: 'preparePublicDirectory',
  SAVE_TIMECODES: 'saveTimecodes'
};
Object.freeze(TarPackage.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for a TarPackage.
 *
 * @property stateTransitions
 * @type Array
 * @static
 * @final
 */
TarPackage.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  TarPackage.TRANSITIONS.EXTRACT_PACKAGE,
  TarPackage.TRANSITIONS.VALIDATE_PACKAGE,
  VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
  VideoPackage.TRANSITIONS.GENERATE_THUMB,
  VideoPackage.TRANSITIONS.GET_METADATA,
  TarPackage.TRANSITIONS.PREPARE_PACKAGE,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.SYNCHRONIZE_MEDIA,
  TarPackage.TRANSITIONS.SAVE_TIMECODES,
  VideoPackage.TRANSITIONS.COPY_IMAGES,
  Package.TRANSITIONS.CLEAN_DIRECTORY
];
Object.freeze(TarPackage.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @property stateMachine
 * @type Array
 * @static
 * @final
 */
TarPackage.stateMachine = VideoPackage.stateMachine.concat([
  {
    name: TarPackage.TRANSITIONS.EXTRACT_PACKAGE,
    from: Package.ORIGINAL_PACKAGE_REMOVED_STATE,
    to: TarPackage.STATES.PACKAGE_EXTRACTED
  },
  {
    name: VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
    from: TarPackage.STATES.PACKAGE_VALIDATED,
    to: VideoPackage.STATES.MP4_DEFRAGMENTED
  },
  {
    name: VideoPackage.TRANSITIONS.GENERATE_THUMB,
    from: VideoPackage.STATES.MP4_DEFRAGMENTED,
    to: VideoPackage.STATES.THUMB_GENERATED
  },
  {
    name: TarPackage.TRANSITIONS.PREPARE_PACKAGE,
    from: VideoPackage.STATES.METADATA_RETRIEVED,
    to: TarPackage.STATES.PUBLIC_DIR_PREPARED
  },
  {
    name: TarPackage.TRANSITIONS.VALIDATE_PACKAGE,
    from: TarPackage.STATES.PACKAGE_EXTRACTED,
    to: TarPackage.STATES.PACKAGE_VALIDATED
  },
  {
    name: TarPackage.TRANSITIONS.PREPARE_PACKAGE,
    from: TarPackage.STATES.PACKAGE_VALIDATED,
    to: TarPackage.STATES.PUBLIC_DIR_PREPARED
  },
  {
    name: Package.TRANSITIONS.UPLOAD_MEDIA,
    from: TarPackage.STATES.PUBLIC_DIR_PREPARED,
    to: Package.STATES.MEDIA_UPLOADED
  },
  {
    name: TarPackage.TRANSITIONS.SAVE_TIMECODES,
    from: Package.STATES.MEDIA_SYNCHRONIZED,
    to: TarPackage.STATES.TIMECODES_SAVED
  },
  {
    name: VideoPackage.TRANSITIONS.COPY_IMAGES,
    from: TarPackage.STATES.TIMECODES_SAVED,
    to: VideoPackage.STATES.COPIED_IMAGES
  }
]);
Object.freeze(TarPackage.stateMachine);

/**
 * Validates package content.
 *
 * A video package must contain, at least a valid package information
 * file and a video file.
 *
 * @example
 *     // mediaPackage example
 *     {
 *       "id" : 1422731934859, // Internal video id
 *       "type" : "vimeo", // The video platform to use
 *       "path" : "C:/Temp/", // The path of the hot folder
 *       "originalPackagePath" : "C:/Temp/video-package.tar", // The original package path in hot folder
 *     }
 *
 * @method validatePackage
 * @async
 * @private
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The package information object
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
        fs.exists(path.join(extractDirectory, packageInformation.filename), function(exists) {

          if (exists)
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
 * Saves the XML timecode file into a JSON equivalent.
 * This will check if the file exists first.
 *
 * 1. Test if timecode xml file exists
 * 2. Transcode XML file to a JSON equivalent
 *    e.g.
 * 3. Format JSON
 *    e.g.
 *
 * @example
 *     // Transform XML timecodes into JSON
 *     // From :
 *     {
 *       "player": {
 *         "synchro":
 *         [
 *           {
 *             "id": ["slide_00000.jpeg"],
 *             "timecode": ["0"]
 *           }, {
 *             "id": ["slide_00001.jpeg"],
 *             "timecode": ["1200"]
 *           }
 *         ]
 *       }
 *     }
 *
 *     // To :
 *     [
 *       {
 *         "timecode": 0,
 *         "type": "image"
 *         "data": {
 *           "filename": "slide_00000.jpeg"
 *         }
 *       },
 *       {
 *         "timecode": 1200,
 *         "type": "image"
 *         "data": {
 *           "filename": "slide_00001.jpeg"
 *         }
 *       }
 *     ]
 *
 * @method saveTimecodes
 * @private
 * @async
 * @param {String} xmlTimecodeFilePath The timecode file to save
 * @param {String} destinationFilePath The JSON timecode file path
 * @param {Function} callback The function to call when done
 *   - **Error** The error if an error occurred, null otherwise
 */
function saveTimecodes(xmlTimecodeFilePath, callback) {
  var self = this;
  var formattedTimecodes = [];
  async.series([
    function(callback) {

      // Check if XML file exists
      fs.exists(xmlTimecodeFilePath, function(exists) {

        if (exists)
          callback();
        else
          callback(new Error('Missing timecode file ' + xmlTimecodeFilePath));

      });
    },
    function(callback) {

      // Transcode XML to JSON
      fs.readFile(xmlTimecodeFilePath, function(error, data) {

        if (error)
          callback(error);
        else {
          xml2js.parseString(data, {
            mergeAttrs: true
          },
          function(error, timecodes) {

            // Transform timecode format to
            if (timecodes && timecodes.player && timecodes.player.synchro) {

              // Iterate through the list of timecodes
              // Change JSON organization to be more accessible
              timecodes.player.synchro.forEach(function(timecodeInfo) {
                if (timecodeInfo['id'] && timecodeInfo['id'].length) {
                  formattedTimecodes.push({
                    timecode: parseInt(timecodeInfo['timecode'][0]),
                    type: 'image',
                    data: {
                      filename: timecodeInfo['id'][0]
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

    if (error) {
      callback(error);
    } else {
      if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};
      openVeoApi.util.merge(self.mediaPackage.metadata, {indexes: formattedTimecodes});

      self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, function(error) {
        callback(error, formattedTimecodes);
      });
    }
  });

}

/**
 * Gets the stack of transitions corresponding to the package.
 *
 * @method getTransitions
 * @return {Array} The stack of transitions
 */
TarPackage.prototype.getTransitions = function() {
  return TarPackage.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 * @method getStateMachine
 */
TarPackage.prototype.getStateMachine = function() {
  return TarPackage.stateMachine;
};

/**
 * Extracts package into temporary directory.
 *
 * This is a transition.
 *
 * @method extractPackage
 */
TarPackage.prototype.extractPackage = function() {
  var self = this;
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));

  // Extract package
  this.updateState(this.mediaPackage.id, STATES.EXTRACTING, function() {

    // Copy destination
    var packagePath = path.join(extractDirectory, self.mediaPackage.id + '.tar');

    process.logger.debug('Extract package ' + packagePath + ' to ' + extractDirectory);
    openVeoApi.fileSystem.extract(packagePath, extractDirectory, function(error) {

      // Extraction failed
      if (error) {
        self.setError(new TarPackageError(error.message, ERRORS.EXTRACT));
      } else {

        // Extraction done
        self.fsm.transition();

      }

    });

  });
};

/**
 * Validates the package by analyzing its content.
 *
 * This is a transition.
 *
 * @method validatePackage
 */
TarPackage.prototype.validatePackage = function() {
  var self = this;

  process.logger.debug('Validate package ' + this.mediaPackage.originalPackagePath);
  this.updateState(this.mediaPackage.id, STATES.VALIDATING, function() {

    // Validate package content
    if (self.mediaPackage.metadata && self.mediaPackage.metadata.indexes)
      self.fsm.transition();
    else validatePackage.call(self, function(error, metadata) {
      if (error)
        self.setError(new TarPackageError(error.message, ERRORS.VALIDATION));
      else {
        if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};

        openVeoApi.util.merge(self.mediaPackage.metadata, metadata);

        async.parallel([
          function(callback) {
            self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, callback);
          },
          function(callback) {
            if (self.mediaPackage.metadata.date)
              self.videoProvider.updateDate(self.mediaPackage.id, self.mediaPackage.metadata.date * 1000, callback);
            else callback();
          },
          function(callback) {
            var pathDescriptor = path.parse(self.mediaPackage.originalPackagePath);
            if (self.mediaPackage.metadata.name && self.mediaPackage.title === pathDescriptor.name)
              self.videoProvider.updateTitle(self.mediaPackage.id, self.mediaPackage.metadata.name, callback);
            else callback();
          }
        ], function() {
          self.fsm.transition();
        });
      }
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
 * <pre>
 *   <?xml version="1.0"?>
 *   <player>
 *     <synchro id="slide_00000.jpeg" timecode="0"/>
 *     <synchro id="slide_00001.jpeg" timecode="1400"/>
 *     ...
 *   </player>
 * </pre>
 *
 * However using "synchro.xml" is deprecated and should not be used anymore. Also note that it is not possible to
 * define points of interest of type "tag" using this method.
 *
 * This is a transition.
 *
 * @method saveTimecodes
 */
TarPackage.prototype.saveTimecodes = function() {
  var self = this;
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));

  process.logger.debug('Save points of interests');

  async.waterfall([

    // Update state
    function(callback) {
      self.updateState(self.mediaPackage.id, STATES.SAVING_TIMECODES, function(error) {
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
        saveTimecodes.call(self, path.join(extractDirectory, 'synchro.xml'), function(error, formatedTimecodes) {
          if (error && self.mediaPackage.metadata['rich-media'])
            callback(error);
          else {
            pointsOfInterest = formatedTimecodes;
            callback(null, pointsOfInterest);
          }
        });
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
              id: shortid.generate(),
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
              name: pointOfInterest.data && pointOfInterest.data.tagname ?
                pointOfInterest.data.tagname : 'Tag' + (tags.length + 1)
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
      self.videoProvider.updateOne(
        new ResourceFilter().equal('id', self.mediaPackage.id),
        {
          tags: tags.map(function(tag) {
            return tag.id;
          }),
          timecodes: timecodes
        },
        callback
      );
    }

  ], function(error) {
    if (error)
      self.setError(new TarPackageError(error.message, ERRORS.SAVE_TIMECODE));
    else
      self.fsm.transition();
  });
};

/**
 * Gets the media file path of the package.
 *
 * @method getMediaFilePath
 * @return {String} System path of the media file
 */
TarPackage.prototype.getMediaFilePath = function() {
  return path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id), this.mediaPackage.metadata.filename);
};
