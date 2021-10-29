'use strict';

/**
 * @module publish/providers/VideoPackage
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var ffmpeg = require('fluent-ffmpeg');
var openVeoApi = require('@openveo/api');
var Package = process.requirePublish('app/server/packages/Package.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoPackageError = process.requirePublish('app/server/packages/VideoPackageError.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var fileSystem = openVeoApi.fileSystem;

// Accepted images files extensions in the package
var acceptedImagesExtensions = [
  fileSystem.FILE_TYPES.JPG,
  fileSystem.FILE_TYPES.GIF
];

/**
 * Defines a VideoPackage to manage publication of a video file.
 *
 * @class VideoPackage
 * @extends module:publish/packages/Package~Package
 * @constructor
 * @param {Object} mediaPackage Information about the video
 * @param {module:publish/providers/VideoProvider~VideoProvider} videoProvider A video provider
 * @param {module:publish/providers/PoiProvider~PoiProvider} poiProvider Points of interest provider
 */
function VideoPackage(mediaPackage, videoProvider, poiProvider) {
  VideoPackage.super_.call(this, mediaPackage, videoProvider, poiProvider);
}

module.exports = VideoPackage;
util.inherits(VideoPackage, Package);

/**
 * Process states for video packages.
 *
 * @const
 * @type {Object}
 */
VideoPackage.STATES = {
  MP4_DEFRAGMENTED: 'mp4Defragmented',
  THUMB_GENERATED: 'thumbGenerated',
  COPIED_IMAGES: 'copiedImages',
  METADATA_RETRIEVED: 'metadataRetrieved'
};
Object.freeze(VideoPackage.STATES);

/**
 * Video package process transitions (from one state to another).
 *
 * @const
 * @type {Object}
 */
