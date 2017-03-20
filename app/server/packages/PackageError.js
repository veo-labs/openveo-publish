'use strict';

/**
 * @module packages
 */

var util = require('util');

/**
 * Defines an error occurring in a package's processing.
 *
 * @class PackageError
 * @extends Error
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 */
function PackageError(message, code) {
  Error.captureStackTrace(this, this.constructor);

  Object.defineProperties(this, {

    /**
     * The package's error code.
     *
     * @property code
     * @type String
     * @final
     */
    code: {value: code},

    /**
     * Error message.
     *
     * @property message
     * @type String
     * @final
     */
    message: {value: message, writable: true},

    /**
     * Error name.
     *
     * @property name
     * @type String
     * @final
     */
    name: {value: 'PackageError', writable: true}

  });
}

module.exports = PackageError;
util.inherits(PackageError, Error);
