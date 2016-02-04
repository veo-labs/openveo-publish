'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var CategoryPage = process.requirePublish('tests/client/e2eTests/pages/CategoryPage.js');
var CategoryModel = process.requirePublish('tests/client/e2eTests/categories/CategoryModel.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Category page', function() {
  var page;

  // Prepare page
  before(function() {
    page = new CategoryPage(new CategoryModel());
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  describe('without access', function() {

    // Log with a user without access permission
    before(function() {
      page.logAs(datas.users.publishGuest);
    });

    it('Should not access the page', function() {
      page.load().then(function() {
        assert.ok(false, 'User has access to categories page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without write permission', function() {

    // Log with a user without write permission
    before(function() {
      page.logAs(datas.users.publishCategoriesNoWrite);
      page.load();
    });

    // Clean tree after each test and reload page
    afterEach(function() {
      page.removeCategoriesByPass(true);
      page.refresh();
    });

    it('should not be able to create the tree', function() {
      page.addCategory('Test create without permission');
      page.saveCategoryModifications();
      page.getAlertMessages().then(function(messages) {
        assert.equal(messages.length, 1);
        assert.equal(messages[0], page.translations.ERROR.FORBIDDEN);
      });
      page.closeAlerts();
    });

    it('should not be able to create the tree by requesting the server directly', function() {
      var data = {
        name: 'categories',
        tree: [
          {
            id: '1452701121600',
            title: 'title',
            items: []
          }
        ]
      };
      page.sendRequest('be/crud/taxonomy', 'put', data).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without update permission', function() {

    // Log with a user without update permission
    before(function() {
      page.logAs(datas.users.publishCategoriesNoUpdate);
      page.load();
    });

    // Clean tree after each test and reload page
    afterEach(function() {
      page.removeCategoriesByPass(true);
      page.refresh();
    });

    it('should not be able to edit a category', function() {
      var name = 'Test edit without permission';
      var initialTree = [
        {
          title: 'Test edit a',
          items: []
        }
      ];
      page.addCategoriesByPass(initialTree, true);
      assert.isRejected(page.editCategory(name, name + ' edited'));
    });

    it('should not be able to edit category by requesting the server directly', function() {
      var initialTree = {
        tree: [
          {
            id: '1452701121600',
            title: 'title',
            items: []
          }
        ]
      };
      page.addCategoriesByPass(initialTree, true);

      page.sendRequest('be/crud/taxonomy/' + page.treeId, 'post', initialTree).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without delete permission', function() {

    // Log with a user without delete permission
    before(function() {
      page.logAs(datas.users.publishCategoriesNoDelete);
      page.load();
    });

    // Clean tree after each test and reload page
    afterEach(function() {
      page.removeCategoriesByPass(true);
      page.refresh();
    });

    it('should not have delete action to remove a category', function() {
      var name = 'Test remove without permission';
      var initialTree = [
        {
          title: 'Test remove a',
          items: []
        }
      ];
      page.addCategoriesByPass(initialTree, true);
      assert.isRejected(page.removeCategory(name));
    });

    it('should not be able to remove category by requesting the server directly', function() {
      var initialTree = {
        tree: [
          {
            id: '1452701121600',
            title: 'title',
            items: []
          }
        ]
      };
      page.addCategoriesByPass(initialTree, true);

      page.sendRequest('be/crud/taxonomy/' + page.treeId, 'delete').then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without create / edit permissions', function() {

    // Log with a user without create / edit permissions
    before(function() {
      page.logAs(datas.users.publishCategoriesNoManage);
      page.load();
    });

    // Reload page afer each test
    afterEach(function() {
      page.refresh();
    });

    it('should not be able to add a new category', function() {
      var initialTree = [
        {
          title: 'Title',
          items: []
        }
      ];
      page.addCategoriesByPass(initialTree, true);
      assert.isRejected(page.addCategory('Test add category without permissions'));
    });

  });
});
