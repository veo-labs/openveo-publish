'use strict';

/**
 * @module packages
 */

var util = require('util');
var fs = require('fs');
var events = require('events');
var path = require('path');
var async = require('async');
var StateMachine = require('javascript-state-machine');
var openVeoApi = require('@openveo/api');
var configDir = openVeoApi.fileSystem.getConfDir();
var videoPlatformFactory = process.requirePublish('app/server/providers/videoPlatforms/factory.js');
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

/**
 * Fired when an error occurred while processing the package.
 *
 * @event error
 * @param {Error} The error
 */

/**
 * Fired when package processing has succeed.
 *
 * @event complete
 * @param {Object} The processed package
 */

/**
 * Defines a Package to manage publication of a media file.
 *
 * @class Package
 * @constructor
 * @param {Object} mediaPackage Information about the media
 * @param {VideoModel} videoModel A video model
 * @param {ConfigurationModel} configurationModel A configuration model
 */
function Package(mediaPackage, videoModel, configurationModel) {

  Object.defineProperties(this, {

    /**
     * Publish configuration.
     *
     * @property publishConf
     * @type Object
     * @final
     */
    publishConf: {value: publishConf},

    /**
     * Video model.
     *
     * @property videoModel
     * @type VideoModel
     * @final
     */
    videoModel: {value: videoModel},

    /**
     * Media package description object.
     *
     * @property mediaPackage
     * @type Object
     */
    mediaPackage: {value: mediaPackage, writable: true},

    /**
     * Video platforms configuration object from videoPlatformConf.json file.
     *
     * @property videoPlatformConf
     * @type Object
     * @final
     */
    videoPlatformConf: {value: videoPlatformConf},

    /**
     * Configuration model.
     *
     * @property configurationModel
     * @type ConfigurationModel
     * @final
     */
    configurationModel: {value: configurationModel}

  });

  // Validate temporary directory
  if (!this.publishConf.videoTmpDir || (typeof this.publishConf.videoTmpDir !== 'string'))
    this.emit('error', new PackageError('videoTmpDir in publishConf.json must be a String'),
      ERRORS.INVALID_CONFIGURATION);
}

util.inherits(Package, events.EventEmitter);
module.exports = Package;

/**
 * Package states.
 *
 * @property STATES
 * @type Object
 * @static
 * @final
 */
Package.STATES = {
  PACKAGE_SUBMITTED: 'packageSubmitted',
  PACKAGE_INITIALIZED: 'packageInitialized',
  PACKAGE_COPIED: 'packageCopied',
  ORIGINAL_PACKAGE_REMOVED: 'originalPackageRemoved',
  MEDIA_UPLOADED: 'mediaUploaded',
  MEDIA_CONFIGURED: 'mediaConfigured',
  DIRECTORY_CLEANED: 'directoryCleaned'
};
Object.freeze(Package.STATES);

/**
 * Package transitions (from one state to another).
 *
 * @property TRANSITIONS
 * @type Object
 * @static
 * @final
 */
