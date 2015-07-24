"use strict"

/**
 * @module publish-controllers
 */

/**
 * Provides route actions for all requests relative to the watcher.
 *
 * @class watcherController
 */

// Module files
var watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");

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
 * @static
 */
module.exports.getStatusAction = function(request, response, next){
  response.send({ status : watcherManager.getStatus() });
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
 * @static
 */
module.exports.stopAction = function(request, response, next){
  watcherManager.stop();
  response.send({ status : watcherManager.getStatus() });
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
 * @static
 */
module.exports.startAction = function(request, response, next){
  watcherManager.start();
  response.send({ status : watcherManager.getStatus() });
};