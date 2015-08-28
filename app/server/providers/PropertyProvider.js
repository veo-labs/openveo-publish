"use strict"

/**
 * @module publish-providers
 */

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");

/**
 * Defines a PropertyProvider class to get and save custom properties.
 *
 * @class PropertyProvider
 * @constructor
 * @extends EntityProvider
 * @param Database database The database to interact with
 */
function PropertyProvider(database){
  openVeoAPI.EntityProvider.prototype.init.call(this, database, "properties");
}

module.exports = PropertyProvider;
util.inherits(PropertyProvider, openVeoAPI.EntityProvider);