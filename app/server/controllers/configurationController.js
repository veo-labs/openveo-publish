'use strict';

/**
 * @module publish-controllers
 */

var path = require('path');
var async = require('async');
var openVeoAPI = require('@openveo/api');
var googleOAuthHelper = process.requirePublish('app/server/helper/googleOAuthHelper.js');
var confDir = path.join(openVeoAPI.fileSystem.getConfDir(), 'publish');
var videoPlatformConf = require(path.join(confDir, 'videoPlatformConf.json'));

/**
 * Retrieves publish plugin configurations.
 */
module.exports.getConfigurationAllAction = function(request, response) {
  var configurations = {};

  async.series([

    // Get Youtube configuration
    function(callback) {
      if (videoPlatformConf['youtube']) {
        var youtubeConf = configurations['youtube'] = {};

        googleOAuthHelper.hasToken(function(hasToken) {
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
    response.send(configurations);
  });
};

/**
 * Redirects action that will be called by google when the user associate our application,
 * a code will be in the parameters.
 */
module.exports.handleGoogleOAuthCodeAction = function(request, response) {
  var code = request.query.code;
  process.logger.debug('Code received ', code);
  googleOAuthHelper.persistTokenWithCode(code, function() {
    response.redirect('/be/publish/configuration');
  });
};
