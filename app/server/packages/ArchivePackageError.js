'use strict';

/**
 * @module publish/packages/ArchivePackageError
 */

var util = require('util');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

/**
 * Defines an error occurring in an archive package's processing.
 *
 * @class ArchivePackageError
 * @extends module:publish/packages/PackageError~PackageError
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 */
function ArchivePackageError(message, code) {
  ArchivePackageError.super_.call(this, message, code);
  this.name = 'ArchivePackageError';
}

module.exports = ArchivePackageError;
util.inherits(ArchivePackageError, PackageError);
