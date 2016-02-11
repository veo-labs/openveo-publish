'use strict';

/**
 * @module publish-models
 */

// Module dependencies
var util = require('util');
var shortid = require('shortid');
var openVeoAPI = require('@openveo/api');
var async = require('async');

var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');

/**
 * Defines a PropertyModel class to manipulate custom properties.
 *
 * @class PropertyModel
 * @constructor
 * @extends EntityModel
 */
function PropertyModel() {
  openVeoAPI.EntityModel.prototype.init.call(this, new PropertyProvider(openVeoAPI.applicationStorage.getDatabase()));
  this.videoProvider = new VideoProvider(openVeoAPI.applicationStorage.getDatabase());
}

module.exports = PropertyModel;
util.inherits(PropertyModel, openVeoAPI.EntityModel);

/**
 * Adds a new property.
 *
 * @example
 *     // data example
 *     {
 *       "name" : "Name of the property",
 *       "description" : "Description of the property",
 *       "type" : "Type of the property"
 *     }
 *
 * @method add
 * @async
 * @param {Object} data A property object
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
PropertyModel.prototype.add = function(data, callback) {
  if (!data.name || !data.description || !data.type) {
    callback(new Error('Requires name, description or type to add a property'));
    return;
  }

  var property = {
    id: shortid.generate(),
    name: data.name,
    description: data.description,
    type: data.type
  };

  this.provider.add(property, function(error) {
    if (callback)
      callback(error, property);
  });
};

/**
 * Updates property.
 *
 * @example
 *     // data example
 *     {
 *       "name" : "New property name"
 *     }
 *
 * @method update
 * @async
 * @param {String} id The id of the property
 * @param {Object} data The property with all fields or not
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 */
PropertyModel.prototype.update = function(id, data, callback) {
  var property = {};
  if (data.name)
    property['name'] = data.name;
  if (data.description)
    property['description'] = data.description;
  if (data.type)
    property['type'] = data.type;
  this.provider.update(id, property, callback);
};

/**
 * Removes a property.
 *
 * @method remove
 * @async
 * @param {String} ids The ids of the property
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of removed properties
 */
PropertyModel.prototype.remove = function(ids, callback) {
  var self = this;
  var series = [];

  // Remove property from database
  series.push(
    function(callback) {
      self.provider.remove(ids, function(error, deletedCount) {
        callback(error, deletedCount);
      });
    }
  );

  // Remove property on video
  ids.forEach(function(value) {
    series.push(
      function(callback) {
        var prop = 'properties.' + value;
        self.videoProvider.removeProp(prop, function(error, modifiedCount) {
          callback(error, modifiedCount);
        });
      }
    );
  });

  async.series(series, function(error, results) {
    if (error)
      callback(error);
    else
      callback(null, results[0]);
  });
};
