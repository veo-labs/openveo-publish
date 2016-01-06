'use strict';

/**
 * Defines the PublishManager which handles all the process in
 * package publication. Package is copied, extracted, interpreted
 * and video is sent to the specified video provider.
 *
 * @example
 *     var openVeoAPI = require("@openveo/api");
 *     var PublishManager = process.requirePublish("app/server/PublishManager.js");
 *     var db = openVeoAPI.applicationStorage.getDatabase();
 *
 *     var publishManager = new PublishManager(db);
 *
 *     // Listen to errors dispatched by the publish manager
 *     publishManager.on("error", function(error){
 *       // Do something
 *     });
 *
 *     // Listen to complete publications dispatched by the publish manager
 *     publishManager.on("complete", function(mediaPackage){
 *       // Do something
 *     });
 *
 *     publishManager.publish({
 *       "type" : "vimeo", // The video platform to use
 *       "originalPackagePath" : "/tmp/video-package.tar" // Path of package to publish
 *     });
 *
 * @module publish-manager
 */

// Module dependencies
var util = require('util');
var events = require('events');
var path = require('path');
var openVeoAPI = require('@openveo/api');
var Package = process.requirePublish('app/server/packages/Package.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var configDir = openVeoAPI.fileSystem.getConfDir();
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));
var errors = process.requirePublish('app/server/packages/errors.js');
var maxConcurrentPublish = publishConf.maxConcurrentPublish || 3;
var acceptedPackagesExtensions = ['tar', 'mp4'];

/**
 * Defines a custom error with an error code.
 *
 * @class PublishError
 * @constructor
 * @extends Error
 * @param {String} message The error message
 * @param {String} code The error code
 */
function PublishError(message, code) {
  this.name = 'PublishError';
  this.message = message || '';
  this.code = code;
}

util.inherits(PublishError, Error);

/**
 * Creates a PublishManager to retrieve, validate and publish
 * a package.
 *
 * @class PublishManager
 * @constructor
 * @param {Database} database A database to store information about
 * the package
 * PublishManager emits the following events :
 *  - Event *error* An error occured
 *    - **Error** The error
 *  - Event *complete* A package was successfully published
 *    - **Object** The published package
 */
function PublishManager(database) {
  openVeoAPI.applicationStorage.setDatabase(database);
  this.queue = [];
  this.pendingPackages = [];
  this.videoModel = new VideoModel();
}

util.inherits(PublishManager, events.EventEmitter);
module.exports = PublishManager;

/**
 * Removes a package from pending packages.
 *
 * @method removeFromPending
 * @private
 * @param {Number} packageId The package id to remove
 */
function removeFromPending(packageId) {
  for (var i = 0; i < this.pendingPackages.length; i++) {
    if (this.pendingPackages[i]['id'] === packageId)
      this.pendingPackages.splice(i, 1);
  }
}

/**
 * Handles Package error event.
 *
 * @method onError
 * @private
 * @param {Error} error The dispatched errors
 * @param {Object} mediaPackage The package on error
 */
function onError(error, mediaPackage) {

  // Remove video from pending videos
  removeFromPending.call(this, mediaPackage.id);

  // Publish pending package from FIFO queue
  if (this.queue.length)
    this.publish(this.queue.shift(0));

  // Add package id to the error message
  if (error)
    error.message += ' (' + mediaPackage.id + ')';

  this.emit('error', error, error.code);
}

/**
 * Handles Package complete event.
 *
 * @method onComplete
 * @private
 * @param {Object} mediaPackage The package on error
 */
function onComplete(mediaPackage) {

  // Remove package from pending packages
  removeFromPending.call(this, mediaPackage.id);

  // Publish pending package from FIFO queue
  if (this.queue.length)
    this.publish(this.queue.shift(0));

  this.emit('complete', mediaPackage);
}

/**
 * Creates a media package manager corresponding to the package type.
 *
 * @method createMediaPackageManager
 * @private
 * @param {Object} mediaPackage The media package to manage
 * @return {Package} A Package manager
 */
function createMediaPackageManager(mediaPackage) {
  var self = this;
  var mediaPackageManager = Package.getPackage(mediaPackage.packageType, mediaPackage);

  // Handle errors from package manager
  mediaPackageManager.on('error', function(error) {
    onError.call(self, error, mediaPackage);
  });

  // Handle complete events from package manager
  mediaPackageManager.on('complete', function(completePackage) {
    onComplete.call(self, completePackage);
  });

  return mediaPackageManager;
}

/**
 * Adds packages to the list of pending packages.
 *
 * @method addPackage
 * @private
 * @param {Object} mediaPackage The package to add to pending packages
 * @return {Boolean} true if the package is successfully to pending packages
 * false if it has been added to queue
 */
