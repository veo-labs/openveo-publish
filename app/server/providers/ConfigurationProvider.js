'use strict';

/**
 * @module providers
 */

var util = require('util');
var openVeoApi = require('@openveo/api');

/**
 * Defines a ConfigurationProvider to get and save publish configuration.
 *
 * @class ConfigurationProvider
 * @extends EntityProvider
 * @constructor
 * @param {Database} database The database to interact with
 */
function ConfigurationProvider(database) {
  ConfigurationProvider.super_.call(this, database, 'publish_configurations');
}

module.exports = ConfigurationProvider;
util.inherits(ConfigurationProvider, openVeoApi.providers.EntityProvider);
