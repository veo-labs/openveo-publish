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
var EntityController = openVeoAPI.controllers.EntityController;
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');

/**
 * Provides route actions for all requests relative to publish configuration.
 *
 * @class ConfigurationController
 * @constructor
 * @extends EntityController
 */
function ConfigurationController() {
  EntityController.call(this, ConfigurationModel);
}

module.exports = ConfigurationController;
util.inherits(ConfigurationController, EntityController);

/**
 * Retrieves publish plugin configurations.
 */
ConfigurationController.prototype.getConfigurationAllAction = function(request, response, next) {
  var model = new this.Entity(request.user);
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

/**
 * Redirects action that will be called by google when the user associate our application,
 * a code will be in the parameters.
 */
ConfigurationController.prototype.saveUploadConfiguration = function(request, response, next) {
  var model = new this.Entity(request.user);
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
        next(errors.SET_CONFIGURATION_ERROR);
        return;
      } else {
        var cb = function(err, addedCount, data) {
          if (err) {
            process.logger.error('Error while saving configuration data', err);
          } else {
            process.logger.debug('Configuration data has been saved');
          }
          if (error)
            next(errors.SET_CONFIGURATION_ERROR);
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
