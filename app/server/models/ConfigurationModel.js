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
 * @param {Object} user The user the entity belongs to
 */
function ConfigurationModel(user) {
  openVeoAPI.EntityModel.call(
          this,
          user,
          new openVeoAPI.EntityProvider(openVeoAPI.applicationStorage.getDatabase(), 'configurations')
          );
}

module.exports = ConfigurationModel;
util.inherits(ConfigurationModel, openVeoAPI.EntityModel);
