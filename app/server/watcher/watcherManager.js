"use strict"

/**
 * Provides functions to manage a watcher sub process.
 *
 * @module publish-watcher
 * @class watcherManager
 */

// Module dependencies
var path = require("path");
var child_process = require("child_process");
var winston = process.requireModule("winston");

// Retrieve logger
var logger = winston.loggers.get("openveo");

// Watcher status
module.exports.STARTING_STATUS = 0;
module.exports.STARTED_STATUS = 1;
module.exports.STOPPING_STATUS = 2;
module.exports.STOPPED_STATUS = 3;

var watcher, status = this.STOPPED_STATUS;

/**
 * Starts the watcher as a child process if not already started.
 *
 * @method start
 */
module.exports.start = function(){
  var self = this;
  
  if(!watcher && status === this.STOPPED_STATUS){

    logger.info("Watcher starting");
    status = this.STARTING_STATUS;
    
    // Executes watcher as a child process
    watcher = child_process.fork(path.normalize(process.rootPublish + "/app/server/watcher/watcher.js"), [
      "--root", process.root,
      "--rootPublish", process.rootPublish,
      "--databaseConf", path.normalize(process.root + "/config/databaseConf.json"),
    ]);

    // Listen to messages from child process
    watcher.on("message", function(data){
      if(data){
        if(data.status === "started"){
          logger.info("Watcher started");
          status = self.STARTED_STATUS;
        }
      }
    });
    
    // Handle watcher close event
    watcher.on("close", function(code){
      logger.info("Watcher stopped");
      status = self.STOPPED_STATUS;
      watcher = null;
    });

  }
};

/**
 * Stops the watcher if started.
 *
 * @method stop
 */
module.exports.stop = function(){
  if(watcher && status === this.STARTED_STATUS){
    logger.info("Watcher stopping");
    status = this.STOPPING_STATUS;
    watcher.kill("SIGINT");
  }
};

/**
 * Gets watcher status.
 *
 * @method getStatus
 * @return {Number} The watcher status with
 *  - 0 Starting
 *  - 1 Started
 *  - 2 Stopping
 *  - 3 Stopped
 */
module.exports.getStatus = function(){
  return status;
};