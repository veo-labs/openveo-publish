'use strict';

/**
 * @module publish/packages/Package
 */

var events = require('events');
var fs = require('fs');
var path = require('path');
var util = require('util');

var async = require('async');
var StateMachine = require('javascript-state-machine');
var openVeoApi = require('@openveo/api');

var configDir = openVeoApi.fileSystem.getConfDir();

var mediaPlatformFactory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var videoPlatformConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

var ResourceFilter = openVeoApi.storages.ResourceFilter;

/**
 * Fired when an error occurred while processing the package.
 *
 * @event module:publish/packages/Package~Package#error
 * @property {Error} error The error
 */

/**
 * Fired when package processing has succeed.
 *
 * @event module:publish/packages/Package~Package#complete
 * @property {Object} package The processed package
 */

/**
 * Fired when package state has changed.
 *
 * @event module:publish/packages/Package~Package#stateChanged
 * @property {Object} package The processed package
 */

/**
 * Defines a Package to manage publication of a media file.
 *
 * @class Package
 * @constructor
 * @param {Object} mediaPackage Information about the media
 * @param {module:publish/providers/VideoProvider~VideoProvider} videoProvider Media provider
 * @param {module:publish/providers/PoiProvider~PoiProvider} poiProvider Points of interest provider
 */
function Package(mediaPackage, videoProvider, poiProvider) {

  // Validate temporary directory
  if (!publishConf.videoTmpDir || (typeof publishConf.videoTmpDir !== 'string'))
    this.emit('error', new PackageError('videoTmpDir in publishConf.json must be a String'),
      ERRORS.INVALID_CONFIGURATION);

  Object.defineProperties(this,

    /** @lends module:publish/packages/Package~Package */
    {

      /**
       * Publish configuration.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      publishConf: {value: publishConf},

      /**
       * Media provider.
       *
       * @type {module:publish/providers/VideoProvider~VideoProvider}
       * @instance
       * @readonly
       */
      videoProvider: {value: videoProvider},

      /**
       * Points of interest provider.
       *
       * @type {module:publish/providers/PoiProvider~PoiProvider}
       * @instance
       * @readonly
       */
      poiProvider: {value: poiProvider},

      /**
       * Media package description object.
       *
       * @type {Object}
       * @instance
       */
      mediaPackage: {value: mediaPackage, writable: true},

      /**
       * Video platforms configuration object from videoPlatformConf.json file.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      videoPlatformConf: {value: videoPlatformConf},

      /**
       * Medias public directory path.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      mediasPublicPath: {value: path.join(process.rootPublish, 'assets/player/videos')},

      /**
       * Package temporary directory path.
       *
       * @type {String}
       * @instance
       */
      packageTemporaryDirectory: {
        value: path.join(
          publishConf.videoTmpDir,
          String(mediaPackage.id),
          mediaPackage.temporarySubDirectory || ''
        ),
        writable: true
      }

    }

  );
}

util.inherits(Package, events.EventEmitter);
module.exports = Package;

/**
 * Package states.
 *
 * @const
 * @type {Object}
 */
Package.STATES = {
  PACKAGE_SUBMITTED: 'packageSubmitted',
  PACKAGE_INITIALIZED: 'packageInitialized',
  PACKAGE_COPIED: 'packageCopied',
  ORIGINAL_PACKAGE_REMOVED: 'originalPackageRemoved',
  MEDIA_UPLOADED: 'mediaUploaded',
  MEDIA_SYNCHRONIZED: 'mediaSynchronized',
  DIRECTORY_CLEANED: 'directoryCleaned',
  MERGE_INITIALIZED: 'mergeInitialized',
  MERGED: 'merged',
  MERGE_FINALIZED: 'mergeFinalized',
  PACKAGE_REMOVED: 'packageRemoved'
};
Object.freeze(Package.STATES);

/**
 * Package transitions (from one state to another).
 *
 * @const
 * @type {Object}
 */
Package.TRANSITIONS = {
  INIT: 'initPackage',
  COPY_PACKAGE: 'copyPackage',
  REMOVE_ORIGINAL_PACKAGE: 'removeOriginalPackage',
  UPLOAD_MEDIA: 'uploadMedia',
  SYNCHRONIZE_MEDIA: 'synchronizeMedia',
  CLEAN_DIRECTORY: 'cleanDirectory',
  INIT_MERGE: 'initMerge',
  MERGE: 'merge',
  FINALIZE_MERGE: 'finalizeMerge',
  REMOVE_PACKAGE: 'removePackage'
};
Object.freeze(Package.TRANSITIONS);