Package.TRANSITIONS = {
  INIT: 'initPackage',
  COPY_PACKAGE: 'copyPackage',
  REMOVE_ORIGINAL_PACKAGE: 'removeOriginalPackage',
  UPLOAD_MEDIA: 'uploadMedia',
  CONFIGURE_MEDIA: 'configureMedia',
  CLEAN_DIRECTORY: 'cleanDirectory'
};
Object.freeze(Package.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for a Package.
 *
 * @property stateTransitions
 * @type Array
 * @static
 * @final
 */
Package.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.CONFIGURE_MEDIA,
  Package.TRANSITIONS.CLEAN_DIRECTORY
];
Object.freeze(Package.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @property stateMachine
 * @type Array
 * @static
 * @final
 */
Package.stateMachine = [
  {
    name: Package.TRANSITIONS.INIT,
    from: Package.STATES.PACKAGE_SUBMITTED,
    to: Package.STATES.PACKAGE_INITIALIZED
  },
  {
    name: Package.TRANSITIONS.COPY_PACKAGE,
    from: Package.STATES.PACKAGE_INITIALIZED,
    to: Package.STATES.PACKAGE_COPIED
  },
  {
    name: Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
    from: Package.STATES.PACKAGE_COPIED,
    to: Package.STATES.ORIGINAL_PACKAGE_REMOVED
  },
  {
    name: Package.TRANSITIONS.UPLOAD_MEDIA,
    from: Package.STATES.ORIGINAL_PACKAGE_REMOVED,
    to: Package.STATES.MEDIA_UPLOADED
  },
  {
    name: Package.TRANSITIONS.CONFIGURE_MEDIA,
    from: Package.STATES.MEDIA_UPLOADED,
    to: Package.STATES.MEDIA_CONFIGURED
  },
  {
    name: Package.TRANSITIONS.CLEAN_DIRECTORY,
    from: Package.STATES.MEDIA_CONFIGURED,
    to: Package.STATES.DIRECTORY_CLEANED
  }
];
Object.freeze(Package.stateMachine);

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
      self.emit('error', new PackageError('Transition ' + event + ' does not exist', ERRORS.TRANSITION));
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
  if (!transition || (transition === Package.TRANSITIONS.UPLOAD_MEDIA && !this.mediaPackage.type)) {

    // Package has not been uploaded yet and request a manual upload
    // Change package state
    if (transition === Package.TRANSITIONS.UPLOAD_MEDIA) {
      process.logger.debug('Package ' + this.mediaPackage.id + ' is waiting for manual upload');
      this.videoModel.updateState(this.mediaPackage.id, STATES.WAITING_FOR_UPLOAD);
    } else
      this.videoModel.updateState(this.mediaPackage.id, STATES.READY);

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
 */
Package.prototype.initPackage = function() {
  process.logger.debug('Init package ' + this.mediaPackage.id);

  var self = this;

  async.series([
    function(callback) {
      self.configurationModel.get({publishDefaultUpload: {$ne: null}}, function(error, result) {
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
              self.mediaPackage.errorCode = ERRORS.NO_ERROR;
              self.mediaPackage.state = STATES.PENDING;
              self.mediaPackage.lastState = Package.STATES.PACKAGE_INITIALIZED;
              self.mediaPackage.lastTransition = Package.TRANSITIONS.COPY_PACKAGE;
              self.mediaPackage.originalPackagePath = originalPackagePath;
              self.mediaPackage.packageType = originalPackageType;
              self.mediaPackage.date = Date.now();
              callback();
            }
          } else {
            self.mediaPackage.state = STATES.PENDING;
            self.mediaPackage.link = null;
            self.mediaPackage.mediaId = null;
            self.mediaPackage.errorCode = ERRORS.NO_ERROR;
            self.mediaPackage.properties = [];
            self.mediaPackage.metadata = self.mediaPackage.metadata || {};
            self.mediaPackage.lastState = Package.STATES.PACKAGE_INITIALIZED;
            self.mediaPackage.lastTransition = Package.TRANSITIONS.COPY_PACKAGE;
            self.mediaPackage.date = Date.now();
            self.videoModel.add(self.mediaPackage, callback);
          }
        }
        );
    }],
    function(error) {
      if (error)
        self.emit('error', new PackageError(error.message, ERRORS.SAVE_PACKAGE_DATA));
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
 */
Package.prototype.copyPackage = function() {
  var self = this;

  // Destination of the copy
  var destinationFilePath = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id),
    this.mediaPackage.id + '.' + this.mediaPackage.packageType);

  this.videoModel.updateState(this.mediaPackage.id, STATES.COPYING);

  // Copy package
  process.logger.debug('Copy ' + this.mediaPackage.originalPackagePath + ' to ' + destinationFilePath);
  openVeoApi.fileSystem.copy(this.mediaPackage.originalPackagePath, destinationFilePath, function(copyError) {
    if (copyError)
      self.setError(new PackageError(copyError.message, ERRORS.COPY));
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
 */
Package.prototype.removeOriginalPackage = function() {
  var self = this;

  // Try to remove the original package
  process.logger.debug('Remove original package ' + this.mediaPackage.originalPackagePath);
  fs.unlink(this.mediaPackage.originalPackagePath, function(error) {
    if (error)
      self.setError(new PackageError(error.message, ERRORS.UNLINK));
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
 */
Package.prototype.uploadMedia = function() {
  var self = this;
  this.videoModel.updateState(this.mediaPackage.id, STATES.UPLOADING);

  // Get video plaform provider from package type
  var videoPlatformProvider = videoPlatformFactory.get(this.mediaPackage.type,
    this.videoPlatformConf[this.mediaPackage.type]);

  // Start uploading the media to the platform
  process.logger.debug('Upload media ' + this.mediaPackage.id);
  videoPlatformProvider.upload(this.getMediaFilePath(), function(error, mediaId) {
    if (error)
      self.setError(new PackageError(error.message, ERRORS.MEDIA_UPLOAD));
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
 */
Package.prototype.configureMedia = function() {
  var self = this;
  process.logger.debug('Configure media ' + this.mediaPackage.id);
  this.videoModel.updateState(this.mediaPackage.id, STATES.CONFIGURING);

  // Get video plaform provider from package type
  var videoPlatformProvider = videoPlatformFactory.get(this.mediaPackage.type,
    this.videoPlatformConf[this.mediaPackage.type]);

  var mediaId = this.mediaPackage.mediaId[this.mediaPackage.mediaId.length];

  // Configure media
  videoPlatformProvider.configure(mediaId, function(error) {
    if (error)
      self.setError(new PackageError(error.message, ERRORS.MEDIA_CONFIGURE));
    else
      self.fsm.transition();
  });
};

/**
 * Removes extracted tar files from temporary directory.
 *
 * This is a transition.
 *
 * @method cleanDirectory
 */
Package.prototype.cleanDirectory = function() {
  var self = this;
  var directoryToRemove = path.join(this.publishConf.videoTmpDir, String(this.mediaPackage.id));

  // Remove package temporary directory
  process.logger.debug('Remove temporary directory ' + directoryToRemove);
  openVeoApi.fileSystem.rmdir(directoryToRemove, function(error) {
    if (error)
      self.setError(new PackageError(error.message, ERRORS.CLEAN_DIRECTORY));
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
 * @method getTransitions
 * @return {Array} The stack of transitions
 */
Package.prototype.getTransitions = function() {
  return Package.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @method getStateMachine
 * @return {Array} The list of states/transitions
 */
Package.prototype.getStateMachine = function() {
  return Package.stateMachine;
};

/**
 * Gets the media file path of the package.
 *
 * @method getMediaFilePath
 * @return {String} System path of the media file
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
 * @method setError
 * @param {PublishError} error The package error
 */
Package.prototype.setError = function(error) {

  // An error occurred
  if (error) {
    this.videoModel.updateState(this.mediaPackage.id, STATES.ERROR);
    this.videoModel.updateErrorCode(this.mediaPackage.id, error.code);
    this.emit('error', error);
  }

};
