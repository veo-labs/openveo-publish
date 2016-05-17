'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Watcher page', function() {
  var page;

  // Load page
  before(function() {
    page = new WatcherPage();
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
        assert.ok(false, 'User has access to watcher page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without manage permission', function() {

    // Log with a user without manage permission
    before(function() {
      page.logAs(datas.users.publishWatcherNoManage);
      page.load();
    });

    // Reload page after each test
    afterEach(function() {
      page.refresh();
    });

    it('should not have button to stop / start the watcher', function() {
      assert.eventually.notOk(page.stopButtonElement.isPresent(), 'Stop button should not be displayed');
      assert.eventually.notOk(page.startButtonElement.isPresent(), 'Start button should not be displayed');
    });

    it('should not be able to stop / start the watcher by requesting the server directly', function() {
      page.sendRequest('be/publish/startWatcher', 'get').then(function(response) {
        assert.equal(response.status, 403, 'User can start the watcher and may not');
      });

      page.sendRequest('be/publish/stopWatcher', 'get').then(function(response) {
        assert.equal(response.status, 403, 'User can stop the watcher and may not');
      });
    });

  });

});
