'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var CategoryPage = process.requirePublish('tests/client/e2eTests/pages/CategoryPage.js');
var CategoryModel = process.requirePublish('app/server/models/CategoryModel.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Category page translations', function() {
  var page, categoryHelper;

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

        // Page translations
        assert.eventually.equal(page.getTitle(), page.translations.PUBLISH.CATEGORIES.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), page.translations.PUBLISH.CATEGORIES.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.PUBLISH.CATEGORIES.INFO);
        assert.eventually.equal(page.addFieldElement.getAttribute('placeholder'),
                                page.translations.PUBLISH.CATEGORIES.NEW_ITEM);

        // Add form
        page.setAddFieldMouseOver();
        assert.eventually.equal(page.popoverElement.getText(), page.translations.PUBLISH.CATEGORIES.NAME_ELEMENT);

        page.setAddButtonMouseOver();
        assert.eventually.equal(page.popoverElement.getText(), page.translations.PUBLISH.CATEGORIES.ADD_ELEMENT);
        assert.eventually.equal(page.saveButtonElement.getText(), page.translations.CORE.UI.FORM_SAVE);
        assert.eventually.equal(page.cancelButtonElement.getText(), page.translations.CORE.UI.FORM_CANCEL);

        return browser.waitForAngular();
      }).then(function() {
        return checkTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  // Prepare page
  before(function() {
    var categoryModel = new CategoryModel();
    categoryHelper = new CategoryHelper(categoryModel);
    page = new CategoryPage(categoryModel);
    page.logAsAdmin();
    page.load();
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  // Clean tree after each test and reload page
  afterEach(function() {
    categoryHelper.removeAllEntities();
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
