'use strict';

/**
 * @module packages
 */

var util = require('util');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

/**
 * Defines an error occurring in a video package's processing.
 *
 * @class VideoPackageError
 * @extends PackageError
 * @constructor
 * @param {String} message The error message
 * @param {String} code The error code
 */
function VideoPackageError(message, code) {
  VideoPackageError.super_.call(this, message, code);
  this.name = 'VideoPackageError';
}

module.exports = VideoPackageError;
util.inherits(VideoPackageError, PackageError);
