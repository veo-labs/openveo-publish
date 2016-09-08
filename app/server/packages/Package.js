'use strict';

/**
 * @module publish-packages
 */

var util = require('util');
var fs = require('fs');
var events = require('events');
var path = require('path');
var async = require('async');
var StateMachine = require('javascript-state-machine');
var openVeoAPI = require('@openveo/api');
var configDir = openVeoAPI.fileSystem.getConfDir();
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var VideoPlatformProvider = process.requirePublish('app/server/providers/VideoPlatformProvider.js');
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var errors = process.requirePublish('app/server/packages/errors.js');

/**
 * Defines a custom error with an error code.
 *
 * @class PackageError
 * @constructor
 * @extends Error
 * @param {String} message The error message
 * @param {String} code The error code
 */
function PackageError(message, code) {
  this.name = 'PackageError';
  this.message = message || '';
  this.code = code;
}

/**
 * Defines a Package class to manage publication of a media file.
 *
 * @example
 *     // media package object example
 *     {
 *       "type": "vimeo", // Platform type
 *       "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 *     }
 *
 * @class Package
 * @constructor
 * @param {Object} mediaPackage Information about the media
 * Package emits the following events :
 *  - Event *error* An error occured
 *    - **Error** The error
 *  - Event *complete* A package was successfully published
 *    - **Object** The published package
 */
function Package(mediaPackage) {

  /**
   * Publish configuration object from publishConf.json file.
   *
   * @property publishConf
   * @type Object
   */
  this.publishConf = publishConf;

  /**
   * Video model.
   *
   * @property videoModel
   * @type VideoModel
   */
  this.videoModel = new VideoModel();

  /**
   * Media package description object.
   *
   * @property mediaPackage
   * @type Object
   */
  this.mediaPackage = mediaPackage;

  /**
   * Video platforms configuration object from videoPlatformConf.json file.
   *
   * @property publishConf
   * @type Object
   */
  this.videoPlatformConf = videoPlatformConf;

  /**
   * Configuration model.
   *
   * @property videoModel
   * @type VideoModel
   */
  this.defaultConfig = new ConfigurationModel();

  // Validate temporary directory
  if (!this.publishConf.videoTmpDir || (typeof this.publishConf.videoTmpDir !== 'string'))
    this.emit('error', new PackageError('videoTmpDir in publishConf.json must be a String'),
      errors.INVALID_CONFIGURATION_ERROR);
}

util.inherits(Package, events.EventEmitter);
module.exports = Package;

// Package states
Package.PACKAGE_SUBMITTED_STATE = 'packageSubmitted';
Package.PACKAGE_INITIALIZED_STATE = 'packageInitialized';
Package.PACKAGE_COPIED_STATE = 'packageCopied';
Package.ORIGINAL_PACKAGE_REMOVED_STATE = 'originalPackageRemoved';
Package.MEDIA_UPLOADED_STATE = 'mediaUploaded';
Package.MEDIA_CONFIGURED_STATE = 'mediaConfigured';
Package.DIRECTORY_CLEANED_STATE = 'directoryCleaned';

// Package transitions (from one state to another)
Package.INIT_TRANSITION = 'initPackage';
Package.COPY_PACKAGE_TRANSITION = 'copyPackage';
Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION = 'removeOriginalPackage';
Package.UPLOAD_MEDIA_TRANSITION = 'uploadMedia';
Package.CONFIGURE_MEDIA_TRANSITION = 'configureMedia';
Package.CLEAN_DIRECTORY_TRANSITION = 'cleanDirectory';

// Define the order in which transitions will be executed for a Package
Package.stateTransitions = [
  Package.INIT_TRANSITION,
  Package.COPY_PACKAGE_TRANSITION,
  Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
  Package.UPLOAD_MEDIA_TRANSITION,
  Package.CONFIGURE_MEDIA_TRANSITION,
  Package.CLEAN_DIRECTORY_TRANSITION
];

