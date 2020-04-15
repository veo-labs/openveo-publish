'use strict';

/**
 * @module providers
 */

var util = require('util');
var async = require('async');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');

/**
 * Defines a PropertyProvider to get and save custom properties.
 *
 * @class PropertyProvider
 * @extends EntityProvider
 * @constructor
 * @param {Database} database The database to interact with
 */
function PropertyProvider(database) {
  PropertyProvider.super_.call(this, database, 'publish_properties');
}

module.exports = PropertyProvider;
util.inherits(PropertyProvider, openVeoApi.providers.EntityProvider);

/**
 * Property types.
 *
 * @property TYPES
 * @type Object
 * @static
 * @final
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
 * @property availableTypes
 * @type Array
 * @static
 * @final
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
 * @method add
 * @async
 * @param {Array} customProperties The list of custom properties to store with for each custom property:
 *   - **String** name The property name
 *   - **String** description The property description
 *   - **String** type The property type (see PropertyProvider.availableTypes)
 *   - **String** [id] The property id, generated if not specified
 *   - **Array** [values] The list of values if type is PropertyProvider.TYPES.LIST
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total amount of properties inserted
 *   - **Array** The list of added properties
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
      id: customProperty.id || shortid.generate(),
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
 * @method updateOne
 * @async
 * @param {ResourceFilter} [filter] Rules to filter property to update
 * @param {Object} data The modifications to perform
 * @param {String} [data.name] The property name
 * @param {String} [data.description] The property description
 * @param {String} [data.type] The property type (see PropertyProvider.availableTypes)
 * @param {String} [data.id] The property id, generated if not specified
 * @param {Array} [data.values] The list of values if type is PropertyProvider.TYPES.LIST
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** 1 if everything went fine
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
 * @method remove
 * @async
 * @param {ResourceFilter} [filter] Rules to filter properties to remove
 * @param {Function} [callback] The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of removed properties
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
 * @method createIndexes
 * @async
 * @param {Function} callback Function to call when it's done with:
 *  - **Error** An error if something went wrong, null otherwise
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
 * @method dropIndex
 * @async
 * @param {String} indexName The name of the index to drop
 * @param {Function} callback Function to call when it's done with:
 *  - **Error** An error if something went wrong, null otherwise
 */
PropertyProvider.prototype.dropIndex = function(indexName, callback) {
  this.storage.dropIndex(this.location, indexName, function(error, result) {
    if (result && result.ok)
      process.logger.debug('Index "' + indexName + '" dropped');

    callback(error);
  });
};
