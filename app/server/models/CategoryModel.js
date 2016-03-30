'use strict';

/**
 * @module publish-models
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');

/**
 * Defines a CategoryModel class to manipulate taxonomy "categories".
 *
 * @class CategoryModel
 * @constructor
 * @extends TaxonomyModel
 * @param {Object} user The user the entity belongs to
 */
function CategoryModel(user) {
  openVeoAPI.TaxonomyModel.call(this, user);
}

module.exports = CategoryModel;
util.inherits(CategoryModel, openVeoAPI.TaxonomyModel);
