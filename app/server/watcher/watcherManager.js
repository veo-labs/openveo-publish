'use strict';

/**
 * Provides functions to manage a watcher sub process.
 *
 * @module publish-watcher
 * @class watcherManager
 */

var path = require('path');
var childProcess = require('child_process');
var openVeoAPI = require('@openveo/api');
var configDir = openVeoAPI.fileSystem.getConfDir();

// Watcher status
module.exports.STARTING_STATUS = 0;
module.exports.STARTED_STATUS = 1;
module.exports.STOPPING_STATUS = 2;
module.exports.STOPPED_STATUS = 3;

var watcher,
  status = this.STOPPED_STATUS;

/**
 * Starts the watcher as a child process if not already started.
 *
 * @method start
 */
module.exports.start = function() {
  var self = this;

  if (!watcher && status === this.STOPPED_STATUS) {

    process.logger.info('Watcher starting');
    status = this.STARTING_STATUS;

    // Executes watcher as a child process
    watcher = childProcess.fork(path.normalize(process.rootPublish + '/app/server/watcher/watcher.js'), [
      '--rootPublish', process.rootPublish,
      '--databaseConf', path.normalize(path.join(configDir, 'core/databaseConf.json')),
      '--anonymousUserId', openVeoAPI.applicationStorage.getAnonymousUserId()
    ]);

    // Listen to messages from child process
    watcher.on('message', function(data) {
      if (data) {
        if (data.status === 'started') {
          process.logger.info('Watcher started');
          status = self.STARTED_STATUS;
        }
      }
    });

    // Handle watcher close event
    watcher.on('close', function() {
      process.logger.info('Watcher stopped');
      status = self.STOPPED_STATUS;
      watcher = null;
    });

    // Kill watcher on node process signal interrupt
    var exit = process.exit;
    process.on('SIGINT', function() {
      if (watcher)
        watcher.disconnect();

      exit(0);
    });

  }
};

/**
 * Stops the watcher if started.
 *
 * @method stop
 */
module.exports.stop = function() {
  if (watcher && status === this.STARTED_STATUS) {
    process.logger.info('Watcher stopping');
    status = this.STOPPING_STATUS;
    watcher.kill('SIGINT');
  }
};

/**
 * Sends a message to the watcher to retry a package.
 *
 * @async
 * @method retryPackage
 * @param {String} id The id of the media to retry
 * @param {Function} callback Function to call when retry is started
 */
module.exports.retryPackage = function(id, callback) {
  if (watcher && status === this.STARTED_STATUS) {

    // Listen to retry message from child process
    watcher.once('message', function(data) {
      if (data && data.action === 'retry')
        callback();
    });

    watcher.send({
      action: 'retry',
      id: id
    });
  }
};

/**
 * Sends a message to the watcher to force uploading a package.
 *
 * @method uploadPackage
 * @param {String} id The id of the media to upload
 * @param {String} platform The name of the platform to upload to
 * @param {Function} callback Function to call when upload is started
 */
module.exports.uploadPackage = function(id, platform, callback) {
  if (watcher && status === this.STARTED_STATUS) {

    // Listen to upload message from child process
    watcher.once('message', function(data) {
      if (data && data.action === 'upload')
        callback();
    });

    watcher.send({
      action: 'upload',
      id: id,
      platform: platform
    });

  }
};

/**
 * Gets watcher status.
 *
 * @method getStatus
 * @return {Number} The watcher status with
 *  - 0 Starting
 *  - 1 Started
 *  - 2 Stopping
 *  - 3 Stopped
 */
module.exports.getStatus = function() {
  return status;
};