VideoPackage.TRANSITIONS = {
  DEFRAGMENT_MP4: 'defragmentMp4',
  GENERATE_THUMB: 'generateThumb',
  COPY_IMAGES: 'copyImages',
  GET_METADATA: 'getMetadata'
};
Object.freeze(VideoPackage.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for a video Package.
 *
 * @const
 * @type {Object}
 */
VideoPackage.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
  VideoPackage.TRANSITIONS.GENERATE_THUMB,
  VideoPackage.TRANSITIONS.GET_METADATA,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.SYNCHRONIZE_MEDIA,
  VideoPackage.TRANSITIONS.COPY_IMAGES,
  Package.TRANSITIONS.CLEAN_DIRECTORY,
  Package.TRANSITIONS.INIT_MERGE,
  Package.TRANSITIONS.MERGE,
  Package.TRANSITIONS.FINALIZE_MERGE,
  Package.TRANSITIONS.REMOVE_PACKAGE
];
Object.freeze(VideoPackage.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @const
 * @type {Object}
 */
VideoPackage.stateMachine = Package.stateMachine.concat([
  {
    name: VideoPackage.TRANSITIONS.DEFRAGMENT_MP4,
    from: Package.STATES.PACKAGE_COPIED,
    to: VideoPackage.STATES.MP4_DEFRAGMENTED
  },
  {
    name: VideoPackage.TRANSITIONS.GENERATE_THUMB,
    from: VideoPackage.STATES.MP4_DEFRAGMENTED,
    to: VideoPackage.STATES.THUMB_GENERATED
  },
  {
    name: VideoPackage.TRANSITIONS.GET_METADATA,
    from: VideoPackage.STATES.THUMB_GENERATED,
    to: VideoPackage.STATES.METADATA_RETRIEVED
  },
  {
    name: Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
    from: VideoPackage.STATES.METADATA_RETRIEVED,
    to: Package.STATES.ORIGINAL_PACKAGE_REMOVED
  },
  {
    name: VideoPackage.TRANSITIONS.COPY_IMAGES,
    from: Package.STATES.MEDIA_SYNCHRONIZED,
    to: VideoPackage.STATES.COPIED_IMAGES
  },
  {
    name: Package.TRANSITIONS.CLEAN_DIRECTORY,
    from: VideoPackage.STATES.COPIED_IMAGES,
    to: Package.STATES.DIRECTORY_CLEANED
  }
]);
Object.freeze(VideoPackage.stateMachine);

/**
 * Defragment the MP4
 *
 * If the input file is fragmented, ffmpeg will be used to defragment
 * the MP4. The fragmentation detection of the file is based on an un-
 * known "nb_frames" property in ffprobe output metadata.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.defragmentMp4 = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var filePath = self.getMediaFilePath();

    self.updateState(self.mediaPackage.id, STATES.DEFRAGMENTING_MP4, function() {
      // Detect if file need defragmentation (unknown "nb_frames")
      ffmpeg.ffprobe(filePath, function(error, metadata) {
        if (metadata && Array.isArray(metadata.streams)) {
          var fragmentedStreams = metadata.streams.filter(function(stream) {
            if (stream.codec_type !== 'video')
              return false;

            return stream.nb_frames === 'N/A';
          });

          if (fragmentedStreams.length === 0) {
            process.logger.debug('No defragmentation is needed (' + self.mediaPackage.id + ')');

            return resolve();
          }

          var destinationPath = path.join(self.publishConf.videoTmpDir, String(self.mediaPackage.id));
          var defragmentedFile = path.join(destinationPath, 'video_defrag.mp4');

          // MP4 defragmentation
          ffmpeg(filePath)
            .audioCodec('copy')
            .videoCodec('copy')
            .outputOptions('-movflags faststart')
            .on('start', function() {
              process.logger.debug('Starting defragmentation (' + self.mediaPackage.id + ') ' +
                                   'of ' + filePath + ' to ' + defragmentedFile);
            })
            .on('error', function(error) {
              reject(new VideoPackageError(error.message, ERRORS.DEFRAGMENTATION));
            })
            .on('end', function() {
              process.logger.debug('Defragmentation complete (' + self.mediaPackage.id + ')');

              // Replace original file
              process.logger.debug('Removing fragmented file ' + filePath);
              fs.unlink(filePath, function(error) {
                if (error) reject(new VideoPackageError(error.message, ERRORS.UNLINK_FRAGMENTED));

                process.logger.debug('Replacing original file (' + self.mediaPackage.id + ') with ' + defragmentedFile);
                fs.rename(defragmentedFile, filePath, function(error) {
                  if (error) reject(new VideoPackageError(error.message, ERRORS.REPLACE_FRAGMENTED));

                  process.logger.debug('Original file replaced (' + self.mediaPackage.id + ')');

                  return resolve();
                });
              });
            })
            .save(defragmentedFile);
        } else return resolve();
      });
    });
  });
};

/**
 * Generates a thumbnail for the video.
 *
 * If no thumbnail has been provided by the user form, ffmpeg will be
 * used to extract an image from the video to generate a thumbnail.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.generateThumb = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var filePath = self.getMediaFilePath();

    self.updateState(self.mediaPackage.id, STATES.GENERATING_THUMB, function() {
      var destinationPath = path.join(self.publishConf.videoTmpDir, String(self.mediaPackage.id));

      if (self.mediaPackage.originalThumbnailPath !== undefined) {

        async.series([

          // Thumbnail already exists for this package, copy the thumbnail
          function(callback) {
            process.logger.debug('Copy thumbnail (' + self.mediaPackage.id + ') in ' + destinationPath);
            openVeoApi.fileSystem.copy(
              self.mediaPackage.originalThumbnailPath,
              path.join(destinationPath, 'thumbnail.jpg'),
              callback
            );
          },

          // Remove original thumbnail
          function(callback) {
            process.logger.debug('Remove original thumbnail ' + self.mediaPackage.originalThumbnailPath);
            fs.unlink(self.mediaPackage.originalThumbnailPath, callback);
          }

        ], function(error) {
          if (error) return reject(new VideoPackageError(error.message, ERRORS.COPY_THUMB));
          self.mediaPackage.thumbnail = '/publish/' + self.mediaPackage.id + '/thumbnail.jpg';
          self.videoProvider.updateThumbnail(
            self.mediaPackage.id,
            self.mediaPackage.thumbnail,
            function() {
              resolve();
            }
          );
        });

      } else {
      // Generate thumb
        process.logger.debug('Generate thumbnail (' + self.mediaPackage.id + ') in ' + destinationPath);
        ffmpeg(filePath).screenshots({
          timestamps: ['10%'],
          filename: 'thumbnail.jpg',
          folder: destinationPath
        }).on('error', function(error) {
          reject(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB));
        }).on('end', function() {
          self.mediaPackage.thumbnail = '/publish/' + self.mediaPackage.id + '/thumbnail.jpg';
          self.videoProvider.updateThumbnail(
            self.mediaPackage.id,
            self.mediaPackage.thumbnail,
            function() {
              resolve();
            }
          );
        });
      }
    });
  });
};

/**
 * Retrieves video height from video metadatas.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.getMetadata = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var filePath = self.getMediaFilePath();

    self.updateState(self.mediaPackage.id, STATES.GETTING_METADATA, function() {
      if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};
      self.mediaPackage.metadata['profile-settings'] = self.mediaPackage.metadata['profile-settings'] || {};

      if (self.mediaPackage.metadata['profile-settings']['video-height']) return resolve();

      ffmpeg.ffprobe(filePath, function(error, metadata) {
        if (error || !metadata.streams) return reject(new VideoPackageError(error.message, ERRORS.GET_METADATA));

        // Find video stream
        var videoStream;
        for (var i = 0; i < metadata.streams.length; i++) {
          if (metadata.streams[i]['codec_type'] === 'video')
            videoStream = metadata.streams[i];
        }

        // Got video stream associated to the video file
        if (videoStream) {
          self.mediaPackage.metadata['profile-settings']['video-height'] = videoStream.height;
          self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, function() {
            resolve();
          });
        } else reject(new VideoPackageError('No video stream found', ERRORS.GET_METADATA));
      });
    });
  });
};

/**
 * Copies presentation images from temporary directory to the public directory.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.copyImages = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var extractDirectory = path.join(self.publishConf.videoTmpDir, String(self.mediaPackage.id));
    var videoFinalDir = path.join(self.mediasPublicPath, self.mediaPackage.id);
    var resources = [];
    var filesToCopy = [];

    process.logger.debug('Copy images to ' + videoFinalDir);
    async.series([

      // Change state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.COPYING_IMAGES, callback);
      },

      // Read directory
      function(callback) {
        process.logger.verbose('Scan directory ' + extractDirectory + ' for images');
        fs.readdir(extractDirectory, function(error, files) {
          if (error)
            callback(new VideoPackageError(error.message, ERRORS.SCAN_FOR_IMAGES));
          else {
            resources = files;
            callback();
          }
        });
      },

      // Validate files in the directory to keep only accepted types
      function(callback) {
        var filesToValidate = {};
        var filesValidationDescriptor = {};

        resources.forEach(function(resource) {
          filesToValidate[resource] = path.join(extractDirectory, resource);
          filesValidationDescriptor[resource] = {in: acceptedImagesExtensions};
        });

        openVeoApi.util.validateFiles(filesToValidate, filesValidationDescriptor, function(error, files) {
          if (error)
            process.logger.warn(error.message, {action: 'copyImages', mediaId: self.mediaPackage.id});

          for (var filePath in files) {
            if (files[filePath].isValid)
              filesToCopy.push(filePath);
          }

          callback();
        });
      },

      // Copy images
      function(callback) {
        var filesLeftToCopy = filesToCopy.length;

        if (!filesToCopy.length) return callback();

        filesToCopy.forEach(function(file) {
          process.logger.verbose('Copy image ' + path.join(extractDirectory, file) +
                                 ' to ' + path.join(videoFinalDir, file));
          openVeoApi.fileSystem.copy(
            path.join(extractDirectory, file),
            path.join(videoFinalDir, file),
            function(error) {
              if (error)
                process.logger.warn(error.message, {action: 'copyImages', mediaId: self.mediaPackage.id});

              filesLeftToCopy--;

              if (filesLeftToCopy === 0)
                callback();
            }
          );
        });

      }
    ], function(error) {
      if (error) reject(error);
      else resolve();
    });
  });
};

/**
 * Merges package media and same package name media.
 *
 * Merging consists of merging the two medias into one in OpenVeo. It means that both medias still exist on the media
 * platform but only one reference exists in OpenVeo with multi remote medias.
 * The incoming media is merged into the existing one.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.merge = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var lockedPackage;

    async.series([

      // Update package state
      function(callback) {
        VideoPackage.super_.prototype.merge.call(self).then(function() {
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
            if (error) return callback(new VideoPackageError(error.message, ERRORS.MERGE_GET_PACKAGE_WITH_SAME_NAME));

            lockedPackage = foundPackage;
            callback();
          }
        );
      },

      // Merge package medias with locked package medias
      function(callback) {
        process.logger.debug('Merge medias ids (' + self.mediaPackage.id + ' -> ' + lockedPackage.id + ')');
        self.videoProvider.updateMediaId(
          lockedPackage.id,
          openVeoApi.util.joinArray(lockedPackage.mediaId, self.mediaPackage.mediaId),
          function(error) {
            if (error) return callback(new VideoPackageError(error.message, ERRORS.MERGE_UPDATE_MEDIAS));
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
 * Gets the stack of transitions corresponding to the package.
 *
 * Each package has its own way to be published, thus transitions stack
 * is different by package.
 *
 * @return {Array} The stack of transitions
 */
VideoPackage.prototype.getTransitions = function() {
  return VideoPackage.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 */
VideoPackage.prototype.getStateMachine = function() {
  return VideoPackage.stateMachine;
};
