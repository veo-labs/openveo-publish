'use strict';

/**
 * Defines the Publish Plugin that will be loaded by the core application.
 *
 * @module publish-plugin
 */

var util = require('util');
var express = require('express');
var async = require('async');
var openVeoAPI = require('@openveo/api');
var watcherManager = process.requirePublish('app/server/watcher/watcherManager.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');

/**
 * Creates a PublishPlugin.
 *
 * @class PublishPlugin
 * @constructor
 * @extends Plugin
 */
function PublishPlugin() {

  /**
   * Publish public router.
   *
   * @property router
   * @type Router
   */
  this.router = express.Router();

  /**
   * Publish private router.
   *
   * @property router
   * @type Router
   */
  this.privateRouter = express.Router();

  /**
   * Publish web service router.
   *
   * @property router
   * @type Router
   */
  this.webServiceRouter = express.Router();

  // Define routes directly here or in the configuration file

}

module.exports = PublishPlugin;
util.inherits(PublishPlugin, openVeoAPI.Plugin);

/**
 * Prepares plugin by creating required database indexes.
 *
 * This is automatically called by core application after plugin is loaded.
 *
 * @method init
 * @async
 * @param {Function} callback Function to call when it's done with :
 *  - **Error** An error if something went wrong, null otherwise
 */
PublishPlugin.prototype.init = function(callback) {
  var database = openVeoAPI.applicationStorage.getDatabase();
  var asyncFunctions = [];
  var providers = [
    new PropertyProvider(database),
    new VideoProvider(database)
  ];

  providers.forEach(function(provider) {
    if (provider.createIndexes) {
      asyncFunctions.push(function(callback) {
        provider.createIndexes(callback);
      });
    }
  });

  async.parallel(asyncFunctions, function(error, results) {
    callback(error);
  });
};

/**
 * Starts the watcher when plugin is ready.
 *
 * This is automatically called by core application after plugin is initialized.
 *
 * @method start
 * @async
 * @param {Function} callback Function to call when it's done with :
 *  - **Error** An error if something went wrong, null otherwise
 */
PublishPlugin.prototype.start = function(callback) {
  if (!process.isWebService)
    watcherManager.start();

  callback();
};