/**
 * Define the order in which transitions will be executed for a Package.
 *
 * @const
 * @type {Object}
 */
Package.stateTransitions = [
  Package.TRANSITIONS.INIT,
  Package.TRANSITIONS.COPY_PACKAGE,
  Package.TRANSITIONS.REMOVE_ORIGINAL_PACKAGE,
  Package.TRANSITIONS.UPLOAD_MEDIA,
  Package.TRANSITIONS.SYNCHRONIZE_MEDIA,
  Package.TRANSITIONS.CLEAN_DIRECTORY,
  Package.TRANSITIONS.INIT_MERGE,
  Package.TRANSITIONS.MERGE,
  Package.TRANSITIONS.FINALIZE_MERGE,
  Package.TRANSITIONS.REMOVE_PACKAGE
];
Object.freeze(Package.stateTransitions);

/**
 * Define machine state authorized transitions depending on previous and next states.
 *
 * @const
 * @type {Object}
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
    name: Package.TRANSITIONS.SYNCHRONIZE_MEDIA,
    from: Package.STATES.MEDIA_UPLOADED,
    to: Package.STATES.MEDIA_SYNCHRONIZED
  },
  {
    name: Package.TRANSITIONS.CLEAN_DIRECTORY,
    from: Package.STATES.MEDIA_SYNCHRONIZED,
    to: Package.STATES.DIRECTORY_CLEANED
  },
  {
    name: Package.TRANSITIONS.INIT_MERGE,
    from: Package.STATES.DIRECTORY_CLEANED,
    to: Package.STATES.MERGE_INITIALIZED
  },
  {
    name: Package.TRANSITIONS.MERGE,
    from: Package.STATES.MERGE_INITIALIZED,
    to: Package.STATES.MERGED
  },
  {
    name: Package.TRANSITIONS.FINALIZE_MERGE,
    from: Package.STATES.MERGED,
    to: Package.STATES.MERGE_FINALIZED
  },
  {
    name: Package.TRANSITIONS.REMOVE_PACKAGE,
    from: Package.STATES.MERGE_FINALIZED,
    to: Package.STATES.PACKAGE_REMOVED
  }
];
Object.freeze(Package.stateMachine);

/**
 * Packages that have been locked by another one with the locker id as property name and the locked id as property
 * value.
 *
 * This object is static to offer a loop safe context for packages which might try to lock another package with the
 * same name at the same time.
 * Lock information is stored in storage but is not loop safe.
 *
 * @const
 * @type {Object}
 */
Package.lockedPackages = {};

/**
 * Waits for the given media to be in one of the given states.
 *
 * Waiting interval is 1 second.
 *
 * @memberof module:publish/packages/Package~Package
 * @this module:publish/packages/Package~Package
 * @private
 * @param {Object} media The media
 * @param {Object} media.id The media id
 * @param {Array} states The authorized states
 * @param {module:publish/packages/Package~Package~waitForMediaStateCallback} callback The function to call
 * when done
 */
function waitForMediaState(media, states, callback) {
  var self = this;

  this.videoProvider.getOne(
    new ResourceFilter().equal('id', media.id),
    null,
    function(error, fetchedMedia) {
      if (error) return callback(error);
      if (!fetchedMedia) return callback(new Error('Media "' + media.id + '" not found'));
      if (states.indexOf(fetchedMedia.state) !== -1) return callback(null, fetchedMedia);

      setTimeout(function() {
        waitForMediaState.call(self, media, states, callback);
      }, 1000);
    }
  );
}

/**
 * Finds if a package is actually locked.
 *
 * @memberof module:publish/packages/Package~Package
 * @this module:publish/packages/Package~Package
 * @private
 * @param {Object} packageToTest The package to test
 * @param {String} packageToTest.id The package to test
 * @return {Boolean} true if package is locked, false otherwise
 */
function isLocked(packageToTest) {
  return Object.values(Package.lockedPackages).indexOf(packageToTest.id) !== -1;
}

/**
 * Finds locker's id of a package.
 *
 * @memberof module:publish/packages/Package~Package
 * @this module:publish/packages/Package~Package
 * @private
 * @param {Object} lockedPackage The locked package
 * @param {String} lockedPackage.id The locked package id
 * @return {(String|null)} The locker's id of the given package or null if package isn't locked
 */
