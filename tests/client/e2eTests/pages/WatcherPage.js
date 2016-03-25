'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var watcherManager = process.requirePublish('app/server/watcher/watcherManager.js');
var BackEndPage = e2e.pages.BackEndPage;
var browserExt = e2e.browser;

/**
 * Creates a new WatcherPage representing the watcher back end page.
 */
function WatcherPage() {
  WatcherPage.super_.call(this);

  // Page path
  this.path = 'be/publish/watcher';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('WATCHER.TITLE'));
  this.pageDescriptionElement = element(by.binding('WATCHER.INFO'));
  this.startingAlertElement = element(by.binding('WATCHER.STARTING'));
  this.startedAlertElement = element(by.binding('WATCHER.STARTED'));
  this.stoppingAlertElement = element(by.binding('WATCHER.STOPPING'));
  this.stoppedAlertElement = element(by.binding('WATCHER.STOPPED'));
  this.startButtonElement = element(by.binding('WATCHER.START_BUTTON'));
  this.stopButtonElement = element(by.binding('WATCHER.STOP_BUTTON'));
}

module.exports = WatcherPage;
util.inherits(WatcherPage, BackEndPage);

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
WatcherPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageTitleElement), 5000, 'Missing watcher page title');
};

/**
 * Gets watcher status code.
 *
 * @return {Promise} Promise resolving with watcher status
 */
WatcherPage.prototype.getWatcherStatus = function() {
  return this.sendRequest('be/publish/watcherStatus', 'get').then(function(response) {
    return protractor.promise.fulfilled(response.data.status);
  });
};

/**
 * Checks if status watcher is displayed.
 *
 * @return {Promise} Promise resolving with a boolean indicating if the watcher status is displayed
 */
WatcherPage.prototype.isStatusDisplayed = function() {
  var self = this;

  return this.getWatcherStatus().then(function(status) {
    switch (status) {
      case watcherManager.STARTING_STATUS:
        return self.startingAlertElement.isDisplayed();
      case watcherManager.STARTED_STATUS:
        return self.startedAlertElement.isDisplayed();
      case watcherManager.STOPPING_STATUS:
        return self.stoppingAlertElement.isDisplayed();
      case watcherManager.STOPPED_STATUS:
        return self.stoppedAlertElement.isDisplayed();
      default:
        return protractor.promise.rejected(new Error('Status ' + status + ' does not exist'));
    }
  });
};

/**
 * Starts watcher.
 *
 * @return {Promise} Promise resolving when the watcher is started
 */
WatcherPage.prototype.startWatcher = function() {
  var self = this;

  return this.getWatcherStatus().then(function(status) {
    if (status === watcherManager.STARTING_STATUS) {
      browser.wait(self.EC.visibilityOf(self.startedAlertElement), 5000, 'Watcher not starting');
      return protractor.promise.fulfilled();
    } else if (status === watcherManager.STARTED_STATUS)
      return protractor.promise.fulfilled();
    else if (status === watcherManager.STOPPING_STATUS)
      browser.wait(self.EC.visibilityOf(self.stoppedAlertElement), 5000, 'Watcher not stopping');

    browserExt.click(self.startButtonElement);
    return browser.wait(self.EC.visibilityOf(self.startedAlertElement), 5000, 'Watcher not starting');
  }).then(function() {
    return protractor.promise.fulfilled();
  });
};

/**
 * Stops watcher.
 *
 * @return {Promise} Promise resolving when the watcher is stopped
 */
WatcherPage.prototype.stopWatcher = function() {
  var self = this;

  return this.getWatcherStatus().then(function(status) {
    if (status === watcherManager.STOPPING_STATUS) {
      browser.wait(self.EC.visibilityOf(self.stoppedAlertElement), 5000, 'Watcher not stopping');
      return protractor.promise.fulfilled();
    } else if (status === watcherManager.STOPPED_STATUS)
      return protractor.promise.fulfilled();
    else if (status === watcherManager.STARTING_STATUS)
      browser.wait(self.EC.visibilityOf(self.startedAlertElement), 5000, 'Watcher not starting');

    browserExt.click(self.stopButtonElement);
    return browser.wait(self.EC.visibilityOf(self.stoppedAlertElement), 5000, 'Watcher not stopping');
  }).then(function() {
    return protractor.promise.fulfilled();
  });
};
