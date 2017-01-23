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
  PublishError.super_.call(this, message);
  this.name = 'PublishError';

  Object.defineProperties(this, {

    /**
     * The publish manager error code.
     *
     * @property code
     * @type String
     * @final
     */
    code: {value: code}

  });
}

module.exports = PublishError;
util.inherits(PublishError, Error);
