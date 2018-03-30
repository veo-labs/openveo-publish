'use strict';

/**
 * @module publish
 */

var util = require('util');
var openVeoApi = require('@openveo/api');
var PUBLISH_HOOKS = process.requirePublish('app/server/hooks.js');

/**
 * Defines the Publish Plugin API exposed to other plugins.
 *
 * @class PublishPluginApi
 * @extends PluginApi
 * @constructor
 */
function PublishPluginApi() {
  PublishPluginApi.super_.call(this);
}

module.exports = PublishPluginApi;
util.inherits(PublishPluginApi, openVeoApi.plugin.PluginApi);

/**
 * Gets publish hooks.
 *
 * @method getHooks
 * @return {Object} The publish hooks
 */
PublishPluginApi.prototype.getHooks = function() {
  return PUBLISH_HOOKS;
};
