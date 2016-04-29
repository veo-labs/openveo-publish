'use strict';

/**
 * @module publish-controllers
 */

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoAPI = require('@openveo/api');
var googleOAuthHelper = process.requirePublish('app/server/providers/videoPlatforms/youtube/googleOAuthHelper.js');
var errors = process.requirePublish('app/server/httpErrors.js');
var confDir = path.join(openVeoAPI.fileSystem.getConfDir(), 'publish');
var videoPlatformConf = require(path.join(confDir, 'videoPlatformConf.json'));
var Controller = openVeoAPI.controllers.Controller;

/**
 * Provides route actions for all requests relative to publish configuration.
 *
 * @class ConfigurationController
 * @constructor
 * @extends Controller
 */
function ConfigurationController() {
  Controller.call(this);
}

module.exports = ConfigurationController;
util.inherits(ConfigurationController, Controller);

/**
 * Retrieves publish plugin configurations.
 */
ConfigurationController.prototype.getConfigurationAllAction = function(request, response, next) {
  var configurations = {};

  async.series([

    // Get Youtube configuration
    function(callback) {
      if (videoPlatformConf['youtube']) {
        var youtubeConf = configurations['youtube'] = {};

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
    }

  ], function(error, results) {
    if (error)
      next(errors.GET_CONFIGURATION_ERROR);
    else
      response.send(configurations);
  });
};

/**
 * Redirects action that will be called by google when the user associate our application,
 * a code will be in the parameters.
 */
ConfigurationController.prototype.handleGoogleOAuthCodeAction = function(request, response) {
  var code = request.query.code;
  process.logger.debug('Code received ', code);
  googleOAuthHelper.persistTokenWithCode(code, function() {
    response.redirect('/be/publish/configuration');
  });
};
