"use scrict"

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");

var PropertyProvider = process.requirePublish("app/server/providers/PropertyProvider.js");

/**
 * Creates a PropertyModel.
 */
function PropertyModel(){
  openVeoAPI.EntityModel.prototype.init.call(this, new PropertyProvider(openVeoAPI.applicationStorage.getDatabase()));
}

module.exports = PropertyModel;
util.inherits(PropertyModel, openVeoAPI.EntityModel);

/**
 * Adds a new property.
 * @param Object data A property object
 * e.g.
 * {
 *   "name" : "Name of the property",
 *   "description" : "Description of the property",
 *   "type" : "Type of the property"
 * }
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
PropertyModel.prototype.add = function(data, callback){
  if(!data.name || !data.description || !data.type){
    callback(new Error("Requires name, description or type to update the property"));
    return;
  }

  var property = {
    id : Date.now().toString(),
    name : data.name,
    description : data.description,
    type : data.type
  };
  
  this.provider.add(property, function(error){
    if(callback)
      callback(error, property);
  });
};

/**
 * Updates property.
 * @param String id The id of the property
 * @param Object data The property with all fields or not
 * e.g.
 * {
 *   "name" : "New property name"
 * }
 * @param Function callback The function to call when it's done
 *   - Error The error if an error occurred, null otherwise
 */
PropertyModel.prototype.update = function(id, data, callback){
  var property = {};
  if(data.name) property["name"] = data.name;
  if(data.description) property["description"] = data.description;    
  if(data.type) property["type"] = data.type;  
  this.provider.update(id, property, callback);
};