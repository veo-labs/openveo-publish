"use strict"

/**
 * Watcher process.
 *
 * **watcher.js** is an independant process and can be run without
 * running openveo publish. By default it is run as a sub process
 * while launching the application server.
 *
 * **watcher.js** can be run as a standalone script or as a child
 * process.
 *
 *     node watcher.js --rootPublish "/home/veo-labs/openveo/node_modules/openveo-publish/app/server/watcher/watcher.js" --databaseConf "/home/veo-labs/openveo/config/databaseConf.json"
 *
 * @module publish-watcher
 * @class watcher.js
 */

// Module dependencies
var path = require("path");
var fs = require("fs");
var util = require("util");
var async = require("async");
var chokidar = require("chokidar");
var winston = require("winston");
var openVeoAPI = require("openveo-api");
var databaseConf;

// Process script arguments
for(var i = 0 ; i < process.argv.length ; i++){

  switch(process.argv[i]){
    case "--rootPublish":
      process.rootPublish = process.argv[i + 1] || null;
    break;
    case "--databaseConf":
      databaseConf = require(path.normalize(process.argv[i + 1])) || null;
    break;    
  }

}

// Validate rootPublish argument
if(!process.rootPublish)
  throw new Error("--rootPublish argument must be passed to the watcher.js script and point to the openveo-publish module root directory");

// Define a function to easily require files inside the module
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

// Module files
var watcherConf = process.requirePublish("config/watcherConf.json");
var publishConf = process.requirePublish("config/publishConf.json");
var videoPlatformConf = process.requirePublish("config/videoPlatformConf.json");
var PublishManager = process.requirePublish("app/server/PublishManager.js");

// Get a logger
var logger = openVeoAPI.logger.get("watcher", process.requirePublish("config/loggerConf.json").watcher);

// hotFolders and videoTmpDir must be defined
if(!watcherConf.hotFolders || !publishConf.videoTmpDir){
  logger.error("You must configure a hot folder and a video temporary directory in watcherConf.json and publishConf.json files");
  return;
}

// hotFolders must be a non empty Array
if(!util.isArray(watcherConf.hotFolders) || !watcherConf.hotFolders.length){
  logger.error("hotFolders property must be an array of objects");
  return;
}

// videoTmpDir must be an String
if(typeof publishConf.videoTmpDir !== "string"){
  logger.error("videoTmpDir property must be a String");
  return;
}

// databaseConf must be an Object
if(typeof databaseConf !== "object"){
  logger.error("--databaseConf argument must point to a JSON file");
  return;
}

// If process is a child process
if(process.connected){
  
  // Exit process if disconnected from its parent
  process.on("disconnect", function(){
    process.exit();
  });

}

// Get a Database instance
var db = openVeoAPI.Database.getDatabase(databaseConf);

// Establish connection to the database
db.connect(function(error){
  
  /**
   * Publishes a package by its name after making sure the
   * file is completely copied to the hot folder.
   * Recursively check file every 10 seconds to know if it has changed
   * or not to be sure file is complete before starting to publish
   * it.
   * TODO Find a better way to know if the file is complete
   * @param String filePath The file of the path to publish
   * @param fs.Stats lastStat Information about the file
   */
  function publishPackage(filePath, lastStat){
    fs.stat(filePath, function(error, stat){

      if(error)
        logger.error(error && error.message, {code : error.code});
      else{

        // Files modification date hasn't change in 10 seconds
        // File is considered complete
        if(lastStat && stat.mtime.getTime() === lastStat.mtime.getTime()){

          // Only files with tar extension are accepted
          if(path.extname(filePath) === ".tar"){
            logger.info("File " + filePath + " has been added to hot folder");
            var dirName = path.dirname(filePath);
            var packageInfo = null;

            // Find the hot folder corresponding in which the file
            // was added
            watcherConf.hotFolders.forEach(function(hotFolder){
              if(path.normalize(hotFolder.path).indexOf(dirName) === 0){
                packageInfo = JSON.parse(JSON.stringify(hotFolder));
                return;
              }
            });

            packageInfo["originalPackagePath"] = filePath;
            publishManager.publish(packageInfo);
          }

        }

        // File modification date has changed, file is not complete yet
        else
          setTimeout(publishPackage, 10000, filePath, stat);
      }
    });
  }

  // Connection to database failed
  if(error){
    logger.error(error && error.message);
    process.exit(0);
  }
  
  // Connection to database done
  else{
    
    // Retrieve the list of hot folders from configuration
    var hotFoldersPaths = [];
    watcherConf.hotFolders.forEach(function(hotFolder){

      if(
        typeof hotFolder === "object" && 
        typeof hotFolder.path === "string"
      )
        hotFoldersPaths.push(path.normalize(hotFolder.path));

    });

    var publishManager = new PublishManager(db, videoPlatformConf, logger);

    // Listen to errors dispatched by the publish manager
    publishManager.on("error", function(error){
      logger.error(error && error.message, {code : error.code});
    });

    // Listen to complete publications dispatched by the publish manager
    publishManager.on("complete", function(videoPackage){
      logger.info("Publish complete for video " + videoPackage.id);
    });
    
    async.filter(hotFoldersPaths, fs.exists, function(results){
      hotFoldersPaths = results;

      // Start watching the hot folders
      var watcher = chokidar.watch(hotFoldersPaths, {
        persistent: true,
        ignoreInitial : true
      });

      // Listen to files added to the hot folder
      watcher.on("add", function(filePath){
        publishPackage(filePath);
      });

      watcher.on("ready", function(){
        logger.info("Initial scan complete. Ready for changes.");

        // If process is a child process
        if(process.connected)
          process.send({"status" : "started"});
      });

      watcher.on("error", function(error){
        logger.error(error && error.message);
      });
    });
    
  }
  
});
