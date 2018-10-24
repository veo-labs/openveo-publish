'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var BackEndPage = e2e.pages.BackEndPage;
var Field = e2e.fields.Field;
var browserExt = e2e.browser;

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

/**
 * Gets fields of the watcher settings form.
 *
 * @param {Object} panelElement The panel element finder
 * @return {Object} The list of fields
 */
ConfigurationPage.prototype.getWatcherSettingsFields = function(panelElement) {
  return {
    owner: Field.get({
      type: 'select',
      name: this.translations.PUBLISH.CONFIGURATION.WATCHER_DEFAULT_OWNER,
      baseElement: panelElement
    }),
    group: Field.get({
      type: 'select',
      name: this.translations.PUBLISH.CONFIGURATION.WATCHER_DEFAULT_GROUP,
      baseElement: panelElement
    })
  };
};

/**
 * Gets fields of the TLS settings form.
 *
 * @param {Object} panelElement The panel element finder
 * @param {Array} propertiesAvailableOptions The available options for properties field
 * @return {Object} The list of fields
 */
ConfigurationPage.prototype.getTlsSettingsFields = function(panelElement, propertiesAvailableOptions) {
  return {
    properties: Field.get({
      type: 'tags',
      name: this.translations.PUBLISH.CONFIGURATION.TLS_PROPERTIES,
      baseElement: panelElement,
      availableOptions: propertiesAvailableOptions
    })
  };
};

/**
 * Gets watcher default owner.
 *
 * @param {Boolean} literal true to get the literal instead, false to get field value
 * @return {Promise} Promise resolving with watcher default owner
 */
ConfigurationPage.prototype.getWatcherDefaultOwner = function(literal) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE).then(function(panelElement) {
    if (literal)
      return self.getWatcherSettingsFields(panelElement).owner.getText();
    else
      return self.getWatcherSettingsFields(panelElement).owner.getValue();
  });
};

/**
 * Gets watcher default group.
 *
 * @param {Boolean} literal true to get the literal instead, false to get field value
 * @return {Promise} Promise resolving with watcher default group
 */
ConfigurationPage.prototype.getWatcherDefaultGroup = function(literal) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE).then(function(panelElement) {
    if (literal)
      return self.getWatcherSettingsFields(panelElement).group.getText();
    else
      return self.getWatcherSettingsFields(panelElement).group.getValue();
  });
};

/**
 * Sets watcher settings.
 *
 * @param {String} ownerName The name of the default owner
 * @param {String} group The name of the default group
 * @return {Promise} Promise resolving when watcher settings have been saved
 */
ConfigurationPage.prototype.editWatcherSettings = function(owner, group) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE).then(function(panelElement) {
    var fields = self.getWatcherSettingsFields(panelElement);
    fields.owner.setValue(owner);
    fields.group.setValue(group);
    return browserExt.click(panelElement.element(by.binding('CORE.UI.FORM_SAVE')));
  });
};

/**
 * Gets TLS properties.
 *
 * @param {Boolean} literal true to get the literal instead, false to get field value
 * @return {Promise} Promise resolving with the list of TLS properties
 */
ConfigurationPage.prototype.getTlsProperties = function(literal) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.TLS_TITLE).then(function(panelElement) {
    if (literal)
      return self.getTlsSettingsFields(panelElement).properties.getText();
    else
      return self.getTlsSettingsFields(panelElement).properties.getValue();
  });
};

/**
 * Sets TLS settings.
 *
 * @param {Array} properties The list of property names
 * @param {Boolean} useAutoCompletion true to use auto completion to add properties, false to set properties manually
 * @param {Array} propertiesAvailableOptions The list of available options for properties field
 * @return {Promise} Promise resolving when TLS settings have been saved
 */
ConfigurationPage.prototype.editTlsSettings = function(properties, useAutoCompletion, propertiesAvailableOptions) {
  var self = this;

  return this.getPanel(self.translations.PUBLISH.CONFIGURATION.TLS_TITLE).then(function(panelElement) {
    var fields = self.getTlsSettingsFields(panelElement, propertiesAvailableOptions);

    if (useAutoCompletion)
      fields.properties.setValueUsingAutoCompletion(properties);
    else
      fields.properties.setValue(properties);

    return browserExt.click(panelElement.element(by.binding('CORE.UI.FORM_SAVE')));
  });
};
