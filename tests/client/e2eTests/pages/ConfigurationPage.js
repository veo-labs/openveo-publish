'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var BackEndPage = e2e.pages.BackEndPage;

/**
 * Creates a new ConfigurationPage representing the publish configuration back end page.
 */
function ConfigurationPage() {
  ConfigurationPage.super_.call(this);

  // Page path
  this.path = 'be/publish/configuration';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('PUBLISH.CONFIGURATION.TITLE'));
  this.pageDescriptionElement = element(by.binding('PUBLISH.CONFIGURATION.INFO'));
  this.youtubeConfigurationTitleElement = element(by.binding('PUBLISH.CONFIGURATION.YOUTUBE_TITLE'));
  this.youtubePeerLinkElement = element(by.binding('\'PUBLISH.CONFIGURATION.YOUTUBE_PEER\''));
  this.youtubePeerModifyLinkElement = element(by.binding('PUBLISH.CONFIGURATION.YOUTUBE_MODIFY_PEER'));
}

module.exports = ConfigurationPage;
util.inherits(ConfigurationPage, BackEndPage);

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
ConfigurationPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageTitleElement), 5000, 'Missing configuration page title');
};

/**
 * Moves mouse over Youtube's configuration block title.
 *
 * @return {Promise} Promise resolving when mouse is over the title
 */
ConfigurationPage.prototype.setMouseOverYoutubeTitle = function() {
  return browser.actions().mouseMove(this.youtubeConfigurationTitleElement).perform();
};

/**
 * Gets Youtube block content as text.
 *
 * @return {Promise} Promise resolving with block text
 */
ConfigurationPage.prototype.getYoutubeBlockText = function() {
  var self = this;

  return browser.waitForAngular().then(function() {
    var blockElement = self.youtubeConfigurationTitleElement.element(by.xpath('..')).element(by.css('.panel-body'));
    return blockElement.getText();
  });
};
