'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;

/**
 * Creates a new CategoryHelper to help manipulate categories without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {CategoryModel} model The entity model that will be used by the Helper
 */
function CategoryHelper(model) {
  CategoryHelper.super_.call(this, model);
}

module.exports = CategoryHelper;
util.inherits(CategoryHelper, Helper);

/**
 * Adds multiple entities at the same time.
 *
 * This method bypass the web browser to directly add entities into database.
 *
 * @method addEntities
 * @param {Array} entities A list of entities to add
 * @return {Promise} Promise resolving when entities are added
 */
CategoryHelper.prototype.addEntities = function(tree) {
  var self = this;

  return this.flow.execute(function() {
    var deferred = protractor.promise.defer();
    var categoriesToAdd = {
      name: 'categories',
      id: self.treeId,
      tree: tree
    };

    self.model.getByFilter({
      name: 'categories'
    },
    function(error, categories) {
      if (error)
        deferred.reject(error);
      else if (!categories) {
        self.model.add(categoriesToAdd, function(error, data) {
          if (error)
            deferred.reject(error);
          else
            deferred.fulfill(data);
        });
      } else {
        self.model.update([self.treeId], categoriesToAdd, function(error) {
          if (error)
            deferred.reject(error);
          else
            deferred.fulfill(categoriesToAdd);
        });
      }
    });
    return deferred.promise.then(function(data) {
      return protractor.promise.fulfilled(data);
    });
  });
};

/**
 * Removes all entities from database.
 *
 * @method removeAllEntities
 * @param {Array} safeEntities A list of entities to keep safe
 * @return {Promise} Promise resolving when all entities are removed
 */
CategoryHelper.prototype.removeAllEntities = function() {
  var self = this;

  return this.flow.execute(function() {
    var deferred = protractor.promise.defer();

    self.model.getByFilter({
      name: 'categories'
    },
    function(error, categories) {
      if (error)
        deferred.reject(error);
      else if (!categories)
        deferred.fulfill();
      else {
        self.model.remove([categories.id], function(error) {
          if (error)
            deferred.reject(error);
          else
            deferred.fulfill();
        });
      }
    });

    return deferred.promise.then(function() {
      return protractor.promise.fulfilled();
    });
  });
};

/**
 * Creates categories.
 *
 * @param {Array} categoryNames The list of category names to create
 * @return {Promise} Promise resolving with created categories
 */
CategoryHelper.prototype.createCategories = function(categoryNames) {
  var self = this;

  return this.flow.execute(function() {
    var categories = [];

    for (var i = 0; i < categoryNames.length; i++) {
      categories.push({
        id: String(i),
        title: categoryNames[i],
        items: []
      });
    }
    return self.addEntities(categories);
  });
};
