'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var CategoryPage = process.requirePublish('tests/client/e2eTests/pages/CategoryPage.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Category page', function() {
  var page, categoryHelper;

  // Prepare page
  before(function() {
    var taxonomyProvider = process.api.getCoreApi().taxonomyProvider;
    categoryHelper = new CategoryHelper(taxonomyProvider);
    page = new CategoryPage(taxonomyProvider);
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
      categoryHelper.removeAllEntities();
      page.refresh();
    });

    it('should not be able to create the tree', function() {
      assert.isRejected(page.addCategory('Test create without permission'));
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
      page.sendRequest('be/taxonomies', 'put', data).then(function(response) {
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
      categoryHelper.removeAllEntities();
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
      categoryHelper.addEntities(initialTree);
      page.refresh();
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
      categoryHelper.addEntities(initialTree);
      page.refresh();

      page.sendRequest('be/taxonomies/' + page.treeId, 'post', initialTree).then(function(response) {
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
      categoryHelper.removeAllEntities();
      page.refresh();
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
      categoryHelper.addEntities(initialTree);
      page.refresh();

      page.sendRequest('be/taxonomies/' + page.treeId, 'delete').then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without add / edit permissions', function() {

    // Log with a user without add / edit permissions
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
      categoryHelper.addEntities(initialTree);
      page.refresh();
      assert.isRejected(page.addCategory('Test add category without permissions'));
    });

  });
});
