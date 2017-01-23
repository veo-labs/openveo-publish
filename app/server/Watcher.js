'use strict';

/**
 * @module publish
 */

var util = require('util');
var events = require('events');
var fs = require('fs');
var chokidar = require('chokidar');
var async = require('async');

/**
 * Fired when watcher status has changed.
 *
 * @event status
 * @param {Number} The watcher status (see Watcher.STATUSES)
 */

/**
 * Fired when an error occurred.
 *
 * @event error
 * @param {Error} The error
 */

/**
 * Fired when a new file has been added to one of the watched folders.
 *
 * @event newFile
 * @param {String} Path of the added file
 */

/**
 * Defines a watcher to be aware of new files added to directories.
 *
 * @class Watcher
 * @constructor
 */
function Watcher() {
  Object.defineProperties(this, {

    /**
     * Watcher's actual status.
     *
     * @property status
     * @type Number
     */
    status: {value: Watcher.STATUSES.STOPPED, writable: true},

    /**
     * The chokidar instance.
     *
     * @property fsWatcher
     * @type FSWatcher
     */
    fsWatcher: {value: null, writable: true}

  });
}

module.exports = Watcher;
util.inherits(Watcher, events.EventEmitter);

/**
 * Watcher's statuses.
 *
 * @property STATUSES
 * @type Object
 * @static
 * @final
 */
Watcher.STATUSES = {
  STARTING: 0,
  STARTED: 1,
  STOPPING: 2,
  STOPPED: 3
};
Object.freeze(Watcher.STATUSES);

/**
 * Sets watcher's status.
 *
 * @method setStatus
 * @private
 * @param {Number} status The new status
 */
function setStatus(status) {
  this.status = status;
  this.emit('status', this.status);
}

/**
 * Starts the watcher if not already started on the given list of directories.
 *
 * @example
 *     var watcher = new Watcher();
 *     watcher.start(['/tmp/hotFolder']);
 *
 * @method start
 * @param {Array} paths The list of paths to watch for new files
 * @throws {Error} Watcher is already started
 */
Watcher.prototype.start = function(paths) {
  var self = this;

  if (self.fsWatcher)
    throw new Error('Watcher already started');

  if (this.status === Watcher.STATUSES.STOPPED) {
    setStatus.call(this, Watcher.STATUSES.STARTING);

    async.filter(paths, fs.stat, function(error, directoriesPaths) {
      if (error)
        return self.emit('error', error);

      // Start watching the hot folders
      self.fsWatcher = chokidar.watch(directoriesPaths, {
        followSymlinks: false,
        awaitWriteFinish: {
          stabilityThreshold: 10000
        }
      });

      // Listen to files added to the hot folder
      self.fsWatcher.on('add', function(filePath) {
        self.emit('newFile', filePath);
      });

      self.fsWatcher.on('ready', function() {
        setStatus.call(self, Watcher.STATUSES.STARTED);
      });

      self.fsWatcher.on('change', function() {
        setStatus.call(self, Watcher.STATUSES.STARTED);
      });

      self.fsWatcher.on('error', function(error) {
        self.emit('error', error);
      });
    });
  }
};

/**
 * Stops the watcher if started.
 *
 * @method stop
 */
Watcher.prototype.stop = function() {
  if (this.fsWatcher && this.status === Watcher.STATUSES.STARTED) {
    setStatus.call(this, Watcher.STATUSES.STOPPING);

    // Stop watcher
    this.fsWatcher.close();

    setStatus.call(this, Watcher.STATUSES.STOPPED);
  }
};

/**
 * Gets watcher status.
 *
 * @method getStatus
 * @return {Number} The watcher status
 */
Watcher.prototype.getStatus = function() {
  return this.status;
};
