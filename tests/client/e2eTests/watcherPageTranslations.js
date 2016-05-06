'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Watcher page translations', function() {
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

        // Page translations
        assert.eventually.equal(page.getTitle(), page.translations.PUBLISH.WATCHER.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), page.translations.PUBLISH.WATCHER.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.PUBLISH.WATCHER.INFO);

        page.startWatcher();

        assert.eventually.equal(page.startedAlertElement.getText(), page.translations.PUBLISH.WATCHER.STARTED);
        assert.eventually.equal(page.stopButtonElement.getText(), page.translations.PUBLISH.WATCHER.STOP_BUTTON);

        page.stopWatcher();

        assert.eventually.equal(page.startButtonElement.getText(), page.translations.PUBLISH.WATCHER.START_BUTTON);
        assert.eventually.equal(page.stoppedAlertElement.getText(), page.translations.PUBLISH.WATCHER.STOPPED);

        return browser.waitForAngular();
      }).then(function() {
        return checkTranslations(++index);
      });
    } else {
      return protractor.promise.fulfilled();
    }
  }

  // Load page
  before(function() {
    page = new WatcherPage();
    page.logAsAdmin();
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Reload page after each test
  afterEach(function() {
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
