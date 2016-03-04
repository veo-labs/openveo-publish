'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;

/**
 * Creates a new ConfigurationHelper to help manipulate configuration without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {ConfigurationModel} model The entity model that will be used by the Helper
 */
function ConfigurationHelper(model) {
  ConfigurationHelper.super_.call(this, model);
}

module.exports = ConfigurationHelper;
util.inherits(ConfigurationHelper, Helper);
