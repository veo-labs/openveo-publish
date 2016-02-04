'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var PropertyPage = process.requirePublish('tests/client/e2eTests/pages/PropertyPage.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var propertyHelper = process.requirePublish('tests/client/e2eTests/helpers/propertyHelper.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Property page translations', function() {
  var page;

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
        page.addLinesByPass([
          {
            name: 'test translations',
            description: 'test translations description',
            type: page.translations.PROPERTIES.FORM_ADD_TEXT_TYPE
          }
        ]).then(function(addedLines) {
          lines = addedLines;
        });

        // Page translations
        assert.eventually.equal(page.getTitle(), page.translations.PROPERTIES.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), page.translations.PROPERTIES.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.PROPERTIES.INFO);
        assert.eventually.equal(page.addFormLabelElement.getText(), page.translations.PROPERTIES.ADD_PROPERTY);

        // Add form translations
        page.openAddForm();
        var addFormFields = page.getAddFormFields(page.addFormElement);
        var nameField = addFormFields.name;
        var descriptionField = addFormFields.description;
        var typeField = addFormFields.type;
        assert.eventually.equal(nameField.getLabel(), page.translations.PROPERTIES.ATTR_NAME);
        assert.eventually.equal(nameField.getDescription(), page.translations.PROPERTIES.FORM_ADD_NAME_DESC);
        assert.eventually.equal(descriptionField.getLabel(), page.translations.PROPERTIES.ATTR_DESCRIPTION);
        assert.eventually.equal(descriptionField.getDescription(),
                                page.translations.PROPERTIES.FORM_ADD_DESCRIPTION_DESC);
        assert.eventually.equal(typeField.getLabel(), page.translations.PROPERTIES.ATTR_TYPE);
        assert.eventually.equal(typeField.getDescription(), page.translations.PROPERTIES.FORM_ADD_TYPE_DESC);
        assert.eventually.equal(page.addButtonElement.getText(), page.translations.UI.FORM_ADD);
        page.closeAddForm();

        // Search engine translations
        page.searchLinkElement.getText().then(function(text) {
          assert.equal(text.trim(), page.translations.UI.SEARCH_BY);
        });

        var searchFields = page.getSearchFields(page.searchFormElement);
        var searchNameField = searchFields.name;
        var searchDescriptionField = searchFields.description;
        assert.eventually.equal(searchNameField.getLabel(), page.translations.PROPERTIES.TITLE_FILTER);
        assert.eventually.equal(searchDescriptionField.getLabel(), page.translations.PROPERTIES.DESCRIPTION_FILTER);

        // All actions translations
        page.setSelectAllMouseOver();
        assert.eventually.equal(page.popoverElement.getAttribute('content'), page.translations.UI.SELECT_ALL);

        page.selectAllLines();
        browserExt.click(page.actionsButtonElement);
        var removeActionElement = page.actionsElement.element(by.cssContainingText('a', page.translations.UI.REMOVE));
        assert.eventually.ok(removeActionElement.isDisplayed(), 'Missing all remove action');

        // Headers translations
        assert.eventually.ok(page.isTableHeader(page.translations.PROPERTIES.NAME_COLUMN), 'Missing name column');
        assert.eventually.ok(page.isTableHeader(page.translations.UI.ACTIONS_COLUMN), 'Missing actions column');

        // Individual actions
        return browser.waitForAngular().then(function() {
          page.getLine(lines[0].name).then(function(line) {
            var actionTd = line.all(by.css('td')).last();
            var actionButton = actionTd.element(by.css('button'));
            var removeActionElement = actionTd.element(by.cssContainingText('a', page.translations.UI.REMOVE));

            browserExt.click(actionButton).then(function() {
              assert.eventually.ok(removeActionElement.isDisplayed(), 'Missing remove action');
            });
          }, function(error) {
            assert.ok(false, error.message);
          });

          return page.removeLinesByPass(lines);
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
    page = new PropertyPage(new PropertyModel());
    page.logAsAdmin();
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Remove all properties after each tests then reload the page
  afterEach(function() {
    propertyHelper.removeAllProperties();
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
