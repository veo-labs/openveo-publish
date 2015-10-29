'use strict';

/**
 * @module publish-packages
 */

// Module dependencies
var util = require('util');
var path = require('path');
var fs = require('fs');
var Package = process.requirePublish('app/server/packages/Package.js');
var errors = process.requirePublish('app/server/packages/errors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var openVeoAPI = require('@openveo/api');
var ffmpeg = require('fluent-ffmpeg');

// Accepted images files extensions in the package
var acceptedImagesExtensions = ['jpeg', 'jpg', 'gif', 'bmp'];

/**
 * Defines a custom error with an error code.
 *
 * @class VideoPackageError
 * @constructor
 * @extends Error
 * @param {String} message The error message
 * @param {String} code The error code
 */
function VideoPackageError(message, code) {
  this.name = 'VideoPackageError';
  this.message = message || '';
  this.code = code;
}

/**
 * Defines a VideoPackage class to manage publication of a video file.
 *
 * @class VideoPackage
 * @constructor
 * @extends Package
 * @param {Object} mediaPackage Information about the video
 * @param {Object} logger A Winston logger
 */
function VideoPackage(mediaPackage, logger) {
  Package.call(this, mediaPackage, logger);
}

module.exports = VideoPackage;
util.inherits(VideoPackage, Package);

// VideoPackage states
VideoPackage.THUMB_GENERATED_STATE = 'thumbGenerated';
VideoPackage.COPIED_IMAGES_STATE = 'copiedImages';

// VideoPackage transitions
VideoPackage.GENERATE_THUMB_TRANSITION = 'generateThumb';
VideoPackage.COPY_IMAGES_TRANSITION = 'copyImages';

VideoPackage.stateTransitions = [
  Package.INIT_TRANSITION,
  Package.COPY_PACKAGE_TRANSITION,
  VideoPackage.GENERATE_THUMB_TRANSITION,
  Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
  Package.UPLOAD_MEDIA_TRANSITION,
  Package.CONFIGURE_MEDIA_TRANSITION,
  VideoPackage.COPY_IMAGES_TRANSITION,
  Package.CLEAN_DIRECTORY_TRANSITION
];

VideoPackage.stateMachine = Package.stateMachine.concat([
  {
    name: VideoPackage.GENERATE_THUMB_TRANSITION,
    from: Package.PACKAGE_COPIED_STATE,
    to: VideoPackage.THUMB_GENERATED_STATE
  },
  {
    name: Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
    from: VideoPackage.THUMB_GENERATED_STATE,
    to: Package.ORIGINAL_PACKAGE_REMOVED_STATE
  },
  {
    name: VideoPackage.COPY_IMAGES_TRANSITION,
    from: Package.MEDIA_CONFIGURED_STATE,
    to: VideoPackage.COPIED_IMAGES_STATE
  },
  {
    name: Package.CLEAN_DIRECTORY_TRANSITION,
    from: VideoPackage.COPIED_IMAGES_STATE,
    to: Package.DIRECTORY_CLEANED_STATE
  }
]);


VideoPackage.prototype.generateThumb = function() {
  var self = this;
  var filePath = this.getMediaFilePath();

  // Generate thumb
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.GENERATE_THUMB_STATE);

  var destinationPath = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));
  ffmpeg(filePath).screenshots({
    timestamps: ['10%'],
    filename: 'thumbnail.jpg',
    folder: destinationPath
  }).on('error', function(error) {
    self.setError(new VideoPackageError(error.message, errors.GENERATE_THUMB_ERROR));
  }).on('end', function() {
    var publicDirectoryPath = path.normalize('/' + self.mediaPackage.id);
    self.videoModel.updateThumbnail(self.mediaPackage.id, path.join(publicDirectoryPath, 'thumbnail.jpg'));
    self.fsm.transition();
  });
};

/**
 * Prepares public directory where the media associated files will be deployed.
 *
 * This is a transition.
 *
 * @method preparePublicDirectory
 * @private
 */
VideoPackage.prototype.preparePublicDirectory = function() {
  var self = this;
  var publicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id);
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.PREPARING_STATE);

  this.logger.debug('Prepare package public directory ' + publicDirectory);

  openVeoAPI.fileSystem.mkdir(path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id),
    function(error) {
      if (error && error.code !== 'EEXIST')
        self.setError(new VideoPackageError(error.message, errors.CREATE_VIDEO_PUBLIC_DIR_ERROR));
      else
        self.fsm.transition();
    });
};


/**
 * Copies presentation images from temporary directory to the public directory.
 *
 * This is a transition.
 *
 * @method copyImages
 * @private
 */
VideoPackage.prototype.copyImages = function() {
  var self = this;
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));
  var videoFinalDir = path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id);

  this.logger.debug('Copy images to ' + videoFinalDir);

  fs.readdir(extractDirectory, function(error, files) {
    if (error)
      self.setError(new VideoPackageError(error.message, errors.SCAN_FOR_IMAGES_ERROR));
    else {
      var filesToCopy = [];
      files.forEach(function(file) {

        // File extension is part of the accepted extensions
        if (acceptedImagesExtensions.indexOf(path.extname(file).slice(1)) >= 0)
          filesToCopy.push(file);

      });

      var filesLeftToCopy = filesToCopy.length;
      filesToCopy.forEach(function(file) {

        openVeoAPI.fileSystem.copy(path.join(extractDirectory, file), path.join(videoFinalDir, file), function(error) {

          if (error)
            self.logger.warn(error.message, {
              action: 'copyImages',
              mediaId: self.mediaPackage.id
            });

          filesLeftToCopy--;

          if (filesLeftToCopy === 0)
            self.fsm.transition();

        });

      });
    }
  });
};

/**
 * Gets the stack of transitions corresponding to the package.
 *
 * Each package has its own way to be published, thus transitions stack
 * is different by package.
 *
 * @return {Array} The stack of transitions
 * @method getTransitions
 */
VideoPackage.prototype.getTransitions = function() {
  return VideoPackage.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 * @method getStateMachine
 */
VideoPackage.prototype.getStateMachine = function() {
  return VideoPackage.stateMachine;
};
