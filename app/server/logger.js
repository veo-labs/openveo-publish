"use strict"

// Module dependencies
var winston = require("winston");

var loggerConf = process.requirePublish("config/loggerConf.json");

// Create logger
winston.loggers.add("publish", {
  file: {
    level: loggerConf.publish.level,
    filename: loggerConf.publish.fileName,
    maxsize : loggerConf.publish.maxFileSize,
    maxFiles : loggerConf.publish.maxFiles
  }
});