function addPackage(mediaPackage) {
  process.logger.debug('Actually ' + this.pendingPackages.length + ' pending packages');

  // Too much pending packages
  if (this.pendingPackages.length >= maxConcurrentPublish) {

    // Add package to queue
    this.queue.push(mediaPackage);
    process.logger.debug('Add package ' + mediaPackage.originalPackagePath + '(' + mediaPackage.id + ') to queue');
    return false;
  } else {

    // Process can deal with the package
    process.logger.debug('Add package ' + mediaPackage.originalPackagePath +
                      '(' + mediaPackage.id + ') to pending packages');

    // Add package to the list of pending packages
    this.pendingPackages.push(mediaPackage);
    return true;
  }
}

/**
 * Tests if package is a valid one depending on the given type.
 *
 * @method isValidPackageType
 * @private
 * @param {String} type The package type
 * @return {Boolean} true if the package is valid false otherwise
 */
function isValidPackageType(type) {
  return acceptedPackagesExtensions.indexOf(type) >= 0;
}

/**
 * Publishes the given package.
 *
 * Package must be one of the supported type.
 *
 * @example
 *     // video package object example
 *     {
 *       "type": "vimeo", // Platform type
 *       "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 *     }
 *
 * @method publish
 * @param {Object} mediaPackage Package to publish
 */
PublishManager.prototype.publish = function(mediaPackage) {
  if (mediaPackage && (typeof mediaPackage === 'object')) {

    // Generate a package id
    mediaPackage.id = Date.now();

    // Defines transitions to perform depending on package extension
    mediaPackage.packageType = path.extname(mediaPackage.originalPackagePath).slice(1);

    // Validate extension
    if (!isValidPackageType(mediaPackage.packageType))
      return this.emit('error', new PublishError('Package type is not valid (' + mediaPackage.packageType + ')',
                                                 errors.INVALID_PACKAGE_TYPE_ERROR));

    var mediaPackageManager = createMediaPackageManager.call(this, mediaPackage);
    mediaPackageManager.init(Package.PACKAGE_SUBMITTED_STATE, Package.INIT_TRANSITION);

    // Package can be added to pending packages
    if (addPackage.call(this, mediaPackage))
      mediaPackageManager.executeTransition(Package.INIT_TRANSITION);
  }
  else
    this.emit('error', new PublishError('mediaPackage argument must be an Object', errors.PACKAGE_NOT_DEFINED_ERROR));
};

/**
 * Retries publishing a package which is on error.
 *
 * @method retry
 * @param {String} packageId The id of the package on error
 */
PublishManager.prototype.retry = function(packageId) {
  if (packageId) {
    var self = this;

    // Retrieve package information
    this.videoModel.getByFilter({id: packageId}, function(error, mediaPackage) {

      // Package does not exist
      if (error || !mediaPackage) {
        self.emit('error', new PublishError('Cannot retry package ' + packageId + ' (not found)',
                                            errors.PACKAGE_NOT_FOUND));
      } else if (mediaPackage.state === VideoModel.ERROR_STATE) {

        // Got package information
        // Package is indeed in error
        self.videoModel.updateState(mediaPackage.id, VideoModel.PENDING_STATE);

        var mediaPackageManager = createMediaPackageManager.call(self, mediaPackage);
        process.logger.info('Retry package ' + mediaPackage.id);
        mediaPackageManager.init(mediaPackage.lastState, mediaPackage.lastTransition);

        // Package can be added to pending packages
        if (addPackage.call(self, mediaPackage))
          mediaPackageManager.executeTransition(mediaPackage.lastTransition);
      }

    });
  }
};

/**
 * Uploads a media blocked in waiting to upload state.
 *
 * @method upload
 * @param {String} packageId The id of the package waiting to be uploaded
 * @param {String} platform The type of the video platform to upload to
 */
PublishManager.prototype.upload = function(packageId, platform) {
  if (packageId && platform) {
    var self = this;

    // Retrieve package information
    this.videoModel.getByFilter({id: packageId}, function(error, mediaPackage) {

      // Package does not exist
      if (error || !mediaPackage) {
        self.emit('error', new PublishError('Cannot upload package ' + packageId + ' (not found)',
                                            errors.PACKAGE_NOT_FOUND));
      } else if (mediaPackage.state === VideoModel.WAITING_FOR_UPLOAD_STATE) {

        // Package is indeed waiting for upload
        self.videoModel.updateState(mediaPackage.id, VideoModel.PENDING_STATE);
        self.videoModel.updateType(mediaPackage.id, platform);

        var mediaPackageManager = createMediaPackageManager.call(self, mediaPackage);
        process.logger.info('Force upload package ' + mediaPackage.id);
        mediaPackage.type = platform;
        mediaPackageManager.init(mediaPackage.lastState, mediaPackage.lastTransition);

        // Package can be added to pending packages
        if (addPackage.call(self, mediaPackage))
          mediaPackageManager.executeTransition(mediaPackage.lastTransition);

      }

    });
  }
};
