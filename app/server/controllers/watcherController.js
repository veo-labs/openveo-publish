"use strict"

// Module files
var watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");

/**
 * Gets watcher status.
 * Return watcher status as an object 
 *
 * e.g.
 * {
 *   "status" : 1
 * }
 *
 * With status corresponding to codes : 
 *  - 0 Starting
 *  - 1 Started
 *  - 2 Stopping
 *  - 3 Stopped
 */
module.exports.getStatusAction = function(request, response, next){
  response.send({ status : watcherManager.getStatus() });
};

/**
 * Stops watcher if running.
 *
 * e.g.
 * {
 *   "status" : 1
 * }
 *
 * With status corresponding to codes : 
 *  - 0 Starting
 *  - 1 Started
 *  - 2 Stopping
 *  - 3 Stopped 
 */
module.exports.stopAction = function(request, response, next){
  watcherManager.stop();
  response.send({ status : watcherManager.getStatus() });
};

/**
 * Stops watcher if running.
 *
 * e.g.
 * {
 *   "status" : 1
 * }
 *
 * With status corresponding to codes : 
 *  - 0 Starting
 *  - 1 Started
 *  - 2 Stopping
 *  - 3 Stopped 
 */
module.exports.startAction = function(request, response, next){
  watcherManager.start();
  response.send({ status : watcherManager.getStatus() });
};