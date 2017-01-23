'use strict';

/**
 * @module providers
 */

var util = require('util');
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
 * Creates properties indexes.
 *
 * @method createIndexes
 * @async
 * @param {Function} callback Function to call when it's done with :
 *  - **Error** An error if something went wrong, null otherwise
 */
PropertyProvider.prototype.createIndexes = function(callback) {
  this.database.createIndexes(this.collection, [
    {key: {name: 'text', description: 'text'}, weights: {name: 2}, name: 'querySearch'}
  ], function(error, result) {
    if (result && result.note)
      process.logger.debug('Create properties indexes : ' + result.note);

    callback(error);
  });
};
