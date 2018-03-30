'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var PropertyPage = process.requirePublish('tests/client/e2eTests/pages/PropertyPage.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Property page translations', function() {
  var page;
  var propertyHelper;
  var defaultSettings;

  /**
   * Checks translations.
   *
   * @param {Number} [index] Index of the language to test in the list of languages
   * @return {Promise} Promise resolving when translations have been tested
   */
  function checkTranslations(index) {
    index = index || 0;
    var languages = page.getLanguages();

    if (index < languages.length) {
      return page.selectLanguage(languages[index]).then(function() {
        var lines;
        propertyHelper.addEntities([
          {
            name: 'test translations',
            description: 'test translations description',
            type: PropertyProvider.TYPES.TEXT
          }
        ]).then(function(addedLines) {
          lines = addedLines;
          return page.refresh();
        });
        var coreTranslations = page.translations.CORE;
        var publishTranslations = page.translations.PUBLISH;

        // Page translations
        assert.eventually.equal(page.getTitle(), publishTranslations.PROPERTIES.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), publishTranslations.PROPERTIES.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), publishTranslations.PROPERTIES.INFO);
        assert.eventually.equal(page.addFormLabelElement.getText(), publishTranslations.PROPERTIES.ADD_PROPERTY);

        // Add form translations
        page.openAddForm();
        var addFormFields = page.getAddFormFields(page.addFormElement);
        var nameField = addFormFields.name;
        var descriptionField = addFormFields.description;
        var typeField = addFormFields.type;
        var listValuesField = addFormFields.listValues;
        assert.eventually.equal(nameField.getLabel(), publishTranslations.PROPERTIES.ATTR_NAME);
        assert.eventually.equal(nameField.getDescription(), publishTranslations.PROPERTIES.FORM_ADD_NAME_DESC);
        assert.eventually.equal(descriptionField.getLabel(), publishTranslations.PROPERTIES.ATTR_DESCRIPTION);
        assert.eventually.equal(descriptionField.getDescription(),
                                publishTranslations.PROPERTIES.FORM_ADD_DESCRIPTION_DESC);
        assert.eventually.equal(typeField.getLabel(), publishTranslations.PROPERTIES.ATTR_TYPE);
        assert.eventually.equal(typeField.getDescription(), publishTranslations.PROPERTIES.FORM_ADD_TYPE_DESC);
        assert.eventually.equal(page.addButtonElement.getText(), coreTranslations.UI.FORM_ADD);

        // Set name, description and type to display the list of values
        nameField.setValue('Name');
        descriptionField.setValue('Description');
        typeField.setValue(publishTranslations.PROPERTIES.FORM_ADD_LIST_TYPE);
        assert.eventually.equal(listValuesField.getLabel(), publishTranslations.PROPERTIES.ATTR_LIST_VALUES);
        assert.eventually.equal(listValuesField.getDescription(),
                                publishTranslations.PROPERTIES.FORM_ADD_LIST_VALUES_DESC);
        page.closeAddForm();

        // Search engine translations
        page.searchLinkElement.getText().then(function(text) {
          assert.equal(text.trim(), coreTranslations.UI.SEARCH_BY);
        });

        var searchFields = page.getSearchFields(page.searchFormElement);
        var searchQueryField = searchFields.query;
        var searchTypeField = searchFields.type;
        assert.eventually.equal(searchQueryField.getLabel(), publishTranslations.PROPERTIES.QUERY_FILTER);
        assert.eventually.equal(searchTypeField.getLabel(), publishTranslations.PROPERTIES.TYPE_FILTER);

        // All actions translations
        page.setSelectAllMouseOver();
        assert.eventually.equal(page.popoverElement.getAttribute('content'), coreTranslations.UI.SELECT_ALL);

        page.selectAllLines();
        browserExt.click(page.actionsButtonElement);
        var removeActionElement = page.actionsElement.element(by.cssContainingText('a', coreTranslations.UI.REMOVE));
        assert.eventually.ok(removeActionElement.isDisplayed(), 'Missing all remove action');

        // Headers translations
        assert.eventually.ok(page.isTableHeader(publishTranslations.PROPERTIES.NAME_COLUMN), 'Missing name column');
        assert.eventually.ok(page.isTableHeader(coreTranslations.UI.ACTIONS_COLUMN), 'Missing actions column');

        // Individual actions
        return browser.waitForAngular().then(function() {
          page.getLine(lines[0].name).then(function(line) {
            var actionTd = line.all(by.css('td')).last();
            var actionButton = actionTd.element(by.css('button'));
            var removeActionElement = actionTd.element(by.cssContainingText('a', coreTranslations.UI.REMOVE));

            browserExt.click(actionButton).then(function() {
              assert.eventually.ok(removeActionElement.isDisplayed(), 'Missing remove action');
            });
          }, function(error) {
            assert.ok(false, error.message);
          });

          propertyHelper.removeEntities(lines);
          return page.refresh();
        });
      }).then(function() {
        return checkTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  // Load page
  before(function() {
    var coreApi = process.api.getCoreApi();
    var database = coreApi.getDatabase();
    var propertyProvider = new PropertyProvider(database);
    propertyHelper = new PropertyHelper(propertyProvider);
    page = new PropertyPage(propertyProvider);
    page.logAsAdmin();
    propertyHelper.getEntities().then(function(settings) {
      defaultSettings = settings;
    });
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Remove all properties after each tests then reload the page
  afterEach(function() {
    propertyHelper.removeAllEntities(defaultSettings);
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
