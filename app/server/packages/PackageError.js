'use strict';

/**
 * @module publish/packages/PackageError
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

  Object.defineProperties(this,

    /** @lends module:publish/packages/PackageError~PackageError */
    {

      /**
       * The package's error code.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      code: {value: code},

      /**
       * Error message.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      message: {value: message, writable: true},

      /**
       * Error name.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      name: {value: 'PackageError', writable: true}

    }

  );
}

module.exports = PackageError;
util.inherits(PackageError, Error);
