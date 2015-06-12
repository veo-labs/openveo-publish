"use strict"

// Module dependencies
var winston = require("winston");
var openVeoAPI = require("openveo-api");
var PropertyProvider = openVeoAPI.PropertyProvider;
var applicationStorage = openVeoAPI.applicationStorage;

// Retrieve logger
var logger = winston.loggers.get("openveo");

var propertyProvider = new PropertyProvider(applicationStorage.getDatabase());

/**
 * Gets the list of properties and return it as a JSON object.
 * Returns a JSON object as :
 * {
 *   properties : [
 *     {
 *       "name" : "Name of the property",
 *       "description" : "Description of the property",
 *       "type" : "Type of the property"
 *     }
 *     ...
 *   ]
 * }
 */
module.exports.getPropertiesAction = function(request, response, next){
  propertyProvider.getProperties(function(error, properties){
    if(error){
      logger.error(error && error.message);
      response.status(500);
    }
    else
      response.send({ properties : properties });
  });
};

/**
 * Adds a new property.
 * Expects the following body : 
 * {
 *   "name" : "Name of the property",
 *   "description" : "Description of the property",
 *   "type" : "Type of the property"
 * }
 * Returns the property as a JSON object :
 * {
 *   property : {
 *    "name" : "Name of the property",
 *    "description" : "Description of the property",
 *    "type" : "Type of the property"
 *   }
 * }
 */
module.exports.addPropertyAction = function(request, response, next){
  if(request.body && request.body.name && request.body.description && request.body.type){
    
    var property = {
      id : Date.now(),
      name : request.body.name,
      description : request.body.description,
      type : request.body.type
    };
    
    propertyProvider.addProperty(property, function(error){
      if(error){
        logger.error(error && error.message);
        response.status(500);
      }
      else
        response.send({property  : property});
    });
  }
  else
    response.status(400).send();
};

/**
 * Updates a property.
 * Expects one GET parameter :  
 *  - id The id of the property to update
 * Expects the following body : 
 * {
 *   "name" : "Name of the property",
 *   "description" : "Description of the property",
 *   "type" : "Type of the property"
 * }
 * with name, description and type optional.
 * Returns either an HTTP code 500 if a server error occured, 400
 * if id parameter is not set or 200 if success.
 */
module.exports.updatePropertyAction = function(request, response, next){
  if(request.params.id && request.body){
    var property = {};
    if(request.body.name) property["name"] = request.body.name;
    if(request.body.description) property["description"] = request.body.description;    
    if(request.body.type) property["type"] = request.body.type;
    
    propertyProvider.updateProperty(request.params.id, property, function(error){
      if(error){
        logger.error(error && error.message);
        response.status(500).send();
      }
      else
        response.send();
    });
  }
  else
    response.status(400).send();
};

/**
 * Removes a property.
 * Expects one GET parameter :
 *  - id The id of the property to remove
 * Returns either an HTTP code 500 if a server error occured, 400
 * if id parameter is not set or 200 if success.
 * TODO Also remove this property from all videos ??
 */
module.exports.removePropertyAction = function(request, response, next){
  if(request.params.id){
    propertyProvider.removeProperty(request.params.id, function(error){
      if(error){
        logger.error(error && error.message);
        response.status(500);
      }
      else
        response.send();
    });
  }
  else
    response.status(400).send();
};