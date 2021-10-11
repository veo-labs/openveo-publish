'use strict';

/**
 * @module publish/providers/mediaPlatforms/tls/TlsClient
 */

var util = require('util');
var RestClient = require('@openveo/rest-nodejs-client').RestClient;

/**
 * Creates a client to connect to TLS web service.
 *
 * @example
 * const OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
 * const client = new TlsClient(
 *             'https://tls-web-service-host/path/to/web/service',
 *             'access token',
 *             '/absolute/path/to/full/chain/certificate.crt'
 * );
 *
 * @class TlsClient
 * @extends RestClient
 * @constructor
 * @param {String} webServiceUrl The complete URL of the TLS web service
 * @param {String} accessToken Access token to authenticate requests to the web service
 * @param {String} [certificate] Absolute path to the web service full chain certificate file
 * @throws {TypeError} Thrown if either webServiceUrl or accessToken is not a valid String
 * @see {@link https://github.com/veo-labs/openveo-rest-nodejs-client|OpenVeo REST NodeJS client documentation} for more information about RestClient
 */
function TlsClient(webServiceUrl, accessToken, certificate) {
  Object.assign(this, new RestClient(webServiceUrl, certificate));

  if (!accessToken || typeof accessToken !== 'string')
    throw new TypeError('Invalid access token: ' + accessToken);

  // Override RestClient accessToken as there is no authentication request for TLS, access token is always the same
  this.accessToken = accessToken;

  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/tls/TlsClient~TlsClient */
    {

      /**
       * The authenticate request to get an access token.
       *
       * As TLS does not have an authentication request, this is a fake request.
       *
       * @type {Object}
       * @instance
       * @readonly
       */
      authenticateRequest: {
        value: {}
      }

    }

  );
}

module.exports = TlsClient;
util.inherits(TlsClient, RestClient);

/**
 * Indicates if client is authenticated to the server.
 *
 * @return {Boolean} true as no authentication is performed on TLS server
 */
TlsClient.prototype.isAuthenticated = function() {
  return true;
};

/**
 * Builds authentication headers.
 *
 * @return {Object} The authentication headers to send with each request
 */
TlsClient.prototype.getAuthenticationHeaders = function() {
  return {
    'X-Auth-Key': this.accessToken
  };
};
