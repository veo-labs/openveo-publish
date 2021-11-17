'use strict';

/**
 * @module publish/packages/ArchivePackage
 */

var fs = require('fs');
var path = require('path');
var util = require('util');

var async = require('async');
var openVeoApi = require('@openveo/api');

var archiveFormatFactory = process.requirePublish('app/server/packages/archiveFormatFactory.js');
var mediaPlatformFactory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
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
 *  - A list of images files
 *  - A description file
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
  Package.TRANSITIONS.INIT_MERGE,
  Package.TRANSITIONS.MERGE,
  Package.TRANSITIONS.FINALIZE_MERGE,
  Package.TRANSITIONS.REMOVE_PACKAGE
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
 * Generates sprites for the given points of interest of type "image".
 *
 * Other types of points of interest will be ignored.
 *
 * @memberof module:publish/packages/ArchivePackage~ArchivePackage
 * @this module:publish/packages/ArchivePackage~ArchivePackage
 * @private
 * @param {String} packageId The media package id the points of interest belong to
 * @param {String} basePath The base path for points of interest files
 * @param {Array} pointsOfInterest The list of points of interest
 * @param {String} pointsOfInterest[].type Point of interest type (ignored if not "image")
 * @param {Number} pointsOfInterest[].timecode Point of interest timecode
 * @param {Object} pointsOfInterest[].data Point of interest data
 * @param {String} pointsOfInterest[].data.filename Point of interest filename regarding basePath
 * @param {String} destinationPath Sprites destination directory path
 * @param {String} [temporaryDirectoryPath] Path to the temporary directory to use to store intermediate images. It
 * will be removed at the end of the operation. If not specified a directory is created in /tmp/
 * @param {module:publish/packages/ArchivePackage~ArchivePackage~generatePointsOfInterestSpritesCallback} callback The
 * function to call when it's done
 */
function generatePointsOfInterestSprites(
  packageId,
  basePath,
  pointsOfInterest,
  destinationPath,
  temporaryDirectoryPath,
  callback
) {
  var pointsOfInterestImagesPath = pointsOfInterest.reduce(function(filtered, pointOfInterest) {
    if (pointOfInterest.type === 'image' && pointOfInterest.data)
      filtered.push(path.join(basePath, pointOfInterest.data.filename));
    return filtered;
  }, []);

  if (!pointsOfInterestImagesPath.length) return callback(null, []);

  // Generate one or more sprite of 740x400 containing all points of interest images
  openVeoApi.imageProcessor.generateSprites(
    pointsOfInterestImagesPath,
    path.join(destinationPath, 'points-of-interest-images.jpg'),
    142,
    80,
    5,
    5,
    90,
    temporaryDirectoryPath,
    function(error, spriteReferences) {
      if (error) return callback(error);

      callback(
        null,
        pointsOfInterest.reduce(function(filtered, pointOfInterest) {
          if (pointOfInterest.type !== 'image' || !pointOfInterest.data || !pointOfInterest.data.filename) {
            return filtered;
          }

          // Find image in sprite
          var imageReference;
          for (var i = 0; i < spriteReferences.length; i++) {
            if (path.join(basePath, pointOfInterest.data.filename) === spriteReferences[i].image) {
              imageReference = spriteReferences[i];
              break;
            }
          }

          filtered.push({
            id: nanoid(),
            timecode: pointOfInterest.timecode,
            image: {
              small: {
                url: '/publish/' + packageId + '/' + path.basename(imageReference.sprite),
                x: imageReference.x,
                y: imageReference.y
              },
              large: '/publish/' + packageId + '/' + pointOfInterest.data.filename
            }
          });

          return filtered;
        }, [])
      );
    }
  );
}

/**
 * Gets formatted list of points of interest of type "tag" from given points of interest.
 *
 * @memberof module:publish/packages/ArchivePackage~ArchivePackage
 * @this module:publish/packages/ArchivePackage~ArchivePackage
 * @private
 * @param {Array} pointsOfInterest The list of points of interest as found in the package
 * @param {String} pointsOfInterest[].type Point of interest type (ignored if not "tag")
 * @param {Number} pointsOfInterest[].timecode Point of interest timecode
 * @param {String} [pointsOfInterest[].name] Point of interest name
 * @param {String} [pointsOfInterest[].category] Point of interest category
 * @return {Array} The formatted list of tags
 */