// Define machine state authorized transitions depending on previous and
// next states
Package.stateMachine = [
  {
    name: Package.INIT_TRANSITION,
    from: Package.PACKAGE_SUBMITTED_STATE,
    to: Package.PACKAGE_INITIALIZED_STATE
  },
  {
    name: Package.COPY_PACKAGE_TRANSITION,
    from: Package.PACKAGE_INITIALIZED_STATE,
    to: Package.PACKAGE_COPIED_STATE
  },
  {
    name: Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
    from: Package.PACKAGE_COPIED_STATE,
    to: Package.ORIGINAL_PACKAGE_REMOVED_STATE
  },
  {
    name: Package.UPLOAD_MEDIA_TRANSITION,
    from: Package.ORIGINAL_PACKAGE_REMOVED_STATE,
    to: Package.MEDIA_UPLOADED_STATE
  },
  {
    name: Package.CONFIGURE_MEDIA_TRANSITION,
    from: Package.MEDIA_UPLOADED_STATE,
    to: Package.MEDIA_CONFIGURED_STATE
  },
  {
    name: Package.CLEAN_DIRECTORY_TRANSITION,
    from: Package.MEDIA_CONFIGURED_STATE,
    to: Package.DIRECTORY_CLEANED_STATE
  }
];

/**
 * Gets an instance of a Package depending on package file type (factory).
 *
 * @method getPackage
 * @static
 * @param {String} type The type of the package platform to instanciate
 * @param {Object} mediaPackage Information about the media
 * @return {Package} An instance of a Package sub class
 */
Package.getPackage = function(type, mediaPackage) {
  var self = this;
  if (type) {

    switch (type) {

      case 'tar':
        var TarPackage = process.requirePublish('app/server/packages/TarPackage.js');
        return new TarPackage(mediaPackage);

      case 'mp4':
        var VideoPackage = process.requirePublish('app/server/packages/VideoPackage.js');
        return new VideoPackage(mediaPackage);

      default:
        self.emit('error', new PackageError('Package type is not valid (' + mediaPackage.packageType + ')',
          errors.INVALID_PACKAGE_TYPE_ERROR));
    }

  }
};

/**
 * Creates a state machine to publish the package.
 *
 * @method init
 * @param {String} initialState Initial machine state
 * @param {String} initialTransition Initial machine transition
 */
Package.prototype.init = function(initialState, initialTransition) {
  var self = this;

  // Get the list of package stack transitions
  var transitions = this.getTransitions(this);

  // Look for the initial transition in the stack of transitions
  var transitionIndex = transitions.indexOf(initialTransition);
  var transition = transitionIndex >= 0 ? transitionIndex : 0;

  // Create a new final state machine
  this.fsm = StateMachine.create({
    initial: initialState,
    events: this.getStateMachine()
  });

  // Handle each enter state event to launch automatically the next
  // transition regarding the stack of transitions
  this.fsm.onenterstate = function() {
    process.logger.verbose('State = ' + self.fsm.current);
    self.executeTransition((transitions[transition + 1]) ? transitions[++transition] : null);
  };

  // Handle each leave state event to execute the corresponding transition
  this.fsm.onleavestate = function(event) {
    process.logger.verbose('Transition = ' + event);

    // Executes function corresponding to transition
    if (self[event])
      self[event]();
    else {
      self.emit('error', new PackageError('Transition ' + event + ' does not exist', errors.TRANSITION_ERROR));
      return false;
    }

    return StateMachine.ASYNC;
  };
};

/**
 * Starts executing at the given transition.
 *
 * The rest of the transitions stack will be executed.
 *
 * @method executeTransition
 * @param {String} transition The transition to launch
 */
