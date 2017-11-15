'use strict';

var path = require('path');
var util = require('util');
var express = require('express');
var async = require('async');
var openVeoApi = require('@openveo/api');
var Watcher = process.requirePublish('app/server/watcher/Watcher.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var listener = process.requirePublish('app/server/listener.js');

var configDir = openVeoApi.fileSystem.getConfDir();
var watcherConf = require(path.join(configDir, 'publish/watcherConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));

/**
 * Defines the Publish Plugin that will be loaded by the core application.
 *
 * @module publish
 * @main publish
 * @class PublishPlugin
 * @extends Plugin
 * @constructor
 */
function PublishPlugin() {
  PublishPlugin.super_.call(this);

  Object.defineProperties(this, {

    /**
     * Publish public router.
     *
     * @property router
     * @type Router
     * @final
     */
    router: {value: express.Router()},

    /**
     * Publish private router.
     *
     * @property router
     * @type Router
     * @final
     */
    privateRouter: {value: express.Router()},

    /**
     * Publish web service router.
     *
     * @property router
     * @type Router
     * @final
     */
    webServiceRouter: {value: express.Router()}

  });
}

module.exports = PublishPlugin;
util.inherits(PublishPlugin, openVeoApi.plugin.Plugin);

/**
 * Sets listeners on core events.
 *
 * @method setCoreListeners
 * @private
 */
function setCoreListeners() {
  var coreApi = process.api.getCoreApi();
  var CORE_HOOKS = coreApi.getHooks();
  coreApi.registerAction(CORE_HOOKS.USERS_DELETED, listener.onUsersDeleted);
}

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
  var coreApi = process.api.getCoreApi();
  var database = coreApi.getDatabase();
  var asyncFunctions = [];
  var providers = [
    new PropertyProvider(database),
    new VideoProvider(database)
  ];

  // Set event listeners on core and plugins
  setCoreListeners.call(this);

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

  // Do not start the watcher if the process is the web service
  if (!process.isWebService) {
    var coreApi = process.api.getCoreApi();
    var database = coreApi.getDatabase();
    var videoModel = new VideoModel(null, new VideoProvider(database), new PropertyProvider(database));
    var publishManager = PublishManager.get(videoModel, publishConf.maxConcurrentPackage);
    var watcher = new Watcher();
    var hotFoldersPaths = [];

    // Retrieve the list of hot folders paths from configuration
    watcherConf.hotFolders.forEach(function(hotFolder) {
      if (
        typeof hotFolder === 'object' &&
        typeof hotFolder.path === 'string'
      )
        hotFoldersPaths.push(path.normalize(hotFolder.path));
    });

    // Listen to watcher's errors
    watcher.on('error', function(error) {
      process.logger.error(error && error.message, {code: error.code, directoryPath: error.directoryPath});
    });

    // Listen to watcher's new detected files
    watcher.on('create', function(resourcePath) {
      process.logger.info('Watcher detected a new resource : ' + resourcePath);
      var pathDescriptor = path.parse(resourcePath);
      var packageInfo = null;

      // Find the hot folder in which the file was added
      watcherConf.hotFolders.forEach(function(hotFolder) {
        if (path.normalize(pathDescriptor.dir).indexOf(path.normalize(hotFolder.path)) === 0) {
          packageInfo = JSON.parse(JSON.stringify(hotFolder));
          return;
        }
      });

      packageInfo['originalPackagePath'] = resourcePath;
      packageInfo['originalFileName'] = pathDescriptor.name;

      publishManager.publish(packageInfo);
    });

    // Listen publish manager's errors
    publishManager.on('error', function(error) {
      process.logger.error(error && error.message, {code: error.code});
    });

    // Listen to publish manager's end of processing for a media
    publishManager.on('complete', function(mediaPackage) {
      process.logger.info('Publish complete for media ' + mediaPackage.id);
    });

    // Listen to publish manager's event informing that a media processing is retrying
    publishManager.on('retry', function(mediaPackage) {
      process.logger.info('Retry publishing media ' + mediaPackage.id + ' started');
    });

    // Listen to publish manager's event informing that a media, waiting for upload, starts uploading
    publishManager.on('upload', function(mediaPackage) {
      process.logger.info('Force uploading media ' + mediaPackage.id + ' started');
    });

    // Watch hot folders
    watcher.add(hotFoldersPaths, function(results) {
      results.forEach(function(result) {
        if (result.error)
          process.logger.error(result.error && result.error.message);
      });

      // Retry all packages which are not in a stable state
      publishManager.retryAll();

      callback();
    });

  } else
    callback();
};
