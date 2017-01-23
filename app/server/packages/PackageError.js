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
  PackageError.super_.call(this, message);
  this.name = 'PackageError';

  Object.defineProperties(this, {

    /**
     * The package's error code.
     *
     * @property code
     * @type String
     * @final
     */
    code: {value: code}

  });
}

module.exports = PackageError;
util.inherits(PackageError, Error);
