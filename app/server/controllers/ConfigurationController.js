'use strict';

/**
 * @module controllers
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var GoogleOAuthHelper = process.requirePublish('app/server/providers/mediaPlatforms/youtube/GoogleOAuthHelper.js');
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
 */
function ConfigurationController() {
  ConfigurationController.super_.call(this);
}

module.exports = ConfigurationController;
util.inherits(ConfigurationController, Controller);

/**
 * Retrieves publish plugin configurations.
 *
 * @method getConfigurationAllAction
 * @async
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
    function(callback) {
      configurations['publishDefaultUpload'] = {};
      var settingProvider = process.api.getCoreApi().settingProvider;

      settingProvider.getOne(
        new ResourceFilter().equal('id', 'publish-defaultUpload'),
        null,
        function(error, defaultUploadSettings) {
          if (error) return callback(error);

          configurations['publishDefaultUpload'] = defaultUploadSettings && defaultUploadSettings.value;
          callback();
        }
      );
    }
  ], function(error, results) {
    if (error)
      next(HTTP_ERRORS.GET_CONFIGURATION_ERROR);
    else
      response.send(configurations);
  });
};

/**
 * Redirects action that will be called by google when the user associate our application,
 * a code will be in the parameters.
 *
 * @method handleGoogleOAuthCodeAction
 * @async
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
 * Saves upload configuration.
 *
 * @example
 *
 *     // Response example
 *     {
 *       "setting" : {
 *         "owner": ..., // The id of the owner that will be associated to medias uploaded through the watcher
 *         "group": ... // The id of the content group that will be associated to medias uploaded through the watcher
 *     }
 *
 * @method saveUploadConfiguration
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.body Request's body
 * @param {String} request.body.owner The id of the owner for new uploaded medias
 * @param {String} request.body.group The id of the group for new uploaded medias
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
ConfigurationController.prototype.saveUploadConfiguration = function(request, response, next) {
  if (request.body) {
    var settingProvider = process.api.getCoreApi().settingProvider;
    var parsedBody;

    try {
      parsedBody = utilExt.shallowValidateObject(request.body, {
        owner: {type: 'object', required: true},
        group: {type: 'object', required: true}
      });
    } catch (error) {
      return next(HTTP_ERRORS.SET_CONFIGURATION_WRONG_PARAMETERS);
    }

    settingProvider.add(
      [
        {
          id: 'publish-defaultUpload',
          value: parsedBody
        }
      ], function(error, total, settings) {
      if (error) {
        process.logger.error(error.message, {error: error, method: 'saveUploadConfiguration'});
        next(HTTP_ERRORS.SET_CONFIGURATION_ERROR);
      } else {
        response.send({setting: settings[0].value, total: total});
      }
    });
  } else {

    // Missing body
    next(HTTP_ERRORS.SET_CONFIGURATION_MISSING_PARAMETERS);

  }
};
