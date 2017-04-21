'use strict';

/**
 * @module watcher
 */

var path = require('path');
var util = require('util');
var events = require('events');
var fs = require('fs');
var async = require('async');
var openVeoApi = require('@openveo/api');
var DirectoryFsWatcher = process.requirePublish('app/server/watcher/DirectoryFsWatcher.js');
var WatcherError = process.requirePublish('app/server/watcher/WatcherError.js');

/**
 * Fired when an error occurred.
 *
 * @event error
 * @param {WatcherError} The error
 */

/**
 * Fired when a new resource (file or directory) has been added to the watched folder.
 *
 * @event create
 * @param {String} Path of the added resource
 */

/**
 * Fired when a resource (file or directory) has been deleted from the watched folder.
 *
 * @event delete
 * @param {String} Path of the resource before it has been removed
 */

/**
 * Fired when a directory is added to the watched directory.
 *
 * Fired after "create" event in case the directory is added to the watched directory.
 *
 * @event watch
 * @param {String} Path of the directory
 */

/**
 * Defines a directory watcher to watch for changes inside a directory and its sub directories.
 *
 * @class DirectoryWatcher
 * @constructor
 * @param {Array} directoryPath The absolute path of the directory to watch
 * @param {Object} [options] Watcher options
 * @param {Number} [options.stabilityThreshold] Number of milliseconds to wait before considering a file
 * as stable
 */
function DirectoryWatcher(directoryPath, options) {
  Object.defineProperties(this, {

    /**
     * The absolute path of the watched directory.
     *
     * @property directoryPath
     * @type String
     * @final
     */
    directoryPath: {
      value: path.resolve(directoryPath)
    },

    /**
     * List of watchers for this directory and its sub directories.
     *
     * @property fsWatchers
     * @type Array
     * @final
     */
    fsWatchers: {
      value: []
    },

    /**
     * Watcher options.
     *
     * @property options
     * @type Object
     * @final
     */
    options: {
      value: options
    }

  });
}

module.exports = DirectoryWatcher;
util.inherits(DirectoryWatcher, events.EventEmitter);

/**
 * Checks if a sub directory is actually being watched.
 *
 * @method isWatched
 * @private
 * @param {String} directoryPath The absolute path of the directory to check
 * @return {Boolean} true if directory is actually being watched, false otherwise
 */
function isWatched(directoryPath) {
  directoryPath = path.resolve(directoryPath);

  for (var i = 0; i < this.fsWatchers.length; i++) {
    if (directoryPath === this.fsWatchers[i].directoryPath)
      return true;
  }

  return false;
}

/**
 * Creates a watcher on the given directory.
 *
 * @method createWatcher
 * @private
 * @async
 * @param {String} directoryPath The absolute path of the directory to watch
 * @param {Function} callback The function to call when its done
 *  - **Error** An error if something went wrong
 */
function createWatcher(directoryPath, callback) {

  // Make sure the directory is not already watched before going any further
  if (isWatched.call(this, directoryPath)) return;

  var directoryFsWatcher = new DirectoryFsWatcher(directoryPath, this.options);

  // Listen to new resources in directory or sub directories
  directoryFsWatcher.on('create', (function(resourcePath) {
    this.emit('create', resourcePath);

    // Analyze the new resource to add a watcher on it if it is a directory
    fs.stat(resourcePath, (function(error, stats) {

      // If resource has not been found (ENOENT) it's because, meanwhile, it has been removed
      if (error) {
        if (error.code !== 'ENOENT')
          return this.emit('error', new WatcherError(error.message, error.code, resourcePath));
      } else if (stats.isDirectory())
        createWatcher.call(this, resourcePath);

    }).bind(this));
  }).bind(this));

  // Listen to removed resources
  directoryFsWatcher.on('delete', (function(resourcePath) {

    // Stop watching the resource if it was a directory
    this.close(resourcePath);
    this.emit('delete', resourcePath);
  }).bind(this));

  // Listen to watcher errors
  directoryFsWatcher.on('error', (function(error) {
    this.emit('error', error);
  }).bind(this));

  this.fsWatchers.push(directoryFsWatcher);

  directoryFsWatcher.watch((function(error) {
    if (!error) this.emit('watch', directoryPath);

    callback && callback(error);
  }).bind(this));
}

/**
 * Watches a directory and all its sub directories.
 *
 * @method watch
 * @async
 * @param {Function} callback The function to call when its done
 *  - **Error** An error if something went wrong
 */
DirectoryWatcher.prototype.watch = function(callback) {

  // Get all resources of the directory (recursively)
  openVeoApi.fileSystem.readdir(this.directoryPath, (function(error, resources) {
    if (error) return callback(error);

    var asyncTasks = [];

    // Watch sub directories for changes
    resources.forEach((function(resource) {
      if (resource.isDirectory()) {

        // Resource is a sub directory
        // Watch it
        asyncTasks.push((function(callback) {
          createWatcher.call(this, resource.path, callback);
        }).bind(this));

      }
    }).bind(this));

    // Finally watch the directory itself
    asyncTasks.push((function(callback) {
      createWatcher.call(this, this.directoryPath, callback);
    }).bind(this));

    async.parallel(asyncTasks, callback);
  }).bind(this));

};

/**
 * Stops watching the directory and all its sub directories.
 *
 * @method close
 * @param {String} [directoryPath] Absolute path of the directory to stop watching. If not specified
 * the directory and all its sub directories won't be watched anymore
 */
DirectoryWatcher.prototype.close = function(directoryPath) {
  var index = -1;
  for (var i = 0; i < this.fsWatchers.length; i++) {
    var fsWatcher = this.fsWatchers[i];

    if (directoryPath) {
      if (directoryPath === fsWatcher.directoryPath) {
        index = i;
        fsWatcher.close();
        break;
      }
    } else {
      fsWatcher.close();
    }
  }

  if (directoryPath) {
    if (index > -1) this.fsWatchers.splice(index, 1);
  } else
    this.fsWatchers.splice(0, this.fsWatchers.length);
};