function getLockerId(lockedPackage) {
  for (var lockerId in Package.lockedPackages) {
    if (Package.lockedPackages[lockerId] === lockedPackage.id) {
      return lockerId;
    }
  }

  return null;
}

/**
 * Creates a state machine to publish the package.
 *
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
  this.fsm = new StateMachine({
    init: initialState,
    transitions: this.getStateMachine()
  });

  // Handle each enter state event to launch automatically the next
  // transition regarding the stack of transitions
  this.fsm.observe('onEnterState', function() {
    self.log('State = ' + self.fsm.state, 'verbose');
    self.executeTransition((transitions[transition + 1]) ? transitions[++transition] : null);
  });

  // Handle each leave state event to execute the corresponding transition
  this.fsm.observe('onLeaveState', function(event) {
    self.log('Transition = ' + event.transition, 'verbose');

    // Executes function corresponding to transition
    if (self[event.transition]) {
      return self[event.transition]();
    } else {
      self.setError(new PackageError('Transition ' + event.transition + ' does not exist', ERRORS.TRANSITION), true);
      return false;
    }

  });
};

/**
 * Updates media state and sends an event to inform about state changed.
 *
 * @param {Number} id The id of the media to update
 * @param {String} state The state of the media
 * @param {module:publish/packages/Package~Package~udapteStateCallback} callback The function to call when it's done
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
 * @param {String} transition The transition to launch
 */
Package.prototype.executeTransition = function(transition) {
  var self = this;

  if (this.mediaPackage.removed) {
    this.log('Package removed');
    return this.emit('complete', this.mediaPackage);
  }

  // Package is initialized
  // Memorize the last state and last transition of the package
  async.parallel([
    function(callback) {
      self.videoProvider.updateLastState(self.mediaPackage.id, self.fsm.state, callback);
    },
    function(callback) {
      self.videoProvider.updateLastTransition(self.mediaPackage.id, transition, callback);
    }
  ], function() {

    // If no more transition or upload transition reached without platform type
    // The publication is considered done
    if (
      !transition ||
      (transition === Package.TRANSITIONS.UPLOAD_MEDIA && !self.mediaPackage.type) ||
      (transition === Package.TRANSITIONS.MERGE && !self.mediaPackage.mergeRequired)
    ) {

      // Package has not been uploaded yet and request a manual upload
      // Change package state
      if (transition === Package.TRANSITIONS.UPLOAD_MEDIA) {
        self.log('Package is waiting for manual upload');
        self.updateState(self.mediaPackage.id, STATES.WAITING_FOR_UPLOAD, function() {
          self.emit('complete', self.mediaPackage);
        });
      } else
        self.updateState(self.mediaPackage.id, STATES.READY, function() {
          self.emit('complete', self.mediaPackage);
        });
    } else {

      // Continue by executing the next transition in the stack
      var result = self.fsm[transition]();

      if (result && typeof result.then === 'function') {
        result.catch((error) => {
          self.setError(error, transition === Package.TRANSITIONS.INIT);
        });
      }

    }

  });

};

