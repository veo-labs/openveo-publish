"use strict"

// Module dependencies
var path = require("path");

// Set module root directory
process.rootPublish = __dirname;
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

// Start the watcher
var watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");
watcherManager.start();

module.exports = process.requirePublish("app/server/PublishPlugin.js");