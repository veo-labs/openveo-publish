'use strict';

/**
 * @module publish/PublishPluginApi
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
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about PluginApi
 */
function PublishPluginApi() {
  PublishPluginApi.super_.call(this);
}

module.exports = PublishPluginApi;
util.inherits(PublishPluginApi, openVeoApi.plugin.PluginApi);

/**
 * Gets publish hooks.
 *
 * @return {Object} The publish hooks
 */
PublishPluginApi.prototype.getHooks = function() {
  return PUBLISH_HOOKS;
};
