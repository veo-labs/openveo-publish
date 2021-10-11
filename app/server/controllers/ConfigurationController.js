'use strict';

/**
 * @module publish/controllers/ConfigurationController
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var GoogleOAuthHelper = process.requirePublish('app/server/providers/mediaPlatforms/youtube/GoogleOAuthHelper.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var confDir = path.join(openVeoApi.fileSystem.getConfDir(), 'publish');
var videoPlatformConf = require(path.join(confDir, 'videoPlatformConf.json'));
var Controller = openVeoApi.controllers.Controller;
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var utilExt = openVeoApi.util;

/**
 * Defines a controller to handle actions relative to configuration's routes.
 *
 * @class ConfigurationController
 * @extends Controller
 * @constructor
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about Controller
 */
function ConfigurationController() {
  ConfigurationController.super_.call(this);
}

module.exports = ConfigurationController;
util.inherits(ConfigurationController, Controller);

/**
 * Retrieves publish plugin configurations.
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.getConfigurationAllAction = function(request, response, next) {
  var configurations = {};

  async.series([

    // Get Youtube configuration
    function(callback) {
      if (videoPlatformConf['youtube']) {
        var youtubeConf = configurations['youtube'] = {};
        var googleOAuthHelper = new GoogleOAuthHelper();

        googleOAuthHelper.hasToken(function(error, hasToken) {
          if (error) {
            process.logger.error('Error while retrieving Google account token with message : ' + error.message);
            return callback(error);
          }

          youtubeConf.hasToken = hasToken;
          youtubeConf.authUrl = googleOAuthHelper.getAuthUrl(
            {
              scope: [
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.upload'
              ]
            }
          );
          callback();
        });
      } else
        callback();
    },

    // Get catalog configuration
    function(callback) {
      var settingProvider = process.api.getCoreApi().settingProvider;

      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-catalog'),
        null,
        function(error, catalogSettings) {
          if (error) return callback(error);

          configurations['publishCatalog'] = catalogSettings && catalogSettings.value;
          callback();
        }
      );
    },

    // Get Watcher configuration
    function(callback) {
      configurations['publishWatcher'] = {};
      var settingProvider = process.api.getCoreApi().settingProvider;

      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-watcher'),
        null,
        function(error, watcherSettings) {
          if (error) return callback(error);

          configurations['publishWatcher'] = watcherSettings && watcherSettings.value;
          callback();
        }
      );
    },

    // Get TLS configuration
    function(callback) {
      if (!videoPlatformConf['tls']) return callback();

      configurations['publishTls'] = {};
      var settingProvider = process.api.getCoreApi().settingProvider;

      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-tls'),
        null,
        function(error, tlsSettings) {
          if (error) return callback(error);

          configurations['publishTls'] = (tlsSettings && tlsSettings.value) ? tlsSettings.value : {};
          callback();
        }
      );
    }

  ], function(error, results) {
    if (error) {
      process.logger.error(error.message, {error: error, method: 'getConfigurationAllAction'});
      next(HTTP_ERRORS.GET_CONFIGURATION_ERROR);
    } else
      response.send(configurations);
  });
};

/**
 * Redirects action that will be called by google when the user associate our application,
 * a code will be in the parameters.
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.query Request's query
 * @param {String} request.query.code Google authentication code
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.handleGoogleOAuthCodeAction = function(request, response, next) {
  var code = request.query.code;
  var googleOAuthHelper = new GoogleOAuthHelper();

  process.logger.debug('Code received ', code);
  googleOAuthHelper.persistTokenWithCode(code, function(error) {
    if (error)
      process.logger.error('Error while trying to retrieve access token', error);

    response.redirect('/be/publish/configuration');
  });
};

/**
 * Saves watcher settings.
 *
 * @example
 * // Response example
 * {
 *   "settings" : {
 *     "owner": ..., // The id of the owner that will be associated to medias uploaded through the watcher
 *     "group": ... // The id of the content group that will be associated to medias uploaded through the watcher
 *   },
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body Request's body
 * @param {String} request.body.owner The id of the owner for new uploaded medias
 * @param {String} request.body.group The id of the group for new uploaded medias
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.saveWatcherSettings = function(request, response, next) {
  if (request.body) {
    var settingProvider = process.api.getCoreApi().settingProvider;
    var parsedBody;

    try {
      parsedBody = utilExt.shallowValidateObject(request.body, {
        owner: {type: 'string'},
        group: {type: 'string'}
      });

    } catch (error) {
      return next(HTTP_ERRORS.SAVE_WATCHER_SETTINGS_WRONG_PARAMETERS);
    }

    settingProvider.add(
      [
        {
          id: 'publish-watcher',
          value: parsedBody
        }
      ],
      function(error, total, settings) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'saveWatcherSettings'});
          next(HTTP_ERRORS.SAVE_WATCHER_SETTINGS_ERROR);
        } else {
          response.send({settings: settings[0].value, total: total});
        }
      }
    );
  } else {

    // Missing body
    next(HTTP_ERRORS.SAVE_WATCHER_SETTINGS_MISSING_PARAMETERS);

  }
};

/**
 * Saves TLS settings.
 *
 * @example
 * // Response example
 * {
 *   "settings" : {
 *     "properties": ... // The list of custom property ids
 *   },
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body Request's body
 * @param {String} request.body.properties The list of custom property ids
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.saveTlsSettingsAction = function(request, response, next) {
  if (request.body) {
    var coreApi = process.api.getCoreApi();
    var settingProvider = coreApi.settingProvider;
    var customProperties;
    var parsedBody;

    try {
      parsedBody = utilExt.shallowValidateObject(request.body, {
        properties: {type: 'array<string>'}
      });
    } catch (error) {
      return next(HTTP_ERRORS.SAVE_TLS_SETTINGS_WRONG_PARAMETERS);
    }

    if (!parsedBody.properties) parsedBody.properties = [];

    async.series([

      // Get the list of custom properties
      function(callback) {
        var database = coreApi.getDatabase();
        var propertyProvider = new PropertyProvider(database);

        propertyProvider.getAll(null, null, {id: 'desc'}, function(error, properties) {
          if (error) {
            process.logger.error(error.message, {error: error, method: 'saveTlsSettings'});
            return callback(HTTP_ERRORS.SAVE_TLS_SETTINGS_CUSTOM_PROPERTIES_ERROR);
          }

          customProperties = properties;
          callback();
        });
      },

      // Validate custom properties
      function(callback) {
        for (var i = 0; i < parsedBody.properties.length; i++) {
          var found = false;

          for (var j = 0; j < customProperties.length; j++) {
            if (customProperties[j].id === parsedBody.properties[i]) {
              found = true;
              break;
            }
          }

          if (!found) return callback(HTTP_ERRORS.SAVE_TLS_SETTINGS_WRONG_PROPERTIES_PARAMETER);
        }

        callback();
      },

      // Save settings
      function(callback) {
        settingProvider.add(
          [
            {
              id: 'publish-tls',
              value: parsedBody
            }
          ],
          function(error, total, settings) {
            if (error) {
              process.logger.error(error.message, {error: error, method: 'saveTlsSettingsAction'});
              callback(HTTP_ERRORS.SAVE_TLS_SETTINGS_ERROR);
            } else {
              callback(null, total, settings);
            }
          }
        );
      }

    ], function(error, results) {
      if (error) return next(error);
      response.send({settings: results[2][1][0].value, total: results[2][0]});
    });

  } else {

    // Missing body
    next(HTTP_ERRORS.SAVE_TLS_SETTINGS_MISSING_PARAMETERS);

  }
};

/**
 * Saves catalog settings.
 *
 * @example
 * // Response example
 * {
 *   "settings" : {
 *     "refreshInterval": 50 // The refresh interval in seconds
 *   },
 *   "total": 1
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body Request's body
 * @param {Number} request.body.refreshInterval The refresh interval in seconds
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.saveCatalogSettingsAction = function(request, response, next) {
  if (request.body) {
    var coreApi = process.api.getCoreApi();
    var settingProvider = coreApi.settingProvider;
    var parsedBody;

    try {
      parsedBody = utilExt.shallowValidateObject(request.body, {
        refreshInterval: {type: 'number'}
      });
    } catch (error) {
      return next(HTTP_ERRORS.SAVE_CATALOG_SETTINGS_WRONG_PARAMETERS);
    }

    settingProvider.add(
      [
        {
          id: 'publish-catalog',
          value: parsedBody
        }
      ],
      function(error, total, settings) {
        if (error) {
          process.logger.error(error.message, {error: error, method: 'saveCatalogSettingsAction'});
          next(HTTP_ERRORS.SAVE_CATALOG_SETTINGS_ERROR);
        } else {
          response.send({
            settings: settings[0].value,
            total: total
          });
        }
      }
    );
  } else {

    // Missing body
    next(HTTP_ERRORS.SAVE_CATALOG_SETTINGS_MISSING_PARAMETERS);

  }
};
