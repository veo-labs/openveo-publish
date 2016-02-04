'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var watcherManager = process.requirePublish('app/server/watcher/watcherManager.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Watcher page', function() {
  var page;

  before(function() {
    page = new WatcherPage();
    page.logAsAdmin();
    page.load();
  });

  after(function() {
    page.logout();
  });

  // Reload page after each test
  afterEach(function() {
    page.refresh();
  });

  it('should display page title', function() {
    assert.eventually.ok(page.pageTitleElement.isPresent());
  });

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  it('should display watcher status', function() {
    assert.eventually.ok(page.isStatusDisplayed());
  });

  it('should be able to start / stop the watcher', function() {

    // Stop watcher
    page.stopWatcher();

    // Check that watcher is stopped
    assert.eventually.equal(page.getWatcherStatus(), watcherManager.STOPPED_STATUS);
    assert.eventually.ok(page.stoppedAlertElement.isDisplayed(), 'Stopped message must be displayed');
    assert.eventually.ok(page.startButtonElement.isDisplayed(), 'Start button must be displayed');

    // Start watcher
    page.startWatcher();

    // Check that watcher is started
    assert.eventually.equal(page.getWatcherStatus(), watcherManager.STARTED_STATUS);
    assert.eventually.ok(page.startedAlertElement.isDisplayed(), 'Started message must be displayed');
    assert.eventually.ok(page.stopButtonElement.isDisplayed(), 'Stop button must be displayed');

    // Start watcher
    page.startWatcher();
  });

});
