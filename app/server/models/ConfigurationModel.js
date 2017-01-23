'use strict';

/**
 * @module models
 */

var util = require('util');
var openVeoApi = require('@openveo/api');

/**
 * Defines a ConfigurationModel to manipulate configurations.
 *
 * @class ConfigurationModel
 * @extends EntityModel
 * @constructor
 * @param {ConfigurationProvider} provider The entity provider
 */
function ConfigurationModel(provider) {
  ConfigurationModel.super_.call(this, provider);
}

module.exports = ConfigurationModel;
util.inherits(ConfigurationModel, openVeoApi.models.EntityModel);
