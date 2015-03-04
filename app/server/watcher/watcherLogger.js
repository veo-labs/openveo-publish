"use strict"

// Module dependencies
var winston = require("winston");

var loggerConf = process.requirePublish("config/loggerConf.json");

// Create logger
winston.loggers.add("watcher", {
  file: {
    level: loggerConf.watcher.level,
    filename: loggerConf.watcher.fileName,
    maxsize : loggerConf.watcher.maxFileSize,
    maxFiles : loggerConf.watcher.maxFiles
  }
});