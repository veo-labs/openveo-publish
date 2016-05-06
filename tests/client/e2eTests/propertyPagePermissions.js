'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var PropertyPage = process.requirePublish('tests/client/e2eTests/pages/PropertyPage.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Property page', function() {
  var page, propertyHelper;

  // Prepare page
  before(function() {
    var propertyModel = new PropertyModel();
    propertyHelper = new PropertyHelper(propertyModel);
    page = new PropertyPage(propertyModel);
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  describe('without access', function() {

    // Log with a user without access permission
    before(function() {
      return page.logAs(datas.users.publishGuest);
    });

    it('Should not access the page', function() {
      return page.load().then(function() {
        assert.ok(false, 'User has access to properties page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without write permission', function() {

    // Log with a user without write permission
    before(function() {
      page.logAs(datas.users.publishPropertiesNoWrite);
      page.load();
    });

    // Remove all properties after each tests then reload the page
    afterEach(function() {
      propertyHelper.removeAllEntities();
      page.refresh();
    });

    it('should not have form to create a property', function() {
      assert.eventually.notOk(page.addFormElement.isPresent());
    });

    it('should not be able to create property by requesting the server directly', function() {
      var data = {
        name: 'Test'
      };
      page.sendRequest('be/publish/properties', 'put', data).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without update permission', function() {

    // Log with a user without update permission
    before(function() {
      page.logAs(datas.users.publishPropertiesNoUpdate);
      page.load();
    });

    // Remove all properties after each tests then reload the page
    afterEach(function() {
      propertyHelper.removeAllEntities();
      page.refresh();
    });

    it('should not have edit button to edit a property', function() {
      var name = 'Test edition';

      // Create line
      page.addLine(name, {
        description: 'Test edition description',
        type: page.translations.PUBLISH.PROPERTIES.FORM_ADD_TEXT_TYPE
      });

      assert.isRejected(page.editProperty(name, {name: 'Another name', description: 'Another description'}));

      // Remove line
      page.removeLine(name);
    });

    it('should not be able to edit property by requesting the server directly', function() {
      var data = {
        name: 'Test edition'
      };

      page.sendRequest('be/publish/properties/whatever', 'post', data).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without delete permission', function() {

    // Load page
    before(function() {
      page.logAs(datas.users.publishPropertiesNoDelete);
      page.load();
    });

    // Remove all properties after each tests then reload the page
    afterEach(function() {
      propertyHelper.removeAllEntities();
      page.refresh();
    });

    it('should not have delete action to remove a property', function() {
      var name = 'test delete without permission';

      propertyHelper.addEntities([
        {
          name: name,
          description: 'test delete without permission description',
          type: PropertyModel.TYPE_TEXT
        }
      ]);
      page.refresh();

      assert.isRejected(page.removeLine(name));
    });

    it('should not be able to remove property by requesting the server directly', function() {
      page.sendRequest('be/publish/properties/whatever', 'delete').then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

});
