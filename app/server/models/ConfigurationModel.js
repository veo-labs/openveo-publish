'use strict';

/**
 * @module publish-models
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a VideoModel class to manipulate videos.
 *
 * @class VideoModel
 * @constructor
 * @extends EntityModel
 */
function ConfigurationModel() {
  openVeoAPI.EntityModel.prototype.init.call(
          this,
          new openVeoAPI.EntityProvider(openVeoAPI.applicationStorage.getDatabase(), 'configurations')
          );
}

module.exports = ConfigurationModel;
util.inherits(ConfigurationModel, openVeoAPI.EntityModel);
