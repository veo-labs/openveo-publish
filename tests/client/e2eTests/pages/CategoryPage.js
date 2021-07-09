'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');
var BackEndPage = e2e.pages.BackEndPage;
var browserExt = e2e.browser;

/**
 * Creates a new CategoryPage representing the categories back end page.
 *
 * @param {EntityProvider} provider The provider for categories CRUD to be able to add / remove categories by passing
 * the user agent
 */
function CategoryPage(provider) {
  CategoryPage.super_.call(this);

  // Page path
  this.path = 'be/publish/categories-list';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('PUBLISH.CATEGORIES.TITLE'));
  this.pageDescriptionElement = element(by.binding('PUBLISH.CATEGORIES.INFO'));
  this.addFieldElement = element(by.model('newitem.title'));
  this.addButtonElement = element(by.css('button.add'));
  this.saveButtonElement = element(by.binding('CORE.UI.FORM_SAVE'));
  this.cancelButtonElement = element(by.binding('CORE.UI.FORM_CANCEL'));
  this.treeElement = element(by.css('.angular-ui-tree'));

  // Category tree id to add a tree of categories by passing the user agent
  this.treeId = 'test';

  // Category EntityProvider
  this.provider = provider;

  // Category helper
  this.helper = new CategoryHelper(this.provider);
}

module.exports = CategoryPage;
util.inherits(CategoryPage, BackEndPage);

/**
 * Creates a tree of categories.
 *
 * @example
 *
 *     // Tree
 *     var tree = [
 *       {
 *         title: "a",
 *         items: [
 *           {
 *             title: "a0",
 *             items: []
 *           }
 *         ]
 *       },
 *       ...
 *     ]
 *     createTree(tree);
 *
 * @private
 * @param {Array} tree The tree description
 * @param {Array} [path=''] Starting tree path
 * @return {Promise} Promise resolving when the tree is fully created
 */
function createTree(tree, path) {
  var self = this;
  path = path || '';

  return browser.waitForAngular().then(function() {
    var promises = [];

    for (var i = 0; i < tree.length; i++)
      promises.push(self.addCategory(tree[i].title, path, i));

    // Add first level categories
    return protractor.promise.all(promises).then(function() {
      var promises = [];
      for (var i = 0; i < tree.length; i++) {
        var category = tree[i];
        if (category.items && category.items.length) {
          promises.push(createTree.call(self, category.items, path + '/' + category.title));
        }
      }

      // Add sub categories
      return protractor.promise.all(promises);
    });
  });
}

/**
 * Gets tree of categories.
 *
 * Reverse create the tree description from tree display.
 *
 * @private
 * @param {ElementFinder} tree The tree HTML ol element
 * @return {Promise} Promise resolving with the tree description
 */
function getTree(tree) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    // Get first level categories
    tree.all(by.xpath('./li')).map(function(categoryElement, index) {
      return {
        index: index,
        title: self.getCategoryName(categoryElement),
        items: []
      };
    }).then(function(categories) {
      if (categories.length) {

        // Got first level categories

        var promises = [];

        for (var i = 0; i < categories.length; i++) {
          var categoryElement = tree.all(by.xpath('./li')).get(categories[i].index);
          promises.push(getTree.call(self, categoryElement.element(by.xpath('./ol'))));
        }

        // Get sub categories
        return protractor.promise.all(promises).then(function(subCategories) {
          for (var i = 0; i < subCategories.length; i++)
            categories[i].items = subCategories[i];

          return protractor.promise.fulfilled(categories);
        });
      } else {

        // No categories in this level
        return protractor.promise.fulfilled([]);

      }
    }).then(function(categories) {
      deferred.fulfill(categories);
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
}

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
CategoryPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageTitleElement), 5000, 'Missing categories page title');
};

/**
 * Gets a category element.
 *
 * @param {String} name The category name
 * @return {Promise} Promise resolving with the category element
 */
