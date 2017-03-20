'use strict';

/**
 * @module publish
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

  Object.defineProperties(this, {

    /**
     * The publish manager error code.
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
    name: {value: 'PublishError', writable: true}

  });
}

module.exports = PublishError;
util.inherits(PublishError, Error);
