'use strict';

var path = require('path');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var ChapterPage = process.requirePublish('tests/client/e2eTests/pages/ChapterPage.js');
var chapterHelper = process.requirePublish('tests/client/e2eTests/helpers/chapterHelper.js');
var mediaHelper = process.requirePublish('tests/client/e2eTests/helpers/mediaHelper.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Chapter page translations', function() {
  var page;
  var medias;
  var mediaId = 'test-chapters-page-translations';
  var mediaFilePath = path.join(process.rootPublish, 'tests/client/e2eTests/packages');
  var mediaFileName = 'blank.mp4';

  // Create a media content
  before(function() {
    page = new ChapterPage(mediaId);
    mediaHelper.createMedia(mediaId, mediaFilePath, mediaFileName).then(function(mediasAdded) {
      medias = mediasAdded;
      return page.load();
    });
  });

  // Remove media content
  after(function() {
    mediaHelper.removeMedias(medias);
    page.logout();
  });

  // Clear all cut and chapters before each test
  afterEach(function() {
    chapterHelper.clearChapters(mediaId);
    page.refresh();
  });

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
        assert.eventually.equal(page.getTitle(), page.translations.CHAPTER.PAGE_TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.CHAPTER.INFO);
        assert.eventually.equal(page.backButtonElement.getText(), page.translations.UI.BACK);
        assert.eventually.equal(page.timeHeaderElement.getText(), page.translations.CHAPTER.HEAD_TIME);
        assert.eventually.equal(page.titleHeaderElement.getText(), page.translations.CHAPTER.HEAD_TITLE);
        assert.eventually.equal(page.newButtonElement.getText(), page.translations.UI.FORM_NEW);
        assert.eventually.equal(page.editButtonElement.getText(), page.translations.UI.FORM_EDIT);
        assert.eventually.equal(page.removeButtonElement.getText(), page.translations.UI.REMOVE);

        // Add form
        browserExt.click(page.newButtonElement);
        var addFormFields = page.getAddFormFields(page.formElement);
        var timeField = addFormFields.time;
        var titleField = addFormFields.title;
        var descriptionField = addFormFields.description;
        assert.eventually.equal(timeField.getLabel(), page.translations.CHAPTER.FORM_TIME);
        assert.eventually.equal(titleField.getLabel(), page.translations.CHAPTER.FORM_TITLE);
        assert.eventually.equal(descriptionField.getLabel(), page.translations.CHAPTER.FORM_DESCRIPTION);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.UI.FORM_ADD);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.UI.FORM_CANCEL);

        // Begin cut
        page.setMouseOverCutButton(true);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.CHAPTER.ADD_BEGIN);

        });
        var cutEditFormFields = page.getEditFormFields(page.formElement, 'cut');
        var cutTimeField = cutEditFormFields.time;
        var cutTitleField = cutEditFormFields.title;
        page.addCut(0.1, true);
        page.selectLine(page.translations.UI.BEGIN);
        browserExt.click(page.editButtonElement);
        assert.eventually.equal(cutTimeField.getLabel(), page.translations.CHAPTER.FORM_TIME);
        assert.eventually.equal(cutTitleField.getLabel(), page.translations.CHAPTER.FORM_TITLE);
        assert.eventually.equal(page.getCutTitle(cutTitleField), page.translations.UI.BEGIN);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.UI.FORM_SAVE);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.UI.FORM_CANCEL);
        page.setMouseOverCutButton(true);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.CHAPTER.REMOVE_BEGIN);

        });
        page.removeCut(true);

        // End cut
        page.setMouseOverCutButton(false);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.CHAPTER.ADD_END);

        });
        page.addCut(0.8, false);
        page.selectLine(page.translations.UI.END);
        browserExt.click(page.editButtonElement);
        assert.eventually.equal(cutTimeField.getLabel(), page.translations.CHAPTER.FORM_TIME);
        assert.eventually.equal(cutTitleField.getLabel(), page.translations.CHAPTER.FORM_TITLE);
        assert.eventually.equal(page.getCutTitle(cutTitleField), page.translations.UI.END);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.UI.FORM_SAVE);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.UI.FORM_CANCEL);
        page.setMouseOverCutButton(false);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.CHAPTER.REMOVE_END);

        });
        page.removeCut(false);

        return browser.waitForAngular();
      }).then(function() {
        return checkTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