CategoryPage.prototype.getCategoryElement = function(name) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var categoryElement;
    var deferred = protractor.promise.defer();

    // Search for the category by searching input values
    self.treeElement.all(by.css('input')).each(function(input, index) {
      browserExt.getProperty(input, 'value').then(function(categoryName) {
        if (categoryName === name)
          categoryElement = input.element(by.xpath('../..'));
      });
    }).then(function() {
      if (categoryElement)
        deferred.fulfill(categoryElement);
      else
        deferred.reject('Category ' + name + ' not found');
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
};

/**
 * Gets category name.
 *
 * @param {ElementFinder} categoryElement The category element
 * @return {Promise} Promise resolving with the category name
 */
CategoryPage.prototype.getCategoryName = function(categoryElement) {
  return browserExt.getProperty(categoryElement.element(by.xpath('./div/input')), 'value');
};

/**
 * Opens a category.
 *
 * @param {String|ElementFinder} category The category
 * @return {Promise} Promise resolving when the category has been opened
 */
CategoryPage.prototype.openCategory = function(category) {
  var self = this;
  var iconElement;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push(
      (typeof category === 'string') ? self.getCategoryElement(category) : protractor.promise.fulfilled(category)
    );

    // Get category element
    return protractor.promise.all(promises);
  }).then(function(results) {
    var categoryElement = results[0];
    iconElement = categoryElement.element(by.xpath('./div')).element(by.css('.glyphicon-chevron-right'));

    // Test if category is opened or not
    return iconElement.isPresent();
  }).then(function(isClosed) {

    // Open category if closed
    if (!isClosed)
      return protractor.promise.fulfilled();
    else
      return browserExt.click(iconElement.element(by.xpath('..')));
  });
};

/**
 * Closes a category.
 *
 * @param {String|ElementFinder} category The category
 * @return {Promise} Promise resolving when the category has been closed
 */
CategoryPage.prototype.closeCategory = function(category) {
  var self = this;
  var iconElement;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push(
      (typeof category === 'string') ? self.getCategoryElement(category) : protractor.promise.fulfilled(category)
    );

    // Get category element
    return protractor.promise.all(promises);
  }).then(function(results) {
    var categoryElement = results[0];
    iconElement = categoryElement.element(by.xpath('./div')).element(by.css('.glyphicon-chevron-down'));

    // Test if category is opened or not
    return iconElement.isPresent();
  }).then(function(isOpened) {

    // Close category if opened
    if (!isOpened)
      return protractor.promise.fulfilled();
    else
      return browserExt.click(iconElement.element(by.xpath('..')));
  });
};

