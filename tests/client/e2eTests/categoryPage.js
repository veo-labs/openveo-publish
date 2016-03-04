'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var CategoryPage = process.requirePublish('tests/client/e2eTests/pages/CategoryPage.js');
var CategoryModel = process.requirePublish('tests/client/e2eTests/categories/CategoryModel.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Category page', function() {
  var page, categoryHelper;

  // Prepare page
  before(function() {
    var categoryModel = new CategoryModel();
    categoryHelper = new CategoryHelper(categoryModel);
    page = new CategoryPage(categoryModel);
    page.logAsAdmin();
    page.load();
  });

  // Clean tree after each test and reload page
  afterEach(function() {
    categoryHelper.removeAllEntities();
    page.refresh();
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  /**
   * Verifies a tree of categories.
   *
   * @param {Object} tree The tree of categories to test
   * @param {Object} expectedTree The expected tree of categories
   */
  function checkTree(tree, expectedTree) {
    for (var i = 0; i < tree.length; i++) {
      var category = tree[i];
      var expectedCategory = expectedTree[i];
      assert.equal(category.title, expectedCategory.title);

      if (category.items && category.items.length)
        checkTree(category.items, expectedCategory.items);
    }
  }

  it('should display page title', function() {
    assert.eventually.ok(page.pageTitleElement.isPresent());
  });

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  it('should be able to add a category', function() {
    var categoryName = 'Test add category';
    page.addCategory(categoryName);
    page.getCategories().then(function(tree) {
      assert.equal(tree.length, 1, 'Only one category must be present');
      assert.equal(tree[0].title, categoryName);
      assert.equal(tree[0].items.length, 0, 'Category must not have sub categories');
    });
  });

  it('should be able to add categories with same names', function() {
    var categoryName = 'Test add category';
    page.addCategory(categoryName);
    page.addCategory(categoryName);
    page.getCategories().then(function(tree) {
      assert.equal(tree[0].title, categoryName);
      assert.equal(tree[1].title, categoryName);
    });
  });

  it('should be able to remove a category', function() {
    var categoryName = 'Test remove category';

    // Add category
    page.addCategory(categoryName);
    assert.isFulfilled(page.getCategoryElement(categoryName));

    // Remove category
    page.removeCategory(categoryName);
    assert.isRejected(page.getCategoryElement(categoryName));
  });

  it('should be able to remove a category and all its sub categories', function() {
    var initialTree = [
      {
        title: 'Test remove all a',
        items: [
          {
            title: 'Test remove all b',
            items: []
          },
          {
            title: 'Test remove all c',
            items: []
          }
        ]
      }
    ];
    categoryHelper.addEntities(initialTree);
    page.refresh();

    page.removeCategory('Test remove all a');

    page.getCategories().then(function(tree) {
      checkTree(tree, []);
    });
  });

  it('should be able to edit a category', function() {
    var initialTree = [
      {
        title: 'Test edit a',
        items: [
          {
            title: 'Test edit c',
            items: []
          }
        ]
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    expectedTree[0].items[0].title = 'Test edit b';
    page.editCategory('Test edit c', 'Test edit b');
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should not be able to add a category without name', function() {
    page.addCategory();
    page.getCategories().then(function(tree) {
      assert.equal(tree.length, 0, 'Tree must not contain any category');
    });
  });

  it('should not be able to save an empty tree', function() {
    assert.eventually.notOk(page.saveButtonElement.isEnabled());
  });

  it('should be able to create a tree of categories', function() {
    var expectedTree = [
      {
        title: 'Test create tree category a',
        items: [
          {
            title: 'Test create tree category a1',
            items: [
              {
                title: 'Test create tree category a10'
              }
            ]
          },
          {
            title: 'Test create tree category a2'
          }
        ]
      },
      {
        title: 'Test create tree category c'
      }
    ];
    page.addCategories(expectedTree);
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to cancel modifications', function() {
    var expectedTree = [
      {
        id: '1',
        title: 'Test cancel a',
        items: []
      }
    ];
    categoryHelper.addEntities(expectedTree);
    page.refresh();
    page.addCategory('Test cancel b');
    page.cancelCategoryModifications();
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to save modifications', function() {
    var initialTree = [
      {
        id: '1',
        title: 'Test save a',
        items: []
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Add category
    expectedTree.push({title: 'Test save b'});
    page.addCategory(expectedTree[1].title);
    page.saveCategoryModifications();
    page.refresh();
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to move a category before another one', function() {
    var initialTree = [
      {
        id: '1',
        title: 'Test move before a',
        items: [
          {
            id: '1',
            title: 'Test move before b',
            items: []
          },
          {
            id: '1',
            title: 'Test move before c',
            items: []
          }
        ]
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Move category
    var category = expectedTree[0].items.pop();
    expectedTree[0].items.unshift(category);
    page.moveCategory('Test move before c', null, 0);
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to move a category after another one', function() {
    var initialTree = [
      {
        title: 'Test move after a',
        items: [
          {
            title: 'Test move after d',
            items: []
          },
          {
            title: 'Test move after b',
            items: []
          },
          {
            title: 'Test move after c',
            items: []
          }
        ]
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Move category
    var category = expectedTree[0].items.shift();
    expectedTree[0].items.push(category);
    page.moveCategory('Test move after d', null, 2);
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to move a category up', function() {
    var initialTree = [
      {
        title: 'Test move up a',
        items: [
          {
            title: 'Test move up b',
            items: []
          },
          {
            title: 'Test move up c',
            items: []
          }
        ]
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Add category
    var category = expectedTree[0].items.pop();
    expectedTree.push(category);
    page.moveAside('Test move up c', true);
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

  it('should be able to open / close sub categories', function() {
    var initialTree = [
      {
        title: 'Test open, close a',
        items: [
          {
            title: 'Test open, close b',
            items: []
          },
          {
            title: 'Test open, close c',
            items: []
          }
        ]
      }
    ];
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Close category
    page.closeCategory('Test open, close a');
    page.getCategoryElement('Test open, close b').then(function(categoryElement) {
      assert.eventually.notOk(categoryElement.isDisplayed(), 'Category should be masked');
    });

    // Open category
    page.openCategory('Test open, close a');
    page.getCategoryElement('Test open, close b').then(function(categoryElement) {
      assert.eventually.ok(categoryElement.isDisplayed(), 'Category should be displayed');
    });
  });

  it('should be able to move category with its sub categories', function() {
    var initialTree = [
      {
        title: 'Test move all a',
        items: []
      },
      {
        title: 'Test move all b',
        items: [
          {
            title: 'Test move all c',
            items: []
          },
          {
            title: 'Test move all d',
            items: []
          }
        ]
      }
    ];
    var expectedTree = JSON.parse(JSON.stringify(initialTree));
    categoryHelper.addEntities(initialTree);
    page.refresh();

    // Close category
    var category = expectedTree.shift();
    expectedTree.push(category);
    page.moveCategory('Test move all b', null, 0);
    page.getCategories().then(function(tree) {
      checkTree(tree, expectedTree);
    });
  });

});
