'use strict';

/**
 * @module models
 */

var util = require('util');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var async = require('async');

/**
 * Defines a PropertyModel to manipulate properties' entities.
 *
 * @class PropertyModel
 * @extends EntityModel
 * @param {PropertyProvider} propertyProvider The entity provider
 * @param {VideoProvider} videoProvider The video provider
 */
function PropertyModel(propertyProvider, videoProvider) {
  PropertyModel.super_.call(this, propertyProvider);

  Object.defineProperties(this, {

    /**
     * Video provider.
     *
     * @property videoProvider
     * @type VideoProvider
     * @final
     */
    videoProvider: {value: videoProvider}

  });
}

module.exports = PropertyModel;
util.inherits(PropertyModel, openVeoApi.models.EntityModel);

/**
 * Property types.
 *
 * @property TYPES
 * @type Object
 * @static
 * @final
 */
PropertyModel.TYPES = {
  TEXT: 'text',
  LIST: 'list',
  BOOLEAN: 'boolean'
};
Object.freeze(PropertyModel.TYPES);

/**
 * The list of available property types.
 *
 * @property availableTypes
 * @type Array
 * @static
 * @final
 */
PropertyModel.availableTypes = [PropertyModel.TYPES.TEXT, PropertyModel.TYPES.LIST, PropertyModel.TYPES.BOOLEAN];
Object.freeze(PropertyModel.availableTypes);

/**
 * Adds a new property.
 *
 * @method add
 * @async
 * @param {Object} data A property object
 * @param {String} [data.id] The property id
 * @param {String} data.name The property name
 * @param {String} data.description The property description
 * @param {String} data.type The property type (see PropertyModel.TYPES)
 * @param {Array} [data.values] The list of values if data.type = PropertyModel.TYPES.LIST
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total amount of items inserted
 *   - **Object** The inserted property
 */
PropertyModel.prototype.add = function(data, callback) {
  if (!data.name || !data.description || !data.type)
    return callback(new TypeError('Requires name, description and type to add a property'));

  if (PropertyModel.availableTypes.indexOf(data.type) < 0)
    return callback(new TypeError('Invalid property type ' + data.type));

  var property = {
    id: data.id || shortid.generate(),
    name: data.name,
    description: data.description,
    type: data.type
  };

  if (data.type === PropertyModel.TYPES.LIST)
    property.values = data.values || [];

  this.provider.add(property, function(error, addedCount, properties) {
    if (callback)
      callback(error, addedCount, properties && properties[0]);
  });
};

/**
 * Updates property.
 *
 * @method update
 * @async
 * @param {String} id The id of the property
 * @param {Object} data Information to update
 * @param {Object} [data.name] The property name
 * @param {Object} [data.description] The property description
 * @param {Object} [data.type] The property type (see PropertyModel.TYPES)
 * @param {Object} [data.values] The list of values if data.type = PropertyModel.TYPES.LIST
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of updated items
 */
PropertyModel.prototype.update = function(id, data, callback) {
  var property = {};
  if (data.name)
    property.name = data.name;
  if (data.description)
    property.description = data.description;
  if (data.type)
    property.type = data.type;
  if (data.type === PropertyModel.TYPES.LIST)
    property.values = data.values || [];
  else
    property.values = null;

  this.provider.update(id, property, callback);
};

/**
 * Removes properties.
 *
 * @method remove
 * @async
 * @param {String} ids The ids of the properties to remove
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
      self.provider.remove(ids, callback);
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