/**
 * Moves a category below another one.
 *
 * It assumes that categories are opened.
 *
 * @param {String|ElementFinder} a The category to move
 * @param {String|ElementFinder} b The category to move a below
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveBelow = function(a, b) {
  var self = this;

  return browser.waitForAngular().then(function() {
    self.moveAfter(a, b);
    return self.moveAside(a);
  });
};

/**
 * Moves a category before another one.
 *
 * It assumes that all categories involved are opened.
 *
 * @param {String|ElementFinder} a The category to move
 * @param {String|ElementFinder} b The category to move b before
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveBefore = function(a, b) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push((typeof a === 'string') ? self.getCategoryElement(a) : protractor.promise.fulfilled(a));
    promises.push((typeof b === 'string') ? self.getCategoryElement(b) : protractor.promise.fulfilled(b));

    // Get category a and b elements
    return protractor.promise.all(promises);
  }).then(function(results) {
    var aElement = results[0];
    var bElement = results[1];

    // Move category a before category b
    return browser.actions().mouseMove(aElement.getWebElement(), {x: 2, y: 2})
      .mouseDown()
      .mouseMove(bElement.getWebElement(), {x: 10, y: 10})
      .mouseMove(bElement.getWebElement(), {x: 10, y: 5})
      .mouseUp()
      .perform();
  });
};

/**
 * Moves a category after another one.
 *
 * It assumes that all categories involved are opened.
 *
 * @param {String|ElementFinder} a The category to move
 * @param {String|ElementFinder} b The category to move b after
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveAfter = function(a, b) {
  var self = this;
  var aElement;
  var bElement;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push((typeof a === 'string') ? self.getCategoryElement(a) : protractor.promise.fulfilled(a));
    promises.push((typeof b === 'string') ? self.getCategoryElement(b) : protractor.promise.fulfilled(b));

    // Get category a and b elements
    return protractor.promise.all(promises);
  }).then(function(results) {
    aElement = results[0];
    bElement = results[1];

    // Get the number of sub categories in category b to know if it has sub categories
    // We need to know if b has sub categories because it's not possible to place a category after an opened
    // category containing sub categories
    return bElement.all(by.xpath('./ol/li')).count();
  }).then(function(totalChildren) {

    // Close bElement if it has children
    if (totalChildren)
      self.closeCategory(bElement);

    // Move category a after category b
    // Point in (0,0) is outside of the element on firefox, thus use (2,2) to make sure the right element is
    // clicked and moved
    // Move the element 40 pixels from the top of the bElement (categories are about 56px height)
    return browser.actions().mouseMove(aElement.getWebElement(), {x: 2, y: 2})
      .mouseDown()
      .mouseMove(bElement.getWebElement(), {x: 0, y: 0})
      .mouseMove(bElement.getWebElement(), {x: 0, y: 40})
      .mouseUp()
      .perform();
  });
};

/**
 * Moves a category rigth (below the previous one).
 *
 * It assumes that all categories involved are opened.
 *
 * @param {String|ElementFinder} a The category
 * @param {Boolean} [moveLeft] Movement side, true to move left, false to move right
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveAside = function(a, moveLeft) {
  var self = this;
  var aElement;
  var previousElement;
  moveLeft = moveLeft || false;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push((typeof a === 'string') ? self.getCategoryElement(a) : protractor.promise.fulfilled(a));

    // Get category a element
    return protractor.promise.all(promises);
  }).then(function(results) {
    aElement = results[0];

    // Get the number of children of the previous element
    previousElement = aElement.all(by.xpath('preceding-sibling::li')).get(0);
    return previousElement.all(by.xpath('./ol/li')).count();
  }).then(function(totalPreviousSiblingChildren) {
    var referenceElement = previousElement;

    if (totalPreviousSiblingChildren && !moveLeft) {

      // Previous element as children and we need to move the element to the right

      // Open previous category
      self.openCategory(previousElement);

      // Close category last child which becomes the reference element
      referenceElement = previousElement.all(by.xpath('./ol/li')).get(totalPreviousSiblingChildren - 1);
      self.closeCategory(referenceElement);

    }

    // Point in (0,0) is outside of the element on firefox, thus use (2,2) to make sure the right element is
    // clicked
    // Move the element aside
    return browser.actions().mouseMove(aElement.getWebElement(), {x: 200, y: 2})
      .mouseDown()
      .mouseMove(referenceElement.getWebElement(), {x: (moveLeft ? 100 : 10), y: 60})
      .mouseMove(referenceElement.getWebElement(), {x: (moveLeft ? 50 : 20), y: 60})
      .mouseMove(referenceElement.getWebElement(), {x: (moveLeft ? -5 : 40), y: 60})
      .mouseUp()
      .perform();

  });
};

/**
 * Moves a category to a position regarding its siblings.
 *
 * It assumes that all categories involved are opened.
 *
 * @param {String|ElementFinder} a The category
 * @param {Number} [position] Expected category position regarding its siblings
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveToPosition = function(a, position) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var promises = [];
    promises.push((typeof a === 'string') ? self.getCategoryElement(a) : protractor.promise.fulfilled(a));

    // Get category a element
    return protractor.promise.all(promises);
  }).then(function(results) {
    var deferred = protractor.promise.defer();
    var aElement = results[0];
    var siblingElements;
    position = Math.max(position, 0);

    // Get category siblings
    aElement.all(by.xpath('../li')).map(function(categoryElement, index) {
      return {
        index: index,
        title: self.getCategoryName(categoryElement)
      };
    }).then(function(elements) {
      siblingElements = elements;

      // Get category a name to be able to find its index in the list of siblings
      self.getCategoryName(aElement).then(function(categoryName) {
        var categoryIndex = 0;

        // Category element actually occupying the desired position
        var referenceElement = aElement.all(by.xpath('../li')).get(position);

        // Retrieve category a index from siblings
        for (var i = 0; i < siblingElements.length; i++) {
          if (siblingElements[i].title === categoryName)
            categoryIndex = siblingElements[i].index;
        }

        if (position > categoryIndex && position < siblingElements.length) {

          // Category actually occupying the desired position is after category a
          // Move category a after this category
          self.moveAfter(aElement, referenceElement).then(function() {
            deferred.fulfill();
          }, function(error) {
            deferred.reject(error);
          });
        } else if (position < categoryIndex && position < siblingElements.length) {

          // Category actually occupying the desired position is before category a
          // Move category a before this category
          self.moveBefore(aElement, referenceElement).then(function() {
            deferred.fulfill();
          }, function(error) {
            deferred.reject(error);
          });
        } else
          deferred.fulfill();

      });
    });

    return deferred.promise;
  });

};

/**
 * Moves a category.
 *
 * @example
 *
 *     // Move category "My cat" under category "My cat b" which is under "My cat a"
 *     // Place "My cat" as the fith element in "My cat b" sub categories
 *     moveCategory('My cat', 'My cat a/My cat b', 5);
 *
 * @param {String} name The category name
 * @param {String} [path] Destination path made of slash separated category names
 * @param {Number} [position] Expected category position regarding its siblings
 * @return {Promise} Promise resolving when the category has been moved
 */
