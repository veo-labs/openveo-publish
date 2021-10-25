'use strict';

/**
 * @module publish/PublishPlugin
 */

var path = require('path');
var util = require('util');

var async = require('async');
var express = require('express');
var openVeoApi = require('@openveo/api');

var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PublishManager = process.requirePublish('app/server/PublishManager.js');
var PublishPluginApi = process.requirePublish('app/server/PublishPluginApi.js');
var listener = process.requirePublish('app/server/listener.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var fileSystem = openVeoApi.fileSystem;
var ResourceFilter = openVeoApi.storages.ResourceFilter;

var configDir = openVeoApi.fileSystem.getConfDir();
var watcherConf = require(path.join(configDir, 'publish/watcherConf.json'));
var publishConf = require(path.join(configDir, 'publish/publishConf.json'));

/**
 * Defines the Publish Plugin that will be loaded by the core application.
 *
 * @class PublishPlugin
 * @extends Plugin
 * @constructor
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about Plugin
 */
function PublishPlugin() {
  PublishPlugin.super_.call(this);

  Object.defineProperties(this,

    /** @lends module:publish/PublishPlugin~PublishPlugin */
    {

      /**
       * Publish public router.
       *
       * @type {Router}
       * @instance
       * @readonly
       */
      router: {value: express.Router()},

      /**
       * Publish private router.
       *
       * @type {Router}
       * @instance
       * @readonly
       */
      privateRouter: {value: express.Router()},

      /**
       * Publish web service router.
       *
       * @type {Router}
       * @instance
       * @readonly
       */
      webServiceRouter: {value: express.Router()},

      /**
       * Publish APIs.
       *
       * @type {module:publish/PublishPluginApi~PublishPluginApi}
       * @instance
       * @readonly
       */
      api: {value: new PublishPluginApi()}

    }

  );
}

module.exports = PublishPlugin;
util.inherits(PublishPlugin, openVeoApi.plugin.Plugin);

/**
 * Sets listeners on events.
 *
 * @memberof module:publish/PublishPlugin~PublishPlugin
 * @this module:publish/PublishPlugin~PublishPlugin
 * @private
 */
function setListeners() {
  var coreApi = process.api.getCoreApi();
  var CORE_HOOKS = coreApi.getHooks();
  var PUBLISH_HOOKS = this.api.getHooks();
  coreApi.registerAction(CORE_HOOKS.USERS_DELETED, listener.onUsersDeleted);
  coreApi.registerAction(CORE_HOOKS.GROUPS_DELETED, listener.onGroupsDeleted);
  coreApi.registerAction(PUBLISH_HOOKS.PROPERTIES_DELETED, listener.onPropertiesDeleted);
  coreApi.registerAction(PUBLISH_HOOKS.MEDIAS_DELETED, listener.onMediasDeleted);
}

/**
 * Prepares plugin by creating required database indexes.
 *
 * This is automatically called by core application after plugin is loaded.
 *
 * @param {callback} callback Function to call when it's done
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
  setListeners.call(this);

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
 * TODO: When a cache mechanism will be implemented, Publish settings will have to be pulled from cache.
 *
 * @param {callback} callback Function to call when it's done
 */
PublishPlugin.prototype.start = function(callback) {
  var coreApi = process.api.getCoreApi();
  var database = coreApi.getDatabase();
  var videoProvider = new VideoProvider(database);
  var publishManager = PublishManager.get(videoProvider, publishConf.maxConcurrentPackage);

  // Do not start the watcher if the process is the web service
  if (!process.isWebService) {
    var watcher = new openVeoApi.watcher.Watcher();
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

      async.series([

        // Validate file
        function(callback) {
          openVeoApi.util.validateFiles({
            file: packageInfo.originalPackagePath
          }, {
            file: {
              in: [fileSystem.FILE_TYPES.MP4, fileSystem.FILE_TYPES.TAR, fileSystem.FILE_TYPES.ZIP],
              validateExtension: true
            }
          }, function(error, files) {
            if (error || (files.file && !files.file.isValid)) {
              var errorMessage = (error && error.message) ||
                  'Media package type is not valid (' + packageInfo.originalPackagePath + ')';
              process.logger.error(errorMessage, {code: ERRORS.INVALID_PACKAGE_TYPE});
              callback(new Error(errorMessage));
            } else {
              callback(null, files.file.type);
            }
          });
        },

        // Get Publish medias settings
        function(callback) {
          var settingProvider = process.api.getCoreApi().settingProvider;

          settingProvider.getOne(
            new ResourceFilter().equal('id', 'publish-watcher'),
            null,
            function(error, setting) {
              if (error) {
                process.logger.error(
                  'Failed getting media settings with message: "' + (error && error.message) + '"'
                );
              }

              callback(error, setting && setting.value);
            }
          );
        }

      ], function(error, results) {
        if (error) return;

        var packageType = results[0];
        var mediasSettings = results[1];

        packageInfo.packageType = packageType;
        if (mediasSettings) {
          if (mediasSettings.owner) packageInfo.user = mediasSettings.owner;
          if (mediasSettings.group) packageInfo.groups = [mediasSettings.group];
        }
        publishManager.publish(packageInfo);
      });

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