function getPointsOfInterestTags(pointsOfInterest) {
  var countTagsWithoutName = 0;

  return pointsOfInterest.reduce(function(filtered, pointOfInterest) {
    if (pointOfInterest.type === 'tag') {
      filtered.push({
        value: pointOfInterest.timecode,
        name: (pointOfInterest.data && (pointOfInterest.data.name || pointOfInterest.data.category)) ||
        'Tag' + (++countTagsWithoutName),
        description: (pointOfInterest.data && pointOfInterest.data.description) || null
      });
    }
    return filtered;
  }, []);
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
 * Defragments all medias files contained in the archive.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.defragmentMp4 = function() {
  var self = this;
  var archiveFormat;
  var mediasFilesPaths;

  return new Promise(function(resolve, reject) {
    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.DEFRAGMENTING_MP4, callback);
      },

      // Get archive format
      function(callback) {
        archiveFormatFactory.get(
          self.packageTemporaryDirectory,
          function(error, format) {
            if (error) return reject(new ArchivePackageError(error.message, ERRORS.DEFRAGMENT_MP4_GET_FORMAT));
            archiveFormat = format;
            callback();
          }
        );
      },

      // Get medias
      function(callback) {
        archiveFormat.getMedias(function(error, mediasFilesNames) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.DEFRAGMENT_MP4_GET_MEDIAS));
          mediasFilesPaths = mediasFilesNames.map(function(mediaFileName) {
            return path.join(self.packageTemporaryDirectory, mediaFileName);
          });
          callback();
        });
      },

      // Defragment medias
      function(callback) {
        if (!mediasFilesPaths || !mediasFilesPaths.length) return callback();

        var defragmentFunctions = [];

        mediasFilesPaths.forEach(function(mediaFilePath) {
          defragmentFunctions.push(function(callback) {
            self.defragment(mediaFilePath, callback);
          });
        });

        async.series(defragmentFunctions, function(error) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.DEFRAGMENTATION));
          callback();
        });
      }

    ], function(error) {
      if (error) reject(error);
      else resolve();
    });
  });
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
    var extractDirectory = self.packageTemporaryDirectory;
    var packagePath = path.join(extractDirectory, self.mediaPackage.id + '.' + self.mediaPackage.packageType);

    async.series([

      // Update state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.EXTRACTING, callback);
      },

      // Extract archive
      function(callback) {
        self.log('Extract package ' + packagePath + ' to ' + extractDirectory);

        openVeoApi.fileSystem.extract(packagePath, extractDirectory, function(error) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.EXTRACT));
          callback();
        });
      },

      // Read media package temporary directory to verify that archive resources weren't contained in a folder
      function(callback) {
        if (self.mediaPackage.temporarySubDirectory) return callback();

        openVeoApi.fileSystem.readdir(self.packageTemporaryDirectory, function(error, stats) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.EXTRACT_VERIFY));

          var topLevelStats = stats.reduce(function(filtered, stat, index) {
            if (path.dirname(stat.path) === self.packageTemporaryDirectory && stat.path !== packagePath) {
              filtered.push(stat);
            }
            return filtered;
          }, []);

          if (topLevelStats.length === 1) {
            if (topLevelStats[0].isDirectory()) {
              self.mediaPackage.temporarySubDirectory = path.basename(topLevelStats[0].path);
              self.packageTemporaryDirectory = path.join(
                self.packageTemporaryDirectory,
                self.mediaPackage.temporarySubDirectory
              );
            }

          }

          callback();
        });
      },

      // If resources are wrapped inside a folder change package temporary directory
      function(callback) {
        if (!self.mediaPackage.temporarySubDirectory) return callback();

        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            temporarySubDirectory: self.mediaPackage.temporarySubDirectory
          },
          function(error) {
            if (error) return callback(new ArchivePackageError(error.message, ERRORS.EXTRACT_UPDATE_PACKAGE));
            callback();
          }
        );
      }

    ], function(error) {
      if (error) reject(error);
      else resolve();
    });

  });
};