Package.prototype.executeTransition = function(transition) {

  // Package is initialized
  // Memorize the last state and last transition of the package
  this.videoModel.updateLastState(this.mediaPackage.id, this.fsm.current);
  this.videoModel.updateLastTransition(this.mediaPackage.id, transition);

  // If no more transition or upload transition reached without platform type
  // The publication is considered done
  if (!transition || (transition === Package.UPLOAD_MEDIA_TRANSITION && !this.mediaPackage.type)) {

    // Package has not been uploaded yet and request a manual upload
    // Change package state
    if (transition === Package.UPLOAD_MEDIA_TRANSITION) {
      process.logger.debug('Package ' + this.mediaPackage.id + ' is waiting for manual upload');
      this.videoModel.updateState(this.mediaPackage.id, VideoModel.WAITING_FOR_UPLOAD_STATE);
    } else
      this.videoModel.updateState(this.mediaPackage.id, VideoModel.READY_STATE);

    // Done, final state reached
    this.emit('complete', this.mediaPackage);
  } else {

    // Continue by executing the next transition in the stack
    this.fsm[transition]();

  }
};

/**
 * Initializes and stores the package.
 *
 * This is a transition.
 *
 * @method initPackage
 * @private
 */
Package.prototype.initPackage = function() {
  process.logger.debug('Init package ' + this.mediaPackage.id);

  var self = this;

  async.series([
    function(callback) {
      self.defaultConfig.get({publishDefaultUpload: {$ne: null}}, function(error, result) {
        if (error)
          callback(error);
        else if (result && result.length >= 1) {
          var conf = result[0].publishDefaultUpload;
          if (conf.owner && conf.owner.value) self.mediaPackage.user = conf.owner.value;
          if (conf.group && conf.owner.value) self.mediaPackage.groups = [conf.group.value];
        }
        callback();
      });
    },
    function(callback) {
      self.videoModel.get({originalFileName: self.mediaPackage.originalFileName, type: self.mediaPackage.type},
        function(error, result) {
          if (error)
            callback(error);
          else if (result && result.length >= 1) {
            if (result[0].errorCode)
              callback(error);
            else {
              var originalPackagePath = self.mediaPackage.originalPackagePath;
              var originalPackageType = self.mediaPackage.packageType;
              self.mediaPackage = result[0];
              self.mediaPackage.errorCode = VideoModel.NO_ERROR;
              self.mediaPackage.state = VideoModel.PENDING_STATE;
              self.mediaPackage.lastState = Package.PACKAGE_INITIALIZED_STATE;
              self.mediaPackage.lastTransition = Package.COPY_PACKAGE_TRANSITION;
              self.mediaPackage.originalPackagePath = originalPackagePath;
              self.mediaPackage.packageType = originalPackageType;
              self.mediaPackage.date = Date.now();
              callback();
            }
          } else {
            self.mediaPackage.state = VideoModel.PENDING_STATE;
            self.mediaPackage.link = null;
            self.mediaPackage.mediaId = null;
            self.mediaPackage.errorCode = VideoModel.NO_ERROR;
            self.mediaPackage.properties = [];
            self.mediaPackage.metadata = self.mediaPackage.metadata || {};
            self.mediaPackage.lastState = Package.PACKAGE_INITIALIZED_STATE;
            self.mediaPackage.lastTransition = Package.COPY_PACKAGE_TRANSITION;
            self.mediaPackage.date = Date.now();
            self.videoModel.add(self.mediaPackage, callback);
          }
        }
        );
    }],
    function(error) {
      if (error)
        self.emit('error', new PackageError(error.message, errors.SAVE_PACKAGE_DATA_ERROR));
      else
        self.fsm.transition();
    });
};

/**
 * Copies package from its submitted directory to temporary directory.
 *
 * This is a transition.
 *
 * @method copyPackage
 * @private
 */
