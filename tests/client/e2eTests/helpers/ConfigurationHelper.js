'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;

/**
 * Creates a new ConfigurationHelper to help manipulate configuration without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {SettingProvider} provider The settings provider that will be used by the Helper
 */
function ConfigurationHelper(provider) {
  ConfigurationHelper.super_.call(this, provider);
}

module.exports = ConfigurationHelper;
util.inherits(ConfigurationHelper, Helper);
