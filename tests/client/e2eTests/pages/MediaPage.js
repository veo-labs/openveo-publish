'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Field = e2e.Field;
var TablePage = e2e.TablePage;
var browserExt = e2e.browser;
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');

/**
 * Creates a new MediaPage representing the medias back end page.
 *
 * @param {EntityModel} model The model for medias CRUD to be able to add / remove medias by passing the
 * user agent
 */
function MediaPage(model) {
  MediaPage.super_.call(this, model);

  // Page path
  this.path = 'be/publish/medias';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('MEDIAS.TITLE'));
  this.pageDescriptionElement = element(by.binding('MEDIAS.INFO'));

  // The list of available media properties
  this.properties = null;

  // The list of available media categories
  this.categories = null;
}

module.exports = MediaPage;
util.inherits(MediaPage, TablePage);

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
MediaPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageTitleElement), 5000, 'Missing medias page title');
};

/**
 * Gets the list of media states as described in VideoModel.
 *
 * @return {Array} The list of media states
 */
MediaPage.prototype.getMediaStates = function() {
  var videoModelProperties = Object.keys(VideoModel);
  var states = [];

  for (var i = 0; i < videoModelProperties.length; i++) {
    if (/_STATE$/.test(videoModelProperties[i]))
      states.push(VideoModel[videoModelProperties[i]]);
  }

  return states;
};

/**
 * Gets search form fields.
 *
 * @param {ElementFinder} Search engine element
 * @return {Object} The list of fields
 */
MediaPage.prototype.getSearchFields = function(form) {
  var fields = {};

  // Name field
  fields.name = Field.get({
    type: 'text',
    name: this.translations.MEDIAS.TITLE_FILTER,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'text',
    name: this.translations.MEDIAS.DESCRIPTION_FILTER,
    baseElement: form
  });

  // Date field
  fields.date = Field.get({
    type: 'date',
    name: this.translations.MEDIAS.DATE_FILTER,
    baseElement: form
  });

  // Category field
  fields.category = Field.get({
    type: 'select',
    name: this.translations.MEDIAS.CATEGORY_FILTER,
    baseElement: form
  });

  return fields;
};

/**
 * Gets edit form fields.
 *
 * @param {ElementFinder} Edit form element
 * @return {Obect} The list of fields
 */
MediaPage.prototype.getEditFormFields = function(form) {
  var fields = {};

  // Name field
  fields.name = Field.get({
    type: 'text',
    name: this.translations.MEDIAS.ATTR_TITLE,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'text',
    name: this.translations.MEDIAS.ATTR_DESCRIPTION,
    baseElement: form
  });

  // Category field
  fields.category = Field.get({
    type: 'select',
    name: this.translations.MEDIAS.ATTR_CATEGORY,
    baseElement: form
  });

  return fields;
};

/**
 * Edits a media.
 *
 * @example
 *
 *     // Media data
 *     var data = {
 *       name: 'My media new name',
 *       description: 'My media description',
 *       category: '1564654123',
 *       properties: {
 *         '12354654': 'Property 1 value',
 *         '53487878': 'Property 2 value'
 *       }
 *     });
 *     editMedia('My media', data);
 *
 * @param {String} name Media name
 * @param {Array} data Media's data
 * @return {Promise} Promise resolving when media is saved
 */
MediaPage.prototype.editMedia = function(name, data) {
  var self = this;

  // Close eventually opened line
  return this.closeLine().then(function() {
    var formElement = self.lineDetailElement.element(by.css('.detail'));
    var fields = self.getEditFormFields(formElement);

    // Open line
    self.openLine(name);

    // Click on edit button
    browserExt.click(self.lineDetailElement.element(by.binding('UI.FORM_EDIT')));

    // Set name
    if (data.name !== undefined)
      fields.name.setValue(data.name);

    // Set description
    if (data.description !== undefined)
      fields.description.setValue(data.description);

    // Set type
    if (data.category !== undefined)
      fields.category.setValue(data.category);

    // Set custom properties
    if (data.properties) {
      for (var propertyId in data.properties) {
        var propertyName = self.getPropertyName(propertyId);
        var propertyField = Field.get({
          type: 'text',
          name: propertyName,
          baseElement: formElement
        });
        propertyField.setValue(data.properties[propertyName]);
      }
    }

    // Click on save button
    return browserExt.click(self.lineDetailElement.element(by.binding('UI.FORM_SAVE')));
  });
};

/**
 * Adds multiple medias at the same time with automatic index.
 *
 * Some additional fields are required to create a media.
 *
 * @param {String} name Base name of the lines to add
 * @param {Number} total Number of lines to add
 * @param {Number} offset Index to start from for the name suffix
 * @param {Boolean} [refresh=true] Request for a refresh
 * @return {Promise} Promise resolving when lines are added and browser page has been reloaded
 */
MediaPage.prototype.addLinesByPassAuto = function(name, total, offset, refresh) {
  var lines = [];
  var date = new Date();
  var states = [VideoModel.READY_STATE, VideoModel.PUBLISHED_STATE];
  var categories = this.getCategories();
  offset = offset || 0;

  for (var i = offset; i < total; i++) {
    date.setDate(date.getDate() + 1);
    lines.push({
      id: name + i,
      state: (i < states.length) ? states[i] : states[0],
      date: date.getTime(),
      title: name + ' ' + i,
      category: (i < categories.length) ? categories[i].id : categories[0].id,
      properties: this.getProperties(),
      packageType: 'tar',
      description: name + ' description ' + i
    });
  }

  return this.addLinesByPass(lines, refresh);
};

/**
 * Gets properties with null as default value.
 *
 * @return {Object} The list of properties with null as default value
 */
MediaPage.prototype.getProperties = function() {
  var properties = {};
  for (var i = 0; i < this.properties.length; i++)
    properties[this.properties[i].id] = null;

  return properties;
};

/**
 * Gets a property name.
 *
 * @param {String} id The property id
 * @return {String} The property name
 */
MediaPage.prototype.getPropertyName = function(id) {
  for (var i = 0; i < this.properties.length; i++) {
    if (this.properties[i].id === id)
      return this.properties[i].name;
  }

  return null;
};

/**
 * Gets the list of available categories.
 *
 * @return {Array} The list of available categories for medias
 */
MediaPage.prototype.getCategories = function(categories) {
  return this.categories.tree;
};

/**
 * Sets media available properties.
 *
 * @param {Array} properties The list of properties available for medias
 */
MediaPage.prototype.setProperties = function(properties) {
  this.properties = properties;
};

/**
 * Sets media available categories.
 *
 * @param {Object} categories The categories tree available for medias
 */
MediaPage.prototype.setCategories = function(categories) {
  this.categories = categories;
};
