"use scrict"

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");

/**
 * Creates a PropertyProvider.
 * @param Database database The database to interact with
 */
function PropertyProvider(database){
  openVeoAPI.EntityProvider.prototype.init.call(this, database, "properties");
}

module.exports = PropertyProvider;
util.inherits(PropertyProvider, openVeoAPI.EntityProvider);