/**
 * Initializes and stores the package.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.initPackage = function() {
  this.log('Init package');

  var self = this;

  return new Promise(function(resolve, reject) {
    self.mediaPackage.state = STATES.PENDING;
    self.mediaPackage.link = null;
    self.mediaPackage.mediaId = null;
    self.mediaPackage.errorCode = ERRORS.NO_ERROR;
    self.mediaPackage.properties = self.mediaPackage.properties || {};
    self.mediaPackage.metadata = self.mediaPackage.metadata || {};
    self.mediaPackage.lastState = Package.STATES.PACKAGE_INITIALIZED;
    self.mediaPackage.lastTransition = Package.TRANSITIONS.COPY_PACKAGE;
    if (self.mediaPackage.date === undefined) self.mediaPackage.date = Date.now();
    self.videoProvider.add([self.mediaPackage], function(addError, total, addedMediaPackages) {
      if (addError) return reject(new PackageError(addError.message, ERRORS.SAVE_PACKAGE_DATA));
      self.emit('stateChanged', self.mediaPackage);
      self.mediaPackage = Object.assign(self.mediaPackage, addedMediaPackages[0]);
      resolve();
    });
  });
};

/**
 * Copies package from its submitted directory to temporary directory.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.copyPackage = function() {
  var self = this;

  return new Promise(function(resolve, reject) {

    // Destination of the copy
    var destinationFilePath = path.join(
      self.packageTemporaryDirectory,
      self.mediaPackage.id + '.' + self.mediaPackage.packageType
    );

    self.updateState(self.mediaPackage.id, STATES.COPYING, function() {

      // Copy package
      self.log('Copy ' + self.mediaPackage.originalPackagePath + ' to ' + destinationFilePath);

      openVeoApi.fileSystem.copy(self.mediaPackage.originalPackagePath, destinationFilePath, function(copyError) {
        if (copyError) reject(new PackageError(copyError.message, ERRORS.COPY));
        else resolve();
      });

    });
  });
};

/**
 * Removes original package.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.removeOriginalPackage = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    async.parallel([

      function(callback) {

        // Try to remove the original package
        self.log('Remove original package ' + self.mediaPackage.originalPackagePath);

        fs.unlink(self.mediaPackage.originalPackagePath, function(error) {
          if (error) callback(new PackageError(error.message, ERRORS.UNLINK));
          else callback();
        });
      }

    ], function(error) {
      if (error) return reject(error);
      else resolve();
    });
  });
};

/**
 * Uploads the media to the media platform.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.uploadMedia = function() {
  var self = this;
  var mediaFilePath;

  return new Promise(function(resolve, reject) {

    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.UPLOADING, callback);
      },

      // Get media file name
      function(callback) {
        if (self.mediaPackage.mediaId && self.mediaPackage.mediaId.length) return callback();

        self.getMediaFilePath(function(error, filePath) {
          if (error) return callback(new PackageError(error.message, ERRORS.UPLOAD_GET_MEDIA_FILE_PATH));
          mediaFilePath = filePath;
          callback();
        });
      },

      // Upload media
      function(callback) {
        if (self.mediaPackage.mediaId && self.mediaPackage.mediaId.length) return callback();

        // Get media plaform provider from package type
        var mediaPlatformProvider = mediaPlatformFactory.get(
          self.mediaPackage.type,
          self.videoPlatformConf[self.mediaPackage.type]
        );

        // Start uploading the media to the platform
        self.log('Upload media ' + mediaFilePath);

        mediaPlatformProvider.upload(mediaFilePath, function(error, id) {
          if (error) return callback(new PackageError(error.message, ERRORS.MEDIA_UPLOAD));

          self.mediaPackage.link = '/publish/video/' + self.mediaPackage.id;
          self.mediaPackage.mediaId = [id];
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
            if (error) return callback(new PackageError(error.message, ERRORS.UPLOAD_MEDIA_UPDATE_PACKAGE));
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
 * Synchronizes uploaded media information with the media platform.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.synchronizeMedia = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.log('Synchronize media');

    self.updateState(self.mediaPackage.id, STATES.SYNCHRONIZING, function() {

      // Get media plaform provider from package type
      var mediaPlatformProvider = mediaPlatformFactory.get(self.mediaPackage.type,
        self.videoPlatformConf[self.mediaPackage.type]);

      // Synchronize media
      mediaPlatformProvider.update(self.mediaPackage, self.mediaPackage, true, function(error) {
        if (error) reject(new PackageError(error.message, ERRORS.MEDIA_SYNCHRONIZE));
        else resolve();
      });

    });
  });
};

/**
 * Removes temporary directory.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.cleanDirectory = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    async.series([

      // Update package state
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.CLEANING, callback);
      },

      // Remove temporary directory
      function(callback) {
        var directoryToRemove = self.packageTemporaryDirectory.replace(
          new RegExp('(.*)/' + self.mediaPackage.temporarySubDirectory),
          '$1'
        );

        self.log('Remove temporary directory ' + directoryToRemove);

        openVeoApi.fileSystem.rmdir(directoryToRemove, function(error) {
          if (error) return callback(new PackageError(error.message, ERRORS.CLEAN_DIRECTORY));
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
 * Initializes merge if a package is found with the same name.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.initMerge = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var packageToLock;

    async.series([

      // Change media state to INITIALIZING_MERGE
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.INITIALIZING_MERGE, callback);
      },

      // Try to find another package with the same name
      function(callback) {
        self.videoProvider.getAll(
          new ResourceFilter().equal('originalFileName', self.mediaPackage.originalFileName),
          null,
          {date: 'desc'},
          function(error, packagesWithSameName) {
            if (error) return callback(new PackageError(error.message, ERRORS.INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME));

            // If this package has been locked then skip merge as only one package with the same name can be merged
            // (and so locked) at a time
            // If one candidate package has been locked then wait for this package to be ready
            // If no candidate package has been locked then choose either package in READY / PUBLISHED state or the
            // older one and lock it
            var defaultPackage;
            var lockedPackage;
            var readyPackage;
            var skipMerge = false;

            packagesWithSameName.forEach(function(packageWithSameName) {
              var isPackageWithSameNameLocked = isLocked(packageWithSameName) ||
                 packageWithSameName.lockedByPackage;

              if (isPackageWithSameNameLocked && packageWithSameName.id === self.mediaPackage.id) {

                // Current package has been locked by another package
                skipMerge = true;

              } else if (isPackageWithSameNameLocked) {

                // Another package has been locked either by this package or another
                lockedPackage = packageWithSameName;

              } else if (packageWithSameName.state === STATES.READY || packageWithSameName.state === STATES.PUBLISHED) {

                // A package is in READY / PUBLISHED state
                readyPackage = packageWithSameName;

              } else if (!defaultPackage && packageWithSameName.id !== self.mediaPackage.id) {

                // Other package with same name is not locked nor in READY / PUBLISHED state
                // Choose it as the default package to lock
                defaultPackage = packageWithSameName;

              }
            });

            packageToLock = lockedPackage || readyPackage || defaultPackage;
            self.mediaPackage.mergeRequired = !skipMerge && packageToLock !== undefined;

            if (self.mediaPackage.mergeRequired) {

              // Lock package if not already locked
              self.lockPackage(packageToLock);

            }

            callback();
          }
        );
      },

      // Set package as package to be merged
      function(callback) {
        if (!self.mediaPackage.mergeRequired) return callback();

        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', self.mediaPackage.id),
          {
            mergeRequired: true
          },
          function(error, totalItems) {
            if (error) {
              return callback(new PackageError(error.message, ERRORS.INIT_MERGE_UPDATE_PACKAGE));
            }
            callback();
          }
        );
      },

      // Wait for the other package to be in READY or PUBLISHED state (so unlocked)
      function(callback) {
        if (!self.mediaPackage.mergeRequired) return callback();

        var expectedStates = [STATES.READY, STATES.PUBLISHED];
        var waitForPackage = function(waitForPackageCallback) {

          if (isLocked(packageToLock) && getLockerId(packageToLock) !== self.mediaPackage.id) {

            // Package has already been locked by another one
            // Wait again for the package to be released
            self.log(
              'Package ' + packageToLock.id + ' already locked by package ' + getLockerId(packageToLock),
              'verbose'
            );

            setTimeout(function() {
              waitForPackage(waitForPackageCallback);
            }, 1000);
            return;
          }

          // Wait for other package to be in READY / PUBLISHED state
          waitForMediaState.call(self, packageToLock, expectedStates, function(error) {
            if (error) {
              return waitForPackageCallback(new PackageError(error.message, ERRORS.INIT_MERGE_WAIT_FOR_MEDIA));
            }

            if (isLocked(packageToLock) && getLockerId(packageToLock) !== self.mediaPackage.id) {

              // Package has already been locked by another one thus its state is going to change soon
              // Wait again for the package to be released and in READY / PUBLISHED state
              self.log(
                'Package ' + packageToLock.id + ' ready but locked by package ' + getLockerId(packageToLock),
                'verbose'
              );
              waitForPackage(waitForPackageCallback);

            } else {

              // Package has not been locked by any other package
              // Lock it
              self.lockPackage(packageToLock);
              waitForPackageCallback();

            }
          });

        };

        if (
          expectedStates.indexOf(packageToLock.state) !== -1 &&
          getLockerId(packageToLock) === self.mediaPackage.id
        ) {

          // Package is already in READY / PUBLISHED state and package has been locked by current package
          return callback();

        } else {

          self.log('Wait for package ' + packageToLock.id + ' to be ready');
          waitForPackage(callback);

        }
      },

      // Lock other package now that it has been released
      function(callback) {
        if (!self.mediaPackage.mergeRequired) return callback();

        self.log('Change package ' + packageToLock.id + ' state to WAITING_FOR_MERGE');

        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', packageToLock.id),
          {
            lockedByPackage: self.mediaPackage.id,
            state: STATES.WAITING_FOR_MERGE
          },
          function(error, totalItems) {
            if (error) {
              return callback(new PackageError(error.message, ERRORS.INIT_MERGE_LOCK_PACKAGE));
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
 * Merges package with the one with the same name.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.merge = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.updateState(self.mediaPackage.id, STATES.MERGING, function(error) {
      if (error) return reject(error);
      resolve();
    });
  });
};

/**
 * Finalizes merge by resetting state of the locked package of the same name.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.finalizeMerge = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var lockedPackage;

    async.series([

      // Change media state to FINALIZING_MERGE
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.FINALIZING_MERGE, callback);
      },

      // Find package locked in WAITING_FOR_MERGE state
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
              return callback(new PackageError(error.message, ERRORS.FINALIZE_MERGE_GET_PACKAGE_WITH_SAME_NAME));
            }

            lockedPackage = foundPackage;
            callback();
          }
        );
      },

      // Reset locked package state and release lock
      // Not that state is reset to READY even if the state was previously PUBLISHED because it requires manual check
      // by the user before publishing the package
      function(callback) {
        self.videoProvider.updateOne(
          new ResourceFilter().equal('id', lockedPackage.id),
          {
            lockedByPackage: null,
            state: STATES.READY
          },
          function(error, totalItems) {
            if (error) {
              return callback(new PackageError(error.message, ERRORS.FINALIZE_MERGE_RELEASE_PACKAGE));
            }

            self.log('Release lock on package ' + Package.lockedPackages[self.mediaPackage.id], 'verbose');
            delete Package.lockedPackages[self.mediaPackage.id];

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
 * Removes the package from OpenVeo but not from the media platform.
 *
 * This is a transition.
 *
 * @async
 * @return {Promise} Promise resolving when transition is done
 */