Package.prototype.copyPackage = function() {
  var self = this;

  // Destination of the copy
  var destinationFilePath = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id),
    this.mediaPackage.id + '.' + this.mediaPackage.packageType);

  this.videoModel.updateState(this.mediaPackage.id, VideoModel.COPYING_STATE);

  // Copy package
  process.logger.debug('Copy ' + this.mediaPackage.originalPackagePath + ' to ' + destinationFilePath);
  openVeoAPI.fileSystem.copy(this.mediaPackage.originalPackagePath, destinationFilePath, function(copyError) {
    if (copyError)
      self.setError(new PackageError(copyError.message, errors.COPY_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Removes original package.
 *
 * This is a transition.
 *
 * @method removeOriginalPackage
 * @private
 */
Package.prototype.removeOriginalPackage = function() {
  var self = this;

  // Try to remove the original package
  process.logger.debug('Remove original package ' + this.mediaPackage.originalPackagePath);
  fs.unlink(this.mediaPackage.originalPackagePath, function(error) {
    if (error)
      self.setError(new PackageError(error.message, errors.UNLINK_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Uploads the media to the video platform.
 *
 * This is a transition.
 *
 * @method uploadMedia
 * @private
 */
Package.prototype.uploadMedia = function() {
  var self = this;
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.UPLOADING_STATE);

  // Get video plaform provider from package type
  var videoPlatformProvider = VideoPlatformProvider.getProvider(this.mediaPackage.type,
    this.videoPlatformConf[this.mediaPackage.type]);

  // Start uploading the media to the platform
  process.logger.debug('Upload media ' + this.mediaPackage.id);
  videoPlatformProvider.upload(this.getMediaFilePath(), function(error, mediaId) {
    if (error)
      self.setError(new PackageError(error.message, errors.MEDIA_UPLOAD_ERROR));
    else {
      if (!self.mediaPackage.mediaId) {
        self.mediaPackage.mediaId = [mediaId];
        self.videoModel.updateLink(self.mediaPackage.id, '/publish/video/' + self.mediaPackage.id);
      } else {
        self.mediaPackage.mediaId = self.mediaPackage.mediaId.concat([mediaId]);
      }
      self.videoModel.updateMediaId(self.mediaPackage.id, self.mediaPackage.mediaId);
      self.fsm.transition();
    }
  });
};

/**
 * Configures uploaded media in video platform.
 *
 * This is a transition.
 *
 * @method configureMedia
 * @private
 */
Package.prototype.configureMedia = function() {
  var self = this;
  process.logger.debug('Configure media ' + this.mediaPackage.id);
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.CONFIGURING_STATE);

  // Get video plaform provider from package type
  var videoPlatformProvider = VideoPlatformProvider.getProvider(this.mediaPackage.type,
    this.videoPlatformConf[this.mediaPackage.type]);

  var mediaId = this.mediaPackage.mediaId[this.mediaPackage.mediaId.length];

  // Configure media
  videoPlatformProvider.configure(mediaId, function(error) {
    if (error)
      self.setError(new PackageError(error.message, errors.MEDIA_CONFIGURE_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Removes extracted tar files from temporary directory.
 *
 * This is a transition.
 *
 * @method copyImages
 * @private
 */
Package.prototype.cleanDirectory = function() {
  var self = this;
  var directoryToRemove = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));

  // Remove package temporary directory
  process.logger.debug('Remove temporary directory ' + directoryToRemove);
  openVeoAPI.fileSystem.rmdir(directoryToRemove, function(error) {
    if (error)
      self.setError(new PackageError(error.message, errors.CLEAN_DIRECTORY_ERROR));
    else
      self.fsm.transition();
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
Package.prototype.getTransitions = function() {
  return Package.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 * @method getStateMachine
 */
Package.prototype.getStateMachine = function() {
  return Package.stateMachine;
};

/**
 * Gets the media file path of the package.
 *
 * @return {String} System path of the media file
 * @method getMediaFilePath
 */
Package.prototype.getMediaFilePath = function() {
  return path.join(this.publishConf.videoTmpDir,
    String(this.mediaPackage.id),
    this.mediaPackage.id + '.' + this.mediaPackage.packageType
  );
};

/**
 * Sets a package as in error.
 *
 * @param {PublishError} error The package error
 * @method setError
 * @private
 */
Package.prototype.setError = function(error) {

  // An error occurred
  if (error) {
    this.videoModel.updateState(this.mediaPackage.id, VideoModel.ERROR_STATE);
    this.videoModel.updateErrorCode(this.mediaPackage.id, error.code);
    this.emit('error', error);
  }

};
