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

/**
 * Updates property.
 * @param String id The id of the property
 * @param Object property The property with all fields or not
 * e.g.
 * {
 *   "name" : "New property name"
 * }
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
PropertyProvider.prototype.update = function(id, property, callback){
  this.database.update(this.collection, {id : parseInt(id)}, property, callback);
};

/**
 * Removes a property.
 * @param String id The id of the property
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
PropertyProvider.prototype.remove = function(id, callback){
  this.database.remove(this.collection, {id : parseInt(id)}, callback);
};