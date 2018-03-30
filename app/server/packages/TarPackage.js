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
 */
function TarPackage(mediaPackage, videoProvider) {
  TarPackage.super_.call(this, mediaPackage, videoProvider);

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
  Package.TRANSITIONS.CONFIGURE_MEDIA,
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
    from: Package.STATES.MEDIA_CONFIGURED,
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
          }
        ], function() {
          self.fsm.transition();
        });
      }
    });

  });
};

/**
 * Saves package timecodes into a JSON file.
 *
 * This is a transition.
 *
 * @method saveTimecodes
 */
TarPackage.prototype.saveTimecodes = function() {
  var self = this;
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));
  var videoFinalDir = path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id);

  process.logger.debug('Save timecodes to ' + videoFinalDir);

  var timecodes;
  async.series([

    // Update state
    function(callback) {
      self.updateState(self.mediaPackage.id, STATES.SAVING_TIMECODES, callback);
    },

    // save timecode in metadata from XML if they are not in metadata
    function(callback) {
      if (self.mediaPackage.metadata && self.mediaPackage.metadata.indexes) {
        timecodes = self.mediaPackage.metadata.indexes;
        callback();
      } else saveTimecodes.call(self, path.join(extractDirectory, 'synchro.xml'), function(error, formatedTimecodes) {
        if (error && self.mediaPackage.metadata['rich-media'])
          callback(new TarPackageError(error.message, ERRORS.SAVE_TIMECODE));
        else {
          timecodes = formatedTimecodes;
          callback();
        }
      });
    },

    // parse meatadata to save timecodes and tags
    function(callback) {
      var videoInfo = {};

      // Got timecodes for this video
      if (timecodes) {
        videoInfo.timecodes = [];
        videoInfo.tags = [];

        for (var i = 0; i < timecodes.length; i++) {
          var currentTc = timecodes[i];
          var timecodeType = currentTc.type;

          switch (timecodeType) {
            case 'image':
              var style = 'publish-thumb-200';
              videoInfo.timecodes.push({
                id: shortid.generate(),
                timecode: currentTc.timecode,
                image: {
                  small: '/publish/' + self.mediaPackage.id + '/' + currentTc.data.filename + '?style=' + style,
                  large: '/publish/' + self.mediaPackage.id + '/' + currentTc.data.filename
                }
              });
              break;

            case 'tag':
              videoInfo.tags.push({
                id: shortid.generate(),
                value: currentTc.timecode / (self.mediaPackage.metadata.duration * 1000),
                name: currentTc.data && currentTc.data.tagname ?
                  currentTc.data.tagname : 'Tag' + (videoInfo.tags.length + 1)
              });
              break;
            default:
          }
        }
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          videoInfo,
          function(error) {
            return callback(error);
          }
        );
      } else {
        callback();
      }
    }
  ], function(error) {
    if (error)
      self.setError(error);
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
  return path.join(this.publishConf.videoTmpDir,
     String(this.mediaPackage.id), this.mediaPackage.metadata.filename);
};
