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
var videoPlatformFactory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

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
 * Fired when package state has changed.
 *
 * @event stateChanged
 * @param {Object} The processed package
 */

/**
 * Defines a Package to manage publication of a media file.
 *
 * @class Package
 * @constructor
 * @param {Object} mediaPackage Information about the media
 * @param {VideoProvider} videoProvider Media provider
 */
function Package(mediaPackage, videoProvider) {

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
     * Media provider.
     *
     * @property videoProvider
     * @type VideoProvider
     * @final
     */
    videoProvider: {value: videoProvider},

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
    videoPlatformConf: {value: videoPlatformConf}

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
    process.logger.verbose('State = ' + self.fsm.current, {id: self.mediaPackage.id});
    self.executeTransition((transitions[transition + 1]) ? transitions[++transition] : null);
  };

  // Handle each leave state event to execute the corresponding transition
  this.fsm.onleavestate = function(event) {
    process.logger.verbose('Transition = ' + event, {id: self.mediaPackage.id});

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
 * Updates media state and sends an event to inform about state changed.
 *
 * @method updateState
 * @async
 * @param {Number} id The id of the media to update
 * @param {String} state The state of the media
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
Package.prototype.updateState = function(id, state, callback) {
  var self = this;

  this.videoProvider.updateState(id, state, function(error, totalItems) {
    self.emit('stateChanged', self.mediaPackage);
    callback(error, totalItems);
  });
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
  var self = this;

  // Package is initialized
  // Memorize the last state and last transition of the package
  async.parallel([
    function(callback) {
      self.videoProvider.updateLastState(self.mediaPackage.id, self.fsm.current, callback);
    },
    function(callback) {
      self.videoProvider.updateLastTransition(self.mediaPackage.id, transition, callback);
    }
  ], function() {

    // If no more transition or upload transition reached without platform type
    // The publication is considered done
    if (!transition || (transition === Package.TRANSITIONS.UPLOAD_MEDIA && !self.mediaPackage.type)) {

      // Package has not been uploaded yet and request a manual upload
      // Change package state
      if (transition === Package.TRANSITIONS.UPLOAD_MEDIA) {
        process.logger.debug('Package ' + self.mediaPackage.id + ' is waiting for manual upload');
        self.updateState(self.mediaPackage.id, STATES.WAITING_FOR_UPLOAD, function() {
          self.emit('complete', self.mediaPackage);
        });
      } else
        self.updateState(self.mediaPackage.id, STATES.READY, function() {
          self.emit('complete', self.mediaPackage);
        });
    } else {

      // Continue by executing the next transition in the stack
      self.fsm[transition]();

    }

  });

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
      var settingProvider = process.api.getCoreApi().settingProvider;

      settingProvider.getOne(
        new ResourceFilter()
        .equal('id', 'publish-defaultUpload'),
        null,
        function(error, setting) {
          if (error) return callback(error);
          var defaultUploadSettings = setting && setting.value;

          if (defaultUploadSettings) {
            if (defaultUploadSettings.owner && defaultUploadSettings.owner.value)
              self.mediaPackage.user = defaultUploadSettings.owner.value;

            if (defaultUploadSettings.group && defaultUploadSettings.owner.value)
              self.mediaPackage.groups = [defaultUploadSettings.group.value];
          }
          callback();
        }
      );
    },
    function(callback) {
      var filter = new ResourceFilter().equal('originalFileName', self.mediaPackage.originalFileName);
      if (self.mediaPackage.type) filter.equal('type', self.mediaPackage.type);

      self.videoProvider.getOne(
        filter,
        null,
        function(getOneError, media) {
          if (getOneError) return callback(getOneError);

          if (media) {
            if (media.errorCode != ERRORS.NO_ERROR)
              callback();
            else {
              var originalPackagePath = self.mediaPackage.originalPackagePath;
              var originalPackageType = self.mediaPackage.packageType;
              self.mediaPackage = media;
              self.mediaPackage.errorCode = ERRORS.NO_ERROR;
              self.mediaPackage.state = STATES.PENDING;
              self.mediaPackage.lastState = Package.STATES.PACKAGE_INITIALIZED;
              self.mediaPackage.lastTransition = Package.TRANSITIONS.COPY_PACKAGE;
              self.mediaPackage.originalPackagePath = originalPackagePath;
              self.mediaPackage.packageType = originalPackageType;
              if (self.mediaPackage.date === undefined) self.mediaPackage.date = Date.now();
              callback();
            }
          } else {
            self.mediaPackage.state = STATES.PENDING;
            self.mediaPackage.link = null;
            self.mediaPackage.mediaId = null;
            self.mediaPackage.errorCode = ERRORS.NO_ERROR;
            self.mediaPackage.properties = self.mediaPackage.properties || {};
            self.mediaPackage.metadata = self.mediaPackage.metadata || {};
            self.mediaPackage.lastState = Package.STATES.PACKAGE_INITIALIZED;
            self.mediaPackage.lastTransition = Package.TRANSITIONS.COPY_PACKAGE;
            if (self.mediaPackage.date === undefined) self.mediaPackage.date = Date.now();
            self.videoProvider.add([self.mediaPackage], callback);
          }
        }
      );
    }],
    function(error) {
      if (error)
        self.emit('error', new PackageError(error.message, ERRORS.SAVE_PACKAGE_DATA));
      else {
        self.emit('stateChanged', self.mediaPackage);
        self.fsm.transition();
      }
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

  this.updateState(this.mediaPackage.id, STATES.COPYING, function() {

    // Copy package
    process.logger.debug('Copy ' + self.mediaPackage.originalPackagePath + ' to ' + destinationFilePath);
    openVeoApi.fileSystem.copy(self.mediaPackage.originalPackagePath, destinationFilePath, function(copyError) {
      if (copyError)
        self.setError(new PackageError(copyError.message, ERRORS.COPY));
      else
        self.fsm.transition();
    });

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

  async.parallel([
    function(callback) {
      // Try to remove the original package
      process.logger.debug('Remove original package ' + self.mediaPackage.originalPackagePath);
      fs.unlink(self.mediaPackage.originalPackagePath, function(error) {
        if (error)
          self.setError(new PackageError(error.message, ERRORS.UNLINK));
        else
          callback();
      });
    },
    function(callback) {
      // Remove uploaded thumbnail (if it has been uploaded)
      if (self.mediaPackage.originalThumbnailPath) {
        process.logger.debug('Remove original thumbnail ' + self.mediaPackage.originalThumbnailPath);
        fs.unlink(self.mediaPackage.originalThumbnailPath, function(error) {
          if (error)
            self.setError(new PackageError(error.message, ERRORS.UNLINK));
          else
            callback();
        });
      } else {
        callback();
      }
    }
  ], function() {
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

  this.updateState(this.mediaPackage.id, STATES.UPLOADING, function() {

    // Get video plaform provider from package type
    var videoPlatformProvider = videoPlatformFactory.get(self.mediaPackage.type,
      self.videoPlatformConf[self.mediaPackage.type]);

    // Start uploading the media to the platform
    process.logger.debug('Upload media ' + self.mediaPackage.id);
    videoPlatformProvider.upload(self.getMediaFilePath(), function(error, mediaId) {
      if (error)
        self.setError(new PackageError(error.message, ERRORS.MEDIA_UPLOAD));
      else {
        async.series([
          function(callback) {
            if (!self.mediaPackage.mediaId) {
              self.mediaPackage.mediaId = [mediaId];
              self.videoProvider.updateLink(self.mediaPackage.id, '/publish/video/' + self.mediaPackage.id, callback);
            } else {
              self.mediaPackage.mediaId = self.mediaPackage.mediaId.concat([mediaId]);
              callback();
            }
          },
          function(callback) {
            self.videoProvider.updateMediaId(self.mediaPackage.id, self.mediaPackage.mediaId, callback);
          }
        ], function() {
          self.fsm.transition();
        });
      }
    });

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
  this.updateState(this.mediaPackage.id, STATES.CONFIGURING, function() {

    // Get video plaform provider from package type
    var videoPlatformProvider = videoPlatformFactory.get(self.mediaPackage.type,
      self.videoPlatformConf[self.mediaPackage.type]);

    var mediaId = self.mediaPackage.mediaId[self.mediaPackage.mediaId.length];

    // Configure media
    videoPlatformProvider.configure(mediaId, function(error) {
      if (error)
        self.setError(new PackageError(error.message, ERRORS.MEDIA_CONFIGURE));
      else
        self.fsm.transition();
    });

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
  var self = this;

  // An error occurred
  if (error) {

    async.parallel([
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.ERROR, callback);
      },
      function(callback) {
        self.videoProvider.updateErrorCode(self.mediaPackage.id, error.code, callback);
      }
    ], function() {
      self.emit('error', error);
    });

  }
};
