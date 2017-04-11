'use strict';

/**
 * @module packages
 */

var util = require('util');
var path = require('path');
var fs = require('fs');
var Package = process.requirePublish('app/server/packages/Package.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoPackageError = process.requirePublish('app/server/packages/VideoPackageError.js');
var openVeoApi = require('@openveo/api');
var ffmpeg = require('fluent-ffmpeg');

// Accepted images files extensions in the package
var acceptedImagesExtensions = ['jpeg', 'jpg', 'gif', 'bmp'];

/**
 * Defines a VideoPackage to manage publication of a video file.
 *
 * @class VideoPackage
 * @extends Package
 * @constructor
 * @param {Object} mediaPackage Information about the video
 * @param {VideoModel} videoModel A video model
 * @param {ConfigurationModel} configurationModel A configuration model
 */
function VideoPackage(mediaPackage, videoModel, configurationModel) {
  VideoPackage.super_.call(this, mediaPackage, videoModel, configurationModel);
}

module.exports = VideoPackage;
util.inherits(VideoPackage, Package);

/**
 * Process states for video packages.
 *
 * @property STATES
 * @type Object
 * @static
 * @final
 */
VideoPackage.STATES = {
  THUMB_GENERATED: 'thumbGenerated',
  COPIED_IMAGES: 'copiedImages',
  METADATA_RETRIEVED: 'metadataRetrieved'
};
Object.freeze(VideoPackage.STATES);

/**
 * Video package process transitions (from one state to another).
 *
 * @property TRANSITIONS
 * @type Object
 * @static
 * @final
 */
VideoPackage.TRANSITIONS = {
  GENERATE_THUMB: 'generateThumb',
  COPY_IMAGES: 'copyImages',
  GET_METADATA: 'getMetadata'
};
Object.freeze(VideoPackage.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for a video Package.
 *
 * @property stateTransitions
 * @type Array
 * @static
 * @final
 */
VideoPackage.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  VideoPackage.TRANSITIONS.GENERATE_THUMB,
  VideoPackage.TRANSITIONS.GET_METADATA,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.CONFIGURE_MEDIA,
  VideoPackage.TRANSITIONS.COPY_IMAGES,
  Package.TRANSITIONS.CLEAN_DIRECTORY
];
Object.freeze(VideoPackage.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @property stateMachine
 * @type Array
 * @static
 * @final
 */
VideoPackage.stateMachine = Package.stateMachine.concat([
  {
    name: VideoPackage.TRANSITIONS.GENERATE_THUMB,
    from: Package.STATES.PACKAGE_COPIED,
    to: VideoPackage.STATES.THUMB_GENERATED
  },
  {
    name: VideoPackage.TRANSITIONS.GET_METADATA,
    from: Package.THUMB_GENERATED_STATE,
    to: VideoPackage.STATES.METADATA_RETRIEVED
  },
  {
    name: Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
    from: VideoPackage.STATES.METADATA_RETRIEVED,
    to: Package.STATES.ORIGINAL_PACKAGE_REMOVED
  },
  {
    name: VideoPackage.TRANSITIONS.COPY_IMAGES,
    from: Package.STATES.MEDIA_CONFIGURED,
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
 * Generates a thumbnail for the video.
 *
 * It uses ffmpeg to extract an image from the video.
 *
 * This is a transition.
 *
 * @method generateThumb
 */
VideoPackage.prototype.generateThumb = function() {
  var self = this;
  var filePath = this.getMediaFilePath();

  // Generate thumb
  this.videoModel.updateState(this.mediaPackage.id, STATES.GENERATE_THUMB);

  process.logger.debug('Generate thumbnail (' + this.mediaPackage.id + ')');
  var destinationPath = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));
  ffmpeg(filePath).screenshots({
    timestamps: ['10%'],
    filename: 'thumbnail.jpg',
    folder: destinationPath
  }).on('error', function(error) {
    self.setError(new VideoPackageError(error.message, ERRORS.GENERATE_THUMB));
  }).on('end', function() {
    self.videoModel.updateThumbnail(
      self.mediaPackage.id,
      '/publish/' + self.mediaPackage.id + '/thumbnail.jpg'
    );
    self.fsm.transition();
  });
};

/**
 * Prepares public directory where the media associated files will be deployed.
 *
 * This is a transition.
 *
 * @method preparePublicDirectory
 */
VideoPackage.prototype.preparePublicDirectory = function() {
  var self = this;
  var publicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id);
  this.videoModel.updateState(this.mediaPackage.id, STATES.PREPARING);

  process.logger.debug('Prepare package public directory ' + publicDirectory);

  openVeoApi.fileSystem.mkdir(publicDirectory,
    function(error) {
      if (error && error.code !== 'EEXIST')
        self.setError(new VideoPackageError(error.message, ERRORS.CREATE_VIDEO_PUBLIC_DIR));
      else
        self.fsm.transition();
    });
};

/**
 * Retrieves video height from video metadatas.
 *
 * This is a transition.
 *
 * @method getMetadata
 */
VideoPackage.prototype.getMetadata = function() {
  var self = this;
  var filePath = this.getMediaFilePath();
  this.videoModel.updateState(this.mediaPackage.id, STATES.GET_METADATA);

  if (!this.mediaPackage.metadata) this.mediaPackage.metadata = {};
  this.mediaPackage.metadata['profile-settings'] = this.mediaPackage.metadata['profile-settings'] || {};

  if (this.mediaPackage.metadata['profile-settings']['video-height'])
    this.fsm.transition();
  else {
    ffmpeg.ffprobe(filePath, function(error, metadata) {
      if (error || !metadata.streams)
        self.setError(new VideoPackageError(error.message, ERRORS.GET_METADATA));
      else {

        // Find video stream
        var videoStream;
        for (var i = 0; i < metadata.streams.length; i++) {
          if (metadata.streams[i]['codec_type'] === 'video')
            videoStream = metadata.streams[i];
        }

        // Got video stream associated to the video file
        if (videoStream) {
          self.mediaPackage.metadata['profile-settings']['video-height'] = videoStream.height;
          self.videoModel.updateMetadata(self.mediaPackage.id, self.mediaPackage.metadata);
          self.fsm.transition();
        } else
          self.setError(new VideoPackageError('No video stream found', ERRORS.GET_METADATA));
      }
    });
  }
};

/**
 * Copies presentation images from temporary directory to the public directory.
 *
 * This is a transition.
 *
 * @method copyImages
 */
VideoPackage.prototype.copyImages = function() {
  var self = this;
  var extractDirectory = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));
  var videoFinalDir = path.normalize(process.rootPublish + '/assets/player/videos/' + this.mediaPackage.id);

  process.logger.debug('Copy images to ' + videoFinalDir);

  fs.readdir(extractDirectory, function(error, files) {
    if (error)
      self.setError(new VideoPackageError(error.message, ERRORS.SCAN_FOR_IMAGES));
    else {
      var filesToCopy = [];
      files.forEach(function(file) {

        // File extension is part of the accepted extensions
        if (acceptedImagesExtensions.indexOf(path.extname(file).slice(1)) >= 0)
          filesToCopy.push(file);

      });

      var filesLeftToCopy = filesToCopy.length;
      filesToCopy.forEach(function(file) {

        openVeoApi.fileSystem.copy(path.join(extractDirectory, file), path.join(videoFinalDir, file), function(error) {

          if (error)
            process.logger.warn(error.message, {
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
 * @method getTransitions
 * @return {Array} The stack of transitions
 */
VideoPackage.prototype.getTransitions = function() {
  return VideoPackage.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @method getStateMachine
 * @return {Array} The list of states/transitions
 */
VideoPackage.prototype.getStateMachine = function() {
  return VideoPackage.stateMachine;
};
