'use strict';

/**
 * @module publish-controllers
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');
var CategoryModel = process.requirePublish('app/server/models/CategoryModel.js');
var errors = process.requirePublish('app/server/httpErrors.js');
var EntityController = openVeoAPI.controllers.EntityController;

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
 * Provides route actions for all requests relative to categories.
 *
 * @class CategoryController
 * @constructor
 * @extends EntityController
 */
function CategoryController() {
  EntityController.call(this, CategoryModel);
}

module.exports = CategoryController;
util.inherits(CategoryController, EntityController);

/**
 * Gets a category.
 *
 * Expects one GET parameter :
 *  - **id** The id of the category
 *
 * @method getEntityAction
 */
CategoryController.prototype.getEntityAction = function(request, response, next) {
  if (request.params.id) {
    var model = new this.Entity(request.user);

    model.getByName('categories', function(error, categories) {
      if (error) {
        next(errors.GET_CATEGORY_ERROR);
      } else {
        response.send({
          entity: categories && getCategory(categories[0].tree, request.params.id)
        });
      }
    });
  } else {

    // Missing id of the category
    next(errors.GET_CATEGORY_MISSING_PARAMETERS);

  }
};

/**
 * Gets list of categories.
 *
 * @method getEntitiesAction
 */
CategoryController.prototype.getEntitiesAction = function(request, response, next) {
  var model = new this.Entity(request.user);

  model.getByName('categories', function(error, categories) {
    if (error) {
      next(errors.GET_CATEGORY_ERROR);
    } else {
      response.send({
        entities: categories[0].tree
      });
    }
  });
};
