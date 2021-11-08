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
 * Defragments given MP4 file.
 *
 * If the input file is fragmented, FFMPEG will be used to defragment the MP4.
 * The fragmentation detection of the file is based on an unknown "nb_frames" property in FFPROBE output metadata.
 *
 * If file is not fragmented, it does nothing.
 *
 * @param {String} mp4FilePath The path of the MP4 file to defragment
 * @return {callback} Function to call when its done
 */
VideoPackage.prototype.defragment = function(mp4FilePath, callback) {
  var defragmentationRequired = false;
  var mp4FilePathElements = path.parse(mp4FilePath);
  var defragmentedFilePath = path.join(
    mp4FilePathElements.dir,
    mp4FilePathElements.name + '-defrag' + mp4FilePathElements.ext
  );
  var self = this;

  async.series([

    // Detect if file need defragmentation (unknown "nb_frames")
    function(callback) {
      ffmpeg.ffprobe(mp4FilePath, function(error, metadata) {
        if (error) return callback(error);

        if (metadata && Array.isArray(metadata.streams)) {
          var fragmentedStreams = metadata.streams.filter(function(stream) {
            if (stream.codec_type !== 'video')
              return false;

            return stream.nb_frames === 'N/A';
          });

          defragmentationRequired = fragmentedStreams.length !== 0;
        }

        callback();
      });
    },

    // Defragment media file
    function(callback) {
      if (!defragmentationRequired) {
        self.log('No defragmentation is needed for file ' + mp4FilePath, 'verbose');
        return callback();
      }

      // MP4 defragmentation
      ffmpeg(mp4FilePath)
        .audioCodec('copy')
        .videoCodec('copy')
        .outputOptions('-movflags faststart')
        .on('start', function() {
          self.log(
            'Starting defragmentation of ' + mp4FilePath + ' to ' + defragmentedFilePath,
            'verbose'
          );
        })
        .on('error', function(error) {
          callback(error);
        })
        .on('end', function() {
          self.log('Defragmentation complete for file ' + mp4FilePath, 'verbose');
          callback();
        })
        .save(defragmentedFilePath);
    },

    // Remove original media file
    function(callback) {
      if (!defragmentationRequired) return callback();

      // Replace original file
      self.log('Removing original fragmented file ' + mp4FilePath, 'verbose');

      fs.unlink(mp4FilePath, function(error) {
        if (error) return callback(error);
        callback();
      });
    },

    // Rename fragmented media file
    function(callback) {
      if (!defragmentationRequired) return callback();

      self.log('Renaming file ' + defragmentedFilePath + ' into ' + mp4FilePath, 'verbose');

      fs.rename(defragmentedFilePath, mp4FilePath, function(error) {
        if (error) return callback(error);

        self.log(defragmentedFilePath + ' renamed into ' + mp4FilePath, 'verbose');

        callback();
      });
    }

  ], callback);
};

