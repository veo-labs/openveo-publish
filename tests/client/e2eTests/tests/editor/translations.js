'use strict';

var path = require('path');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var EditorPage = process.requirePublish('tests/client/e2eTests/pages/EditorPage.js');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Editor page translations', function() {
  var page;
  var medias;
  var mediaId = 'test-editor-page-translations';
  var mediaFilePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages');
  var mediaFileName = 'blank.mp4';
  var mediaHelper;

  // Create a media content
  before(function() {
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    var mediaPage = new MediaPage(videoProvider);
    page = new EditorPage(mediaId);
    mediaHelper = new MediaHelper(videoProvider);

    mediaPage.logAsAdmin();
    mediaPage.load();

    mediaHelper.createMedia(mediaId, mediaFilePath, mediaFileName, STATES.PUBLISHED).then(
      function(mediasAdded) {
        medias = mediasAdded;
        page.logAsAdmin();
        return page.load();
      }
    );
  });

  // Remove media content
  after(function() {
    mediaHelper.removeEntities(medias);
    page.logout();
  });

  // Clear all cut and chapters before each test
  afterEach(function() {
    mediaHelper.clearChapters(mediaId);
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
        assert.eventually.equal(page.getTitle(), page.translations.PUBLISH.EDITOR.PAGE_TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.PUBLISH.EDITOR.INFO);
        assert.eventually.equal(page.backButtonElement.getText(), page.translations.CORE.UI.BACK);
        assert.eventually.equal(page.newButtonElement.getText(), page.translations.CORE.UI.FORM_NEW);
        assert.eventually.equal(page.editButtonElement.getText(), page.translations.CORE.UI.FORM_EDIT);
        assert.eventually.equal(page.removeButtonElement.getText(), page.translations.CORE.UI.REMOVE);

        // Add form
        browserExt.click(page.newButtonElement);
        var addFormFields = page.getAddFormFields(page.formElement);
        var timeField = addFormFields.time;
        var titleField = addFormFields.title;
        var descriptionField = addFormFields.description;
        assert.eventually.equal(timeField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TIME);
        assert.eventually.equal(titleField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TITLE);
        assert.eventually.equal(descriptionField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_DESCRIPTION);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.CORE.UI.FORM_ADD);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.CORE.UI.FORM_CANCEL);

        // Begin cut
        page.setMouseOverCutButton(true);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.PUBLISH.EDITOR.ADD_BEGIN);

        });
        var cutEditFormFields = page.getEditFormFields(page.formElement, 'cut');
        var cutTimeField = cutEditFormFields.time;
        var cutTitleField = cutEditFormFields.title;
        page.addCut(0.1, true);
        assert.eventually.equal(page.timeHeaderElement.getText(), page.translations.PUBLISH.EDITOR.HEAD_TIME);
        assert.eventually.equal(page.titleHeaderElement.getText(), page.translations.PUBLISH.EDITOR.HEAD_TITLE);
        page.selectLine(page.translations.CORE.UI.BEGIN);
        browserExt.click(page.editButtonElement);
        assert.eventually.equal(cutTimeField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TIME);
        assert.eventually.equal(cutTitleField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TITLE);
        assert.eventually.equal(page.getCutTitle(cutTitleField), page.translations.CORE.UI.BEGIN);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.CORE.UI.FORM_SAVE);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.CORE.UI.FORM_CANCEL);
        page.setMouseOverCutButton(true);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.PUBLISH.EDITOR.REMOVE_BEGIN);

        });
        page.removeCut(true);

        // End cut
        page.setMouseOverCutButton(false);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.PUBLISH.EDITOR.ADD_END);

        });
        page.addCut(0.8, false);
        assert.eventually.equal(page.timeHeaderElement.getText(), page.translations.PUBLISH.EDITOR.HEAD_TIME);
        assert.eventually.equal(page.titleHeaderElement.getText(), page.translations.PUBLISH.EDITOR.HEAD_TITLE);
        page.selectLine(page.translations.CORE.UI.END);
        browserExt.click(page.editButtonElement);
        assert.eventually.equal(cutTimeField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TIME);
        assert.eventually.equal(cutTitleField.getLabel(), page.translations.PUBLISH.EDITOR.FORM_TITLE);
        assert.eventually.equal(page.getCutTitle(cutTitleField), page.translations.CORE.UI.END);
        assert.eventually.equal(page.saveButtonElements.get(0).getText(), page.translations.CORE.UI.FORM_SAVE);
        assert.eventually.equal(page.saveButtonElements.get(1).getText(), page.translations.CORE.UI.FORM_CANCEL);
        page.setMouseOverCutButton(false);
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.PUBLISH.EDITOR.REMOVE_END);

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
