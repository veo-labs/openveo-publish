'use strict';

/**
 * @module publish-controllers
 */

/**
 * Provides route actions for all requests relative to categories.
 *
 * @class categoryController
 */

var util = require('util');
var CategoryModel = process.requirePublish('app/server/models/CategoryModel.js');
var errors = process.requirePublish('app/server/httpErrors.js');

var categoryModel = new CategoryModel();

/**
 * Finds a category in a list of categories and sub categories.
 *
 * @method getCategory
 * @private
 * @param {Array} tree The list of categories
 * @param {String} categoryId The id of the category to look for
 * @return {Object} The category or undefined if not found
 */
function getCategory(tree, categoryId) {
  if (util.isArray(tree) && typeof categoryId === 'string') {
    for (var i = 0; i < tree.length; i++) {
      var category = tree[i];
      if (category.id === categoryId)
        return category;
      else if (category.items) {
        var result = getCategory(category.items, categoryId);
        if (result)
          return result;
      }
    }
  }
  return undefined;
}

/**
 * Gets a category.
 *
 * Expects one GET parameter :
 *  - **id** The id of the category
 *
 * @method getCategoryAction
 * @static
 */
module.exports.getCategoryAction = function(request, response, next) {
  if (request.params.id) {
    categoryModel.getByName('categories', function(error, categories) {
      if (error) {
        next(errors.GET_CATEGORY_ERROR);
      } else {
        response.send({
          category: categories && getCategory(categories.tree, request.params.id)
        });
      }
    });
  } else {

    // Missing type and / or id of the category
    next(errors.GET_CATEGORY_MISSING_PARAMETERS);

  }
};
