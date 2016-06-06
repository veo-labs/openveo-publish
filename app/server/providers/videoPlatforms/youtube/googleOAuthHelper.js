'use strict';

var google = require('googleapis');
var path = require('path');
var async = require('async');
var OAuth2 = google.auth.OAuth2;
var openVeoAPI = require('@openveo/api');
var configDir = openVeoAPI.fileSystem.getConfDir();
var publishConf = require(path.join(configDir, 'publish/videoPlatformConf.json'));
var config;
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');

/**
 * Constructs a new helper for google OAuth association and requests.
 */
function GoogleOAuthHelper() {
  if (publishConf.youtube && publishConf.youtube.googleOAuth)
    config = publishConf.youtube.googleOAuth;

  /**
   * Google oauth client library.
   *
   * @property oauth2Client
   * @type OAuth2
   */
  this.oauth2Client = config ? new OAuth2(config.clientId, config.clientSecret, config.redirectUrl) : null;

  /**
   * Configuration model.
   *
   * @property confModel
   * @type ConfigurationModel
   */
  this.confModel = new ConfigurationModel();
}

/**
 * Persists the tokens retrieved from Google.
 *
 * @param {Object} tokens The tokens retrieved from Google
 * @param {Function} [callback] Callback function with :
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The saved token object
 */
GoogleOAuthHelper.prototype.saveToken = function(tokens, callback) {
  var configuration;
  var self = this;
  async.series([

    // Retrieve token information from database
    function(callback) {
      self.confModel.get({googleOAuthTokens: {$ne: null}}, function(error, result) {
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
        callback(error);
        return;
      } else {
        var cb = function(err, addedCount, data) {
          if (err) {
            process.logger.error('Error while saving configuration data', err);
          } else {
            process.logger.debug('Configuration data has been saved');
          }

          if (callback)
            callback(err, tokens);
        };

        if (configuration && configuration.id)
          self.confModel.update(configuration.id, {googleOAuthTokens: tokens}, cb);
        else
          self.confModel.add({googleOAuthTokens: tokens}, cb);
      }
    }
  );
};

/**
 * Retrieves the current token or null if it was not persisted earlier.
 *
 * @param {Function} callback Callback function with :
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The token object
 */
GoogleOAuthHelper.prototype.fetchToken = function(callback) {
  this.confModel.get(null, function(error, result) {

    if (error) {
      process.logger.error('Error while retrieving configuration data', error);
      callback(error);
      return;
    } else if (!result || result.length < 1) {
      callback();
      return;
    } else {
      var conf = result[0];
      process.logger.debug('Configuration id retrieved', result && conf && conf.id);
      var tokens = conf && conf.hasOwnProperty('googleOAuthTokens') ? conf.googleOAuthTokens : null;
      process.logger.debug('Token retrieved from DB', tokens);
      callback(null, tokens);
    }
  });
};

/**
 * Builds the url that will permit to access google association page on the client's browser.
 *
 * @param {Object} options Options to build the url, 'scope' is mandatory
 * @return {String} The url to the google association page
 */
GoogleOAuthHelper.prototype.getAuthUrl = function(options) {
  if (!options.hasOwnProperty('scope')) {
    throw new Error('Please specify the scope');
  }

  var _options = openVeoAPI.util.merge({
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
 * @param {Function} callback Callback function with :
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The token object
 */
GoogleOAuthHelper.prototype.persistTokenWithCode = function(code, callback) {
  var self = this;
  self.oauth2Client.getToken(code, function(err, tokens, response) {
    if (err) {
      process.logger.error('Error while trying to retrieve access token', err);
      process.logger.error(response.body);
      callback(err, null);
    } else if (tokens && Object.keys(tokens).length > 0) {
      process.logger.debug('Token as been retrieved sucessfully', tokens);
      self.saveToken(tokens, callback);
    } else if (callback) {
      callback(null, null);
    }
  });
};

/**
 * Checks whether or not a previous token has been retrieved.
 *
 * @param {Function} callback Callback function with :
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Boolean** true a token exists, false otherwise
 */
GoogleOAuthHelper.prototype.hasToken = function(callback) {
  this.fetchToken(function(error, tokens) {
    callback(error, new Boolean(tokens && Object.keys(tokens).length > 0));
  });
};

/**
 * Retrieves a fresh (=valid) token, if a previous token was set and is still valid it is returned. If this previous
 * token is not valid anymore a new token is retrieved.
 * This function should be used after a previous successfull google association.
 *
 * @param {Function} callback Callback function with :
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** The token object
 */
GoogleOAuthHelper.prototype.getFreshToken = function(callback) {
  var self = this;
  this.fetchToken(function(err, tokens) {
    if (err) {
      process.logger.error('Error while retrieving the token', err);
      callback(err, null);
    } else if (!tokens || Object.keys(tokens).length <= 0) {
      callback(new Error('No token was previously set'), null);
    } else {
      var tokenHasExpired = tokens.expiry_date ? tokens.expiry_date <= (new Date()).getTime() : false;
      if (!tokenHasExpired) {
        process.logger.debug('Token found and up to date');
        callback(null, tokens);
      } else {
        process.logger.debug('Token found but has expired, querying for a new one');

        // hint : the tokens object also contains our refresh token
        self.oauth2Client.setCredentials(tokens);
        self.oauth2Client.refreshAccessToken(function(err, freshTokens) {
          if (err) {
            process.logger.error('Error while trying to refresh the access token', err);
            callback(err, freshTokens);
            return;
          }
          process.logger.debug('Token as been retrieved sucessfully', freshTokens);
          self.saveToken(freshTokens, callback);
        });
      }
    }
  });
};

module.exports = new GoogleOAuthHelper();
