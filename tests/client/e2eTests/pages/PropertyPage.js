'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Field = e2e.Field;
var TablePage = e2e.TablePage;
var browserExt = e2e.browser;

/**
 * Creates a new PropertyPage representing the properties back end page.
 */
function PropertyPage(model) {
  PropertyPage.super_.call(this, model);

  // Page path
  this.path = 'be/publish/properties';

  // Element finders specific to this page
  this.pageTitleElement = element(by.binding('PROPERTIES.TITLE'));
  this.pageDescriptionElement = element(by.binding('PROPERTIES.INFO'));
  this.addFormLabelElement = element(by.binding('PROPERTIES.ADD_PROPERTY'));
}

module.exports = PropertyPage;
util.inherits(PropertyPage, TablePage);

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
PropertyPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageTitleElement), 5000, 'Missing properties page title');
};

/**
 * Gets search form fields.
 *
 * @param {ElementFinder} Search engine element
 * @return {Object} The list of fields
 */
PropertyPage.prototype.getSearchFields = function(form) {
  var fields = {};

  // Name field
  fields.name = Field.get({
    type: 'text',
    name: this.translations.PROPERTIES.TITLE_FILTER,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'text',
    name: this.translations.PROPERTIES.DESCRIPTION_FILTER,
    baseElement: form
  });

  return fields;
};

/**
 * Gets add form fields.
 *
 * @param {ElementFinder} Add form element
 * @return {Object} The list of fields
 */
PropertyPage.prototype.getAddFormFields = function(form) {
  var fields = {};

  // Name field
  fields.name = Field.get({
    type: 'text',
    name: this.translations.PROPERTIES.ATTR_NAME,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'text',
    name: this.translations.PROPERTIES.ATTR_DESCRIPTION,
    baseElement: form
  });

  // Type field
  fields.type = Field.get({
    type: 'select',
    name: this.translations.PROPERTIES.ATTR_TYPE,
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
PropertyPage.prototype.getEditFormFields = function(form) {
  return this.getAddFormFields(form);
};

/**
 * Adds a new user.
 *
 * User must be logged and have permission to create users.
 *
 * @param {String} name User name
 * @param {Array} data User's email, password and roles
 * @return {Promise} Promise resolving when the user has been added
 */
PropertyPage.prototype.addLine = function(name, data) {
  var self = this;

  // Open add form
  return this.openAddForm().then(function() {
    var fields = self.getAddFormFields(self.addFormElement);

    // Set name, description and type
    fields.name.setValue(data.name || name);
    fields.description.setValue(data.description);
    fields.type.setValue(data.type);

    // Click the add button
    browserExt.click(self.addButtonElement);

    // Close add form
    return self.closeAddForm();

  });
};

/**
 * Edits a property.
 *
 * @param {String} name Property name
 * @param {Array} data Property's description and type
 * @return {Promise} Promise resolving when the save button is clicked
 */
PropertyPage.prototype.editProperty = function(name, data) {
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
    if (data.type !== undefined)
      fields.type.setValue(data.type);

    // Click on save button
    return browserExt.click(self.lineDetailElement.element(by.binding('UI.FORM_SAVE')));
  });
};

/**
 * Adds multiple lines at the same time with automatic index.
 *
 * Some additional fields are required to create a property.
 *
 * @param {String} name Base name of the lines to add
 * @param {Number} total Number of lines to add
 * @param {Number} offset Index to start from for the name suffix
 * @param {Boolean} [refresh=true] Request for a refresh
 * @return {Promise} Promise resolving when lines are added and browser page has been reloaded
 */
PropertyPage.prototype.addLinesByPassAuto = function(name, total, offset, refresh) {
  var lines = [];
  offset = offset || 0;

  for (var i = offset; i < total; i++) {
    lines.push({
      name: name + ' ' + i,
      description: name + ' description ' + i,
      type: this.translations.PROPERTIES.FORM_ADD_TEXT_TYPE
    });
  }

  return this.addLinesByPass(lines, refresh);
};