CategoryPage.prototype.moveCategory = function(name, path, position) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var parentCategoryNames;

    if (path) {
      var promises = [];

      // Get future parent categories from destination path
      parentCategoryNames = path.split('/');

      // Filter parent categories to keep only valid ones (a category without a name is not a valid one)
      parentCategoryNames = parentCategoryNames.filter(function(parentCategoryName) {
        if (parentCategoryName) {
          promises.push(self.openCategory(parentCategoryName));
          return true;
        }
        return false;
      });

      // Open all parent categories
      protractor.promise.all(promises);
    }

    if (parentCategoryNames && parentCategoryNames.length) {

      // Move category below its parent category
      self.moveBelow(name, parentCategoryNames[parentCategoryNames.length - 1]);

    }

    // Move category regarding its position
    if (position !== undefined) {
      return self.moveToPosition(name, position);
    } else
      return protractor.promise.fulfilled();
  });
};

/**
 * Adds a new category.
 *
 * @example
 *
 *     // Add category "My cat" under category "My cat b" which is under "My cat a"
 *     // Place "My cat" as the fith element in "My cat b" sub categories
 *     addCategory('My cat', 'My cat a/My cat b', 5);
 *
 * @param {String} name The category name
 * @param {String} [path] Destination path made of slash separated category names
 * @param {Number} [position] Expected category position regarding its siblings
 * @return {Promise} Promise resolving when the category has been added and placed
 */
CategoryPage.prototype.addCategory = function(name, path, position) {
  var self = this;

  return browser.waitForAngular().then(function() {

    // Fill add field
    self.addFieldElement.clear();
    self.addFieldElement.sendKeys(name || '');

    if (name) {

      // Submit form
      browserExt.click(self.addButtonElement);

      // Move category to its final destination
      return self.moveCategory(name, path, position);

    } else
      return browserExt.click(self.addButtonElement);
  });
};

/**
 * Removes a category.
 *
 * @param {String} name The category name
 * @return {Promise} Promise resolving when the category has been removed
 */
CategoryPage.prototype.removeCategory = function(name) {
  return this.getCategoryElement(name).then(function(categoryElement) {
    var iconElement = categoryElement.element(by.xpath('./div')).element(by.css('.glyphicon-remove'));
    return browserExt.click(iconElement.element(by.xpath('..')));
  });
};

/**
 * Edits a category.
 *
 * @param {String} name Category name
 * @param {String} newName New category name
 * @return {Promise} Promise resolving when category has been edited
 */
CategoryPage.prototype.editCategory = function(name, newName) {
  return this.getCategoryElement(name).then(function(categoryElement) {
    var inputElement = categoryElement.element(by.xpath('./div/input'));
    inputElement.clear();
    return inputElement.sendKeys(newName);
  });
};

/**
 * Adds categories.
 *
 * Previous categories tree will be removed.
 *
 * @example
 *
 *     // Tree
 *     var tree = [
 *       {
 *         title: "a",
 *         items: [
 *           {
 *             title: "a0",
 *             items: []
 *           }
 *         ]
 *       },
 *       ...
 *     ]
 *     addCategories(tree);
 *
 * @param {Object} tree The categories tree representation
 * @return {Promise} Promise resolving when categories are added
 */
CategoryPage.prototype.addCategories = function(tree) {
  var self = this;

  return this.helper.removeAllEntities().then(function() {
    createTree.call(self, tree);
    return self.refresh();
  });
};

/**
 * Gets categories.
 *
 * @return {Promise} Promise resolving with the list of categories as tree representation
 */
CategoryPage.prototype.getCategories = function() {
  return getTree.call(this, this.treeElement.all(by.xpath('./ol')));
};

/**
 * Cancels category modifications.
 *
 * @return {Promise} Promise resolving when canceled
 */
CategoryPage.prototype.cancelCategoryModifications = function() {
  return browserExt.click(this.cancelButtonElement);
};

/**
 * Saves category modifications.
 *
 * @return {Promise} Promise resolving when saved
 */
CategoryPage.prototype.saveCategoryModifications = function() {
  return browserExt.click(this.saveButtonElement);
};

/**
 * Moves the cursor over the add field to display the popover.
 *
 * @return {Promise} Promise resolving when the mouse is over the add field
 */
CategoryPage.prototype.setAddFieldMouseOver = function() {
  var self = this;
  return browser.actions().mouseMove(this.addFieldElement).perform().then(function() {
    return browser.wait(self.EC.presenceOf(self.popoverElement), 1000, 'Missing dialog over add field');
  }).then(function() {
    return protractor.promise.fulfilled();
  });
};

/**
 * Moves the cursor over the add button to display the popover.
 *
 * @return {Promise} Promise resolving when the mouse is over the add field
 */
CategoryPage.prototype.setAddButtonMouseOver = function() {
  var self = this;
  return browser.actions().mouseMove(this.addButtonElement).perform().then(function() {
    return browser.wait(self.EC.presenceOf(self.popoverElement), 1000, 'Missing dialog over add button');
  }).then(function() {
    return protractor.promise.fulfilled();
  });
};
