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
 */
function CategoryModel() {
  CategoryModel.super_.call(this);
}

module.exports = CategoryModel;
util.inherits(CategoryModel, openVeoAPI.TaxonomyModel);
