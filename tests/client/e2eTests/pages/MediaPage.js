'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Field = e2e.fields.Field;
var TablePage = e2e.pages.TablePage;
var browserExt = e2e.browser;
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');

/**
 * Creates a new MediaPage representing the medias back end page.
 *
 * @param {EntityProvider} provider The provider for medias CRUD to be able to add / remove medias by passing the
 * user agent
 */
function MediaPage(provider) {
  MediaPage.super_.call(this, provider);

  // Page path
  this.path = 'be/publish/medias-list';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('PUBLISH.MEDIAS.TITLE'));
  this.pageDescriptionElement = element(by.binding('PUBLISH.MEDIAS.INFO'));

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
 * Gets search form fields.
 *
 * @param {ElementFinder} Search engine element
 * @return {Object} The list of fields
 */
MediaPage.prototype.getSearchFields = function(form) {
  var fields = {};

  // Query field
  fields.query = Field.get({
    type: 'text',
    name: this.translations.PUBLISH.MEDIAS.QUERY_FILTER,
    baseElement: form
  });

  // Date field
  fields.date = Field.get({
    type: 'date',
    name: this.translations.PUBLISH.MEDIAS.DATE_FILTER,
    baseElement: form
  });

  // Category field
  fields.category = Field.get({
    type: 'select',
    name: this.translations.PUBLISH.MEDIAS.CATEGORY_FILTER,
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
    name: this.translations.PUBLISH.MEDIAS.ATTR_TITLE,
    baseElement: form
  });

  fields.date = Field.get({
    type: 'date',
    name: this.translations.PUBLISH.MEDIAS.ATTR_DATE,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'tinymce',
    name: this.translations.PUBLISH.MEDIAS.ATTR_DESCRIPTION,
    baseElement: form
  });

  // Category field
  fields.category = Field.get({
    type: 'select',
    name: this.translations.PUBLISH.MEDIAS.ATTR_CATEGORY,
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
    browserExt.click(self.lineDetailElement.element(by.binding('CORE.UI.FORM_EDIT')));

    // Set name
    if (data.name !== undefined)
      fields.name.setValue(data.name);

    // Set date
    if (data.date !== undefined)
      fields.date.setValue(data.date);

    // Set description
    if (data.description !== undefined)
      fields.description.setValue(data.description);

    // Set type
    if (data.category !== undefined)
      fields.category.setValue(data.category);

    // Set custom properties
    if (data.properties) {
      for (var propertyId in data.properties) {
        var property = self.getProperty(propertyId);
        var fieldType = 'text';

        if (property.type === PropertyProvider.TYPES.LIST) fieldType = 'select';
        if (property.type === PropertyProvider.TYPES.BOOLEAN) fieldType = 'checkbox';

        var propertyField = Field.get({
          type: fieldType,
          name: property.name,
          baseElement: formElement
        });
        propertyField.setValue(data.properties[property.id]);
      }
    }

    // Click on save button
    return browserExt.click(self.lineDetailElement.element(by.binding('CORE.UI.FORM_SAVE')));
  });
};

/**
 * Gets property information.
 *
 * @param {String} id The id of the property to retrieve
 * @return {Object} The property
 */
MediaPage.prototype.getProperty = function(id) {
  for (var i = 0; i < this.properties.length; i++) {
    if (this.properties[i].id === id)
      return this.properties[i];
  }

  return null;
};

/**
 * Gets properties.
 *
 * @return {Object} The list of properties
 */
MediaPage.prototype.getProperties = function() {
  return this.properties;
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