/**
 * Uploads the medias to the media platform.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.uploadMedia = function() {
  var self = this;
  var archiveFormat;
  var mediasFilesPaths;

  return new Promise(function(resolve, reject) {
    self.mediaPackage.link = '/publish/video/' + self.mediaPackage.id;

    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.UPLOADING, callback);
      },

      // Get archive format
      function(callback) {
        archiveFormatFactory.get(
          self.packageTemporaryDirectory,
          function(error, format) {
            if (error) return reject(new ArchivePackageError(error.message, ERRORS.UPLOAD_MEDIA_GET_FORMAT));
            archiveFormat = format;
            callback();
          }
        );
      },

      // Get medias
      function(callback) {
        archiveFormat.getMedias(function(error, mediasFilesNames) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.UPLOAD_MEDIA_GET_MEDIAS));
          mediasFilesPaths = mediasFilesNames.map(function(mediaFileName) {
            return path.join(self.packageTemporaryDirectory, mediaFileName);
          });
          callback();
        });
      },

      // Upload media
      function(callback) {
        if (self.mediaPackage.mediaId && self.mediaPackage.mediaId.length === mediasFilesPaths.length) {
          return callback();
        }

        var totalMediasToSkip = 0;
        var uploadMediaFunctions = [];

        if (self.mediaPackage.mediaId) totalMediasToSkip = self.mediaPackage.mediaId.length;
        else self.mediaPackage.mediaId = [];

        // Upload only medias which haven't been uploaded yet (some medias could have been uploaded if package
        // processing failed on this transition)
        mediasFilesPaths = mediasFilesPaths.slice(totalMediasToSkip);

        // Get media plaform provider from package type
        var mediaPlatformProvider = mediaPlatformFactory.get(
          self.mediaPackage.type,
          self.videoPlatformConf[self.mediaPackage.type]
        );

        mediasFilesPaths.forEach(function(mediaFilePath) {
          uploadMediaFunctions.push(function(callback) {

            // Start uploading the media to the platform
            self.log('Upload media ' + mediaFilePath);

            mediaPlatformProvider.upload(mediaFilePath, function(error, id) {
              if (error) return callback(error);
              self.mediaPackage.mediaId.push(id);
              callback();
            });
          });
        });

        async.series(uploadMediaFunctions, function(error) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.MEDIA_UPLOAD));
          callback();
        });
      },

      // Update package
      function(callback) {
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            link: self.mediaPackage.link,
            mediaId: self.mediaPackage.mediaId
          },
          function(error) {
            if (error) return callback(new ArchivePackageError(error.message, ERRORS.UPLOAD_MEDIA_UPDATE_PACKAGE));
            callback();
          }
        );
      }

    ], function(error) {
      if (error) reject(error);
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
    var archiveFormat;

    self.log('Validate package');

    async.series([

      // Update state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.VALIDATING, callback);
      },

      // Get archive format
      function(callback) {
        archiveFormatFactory.get(
          self.packageTemporaryDirectory,
          function(error, format) {
            if (error) return reject(new ArchivePackageError(error.message, ERRORS.VALIDATE_GET_FORMAT));
            archiveFormat = format;
            callback();
          }
        );
      },

      // Validate package
      function(callback) {
        archiveFormat.validate(function(error, isValid) {
          if (!error && !isValid) error = new Error('Invalid archive format');
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.VALIDATION));

          callback();
        });
      },

      // Get archive metadatas
      function(callback) {
        if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};

        async.series([

          function(callback) {
            archiveFormat.getMetadatas(function(error, metadatas) {
              if (error) return callback(error);
              openVeoApi.util.merge(self.mediaPackage.metadata, metadatas);
              callback();
            });
          },

          function(callback) {
            archiveFormat.getDate(function(error, date) {
              if (error) return callback(error);
              self.mediaPackage.date = date;
              callback();
            });
          },

          function(callback) {
            archiveFormat.getName(function(error, name) {
              if (error) return callback(error);

              var pathDescriptor = path.parse(self.mediaPackage.originalPackagePath);
              if (name && self.mediaPackage.title === pathDescriptor.name) {
                self.mediaPackage.title = name;
              }

              callback();
            });
          }

        ], function(error) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.VALIDATE_GET_METADATAS));
          callback();
        });
      },

      // Update package
      function(callback) {
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            date: self.mediaPackage.date,
            metadata: self.mediaPackage.metadata,
            title: self.mediaPackage.title
          },
          function(error) {
            if (error) return callback(new ArchivePackageError(error.message, ERRORS.VALIDATE_UPDATE_PACKAGE));
            callback();
          }
        );
      }

    ], function(error) {
      if (error) reject(error);
      else resolve();
    });

  });
};

/**
 * Saves package points of interest.
 *
 * The archive package can contain points of interest of type tag or image.
 * Points of interest are described in the archive metadatas file.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.savePointsOfInterest = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var archiveFormat;
    var extractDirectory = self.packageTemporaryDirectory;
    var pointsOfInterest;
    var tags;
    var timecodes;

    self.log('Save points of interest');

    if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};

    async.series([

      // Update state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.SAVING_POINTS_OF_INTEREST, callback);
      },

      // Get archive format
      function(callback) {
        archiveFormatFactory.get(
          self.packageTemporaryDirectory,
          function(error, format) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_GET_FORMAT));
            }

            archiveFormat = format;
            callback();
          }
        );
      },

      // Retrieve points of interest
      function(callback) {
        archiveFormat.getPointsOfInterest(function(error, pointsOfInterestMetadatas) {
          if (error) {
            return callback(
              new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_GET_POINTS_OF_INTEREST)
            );
          }

          pointsOfInterest = pointsOfInterestMetadatas;
          openVeoApi.util.merge(self.mediaPackage.metadata, {indexes: pointsOfInterest});
          callback();
        });
      },

      // Update package metadata
      function(callback) {
        self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, function(error) {
          if (error) {
            return callback(
              new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE_METADATA)
            );
          }
          callback();
        });
      },

      // Generate sprites for the points of interest of type "image"
      function(callback) {
        if (!pointsOfInterest || !pointsOfInterest.length) return callback();

        generatePointsOfInterestSprites.call(
          self,
          self.mediaPackage.id,
          extractDirectory,
          pointsOfInterest,
          extractDirectory,
          extractDirectory,
          function(error, formattedPointsOfInterestImages) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_GENERATE_SPRITES));
            }
            timecodes = formattedPointsOfInterestImages;
            callback();
          }
        );
      },

      // Save points of interest of type "tag"
      function(callback) {
        if (!pointsOfInterest || !pointsOfInterest.length) return callback();

        tags = getPointsOfInterestTags(pointsOfInterest);
        self.poiProvider.add(tags, function(error, total, addedTags) {
          if (error) return callback(new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_ADD_TAGS));
          tags = addedTags;
          callback();
        });
      },

      // Save timecodes and tags into the media
      function(callback) {
        self.mediaPackage.timecodes = timecodes || [];
        self.mediaPackage.tags = (tags || []).map(function(tag) {
          return tag.id;
        });
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            tags: self.mediaPackage.tags,
            timecodes: self.mediaPackage.timecodes
          },
          function(error) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE));
            }
            callback();
          }
        );
      }

    ], function(error) {
      if (error) reject(error);
      else resolve();
    });
  });
};

/**
 * Merges package points of interest and same package name points of interest.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
ArchivePackage.prototype.merge = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var lockedPackage;
    var packagePointsOfInterestTags = [];
    var pointsOfInterestImages = [];

    async.series([

      // Update package state and merge medias
      function(callback) {
        ArchivePackage.super_.prototype.merge.call(self).then(function() {
          callback();
        }).catch(function(error) {
          reject(error);
        });
      },

      // Find package locked in INIT_MERGE transition
      function(callback) {
        self.videoProvider.getOne(
          new ResourceFilter().and([
            new ResourceFilter().equal('state', STATES.WAITING_FOR_MERGE),
            new ResourceFilter().equal('originalFileName', self.mediaPackage.originalFileName),
            new ResourceFilter().equal('lockedByPackage', self.mediaPackage.id)
          ]),
          null,
          function(error, foundPackage) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.MERGE_GET_PACKAGE_WITH_SAME_NAME));
            }

            lockedPackage = foundPackage;
            callback();
          }
        );
      },

      // Remove locked package sprites
      function(callback) {
        if (!self.mediaPackage.timecodes.length) return callback();

        self.log('Remove locked package (' + lockedPackage.id + ') sprites');

        var lockedPackagePublicDirectory = path.join(self.mediasPublicPath, lockedPackage.id);

        // Read locked package public directory
        fs.readdir(lockedPackagePublicDirectory, function(error, resources) {
          if (error) {
            return callback(
              new ArchivePackageError(error.message, ERRORS.MERGE_READ_PACKAGE_WITH_SAME_NAME_PUBLIC_DIRECTORY)
            );
          }

          var actions = resources.reduce(function(filtered, resource) {
            if (/points-of-interest-images[^.]*\.jpg/.test(resource)) {
              filtered.push({
                type: openVeoApi.fileSystem.ACTIONS.REMOVE,
                sourcePath: path.join(lockedPackagePublicDirectory, resource)
              });
            }
            return filtered;
          }, []);

          if (!actions.length) return callback();

          openVeoApi.fileSystem.performActions(actions, function(error) {
            if (error) {
              return callback(
                new ArchivePackageError(error.message, ERRORS.MERGE_REMOVE_PACKAGE_WITH_SAME_NAME_SPRITES)
              );
            }
            callback();
          });
        });
      },

      // Copy points of interest images to locked package public directory
      function(callback) {
        if (!self.mediaPackage.timecodes.length) return callback();

        var mediaPackagePublicDirectory = path.join(self.mediasPublicPath, self.mediaPackage.id);
        var lockedPackagePublicDirectory = path.join(self.mediasPublicPath, lockedPackage.id);

        self.log('Copy package points of interest images to locked package (' + lockedPackage.id + ')');

        openVeoApi.fileSystem.performActions(self.mediaPackage.timecodes.map(function(timecode) {
          return {
            type: openVeoApi.fileSystem.ACTIONS.COPY,
            sourcePath: path.join(mediaPackagePublicDirectory, path.basename(timecode.image.large)),
            destinationPath: path.join(
              lockedPackagePublicDirectory,
              self.mediaPackage.id + '-' + path.basename(timecode.image.large)
            )
          };
        }), function(error) {
          if (error) {
            return callback(new ArchivePackageError(error.message, ERRORS.MERGE_COPY_IMAGES));
          }
          callback();
        });
      },

      // Merge points of interest of type "image"
      function(callback) {
        if (!self.mediaPackage.timecodes.length) return callback();

        pointsOfInterestImages = lockedPackage.timecodes.map(function(timecode) {
          return {
            timecode: timecode.timecode,
            type: 'image',
            data: {
              filename: path.basename(timecode.image.large)
            }
          };
        }).concat(self.mediaPackage.timecodes.map(function(timecode) {
          return {
            timecode: timecode.timecode,
            type: 'image',
            data: {
              filename: self.mediaPackage.id + '-' + path.basename(timecode.image.large)
            }
          };
        })).sort(function(timecode1, timecode2) {
          return timecode1.timecode - timecode2.timecode;
        });

        callback();
      },

      // Get package points of interest of type "tag"
      function(callback) {
        if (!self.mediaPackage.tags.length) return callback();

        self.poiProvider.getAll(
          new ResourceFilter().in('id', self.mediaPackage.tags),
          null,
          {value: 'asc'},
          function(error, foundPointsOfInterest) {
            if (error) return callback(new ArchivePackageError(error.message, ERRORS.MERGE_GET_POINTS_OF_INTEREST));

            packagePointsOfInterestTags = foundPointsOfInterest;
            callback();
          }
        );
      },

      // Duplicate points of interest of type "tag"
      function(callback) {
        if (!packagePointsOfInterestTags.length) return callback();

        self.log('Duplicate points of interest of type "tag"');

        self.poiProvider.add(
          packagePointsOfInterestTags.map(function(pointOfInterestTag) {
            return {
              name: pointOfInterestTag.name,
              value: pointOfInterestTag.value
            };
          }),
          function(error, total, addedTags) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.MERGE_DUPLICATE_POINTS_OF_INTEREST));
            }

            packagePointsOfInterestTags = addedTags;
            callback();
          }
        );
      },

      // Generate sprites
      function(callback) {
        if (!pointsOfInterestImages.length) return callback();

        self.log('Generate sprites for merged points of interest of type "image" (' + lockedPackage.id + ')');

        generatePointsOfInterestSprites.call(
          self,
          lockedPackage.id,
          path.join(self.mediasPublicPath, lockedPackage.id),
          pointsOfInterestImages,
          path.join(self.mediasPublicPath, lockedPackage.id),
          null,
          function(error, formattedPointsOfInterestImages) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.MERGE_GENERATE_SPRITES));
            }

            pointsOfInterestImages = formattedPointsOfInterestImages;
            callback();
          }
        );
      },

      // Update locked package
      function(callback) {
        if (!self.mediaPackage.timecodes.length && !self.mediaPackage.tags.length) return callback();

        self.log('Update locked package (' + lockedPackage.id + ') points of interest');

        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', lockedPackage.id),
          {
            tags: lockedPackage.tags.concat(packagePointsOfInterestTags.map(function(pointOfInterestTag) {
              return pointOfInterestTag.id;
            })),
            timecodes: pointsOfInterestImages
          },
          function(error) {
            if (error) {
              return callback(new ArchivePackageError(error.message, ERRORS.MERGE_POINTS_OF_INTEREST_UPDATE_PACKAGE));
            }

            callback();
          }
        );
      }

    ], function(error) {
      if (error) return reject(error);
      resolve();
    });
  });
};

/**
 * Gets the first media file path in temporary directory.
 *
 * @return {module:publish/packages/Package~Package~getMediaFilePathCallback} Function to call when its done
 */
