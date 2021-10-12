'use strict';

/**
 * @module publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper
 */

var google = require('googleapis').google;
var path = require('path');
var OAuth2 = google.auth.OAuth2;
var openVeoApi = require('@openveo/api');
var configDir = openVeoApi.fileSystem.getConfDir();
var publishConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var config;

/**
 * Defines an helper for google OAuth association and requests.
 *
 * @class GoogleOAuthHelper
 * @constructor
 * @throws {TypeError} If configuration is missing
 */
function GoogleOAuthHelper() {
  if (publishConf.youtube && publishConf.youtube.googleOAuth)
    config = publishConf.youtube.googleOAuth;

  if (!config)
    throw new TypeError('A GoogleOAuthHelper needs a configuration');

  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoohleOAuthHelper */
    {

      /**
       * Google oauth client library.
       *
       * @type {OAuth2}
       * @instance
       * @readonly
       */
      oauth2Client: {
        value: new OAuth2(config.clientId, config.clientSecret, config.redirectUrl)
      }

    }

  );
}

/**
 * Persists the tokens retrieved from Google.
 *
 * @param {Object} tokens The tokens retrieved from Google
 * @param {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~saveTokenCallback}
 * [callback] The function to call when its done
 */
GoogleOAuthHelper.prototype.saveToken = function(tokens, callback) {
  var settingProvider = process.api.getCoreApi().settingProvider;

  settingProvider.add(
    [
      {
        id: 'publish-googleOAuthTokens',
        value: tokens
      }
    ],
    function(error, addedCount, data) {
      if (callback) return callback(error, data[0].value);
      if (error) process.logger.error('Saving token failed with message: ' + error.message, error);
    }
  );
};

/**
 * Retrieves the current token or null if it was not persisted earlier.
 *
 * @param {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~fetchTokenCallback}
 * [callback] The function to
 * call when its done
 */
GoogleOAuthHelper.prototype.fetchToken = function(callback) {
  var settingProvider = process.api.getCoreApi().settingProvider;

  settingProvider.getOne(
    new ResourceFilter().equal('id', 'publish-googleOAuthTokens'),
    null,
    function(error, googleOAuthSettings) {
      if (error) return callback(error);
      callback(null, googleOAuthSettings && googleOAuthSettings.value);
    }
  );
};

/**
 * Builds the url that will permit to access google association page on the client's browser.
 *
 * @param {Object} options Options to build the url, 'scope' is mandatory
 * @return {String} The url to the google association page
 */
GoogleOAuthHelper.prototype.getAuthUrl = function(options) {
  if (!Object.prototype.hasOwnProperty.call(options, 'scope')) {
    throw new Error('Please specify the scope');
  }

  var _options = openVeoApi.util.merge({
    access_type: 'offline', // eslint-disable-line camelcase
    approval_prompt: 'force', // eslint-disable-line camelcase
    response_type: 'code' // eslint-disable-line camelcase
  }, options);

  return this.oauth2Client.generateAuthUrl(_options);
};

/**
 * Retrieves a token from google with an authorization code, this token is then saved for later use and can be
 * retrieved with @see this.fetchToken.
 *
 * @param {String} code The authorization code
 * @param
 * {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~persistTokenWithCodeCallback}
 * [callback] The function to call when its done
 */
GoogleOAuthHelper.prototype.persistTokenWithCode = function(code, callback) {
  var self = this;
  self.oauth2Client.getToken(code, function(error, token, response) {
    if (error) return callback(error);
    else if (token && Object.keys(token).length > 0) {
      process.logger.debug('Token as been retrieved sucessfully', token);
      self.saveToken(token, callback);
    } else if (callback) {
      callback();
    }
  });
};

/**
 * Checks whether or not a previous token has been retrieved.
 *
 * @param {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~hasTokenCallback}
 * [callback] The function to call when its done
 */
GoogleOAuthHelper.prototype.hasToken = function(callback) {
  this.fetchToken(function(error, token) {
    callback(error, token ? true : false);
  });
};

/**
 * Retrieves a fresh (=valid) token, if a previous token was set and is still valid it is returned. If this previous
 * token is not valid anymore a new token is retrieved.
 * This function should be used after a previous successfull google association.
 *
 * @param {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~getFreshTokenCallback}
 * [callback] The function to call when its done
 */
GoogleOAuthHelper.prototype.getFreshToken = function(callback) {
  var self = this;
  this.fetchToken(function(error, token) {
    if (error) return callback(error);
    if (!token) return callback(new Error('No token was previously set'));
    else {
      var tokenHasExpired = token.expiry_date ? token.expiry_date <= (new Date()).getTime() : false;
      if (!tokenHasExpired) {
        process.logger.debug('Token found and up to date');
        callback(null, token);
      } else {
        process.logger.debug('Token found but has expired, querying for a new one');

        // hint: the token object also contains our refresh token
        self.oauth2Client.setCredentials(token);
        self.oauth2Client.refreshAccessToken(function(refreshError, freshToken) {
          if (refreshError) return callback(refreshError, freshToken);

          process.logger.debug('Token as been retrieved sucessfully', freshToken);
          self.saveToken(freshToken, callback);
        });
      }
    }
  });
};

module.exports = GoogleOAuthHelper;

/**
 * @callback module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~saveTokenCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} token The saved token object
 */

/**
 * @callback
 * module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~fetchTokenCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} token The token object
 */

/**
 * @callback
 * module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~persistTokenWithCodeCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} token The token object
 */

/**
 * @callback module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~hasTokenCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Boolean} doesExist true a token exists, false otherwise
 */

/**
 * @callback module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper~getFreshTokenCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Object} token The token object
 */
