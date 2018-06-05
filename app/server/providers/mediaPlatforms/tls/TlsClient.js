'use strict';

/**
 * @module providers
 */

var util = require('util');
var RestClient = require('@openveo/rest-nodejs-client').RestClient;

/**
 * Creates a client to connect to TLS web service.
 *
 * @example
 *
 *     const OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
 *     const client = new TlsClient(
 *                 'https://tls-web-service-host/path/to/web/service',
 *                 'access token',
 *                 '/absolute/path/to/full/chain/certificate.crt'
 *     );
 *
 * @class TlsClient
 * @extends RestClient
 * @constructor
 * @param {String} webServiceUrl The complete URL of the TLS web service
 * @param {String} accessToken Access token to authenticate requests to the web service
 * @param {String} [certificate] Absolute path to the web service full chain certificate file
 * @throws {TypeError} Thrown if either webServiceUrl or accessToken is not a valid String
 */
function TlsClient(webServiceUrl, accessToken, certificate) {
  Object.assign(this, new RestClient(webServiceUrl, certificate));

  if (!accessToken || typeof accessToken !== 'string')
    throw new TypeError('Invalid access token: ' + accessToken);

  // Override RestClient accessToken as there is no authentication request for TLS, access token is always the same
  this.accessToken = accessToken;

  Object.defineProperties(this, {

    /**
     * The authenticate request to get an access token.
     *
     * As TLS does not have an authentication request, this is a fake request.
     *
     * @property authenticateRequest
     * @type Object
     * @final
     */
    authenticateRequest: {
      value: {}
    }

  });
}

module.exports = TlsClient;
util.inherits(TlsClient, RestClient);

/**
 * Indicates if client is authenticated to the server.
 *
 * @method isAuthenticated
 * @return {Boolean} true as no authentication is performed on TLS server
 */
TlsClient.prototype.isAuthenticated = function() {
  return true;
};

/**
 * Builds authentication headers.
 *
 * @private
 * @method getAuthenticationHeader
 * @return {Object} The authentication headers to send with each request
 */
TlsClient.prototype.getAuthenticationHeaders = function() {
  return {
    'X-Auth-Key': this.accessToken
  };
};
