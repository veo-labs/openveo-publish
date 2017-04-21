'use strict';

/**
 * @module watcher
 */

var path = require('path');
var util = require('util');
var events = require('events');
var fs = require('fs');
var WatcherError = process.requirePublish('app/server/watcher/WatcherError.js');

/**
 * Fired when an error occurred.
 *
 * @event error
 * @param {WatcherError} The error
 */

/**
 * Fired when a new resource (file or directory) has been added to the directory.
 *
 * @event create
 * @param {String} Path of the added resource
 */

/**
 * Fired when a resource (file or directory) has been deleted from the directory.
 *
 * @event delete
 * @param {String} Path of the resource before it has been removed
 */

/**
 * Defines a directory watcher which is a wrapper around Node.js fs.watch.
 *
 * fs.watch only emit "change" and "rename" events, nothing more.
 * This class intends to make it more user friendly by emitting more understandable events like "create" or "delete".
 *
 * It analyzes only "rename" events, "change" events are not constant between Linux and Windows systems.
 * On both Linux and Windows systems :
 * When a file is added a "rename" event is emitted followed by a "change" event
 * When a file is renamed a "rename" event is emitted twice (one for the removal and one for the addition)
 * When a file is removed a "rename" event is emitted
 *
 * To work through this behaviour, a snapshot of the directory is made each time a "rename" event is fired.
 * Then new resources inside the directory are compared to the snapshot to find out which resource has been
 * added or removed.
 *
 * If a "rename" event is emitted while the directory is being analyzed, directory will be analyzed again making every
 * "rename" event count.
 *
 * @class DirectoryFsWatcher
 * @constructor
 * @param {Array} directoryPath The absolute path of the directory to watch
 * @param {Object} [options] Watcher options
 * @param {Number} [options.stabilityThreshold] Number of milliseconds to wait before considering a file
 * as stable
 */
function DirectoryFsWatcher(directoryPath, options) {
  options = options || {};
  options.stabilityThreshold = options.stabilityThreshold > 0 ? options.stabilityThreshold : 10000;

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
     * Watcher options.
     *
     * @property options
     * @type Object
     * @final
     */
    options: {
      value: options
    },

    /**
     * The number of "rename" events which haven't been treated yet.
     *
     * @property pendingEventsCounter
     * @type Number
     */
    pendingEventsCounter: {
      value: 0,
      writable: true
    },

    /**
     * The resources inside the directory with the resource path as the key and true as the value.
     *
     * The snapshot represents the current content of the directory and will be updated after each "rename" event.
     *
     * @property snapshot
     * @type Object
     */
    snapshot: {
      value: {},
      writable: true
    },

    /**
     * The Node.js directory watcher.
     *
     * @property fsWatcher
     * @type fs.FSWatcher
     */
    fsWatcher: {
      value: null,
      writable: true
    }

  });
}

module.exports = DirectoryFsWatcher;
util.inherits(DirectoryFsWatcher, events.EventEmitter);

/**
 * Waits for the resource to be fully written.
 *
 * @method awaitWriteFinish
 * @private
 * @param {String} resourcePath The absolute path of the resource to wait for
 * @param {fs.Stats} [lastStat] Last information about the resource
 */
function awaitWriteFinish(resourcePath, lastStat) {
  fs.stat(resourcePath, (function(error, stat) {

    // If resource has not been found (ENOENT) it's because, meanwhile, it has been removed
    if (error) {
      if (error.code !== 'ENOENT')
        return this.emit('error', new WatcherError(error.message, error.code, resourcePath));
    } else if (stat.isDirectory()) {

      // Resource is a directory, no need to wait
      this.emit('create', resourcePath);

    } else if (lastStat && stat.size === lastStat.size && stat.mtime.getTime() === lastStat.mtime.getTime()) {

      // Modification time has not changed since 10 seconds
      // Consider file has written
      this.emit('create', resourcePath);

    } else {

      // Await 10 seconds to be sure it is fully written
      setTimeout(awaitWriteFinish.bind(this), this.options.stabilityThreshold, resourcePath, stat);

    }

  }).bind(this));
}

/**
 * Interprets a "rename" event.
 *
 * If "rename" event corresponds to an addition, a "create" event will be fired.
 * If "rename" event corresponds to a removal, a "delete" event will be fired.
 *
 * @method interpretRename
 * @private
 * @async
 */
function interpretRename() {

  // It takes some time for the fs.FSWatcher to really stop firing events after a close
  // Do not interpret events anymore if watcher has been closed
  if (!this.fsWatcher) return;

  // Queue "rename" events to not miss any while reading the directory
  this.pendingEventsCounter++;

  fs.readdir(this.directoryPath, (function(error, resources) {
    var newSnapshot = {};
    if (error && error.code !== 'EPERM')
      return this.emit('error', new WatcherError(error.message, error.code, this.directoryPath));

    // Compare resources with the snapshot
    resources.forEach((function(resource) {

      // Create the new snapshot
      newSnapshot[resource] = true;

      if (this.snapshot[resource]) {

        // Resource was already there
        // Mark it as removed

        delete this.snapshot[resource];

      } else {

        // New resource

        awaitWriteFinish.call(this, path.join(this.directoryPath, resource));
      }
    }).bind(this));

    // All remaining resources in the previous snapshot are resources which have been removed
    for (var resource in this.snapshot)
      this.emit('delete', path.join(this.directoryPath, resource));

    // Save new snapshot
    this.snapshot = newSnapshot;

    this.pendingEventsCounter--;

    // If another "rename" event was fired while interpreting, interpret again
    if (this.pendingEventsCounter)
      interpretRename.call(this);
  }).bind(this));
}

/**
 * Watches the directory.
 *
 * @method watch
 * @async
 * @param {Function} callback The function to call when its starts listening to changes
 *  - **Error** An error if something went wrong
 */
DirectoryFsWatcher.prototype.watch = function(callback) {
  if (this.fsWatcher) this.close();

  fs.readdir(this.directoryPath, (function(error, resources) {
    if (error) return callback(error);

    // New directory being watched
    // Emit a "create" event for all its resources and create a snapshot
    resources.forEach((function(resource) {
      this.snapshot[resource] = true;
      awaitWriteFinish.call(this, path.join(this.directoryPath, resource));
    }).bind(this));

    this.fsWatcher = fs.watch(this.directoryPath, {persistent: false});

    this.fsWatcher.on('change', (function(type) {
      if (type === 'rename') {

        // Read dir to find out what have changed
        interpretRename.call(this);

      }
    }).bind(this));

    this.fsWatcher.on('error', (function(error) {

      // EPERM errors are fired when directory has been removed while the watcher is still running
      // This is due to fs.FSWatcher.close() which is not immediate
      if (error.code !== 'EPERM')
        this.emit('error', new WatcherError(error.message, error.code, this.directoryPath));
    }).bind(this));

    callback();
  }).bind(this));
};

/**
 * Stops watching the directory.
 *
 * @method close
 */
DirectoryFsWatcher.prototype.close = function() {
  if (this.fsWatcher) {
    this.fsWatcher.close();
    this.fsWatcher = null;
  }
};
