'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page translations', function() {
  var page, mediaHelper;

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
        var coreTranslations = page.translations.CORE;
        var publishTranslations = page.translations.PUBLISH;

        // Page translations
        assert.eventually.equal(page.getTitle(), publishTranslations.MEDIAS.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), publishTranslations.MEDIAS.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), publishTranslations.MEDIAS.INFO);

        // Search engine translations
        page.searchLinkElement.getText().then(function(text) {
          assert.equal(text.trim(), coreTranslations.UI.SEARCH_BY);
        });

        page.openSearchEngine();
        var searchFields = page.getSearchFields(page.searchFormElement);
        var searchQueryField = searchFields.query;
        var searchFromField = searchFields.from;
        var searchToField = searchFields.to;
        var searchCategoryField = searchFields.category;
        var searchOwnerField = searchFields.owner;
        assert.eventually.equal(searchQueryField.getLabel(), publishTranslations.MEDIAS.QUERY_FILTER);
        assert.eventually.equal(searchFromField.getLabel(), publishTranslations.MEDIAS.START_DATE_FILTER);
        assert.eventually.equal(searchToField.getLabel(), publishTranslations.MEDIAS.END_DATE_FILTER);
        assert.eventually.equal(searchCategoryField.getLabel(), publishTranslations.MEDIAS.CATEGORY_FILTER);
        assert.eventually.equal(searchOwnerField.getLabel(), publishTranslations.MEDIAS.OWNER_FILTER);
        page.closeSearchEngine();

        // All actions translations
        page.setSelectAllMouseOver();
        assert.eventually.equal(page.popoverElement.getAttribute('content'), coreTranslations.UI.SELECT_ALL);

        page.selectAllLines();
        browserExt.click(page.actionsButtonElement);
        var removeActionElement = page.actionsElement.element(by.cssContainingText('a', coreTranslations.UI.REMOVE));
        assert.eventually.ok(removeActionElement.isDisplayed(), 'Missing all remove action');

        // Headers translations
        assert.eventually.ok(page.isTableHeader(publishTranslations.MEDIAS.NAME_COLUMN), 'Missing name column');
        assert.eventually.ok(page.isTableHeader(publishTranslations.MEDIAS.DATE_COLUMN), 'Missing date column');
        assert.eventually.ok(page.isTableHeader(publishTranslations.MEDIAS.CATEGORY_COLUMN), 'Missing category column');
        assert.eventually.ok(page.isTableHeader(publishTranslations.MEDIAS.STATUS_COLUMN), 'Missing status column');
        assert.eventually.ok(page.isTableHeader(coreTranslations.UI.ACTIONS_COLUMN), 'Missing actions column');

        return browser.waitForAngular();
      }).then(function() {
        return checkTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  /**
   * Checks a state translation.
   *
   * @param {Number} state The state to test
   * @return {Promise} Promise resolving when checked
   */
  function checkState(state) {
    return browser.waitForAngular().then(function() {
      var lines;
      var statusHeaderIndex;
      var linesToAdd = [
        {
          id: '0',
          state: state,
          title: 'Test state'
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd).then(function(addedLines) {
        lines = addedLines;
        return page.refresh();
      });

      // Get status header index
      page.getTableHeaderIndex(page.translations.PUBLISH.MEDIAS.STATUS_COLUMN).then(function(index) {
        statusHeaderIndex = index;
        return page.getLineCells(linesToAdd[0].title);
      }).then(function(cells) {

        // Test media state label
        if (state === STATES.ERROR)
          assert.equal(cells[statusHeaderIndex].indexOf(page.translations.PUBLISH.MEDIAS['STATE_' + state]), 0);
        else
          assert.equal(cells[statusHeaderIndex], page.translations.PUBLISH.MEDIAS['STATE_' + state]);
      });

      // Remove lines
      return browser.waitForAngular().then(function() {
        mediaHelper.removeEntities(lines);
        return page.refresh();
      });
    });
  }

  /**
   * Checks states translations.
   *
   * @param {Array} states The list of states to test
   * @param {Number} [index] Index of the state to test in the list of states
   * @return {Promise} Promise resolving when translations have been tested
   */
  function checkStates(states, index) {
    index = index || 0;

    if (index < states.length) {
      return checkState(states[index]).then(function() {
        return checkStates(states, ++index);
      });
    } else
      return protractor.promise.fulfilled();
  }

  /**
   * Checks translations of all media state labels for each language.
   *
   * @param {Number} [index] Index of the language to test in the list of languages
   * @return {Promise} Promise resolving when translations have been tested
   */
  function checkStateTranslations(index) {
    index = index || 0;
    var languages = page.getLanguages();
    var states = [];

    for (var stateName in STATES)
      states.push(STATES[stateName]);

    if (index < languages.length) {
      return page.selectLanguage(languages[index]).then(function() {

        // Check states translations
        return checkStates(states);

      }).then(function() {
        return checkStateTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  // Load page
  before(function() {
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    mediaHelper = new MediaHelper(videoProvider);
    page = new MediaPage(videoProvider);
    page.logAsAdmin();
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Remove all videos after each tests then reload the page
  afterEach(function() {
    mediaHelper.removeAllEntities();
    page.refresh();
  });

  it('should be available in different languages', function() {
    mediaHelper.addEntities([
      {
        id: '0',
        state: STATES.PUBLISHED,
        title: 'Test state'
      }
    ]);
    page.refresh();

    checkTranslations();
  });

  it('should be available for medias status in different languages', function() {
    checkStateTranslations();
  });

});
