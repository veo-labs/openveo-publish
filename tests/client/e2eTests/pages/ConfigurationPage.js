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
 * Gets a panel.
 *
 * @param {String} name The title of the panel
 * @return {Promise} Promise resolving with the panel (element finder)
 */
ConfigurationPage.prototype.getPanel = function(name) {
  var panelElement;
  var deferred = protractor.promise.defer();

  // Get all panel headings
  element.all(by.css('.panel-heading')).each(function(panelHeading, index) {

    // Get panel title
    panelHeading.getText().then(function(text) {

      // Panel title corresponds to the searched title
      // Return parent element
      if (text.replace(/ ?[\*:]?$/, '') === name.toUpperCase())
        panelElement = panelHeading.element(by.xpath('..'));

    });
  }).then(function() {
    if (panelElement)
      deferred.fulfill(panelElement);
    else
      deferred.reject(new Error('"' + name + '" panel not found'));
  }, function(error) {
    deferred.reject(new Error('"' + name + '" panel not found (' + error.message + ')'));
  });

  return deferred.promise;
};

/**
 * Gets panel information popover.
 *
 * @param {String} name The title of the panel
 * @return {Promise} Promise resolving with the panel information text
 */
ConfigurationPage.prototype.getPanelInformation = function(name) {
  var self = this;

  return this.getPanel(name).then(function(panelElement) {
    browser.actions().mouseMove(panelElement.element(by.css('.panel-heading'))).perform();
    return self.popoverElement.getAttribute('content');
  }).then(function(panelTitle) {

    // Spaces in popover are replaced by no-break space charaters
    return protractor.promise.fulfilled(panelTitle.replace(/\u00A0/g, ' '));

  });
};

/**
 * Gets panel body text.
 *
 * @param {String} name The title of the panel
 * @return {Promise} Promise resolving with the panel text
 */
ConfigurationPage.prototype.getPanelText = function(name) {
  return this.getPanel(name).then(function(panelElement) {
    return panelElement.element(by.css('.panel-body')).getText();
  });
};

/**
 * Gets Youtube peer link.
 *
 * @return {Promise} Promise resolving with Youtube panel peer link
 */
ConfigurationPage.prototype.getYoutubePeerLink = function(name) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE).then(function(panelElement) {
    return panelElement.element(by.css('a')).getText();
  });
};
