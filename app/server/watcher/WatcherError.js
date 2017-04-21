'use strict';

/**
 * @module watcher
 */

var util = require('util');

/**
 * Defines an error occurring while watching for directory changes.
 *
 * @class WatcherError
 * @extends Error
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 * @param {String} directoryPath The absolute path of the directory in error
 */
function WatcherError(message, code, directoryPath) {
  Error.captureStackTrace(this, this.constructor);

  Object.defineProperties(this, {

    /**
     * The fs.FSWatcher's error code.
     *
     * @property code
     * @type String
     * @final
     */
    code: {value: code},

    /**
     * The absolute path of the watched directory the error belongs to.
     *
     * @property directoryPath
     * @type String
     * @final
     */
    directoryPath: {value: directoryPath},

    /**
     * Error message.
     *
     * @property message
     * @type String
     */
    message: {value: message, writable: true},

    /**
     * Error name.
     *
     * @property name
     * @type String
     */
    name: {value: 'WatcherError', writable: true}

  });
}

module.exports = WatcherError;
util.inherits(WatcherError, Error);