Package.prototype.removePackage = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    async.series([

      // Change media state to REMOVING
      function(callback) {
        self.updateState(self.mediaPackage.id, STATES.REMOVING, callback);
      },

      // Remove package from OpenVeo
      function(callback) {
        self.videoProvider.removeLocal(new ResourceFilter().equal('id', self.mediaPackage.id), function(error) {
          if (error) return callback(new PackageError(error.message, ERRORS.REMOVE_PACKAGE));
          self.mediaPackage.removed = true;
          callback();
        });
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
Package.prototype.getTransitions = function() {
  return Package.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 */
Package.prototype.getStateMachine = function() {
  return Package.stateMachine;
};

/**
 * Gets the media file path of the package.
 *
 * @return {module:publish/packages/Package~Package~getMediaFilePathCallback} Function to call when its done
 */
Package.prototype.getMediaFilePath = function(callback) {
  callback(null, path.join(
    this.packageTemporaryDirectory,
    this.mediaPackage.id + '.' + this.mediaPackage.packageType
  ));
};

/**
 * Locks given package if not already locked.
 *
 * @param {Object} packageToLock The package to lock
 */
Package.prototype.lockPackage = function(packageToLock) {
  if (isLocked(packageToLock)) return;

  this.log('Lock package ' + packageToLock.id, 'verbose');
  Package.lockedPackages[this.mediaPackage.id] = packageToLock.id;
};

/**
 * Logs given message suffixing it with the package id.
 *
 * @param {String} message The message to log
 * @param {String} [level="debug"] The expected log level
 */
Package.prototype.log = function(message, level) {
  process.logger[level || 'debug'](message, {id: this.mediaPackage.id});
};

/**
 * Sets a package as in error.
 *
 * @param {module:publish/PublishError~PublishError} error The package error
 * @param {boolean} doNotUpdateMedia true to simply emit the error without updating the media
 */
Package.prototype.setError = function(error, doNotUpdateMedia) {
  var self = this;

  // An error occurred
  if (error) {

    if (Package.lockedPackages[this.mediaPackage.id]) {
      this.log('Release lock on package ' + Package.lockedPackages[this.mediaPackage.id], 'verbose');
      delete Package.lockedPackages[this.mediaPackage.id];
    }

    async.parallel([
      function(callback) {
        if (doNotUpdateMedia) return callback();
        self.updateState(self.mediaPackage.id, STATES.ERROR, callback);
      },
      function(callback) {
        if (doNotUpdateMedia) return callback();
        self.videoProvider.updateErrorCode(self.mediaPackage.id, error.code, callback);
      }
    ], function() {
      self.emit('error', error);
    });

  }
};

/**
 * @callback module:publish/packages/Package~Package~getMediaFilePathCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {String} mediaFilePath The path of the media file in temporary directory
 */

/**
 * @callback module:publish/packages/Package~Package~udapteStateCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Number} total The number of udpdated items
 */

/**
 * @callback module:publish/packages/Package~Package~waitForMediaStateCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} media The media with all properties
 */
