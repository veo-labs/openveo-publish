'use strict';

/**
 * @module publish-providers
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a PropertyProvider class to get and save custom properties.
 *
 * @class PropertyProvider
 * @constructor
 * @extends EntityProvider
 * @param Database database The database to interact with
 */
function PropertyProvider(database) {
  openVeoAPI.EntityProvider.prototype.init.call(this, database, 'properties');
}

module.exports = PropertyProvider;
util.inherits(PropertyProvider, openVeoAPI.EntityProvider);

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
