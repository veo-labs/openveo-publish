'use strict';

/**
 * @module publish/providers/PropertyProvider
 */

var util = require('util');
var async = require('async');
var nanoid = require('nanoid').nanoid;
var openVeoApi = require('@openveo/api');

/**
 * Defines a PropertyProvider to get and save custom properties.
 *
 * @class PropertyProvider
 * @extends EntityProvider
 * @constructor
 * @param {Database} database The database to interact with
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about EntityProvider or Database
 */
function PropertyProvider(database) {
  PropertyProvider.super_.call(this, database, 'publish_properties');
}

module.exports = PropertyProvider;
util.inherits(PropertyProvider, openVeoApi.providers.EntityProvider);

/**
 * Property types.
 *
 * @const
 * @type {Object}
 */
PropertyProvider.TYPES = {
  TEXT: 'text',
  LIST: 'list',
  BOOLEAN: 'boolean',
  DATE_TIME: 'dateTime'
};
Object.freeze(PropertyProvider.TYPES);

/**
 * The list of available property types.
 *
 * @const
 * @type {Array}
 */
PropertyProvider.availableTypes = [
  PropertyProvider.TYPES.TEXT,
  PropertyProvider.TYPES.LIST,
  PropertyProvider.TYPES.BOOLEAN,
  PropertyProvider.TYPES.DATE_TIME
];
Object.freeze(PropertyProvider.availableTypes);

/**
 * Adds custom properties.
 *
 * @param {Array} customProperties The list of custom properties to store with for each custom property:
 * @param {String} customProperties.name The property name
 * @param {String} customProperties.description The property description
 * @param {String} customProperties.type The property type (see PropertyProvider.availableTypes)
 * @param {String} [customProperties.id] The property id, generated if not specified
 * @param {Array} [customProperties.values] The list of values if type is PropertyProvider.TYPES.LIST
 * @param {module:publish/providers/PropertyProvider~PropertyProvider~addCallback} [callback] The function to call when
 * it's done
 */
PropertyProvider.prototype.add = function(customProperties, callback) {
  var customPropertiesToAdd = [];

  for (var i = 0; i < customProperties.length; i++) {
    var customProperty = customProperties[i];

    if (!customProperty.name || !customProperty.description)
      return this.executeCallback(callback, new TypeError('Requires name and description to add a custom property'));

    if (PropertyProvider.availableTypes.indexOf(customProperty.type) < 0)
      return this.executeCallback(callback, new TypeError('Invalid property type ' + customProperty.type));

    var property = {
      id: customProperty.id || nanoid(),
      name: customProperty.name,
      description: customProperty.description,
      type: customProperty.type
    };

    if (customProperty.type === PropertyProvider.TYPES.LIST)
      property.values = customProperty.values || [];

    customPropertiesToAdd.push(property);
  }

  PropertyProvider.super_.prototype.add.call(this, customPropertiesToAdd, callback);
};

/**
 * Updates a custom property.
 *
 * @param {ResourceFilter} [filter] Rules to filter property to update
 * @param {Object} data The modifications to perform
 * @param {String} [data.name] The property name
 * @param {String} [data.description] The property description
 * @param {String} [data.type] The property type (see PropertyProvider.availableTypes)
 * @param {String} [data.id] The property id, generated if not specified
 * @param {Array} [data.values] The list of values if type is PropertyProvider.TYPES.LIST
 * @param {module:publish/providers/PropertyProvider~PropertyProvider~updateOneCallback} [callback] The function to
 * call when it's done
 */
PropertyProvider.prototype.updateOne = function(filter, data, callback) {
  var modifications = {};
  if (data.name) modifications.name = data.name;
  if (data.description) modifications.description = data.description;
  if (data.type) modifications.type = data.type;
  if (data.type === PropertyProvider.TYPES.LIST)
    modifications.values = data.values || [];
  else
    modifications.values = null;

  PropertyProvider.super_.prototype.updateOne.call(this, filter, modifications, callback);
};

/**
 * Removes custom properties.
 *
 * This will execute publish hook "PROPERTIES_DELETED" after removing custom properties with:
 * - **Array** The list of removed properties
 *
 * @param {ResourceFilter} [filter] Rules to filter properties to remove
 * @param {module:publish/providers/PropertyProvider~PropertyProvider~removeCallback} [callback] The function to call
 * when it's done
 */
PropertyProvider.prototype.remove = function(filter, callback) {
  var self = this;
  var customPropertyIds;
  var totalRemovedProperties;

  async.series([

    // Get custom property ids
    function(callback) {
      self.getAll(
        filter,
        {
          include: ['id']
        },
        {
          id: 'desc'
        },
        function(getAllError, customProperties) {
          if (getAllError) return callback(getAllError);
          if (!customProperties || !customProperties.length) return callback();

          customPropertyIds = customProperties.map(function(customProperty) {
            return customProperty.id;
          });

          callback();
        }
      );
    },

    // Remove custom properties
    function(callback) {
      if (!customPropertyIds || !customPropertyIds.length) return callback();

      PropertyProvider.super_.prototype.remove.call(self, filter, function(removeError, total) {
        totalRemovedProperties = total;
        callback(removeError);
      });
    },

    // Execute hook
    function(callback) {
      if (!customPropertyIds || !customPropertyIds.length) return callback();

      var api = process.api.getCoreApi();
      var publishApi = process.api.getApi('publish');
      api.executeHook(
        publishApi.getHooks().PROPERTIES_DELETED,
        customPropertyIds,
        function(hookError) {
          self.executeCallback(callback, hookError);
        }
      );
    }

  ], function(error, results) {
    self.executeCallback(callback, error, !error ? totalRemovedProperties : undefined);
  });
};

/**
 * Creates properties indexes.
 *
 * @param {callback} callback Function to call when it's done
 */
PropertyProvider.prototype.createIndexes = function(callback) {
  var language = process.api.getCoreApi().getContentLanguage();

  this.storage.createIndexes(this.location, [

    // eslint-disable-next-line camelcase
    {key: {name: 'text', description: 'text'}, weights: {name: 2}, default_language: language, name: 'querySearch'}

  ], function(error, result) {
    if (result && result.note)
      process.logger.debug('Create properties indexes : ' + result.note);

    callback(error);
  });
};

/**
 * Drops an index from database collection.
 *
 * @param {String} indexName The name of the index to drop
 * @param {callback} callback Function to call when it's done
 */
PropertyProvider.prototype.dropIndex = function(indexName, callback) {
  this.storage.dropIndex(this.location, indexName, function(error, result) {
    if (result && result.ok)
      process.logger.debug('Index "' + indexName + '" dropped');

    callback(error);
  });
};

/**
 * @callback module:publish/providers/PropertyProvider~PropertyProvider~addCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Number} total The total amount of properties inserted
 * @param {Array} properties The list of added properties
 */

/**
 * @callback module:publish/providers/PropertyProvider~PropertyProvider~updateOneCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Number} total 1 if everything went fine
 */

/**
 * @callback module:publish/providers/PropertyProvider~PropertyProvider~removeCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {Number} total The number of removed properties
 */
