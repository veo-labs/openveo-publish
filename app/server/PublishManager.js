'use strict';

/**
 * @module publish
 */

var util = require('util');
var events = require('events');
var path = require('path');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var Package = process.requirePublish('app/server/packages/Package.js');
var packageFactory = process.requirePublish('app/server/packages/packageFactory.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PublishError = process.requirePublish('app/server/PublishError.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

var publishManager;

/**
 * Fired when an error occurred while processing a package.
 *
 * @event error
 * @param {Error} The error
 */

/**
 * Fired when a package process has succeed.
 *
 * @event complete
 * @param {Object} The processed package
 */

/**
 * Fired when a media in error restarts.
 *
 * @event retry
 * @param {Object} The media
 */

/**
 * Fired when a media stuck in "waiting for upload" state starts uploading.
 *
 * @event upload
 * @param {Object} The media
 */

/**
 * Fired when media state has changed.
 *
 * @event stateChanged
 * @param {Object} The media
 */

/**
 * Defines the PublishManager which handles the media publication's process.
 *
 * Media publications are handled in parallel. Media publication's process can be
 * different regarding the type of the media.
 *
 * @example
 *     var coreApi = process.api.getCoreApi();
 *     var database = coreApi.getDatabase();
 *     var PublishManager = process.requirePublish('app/server/PublishManager.js');
 *     var videoProvider = new VideoProvider(database);
 *     var publishManager = new PublishManager(videoProvider, 5);
 *
 *     // Listen publish manager's errors
 *     publishManager.on('error', function(error) {
 *       // Do something
 *     });
 *
 *     // Listen to publish manager's end of processing for a media
 *     publishManager.on('complete', function(mediaPackage){
 *       // Do something
 *     });
 *
 *     // Listen to publish manager's event informing that a media processing is retrying
 *     publishManager.on('retry', function(mediaPackage) {
 *       // Do something
 *     });
 *
 *     // Listen to publish manager's event informing that a media, waiting for upload, starts uploading
 *     publishManager.on('upload', function(mediaPackage) {
 *       // Do something
 *     });
 *
 *     publishManager.publish({
 *       type: 'youtube', // The media platform to use for this media
 *       originalPackagePath: '/home/openveo/medias/media-package.tar', // Path of the media package
 *       originalFileName: 'media-package' // File name without extension
 *     });
 *
 * @class PublishManager
 * @constructor
 * @param {VideoProvider} videoProvider The media provider
 * @param {Number} [maxConcurrentPackage=3] The maximum number of medias to treat in parallel
 */
function PublishManager(videoProvider, maxConcurrentPackage) {
  if (publishManager)
    throw new Error('PublishManager already instanciated, use get method instead');

  Object.defineProperties(this, {

    /**
     * Medias waiting to be processed.
     *
     * @property queue
     * @type Array
     * @final
     */
    queue: {value: []},

    /**
     * Medias being processed.
     *
     * @property pendingPackages
     * @type Array
     * @final
     */
    pendingPackages: {value: []},

    /**
     * Media provider.
     *
     * @property videoProvider
     * @type VideoProvider
     * @final
     */
    videoProvider: {value: videoProvider},

    /**
     * Maximum number of medias to treat in parallel.
     *
     * @property maxConcurrentPackage
     * @type Number
     * @final
     */
    maxConcurrentPackage: {value: maxConcurrentPackage || 3}

  });
}

util.inherits(PublishManager, events.EventEmitter);
module.exports = PublishManager;

/**
 * Removes a media from pending medias.
 *
 * @method removeFromPending
 * @private
 * @param {Object} mediaPackage The media package to remove
 */
function removeFromPending(mediaPackage) {
  for (var i = 0; i < this.pendingPackages.length; i++) {
    if (this.pendingPackages[i]['id'] === mediaPackage.id) {
      this.pendingPackages.splice(i, 1);
      break;
    }
  }
  for (var j = 0; j < this.pendingPackages.length; j++) {
    if (this.pendingPackages[j]['originalFileName'] === mediaPackage.originalFileName) {
      this.pendingPackages.splice(j, 1);
      break;
    }
  }
  process.logger.debug('Package ' + mediaPackage.id + ' from ' +
   mediaPackage.originalFileName + ' is removed from pendingPackages');
}

/**
 * Handles media error event.
 *
 * @method onError
 * @private
 * @param {Error} error The error
 * @param {Object} mediaPackage The media on error
 */
function onError(error, mediaPackage) {

  // Remove media from pending medias
  removeFromPending.call(this, mediaPackage);

  // Publish pending media from FIFO queue
  if (this.queue.length)
    this.publish(this.queue.shift(0));

  // Add media id to the error message
  if (error)
    error.message += ' (' + mediaPackage.id + ')';

  this.emit('error', error, error.code);
}

/**
 * Handles media complete event.
 *
 * @method onComplete
 * @private
 * @param {Object} mediaPackage The package on error
 */
function onComplete(mediaPackage) {

  // Remove package from pending packages
  removeFromPending.call(this, mediaPackage);

  // Publish pending package from FIFO queue
  if (this.queue.length)
    this.publish(this.queue.shift(0));

  this.emit('complete', mediaPackage);
}

/**
 * Creates a media package manager corresponding to the media type.
 *
 * @method createMediaPackageManager
 * @private
 * @param {Object} mediaPackage The media to manage
 * @return {Package} A media package manager
 */
function createMediaPackageManager(mediaPackage) {
  var self = this;
  var mediaPackageManager = packageFactory.get(mediaPackage.packageType, mediaPackage);

  // Handle errors from media package manager
  mediaPackageManager.on('error', function(error) {
    onError.call(self, error, mediaPackage);
  });

  // Handle complete events from media package manager
  mediaPackageManager.on('complete', function(completePackage) {
    onComplete.call(self, completePackage);
  });

  // Handle stateChanged events from media package manager
  mediaPackageManager.on('stateChanged', function(mediaPackage) {
    self.emit('stateChanged', mediaPackage);
  });

  return mediaPackageManager;
}

/**
 * Adds media package to the list of pending packages.
 *
 * @method addPackage
 * @private
 * @param {Object} mediaPackage The media package to add to pending packages
 * @return {Boolean} true if the media package is successfully added to pending packages
 * false if it has been added to queue
 */
function addPackage(mediaPackage) {
  process.logger.debug('Actually ' + this.pendingPackages.length + ' pending packages');
  var idAllreadyPending = this.pendingPackages.filter(function(pendingPackage) {
    return mediaPackage.originalFileName === pendingPackage.originalFileName;
  });

  // Too much pending packages
  if (this.pendingPackages.length >= this.maxConcurrentPackage || idAllreadyPending.length) {

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
 * Gets an instance of the PublishManager.
 *
 * @method get
 * @static
 * @param {VideoProvider} videoProvider The media provider
 * @param {Number} [maxConcurrentPackage] The maximum number of medias to treat in parallel
 * @return {PublishManager} The PublishManager singleton instance
 */
PublishManager.get = function(videoProvider, maxConcurrentPackage) {
  if (!publishManager)
    publishManager = new PublishManager(videoProvider);

  return publishManager;
};

/**
 * Publishes the given media package.
 *
 * Media package must be of one of the supported type.
 *
 * @method publish
 * @param {Object} mediaPackage Media to publish
 * @param {String} mediaPackage.originalPackagePath Package absolute path
 * @param {String} mediaPackage.packageType The package type
 * @param {String} [mediaPackage.title] The title to use for this media, default to the file name without extension
 */
PublishManager.prototype.publish = function(mediaPackage) {
  var self = this;

  if (mediaPackage && (typeof mediaPackage === 'object')) {

    // Media package can be in queue and already have an id
    if (!mediaPackage.id) {
      var pathDescriptor = path.parse(mediaPackage.originalPackagePath);
      mediaPackage.id = shortid.generate();
      mediaPackage.title = mediaPackage.title || pathDescriptor.name;
    }

    self.videoProvider.getOne(
      new ResourceFilter().equal('originalPackagePath', mediaPackage.originalPackagePath),
      {
        include: ['id']
      },
      function(error, media) {
        if (error) {
          self.emit('error', new PublishError('Getting media with original package path "' +
                                              mediaPackage.originalPackagePath + '" failed with message : ' +
                                              error.message, ERRORS.UNKNOWN));
        } else if (!media) {

          // Package can be added to pending packages as a new one
          if (addPackage.call(self, mediaPackage)) {

            // Media package does not exist
            // Publish it
            var mediaPackageManager = createMediaPackageManager.call(self, mediaPackage);
            mediaPackageManager.init(Package.STATES.PACKAGE_SUBMITTED, Package.TRANSITIONS.INIT);
            mediaPackageManager.executeTransition(Package.TRANSITIONS.INIT);

          }

        } else if (media.id === mediaPackage.id) {

          // Media already exists
          // Retry media
          self.retry(media.id, true);

        } else {
          self.emit(
            'error',
            new PublishError('Duplicate file "' + mediaPackage.originalPackagePath, ERRORS.DUPLICATE_MEDIA)
          );
        }
      }
    );
  } else
    this.emit('error', new PublishError('mediaPackage argument must be an Object', ERRORS.UNKNOWN));
};

/**
 * Retries publishing a media package which is on error.
 *
 * @method retry
 * @param {String} packageId The id of the package on error
 * @param {Boolean} forceRetry Force retrying a package no matter its state
 */
PublishManager.prototype.retry = function(packageId, forceRetry) {
  if (packageId) {
    var self = this;

    // Retrieve package information
    this.videoProvider.getOne(
      new ResourceFilter().equal('id', packageId),
      null,
      function(error, mediaPackage) {
        if (error) {
          self.emit(
            'error',
            new PublishError(
              'Getting package ' + packageId + ' failed with message : ' + error.message,
              ERRORS.UNKNOWN
            )
          );
        } else if (!mediaPackage) {

          // Package does not exist
          self.emit('error', new PublishError('Cannot retry package ' + packageId + ' (not found)',
                                              ERRORS.PACKAGE_NOT_FOUND));

        } else if (mediaPackage.state === STATES.ERROR || forceRetry) {

          // Got package information
          // Package is indeed in error
          self.videoProvider.updateState(mediaPackage.id, STATES.PENDING, function() {

            // Retry officially started
            self.emit('retry', mediaPackage);
            self.emit('stateChanged', mediaPackage);

          });

          var mediaPackageManager = createMediaPackageManager.call(self, mediaPackage);
          process.logger.info('Retry package ' + mediaPackage.id);
          mediaPackageManager.init(mediaPackage.lastState, mediaPackage.lastTransition);

          // Package can be added to pending packages
          if (addPackage.call(self, mediaPackage))
            mediaPackageManager.executeTransition(mediaPackage.lastTransition);
        }

      }
    );
  }
};

/**
 * Retries publishing all packages in a non stable state.
 *
 * Stable states are :
 * - STATES.ERROR
 * - STATES.WAITING_FOR_UPLOAD
 * - STATES.READY
 * - STATES.PUBLISHED
 *
 * @method retryAll
 */
PublishManager.prototype.retryAll = function() {
  var self = this;

  // Retrieve all packages in a non stable state
  this.videoProvider.getAll(
    new ResourceFilter()
    .notIn('state', [
      STATES.ERROR,
      STATES.WAITING_FOR_UPLOAD,
      STATES.READY,
      STATES.PUBLISHED
    ]),
    null,
    {
      id: 'desc'
    },
    function(error, mediaPackages) {
      if (error)
        return self.emit('error', new PublishError('Getting packages in non stable state failed with message : ' +
                                                   error.message,
                                              ERRORS.UNKNOWN));

      mediaPackages.forEach(function(mediaPackage) {
        self.retry(mediaPackage.id, true);
      });

    }
  );

};

/**
 * Uploads a media blocked in "waiting to upload" state.
 *
 * @method upload
 * @param {String} packageId The id of the package waiting to be uploaded
 * @param {String} platform The type of the video platform to upload to
 */
PublishManager.prototype.upload = function(packageId, platform) {
  if (packageId && platform) {
    var self = this;

    // Retrieve package information
    this.videoProvider.getOne(
      new ResourceFilter().equal('id', packageId),
      null,
      function(error, mediaPackage) {
        if (error) {
          self.emit(
            'error',
            new PublishError(
              'Getting package ' + packageId + ' failed with message : ' + error.message,
              ERRORS.UNKNOWN
            )
          );
        } else if (!mediaPackage) {

          // Package does not exist
          self.emit('error', new PublishError('Cannot upload package ' + packageId + ' (not found)',
                                              ERRORS.PACKAGE_NOT_FOUND));

        } else if (mediaPackage.state === STATES.WAITING_FOR_UPLOAD) {

          // Package is indeed waiting for upload
          self.videoProvider.updateState(mediaPackage.id, STATES.PENDING, function() {

            // Upload officially started
            self.emit('upload', mediaPackage);
            self.emit('stateChanged', mediaPackage);

          });
          self.videoProvider.updateType(mediaPackage.id, platform);

          var mediaPackageManager = createMediaPackageManager.call(self, mediaPackage);
          process.logger.info('Force upload package ' + mediaPackage.id);
          mediaPackage.type = platform;
          mediaPackageManager.init(mediaPackage.lastState, mediaPackage.lastTransition);

          // Package can be added to pending packages
          if (addPackage.call(self, mediaPackage))
            mediaPackageManager.executeTransition(mediaPackage.lastTransition);

        }

      }
    );
  }
};
