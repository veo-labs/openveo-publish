'use strict';

/**
 * @module watcher
 */

var path = require('path');
var util = require('util');
var events = require('events');
var async = require('async');
var DirectoryWatcher = process.requirePublish('app/server/watcher/DirectoryWatcher.js');

/**
 * Fired when an error occurred.
 *
 * @event error
 * @param {WatcherError} The error
 */

/**
 * Fired when a new resource (file or directory) has been added to one of the watched folders.
 *
 * @event create
 * @param {String} Path of the added resource
 */

/**
 * Fired when a resource (file or directory) has been deleted from one of the watched folders.
 *
 * @event delete
 * @param {String} Path of the resource before it has been removed
 */

/**
 * Fired when a directory is added to watched directories.
 *
 * Fired after "create" event in case the directory is added to an already watched directory.
 *
 * @event watch
 * @param {String} Path of the directory
 */

/**
 * Defines a watcher to be aware of new resources added to one or several directories.
 *
 * @example
 *     // Create a new watcher
 *     var watcher = new Watcher();
 *
 *     // Listen to watcher events
 *     watcher.on('create', function(resourcePath) {
 *       console.log('A new file has been added : ' + resourcePath);
 *     });
 *
 *     watcher.on('delete', function(resourcePath) {
 *       console.log('A file has been removed : ' + resourcePath);
 *     });
 *
 *     watcher.on('watch', function(directoryPath) {
 *       console.log('A watcher is now running for directory ' + directoryPath);
 *     });
 *
 *     watcher.on('error', function(error) {
 *       console.log(error);
 *     });
 *
 *     // Ask watcher to watch directories
 *     watcher.add([
 *       '/tmp/hotFolder1',
 *       '/tmp/hotFolder2',
 *       '/tmp/hotFolder3'
 *     ], function(results) {
 *       console.log(results);
 *     });
 *
 *     // Ask watcher to stop watching directories
 *     watcher.remove([
 *       '/tmp/hotFolder3'
 *     ]);
 *
 * @class Watcher
 * @constructor
 * @param {Object} [options] Watcher options
 * @param {Number} [options.stabilityThreshold] Number of milliseconds to wait before considering a file
 * as stable
 */
function Watcher(options) {
  Object.defineProperties(this, {

    /**
     * The list of directories' watchers actually running.
     *
     * @property directoriesWatchers
     * @type Array
     * @final
     */
    directoriesWatchers: {
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

module.exports = Watcher;
util.inherits(Watcher, events.EventEmitter);

/**
 * Checks if a directory is actually being watched.
 *
 * @method isWatched
 * @private
 * @param {String} directoryPath The absolute path of the directory to check
 * @return {Boolean} true if directory is actually being watched, false otherwise
 */
function isWatched(directoryPath) {
  directoryPath = path.resolve(directoryPath);

  for (var i = 0; i < this.directoriesWatchers.length; i++) {
    if (directoryPath === this.directoriesWatchers[i].directoryPath)
      return true;
  }

  return false;
}

/**
 * Adds new directories to watch.
 *
 * @method add
 * @async
 * @param {Array} directoriesPaths The list of absolute directories paths to watch
 * @param {Function} callback The function to call when directories are being watched
 *  - **Array** The list of results with a property "error" if something went wrong
 */
Watcher.prototype.add = function(directoriesPaths, callback) {
  var asyncTasks = [];

  directoriesPaths.forEach((function(directoryPath) {
    asyncTasks.push((function(callback) {
      if (isWatched.call(this, directoryPath))
        return callback(new Error('Directory "' + directoryPath + '" is already being watched'));

      var directoryWatcher = new DirectoryWatcher(directoryPath, this.options);

      directoryWatcher.on('create', (function(resourcePath) {
        this.emit('create', resourcePath);
      }).bind(this));

      directoryWatcher.on('watch', (function(directoryPath) {
        this.emit('watch', directoryPath);
      }).bind(this));

      directoryWatcher.on('delete', (function(resourcePath) {
        this.emit('delete', resourcePath);
      }).bind(this));

      directoryWatcher.on('error', (function(error) {
        this.emit('error', error);
      }).bind(this));

      this.directoriesWatchers.push(directoryWatcher);

      // Watch directory
      directoryWatcher.watch(callback);

    }).bind(this));
  }).bind(this));

  async.parallel(async.reflectAll(asyncTasks), function(error, results) {
    callback(results);
  });
};

/**
 * Stops watching directories.
 *
 * @method remove
 * @param {Array} [directoriesPaths] The list of absolute directories' paths to stop watching. If no directories are
 * specified all watching directories won't be watched anymore
 */
Watcher.prototype.remove = function(directoriesPaths) {
  if (directoriesPaths) {
    directoriesPaths.forEach((function(directoryPath) {
      var index = -1;
      for (var i = 0; i < this.directoriesWatchers.length; i++) {
        var directoryWatcher = this.directoriesWatchers[0];
        if (directoryWatcher.directoryPath === path.resolve(directoryPath)) {
          directoryWatcher.close();
          index = i;
          break;
        }
      }
      if (index > -1)
        this.directoriesWatchers.splice(index, 1);
    }).bind(this));
  } else {
    this.directoriesWatchers.forEach(function(directoryWatcher) {
      directoryWatcher.close();
    });
    this.directoriesWatchers.splice(0, this.directoriesWatchers.length);
  }
};
