
'use strict';

/**
 * @module publish-controllers
 */

var util = require('util');
var async = require('async');
var openVeoAPI = require('@openveo/api');
var errors = process.requirePublish('app/server/httpErrors.js');
var watcherManager = process.requirePublish('app/server/watcher/watcherManager.js');
var Controller = openVeoAPI.controllers.Controller;

/**
 * Provides route actions for all requests relative to the watcher.
 *
 * @class WatcherController
 * @constructor
 * @extends Controller
 */
function WatcherController() {
  Controller.call(this);
}

module.exports = WatcherController;
util.inherits(WatcherController, Controller);

/**
 * Retries to publish a video on error.
 *
 * Expects one GET parameter :
 *  - **ids** The list of video ids to retry
 *
 * @method retryVideoAction
 */
WatcherController.prototype.retryVideoAction = function(request, response, next) {
  if (request.params.ids) {
    var ids = request.params.ids.split(',');

    var asyncFunctions = [];
    var retryAsyncFunction = function(id) {
      return function(callback) {
        watcherManager.retryPackage(id, function() {
          callback();
        });
      };
    };

    for (var i = 0; i < ids.length; i++)
      asyncFunctions.push(retryAsyncFunction(ids[i]));

    async.parallel(asyncFunctions, function() {
      response.send();
    });
  } else {

    // Missing type and / or id of the video
    next(errors.RETRY_VIDEO_MISSING_PARAMETERS);

  }
};

/**
 * Starts uploading a video to the media platform.
 *
 * Expects one GET parameter :
 *  - **ids** The list of video ids to upload
 *  - **platform** The name of the platform to upload to
 *
 * @method startUploadAction
 */
WatcherController.prototype.startUploadAction = function(request, response, next) {
  if (request.params.ids && request.params.platform) {
    var ids = request.params.ids.split(',');

    var asyncFunctions = [];
    var uploadAsyncFunction = function(id, platform) {
      return function(callback) {
        watcherManager.uploadPackage(id, platform, function() {
          callback();
        });
      };
    };

    for (var i = 0; i < ids.length; i++)
      asyncFunctions.push(uploadAsyncFunction(ids[i], request.params.platform));

    async.parallel(asyncFunctions, function() {
      response.send();
    });

  } else {

    // Missing platform and / or id of the video
    next(errors.START_UPLOAD_VIDEO_MISSING_PARAMETERS);

  }
};

/**
 * Gets watcher status.
 *
 * Return watcher status as an object.
 *
 * @example
 *     {
 *       "status" : 1
 *     }
 *
 *     // With status corresponding to codes :
 *     //  - 0 Starting
 *     //  - 1 Started
 *     //  - 2 Stopping
 *     //  - 3 Stopped
 *
 * @method getStatusAction
 */
WatcherController.prototype.getStatusAction = function(request, response) {
  response.send({
    status: watcherManager.getStatus()
  });
};

/**
 * Stops watcher if running.
 *
 * @example
 *     {
 *       "status" : 1
 *     }
 *
 *     // With status corresponding to codes :
 *     //  - 0 Starting
 *     //  - 1 Started
 *     //  - 2 Stopping
 *     //  - 3 Stopped
 *
 * @method stopAction
 */
WatcherController.prototype.stopAction = function(request, response) {
  watcherManager.stop();
  response.send({
    status: watcherManager.getStatus()
  });
};

/**
 * Starts watcher if not running.
 *
 * @example
 *     {
 *       "status" : 1
 *     }
 *
 *     // With status corresponding to codes :
 *     //  - 0 Starting
 *     //  - 1 Started
 *     //  - 2 Stopping
 *     //  - 3 Stopped
 *
 * @method startAction
 */
WatcherController.prototype.startAction = function(request, response) {
  watcherManager.start();
  response.send({
    status: watcherManager.getStatus()
  });
};
