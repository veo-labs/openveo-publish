'use strict';

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a CategoryProvider to get and save categories.
 *
 * Right now categories are taxonomies and use TaxonomyModel / TaxonomyProvider from openveo-core.
 * TaxonomyModel / TaxonomyProvider need to be in openveo-api to be used by plugins and core.
 * openveo-publish must define CategoryModel / CategoryProvider extending TaxonomyModel / TaxonomyProvider and
 * define new permissions for categories.
 * When it's done, this object must no longer be used.
 */
function CategoryProvider(database) {
  openVeoAPI.EntityProvider.prototype.init.call(this, database, 'taxonomy');
}

module.exports = CategoryProvider;
util.inherits(CategoryProvider, openVeoAPI.EntityProvider);
