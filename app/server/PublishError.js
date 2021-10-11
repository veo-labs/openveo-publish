'use strict';

/**
 * @module publish/PublishError
 */

var util = require('util');

/**
 * Defines an error occurring in publish manager.
 *
 * @class PublishError
 * @extends Error
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 */
function PublishError(message, code) {
  Error.captureStackTrace(this, this.constructor);

  Object.defineProperties(this,

    /** @lends module:publish/PublishError~PublishError */
    {

      /**
       * The publish manager error code.
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
       */
      message: {value: message, writable: true},

      /**
       * Error name.
       *
       * @type {String}
       * @instance
       */
      name: {value: 'PublishError', writable: true}

    }

  );
}

module.exports = PublishError;
util.inherits(PublishError, Error);
