'use strict';

var util = require('util');
var openVeoApi = require('@openveo/api');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;
var ResourceFilter = openVeoApi.storages.ResourceFilter;

/**
 * Creates a new CategoryHelper to help manipulate categories without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {TaxonomyProvider} provider The entity provider that will be used by the Helper
 */
function CategoryHelper(provider) {
  CategoryHelper.super_.call(this, provider);
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

    self.provider.getOne(new ResourceFilter().equal('name', 'categories'), null, function(error, categories) {
      if (error) deferred.reject(error);
      else if (!categories) {
        self.provider.add([categoriesToAdd], function(error, total, addedCategories) {
          if (error)
            deferred.reject(error);
          else
            deferred.fulfill(addedCategories[0]);
        });
      } else {
        self.provider.updateOne(
          new ResourceFilter().equal('id', self.treeId),
          categoriesToAdd,
          function(error) {
            if (error)
              deferred.reject(error);
            else
              deferred.fulfill(categoriesToAdd);
          }
        );
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

    self.provider.getOne(
      new ResourceFilter().equal('name', 'categories'),
      null,
      function(error, category) {
        if (error)
          deferred.reject(error);
        else if (!category)
          deferred.fulfill();
        else {
          self.provider.remove(
            new ResourceFilter().equal('id', category.id),
            function(error, total) {
              if (error)
                deferred.reject(error);
              else
                deferred.fulfill();
            }
          );
        }
      }
    );

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
