'use strict';

var util = require('util');
var openVeoAPI = require('@openveo/api');
var CategoryProvider = process.requirePublish('tests/client/e2eTests/categories/CategoryProvider.js');

/**
 * Defines a CategoryModel to manipulate categories.
 *
 * Right now categories are taxonomies and use TaxonomyModel / TaxonomyProvider from openveo-core.
 * TaxonomyModel / TaxonomyProvider need to be in openveo-api to be used by plugins and core.
 * openveo-publish must define CategoryModel / CategoryProvider extending TaxonomyModel / TaxonomyProvider and
 * define new permissions for categories.
 * When it's done, this object must no longer be used.
 */
function CategoryModel() {
  openVeoAPI.EntityModel.prototype.init.call(this, new CategoryProvider(openVeoAPI.applicationStorage.getDatabase()));
}

module.exports = CategoryModel;
util.inherits(CategoryModel, openVeoAPI.EntityModel);
