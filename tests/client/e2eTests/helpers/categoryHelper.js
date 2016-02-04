'use strict';

var CategoryModel = process.requirePublish('tests/client/e2eTests/categories/CategoryModel.js');
var CategoryPage = process.requirePublish('tests/client/e2eTests/pages/CategoryPage.js');

/**
 * Creates categories.
 *
 * @param {Array} categoryNames The list of category names to create
 * @return {Promise} Promise resolving with created categories
 */
module.exports.createCategories = function(categoryNames) {
  return browser.waitForAngular().then(function() {
    var categories = [];
    var categoriesPage = new CategoryPage(new CategoryModel());

    for (var i = 0; i < categoryNames.length; i++) {
      categories.push({
        id: String(i),
        title: categoryNames[i],
        items: []
      });
    }
    return categoriesPage.addCategoriesByPass(categories, false);
  });
};

/**
 * Removes all categories from database.
 *
 * @return {Promise} Promise resolving with customed properties
 */
module.exports.removeAllCategories = function() {
  var categoriesPage = new CategoryPage(new CategoryModel());
  categoriesPage.removeCategoriesByPass(false);
};