/**
 * Defragments the MP4.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.defragmentMp4 = function() {
  var self = this;
  var mediaFilePath;

  return new Promise(function(resolve, reject) {
    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.DEFRAGMENTING_MP4, callback);
      },

      // Get media file name
      function(callback) {
        self.getMediaFilePath(function(error, filePath) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.DEFRAGMENT_MP4_GET_MEDIA_FILE_PATH));
          mediaFilePath = filePath;
          callback();
        });
      },

      // Defragment media file
      function(callback) {
        self.defragment(mediaFilePath, function(error) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.DEFRAGMENTATION));
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
  var mediaFilePath;

  return new Promise(function(resolve, reject) {

    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.GENERATING_THUMB, callback);
      },

      // Get media file name
      function(callback) {
        if (self.mediaPackage.mediaId && self.mediaPackage.mediaId.length) return callback();

        self.getMediaFilePath(function(error, filePath) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB_GET_MEDIA_FILE_PATH));
          mediaFilePath = filePath;
          callback();
        });
      },

      // Copy thumbnail if it already exists for this package
      function(callback) {
        if (self.mediaPackage.originalThumbnailPath === undefined) return callback();

        self.log('Copy thumbnail in ' + self.packageTemporaryDirectory);

        openVeoApi.fileSystem.copy(
          self.mediaPackage.originalThumbnailPath,
          path.join(self.packageTemporaryDirectory, 'thumbnail.jpg'),
          function(error) {
            if (error) return callback(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB_COPY_ORIGINAL));
            self.mediaPackage.thumbnail = '/publish/' + self.mediaPackage.id + '/thumbnail.jpg';
            callback();
          }
        );
      },

      // Remove original thumbnail
      function(callback) {
        if (self.mediaPackage.originalThumbnailPath === undefined) return callback();

        self.log('Remove original thumbnail ' + self.mediaPackage.originalThumbnailPath);

        fs.unlink(self.mediaPackage.originalThumbnailPath, function(error) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB_REMOVE_ORIGINAL));
          callback();
        });
      },

      // Generate thumb
      function(callback) {
        if (self.mediaPackage.originalThumbnailPath !== undefined) return callback();

        self.log('Generate thumbnail in ' + self.packageTemporaryDirectory);

        ffmpeg(mediaFilePath).screenshots({
          timestamps: ['10%'],
          filename: 'thumbnail.jpg',
          folder: self.packageTemporaryDirectory
        }).on('error', function(error) {
          callback(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB));
        }).on('end', function() {
          self.mediaPackage.thumbnail = '/publish/' + self.mediaPackage.id + '/thumbnail.jpg';
          callback();
        });
      },

      // Update package
      function(callback) {
        self.videoProvider.updateThumbnail(self.mediaPackage.id, self.mediaPackage.thumbnail, function(error) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB_UPDATE_PACKAGE));
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
 * Retrieves video height.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
VideoPackage.prototype.getMetadata = function() {
  var self = this;
  var mediaFilePath;

  return new Promise(function(resolve, reject) {
    if (!self.mediaPackage.metadata) self.mediaPackage.metadata = {};
    self.mediaPackage.metadata['profile-settings'] = self.mediaPackage.metadata['profile-settings'] || {};

    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.GETTING_METADATA, callback);
      },

      // Get media file name
      function(callback) {
        if (self.mediaPackage.metadata['profile-settings']['video-height']) return callback();

        self.getMediaFilePath(function(error, filePath) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GET_METADATA_GET_MEDIA_FILE_PATH));
          mediaFilePath = filePath;
          callback();
        });
      },

      // Get video height
      function(callback) {
        if (self.mediaPackage.metadata['profile-settings']['video-height']) return callback();

        ffmpeg.ffprobe(mediaFilePath, function(error, metadata) {
          if (!error && !metadata.streams) error = new Error('No streams found in media file');
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GET_METADATA));

          // Find video stream
          var videoStream;
          for (var i = 0; i < metadata.streams.length; i++) {
            if (metadata.streams[i]['codec_type'] === 'video')
              videoStream = metadata.streams[i];
          }

          // Got video stream associated to the video file
          if (videoStream) {
            self.mediaPackage.metadata['profile-settings']['video-height'] = videoStream.height;
            callback();
          } else callback(new VideoPackageError('No video stream found', ERRORS.GET_METADATA));
        });
      },

      // Update package
      function(callback) {
        self.videoProvider.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata, function(error) {
          if (error) return callback(new VideoPackageError(error.message, ERRORS.GET_METADATA_UPDATE_PACKAGE));
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
    var extractDirectory = self.packageTemporaryDirectory;
    var videoFinalDir = path.join(self.mediasPublicPath, self.mediaPackage.id);
    var resources = [];
    var filesToCopy = [];

    self.log('Copy images to ' + videoFinalDir);

    async.series([

      // Change state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.COPYING_IMAGES, callback);
      },

      // Read directory
      function(callback) {
        self.log('Scan directory ' + extractDirectory + ' for images', 'verbose');

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
            self.log(error.message, 'warn');

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
          self.log(
            'Copy image ' + path.join(extractDirectory, file) + ' to ' + path.join(videoFinalDir, file),
            'verbose'
          );

          openVeoApi.fileSystem.copy(
            path.join(extractDirectory, file),
            path.join(videoFinalDir, file),
            function(error) {
              if (error)
                self.log(error.message, 'warn');

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
        self.log('Merge medias ids with medias ids of package ' + lockedPackage.id);

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