ArchivePackage.prototype.getMediaFilePath = function(callback) {
  var archiveFormat;
  var mediasFilesNames;
  var self = this;

  async.series([

    // Get archive format
    function(callback) {
      archiveFormatFactory.get(self.packageTemporaryDirectory, function(error, format) {
        if (error) return callback(error);
        archiveFormat = format;
        callback();
      });
    },

    // Get the list of medias files names in the archive from metadatas
    function(callback) {
      archiveFormat.getMedias(function(error, medias) {
        if (error) return callback(error);
        mediasFilesNames = medias;
        callback();
      });
    }

  ], function(error) {
    if (error) return callback(error);
    callback(null, path.join(self.packageTemporaryDirectory, mediasFilesNames[0]));
  });
};

/**
 * @callback module:publish/packages/ArchivePackage~ArchivePackage~validatePackageCallack
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} package The package information object
 */

/**
 * @callback module:publish/packages/ArchivePackage~ArchivePackage~generatePointsOfInterestSpritesCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Array} pointsOfInterest The list of formatted points of interest
 * @param {String} pointsOfInterest[].id Point of interest id
 * @param {Number} pointsOfInterest[].time Point of interest timecode
 * @param {Object} pointsOfInterest[].image Point of interest image locations
 * @param {Object} pointsOfInterest[].image.small Point of interest small image location
 * @param {String} pointsOfInterest[].image.small.url Point of interest small image sprite URL
 * @param {Number} pointsOfInterest[].image.small.x Point of interest small image x coordinate inside sprite
 * @param {Number} pointsOfInterest[].image.small.y Point of interest small image y coordinate inside sprite
 * @param {String} pointsOfInterest[].image.large Point of interest large image URI
 */
