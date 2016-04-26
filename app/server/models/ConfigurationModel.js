'use strict';

/**
 * @module publish-models
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a ConfigurationModel class to manipulate configurations.
 *
 * @class ConfigurationModel
 * @constructor
 * @extends EntityModel
 */
function ConfigurationModel() {
  openVeoAPI.EntityModel.call(
          this,
          new openVeoAPI.EntityProvider(openVeoAPI.applicationStorage.getDatabase(), 'configurations')
          );
}

module.exports = ConfigurationModel;
util.inherits(ConfigurationModel, openVeoAPI.EntityModel);
