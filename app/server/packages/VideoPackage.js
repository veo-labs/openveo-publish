'use strict';

/**
 * @module publish-packages
 */

// Module dependencies
var util = require('util');
var Package = process.requirePublish('app/server/packages/Package.js');

/**
 * Defines a VideoPackage class to manage publication of a video file.
 *
 * @example
 *     // video package object example
 *     {
 *       "type": "vimeo", // Platform type
 *       "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 *     }
 *
 * @class VideoPackage
 * @constructor
 * @extends Package
 * @param {Object} mediaPackage Information about the video
 * @param {Object} logger A Winston logger
 */
function VideoPackage(mediaPackage, logger) {
  Package.call(this, mediaPackage, logger);
}

module.exports = VideoPackage;
util.inherits(VideoPackage, Package);
