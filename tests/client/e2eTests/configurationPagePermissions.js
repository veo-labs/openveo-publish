'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page', function() {
  var page;

  // Prepare page
  before(function() {
    page = new ConfigurationPage();
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

    it('should not access the page', function() {
      page.load().then(function() {
        assert.ok(false, 'User has access to configuration page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without manage permission', function() {

    // Log with a user without manage permission
    before(function() {
      page.logAs(datas.users.publishConfigurationNoManage);
      page.load();
    });

    // Reload page after each test
    afterEach(function() {
      page.refresh();
    });

    it('should not have link to associate a Youtube account', function() {
      assert.eventually.notOk(page.youtubePeerLinkElement.isPresent());
    });

  });

});
