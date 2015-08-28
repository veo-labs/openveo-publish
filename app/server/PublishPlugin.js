"use strict"

/**
 * Defines the Publish Plugin that will be loaded by the core application.
 *
 * @module publish-plugin
 */

// Module dependencies
var util = require("util");
var express = require("express");
var openVeoAPI = require("openveo-api");
var watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");

/**
 * Creates a PublishPlugin.
 *
 * @class PublishPlugin
 * @constructor
 * @extends Plugin
 */
function PublishPlugin(){

  // Creates admin and front new routers
  this.router = express.Router();
  this.adminRouter = express.Router();
  this.webServiceRouter = express.Router();
  
  // Define routes directly here or in the configuration file
  
}

module.exports = PublishPlugin;
util.inherits(PublishPlugin, openVeoAPI.Plugin);

/**
 * Starts the watcher when plugin is ready.
 *
 * This is automatically called by core application after plugin is
 * loaded.
 *
 * @method start
 */
PublishPlugin.prototype.start = function(){
  watcherManager.start();
};