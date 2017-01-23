'use strict';

/**
 * @module packages
 */

var util = require('util');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

/**
 * Defines an error occurring in a tar package's processing.
 *
 * @class TarPackageError
 * @extends PackageError
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 */
function TarPackageError(message, code) {
  TarPackageError.super_.call(this, message, code);
  this.name = 'TarPackageError';
}

module.exports = TarPackageError;
util.inherits(TarPackageError, PackageError);
