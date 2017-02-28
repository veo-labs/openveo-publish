'use strict';

/**
 * @module controllers
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoApi = require('@openveo/api');
var GoogleOAuthHelper = process.requirePublish('app/server/providers/videoPlatforms/youtube/GoogleOAuthHelper.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var confDir = path.join(openVeoApi.fileSystem.getConfDir(), 'publish');
var videoPlatformConf = require(path.join(confDir, 'videoPlatformConf.json'));
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var ConfigurationProvider = process.requirePublish('app/server/providers/ConfigurationProvider.js');
var EntityController = openVeoApi.controllers.EntityController;

/**
 * Defines a controller to handle actions relative to configuration's routes.
 *
 * @class ConfigurationController
 * @extends EntityController
 * @constructor
 */
function ConfigurationController() {
  ConfigurationController.super_.call(this, ConfigurationModel, ConfigurationProvider);
}

module.exports = ConfigurationController;
util.inherits(ConfigurationController, EntityController);

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
  var model = this.getModel(request);
  var configurations = {};

  async.series([

    // Get Youtube configuration
    function(callback) {
      if (videoPlatformConf['youtube']) {
        var youtubeConf = configurations['youtube'] = {};
        var coreApi = openVeoApi.api.getCoreApi();
        var configurationModel = new ConfigurationModel(new ConfigurationProvider(coreApi.getDatabase()));
        var googleOAuthHelper = new GoogleOAuthHelper(configurationModel);
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
      model.get({publishDefaultUpload: {$ne: null}}, function(error, result) {
        if (error || !result || result.length < 1) {
          callback(error);
          return;
        } else {
          configurations['publishDefaultUpload'] = result[0].publishDefaultUpload;
        }
        callback();
      });
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
  var coreApi = openVeoApi.api.getCoreApi();
  var configurationModel = new ConfigurationModel(new ConfigurationProvider(coreApi.getDatabase()));
  var googleOAuthHelper = new GoogleOAuthHelper(configurationModel);
  process.logger.debug('Code received ', code);
  googleOAuthHelper.persistTokenWithCode(code, function() {
    response.redirect('/be/publish/configuration');
  });
};

/**
 * Saves upload configuration.
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
  var model = this.getModel(request);
  var configuration;
  var body = request.body;
  async.series([

    // Retrieve token information from database
    function(callback) {
      model.get({publishDefaultUpload: {$ne: null}}, function(error, result) {
        if (error || !result || result.length < 1) {
          callback(error);
          return;
        } else {
          configuration = result[0];
        }
        callback();
      });
    }],

    function(error) {
      if (error) {
        next(HTTP_ERRORS.SET_CONFIGURATION_ERROR);
        return;
      } else {
        var cb = function(err, addedCount, data) {
          if (err) {
            process.logger.error('Error while saving configuration data', err);
          } else {
            process.logger.debug('Configuration data has been saved');
          }
          if (error)
            next(HTTP_ERRORS.SET_CONFIGURATION_ERROR);
          else
            response.status(200).send();
        };

        var saveConf = {
          publishDefaultUpload: {
            owner: body.owner,
            group: body.group
          }
        };

        if (configuration && configuration.id)
          model.update(configuration.id, saveConf, cb);
        else
          model.add(saveConf, cb);
      }
    }
    );
};
