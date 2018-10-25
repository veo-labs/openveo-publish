'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var ConfigurationHelper = process.requirePublish('tests/client/e2eTests/helpers/ConfigurationHelper.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page translations', function() {
  var page;
  var configurationHelper;
  var defaultSettings;

  /**
   * Validates Youtube settings translations.
   */
  function checkYoutubeSettings() {

    // Youtube panel title
    assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE));
    assert.eventually.equal(
      page.getPanelInformation(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE),
      page.translations.PUBLISH.CONFIGURATION.YOUTUBE_INFO
    );

    // Youtube with no associated account
    assert.eventually.equal(page.getPanelText(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE),
                          page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_NOT_ASSOCIATED_STATUS + '\n' +
                          page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER
                         );

    // Youtube with an associated account
    // Associate a fake Google account
    configurationHelper.addEntities([{
      id: 'publish-googleOAuthTokens',
      value: {
        access_token: 'accessToken',
        token_type: 'Bearer',
        refresh_token: 'refreshToken',
        expiry_date: new Date().getTime()
      }
    }]);
    page.refresh();
    assert.eventually.equal(page.getYoutubePeerLink(), page.translations.PUBLISH.CONFIGURATION.YOUTUBE_MODIFY_PEER);
    assert.eventually.equal(page.getPanelText(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE),
                            page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_ASSOCIATED_STATUS + '\n' +
                            page.translations.PUBLISH.CONFIGURATION.YOUTUBE_MODIFY_PEER
                           );
  }

  /**
   * Validates watcher settings translations.
   */
  function checkWatcherSettings() {

    // Watcher panel title
    assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE));
    assert.eventually.equal(
      page.getPanelInformation(page.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE),
      page.translations.PUBLISH.CONFIGURATION.WATCHER_INFO
    );

    // Watcher without owner nor group
    assert.eventually.equal(page.getWatcherDefaultOwner(), page.translations.CORE.UI.NONE);
    assert.eventually.equal(page.getWatcherDefaultGroup(), page.translations.CORE.UI.NONE);

    // Watcher formular button
    page.getPanel(page.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE).then(function(panelElement) {
      assert.eventually.ok(panelElement.element(by.binding('CORE.UI.FORM_SAVE')).isPresent());
    });

  }

  /**
   * Validates TLS settings translations.
   */
  function checkTlsSettings() {

    // TLS panel title
    assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.TLS_TITLE));
    assert.eventually.equal(
      page.getPanelInformation(page.translations.PUBLISH.CONFIGURATION.TLS_TITLE),
      page.translations.PUBLISH.CONFIGURATION.TLS_INFO
    );

    // TLS formular button
    page.getPanel(page.translations.PUBLISH.CONFIGURATION.TLS_TITLE).then(function(panelElement) {
      assert.eventually.ok(panelElement.element(by.binding('CORE.UI.FORM_SAVE')).isPresent());
    });

  }

  /**
   * Validates catalog settings translations.
   */
  function checkCatalogSettings() {

    // Catalog panel title
    assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.CATALOG_TITLE));
    assert.eventually.equal(
      page.getPanelInformation(page.translations.PUBLISH.CONFIGURATION.CATALOG_TITLE),
      page.translations.PUBLISH.CONFIGURATION.CATALOG_INFO
    );

    // Catalog without refresh interval
    assert.eventually.isEmpty(page.getCatalogRefreshInterval());

    // Catalog formular button
    page.getPanel(page.translations.PUBLISH.CONFIGURATION.CATALOG_TITLE).then(function(panelElement) {
      assert.eventually.ok(panelElement.element(by.binding('CORE.UI.FORM_SAVE')).isPresent());
    });

  }

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
        assert.eventually.equal(page.getTitle(), page.translations.PUBLISH.CONFIGURATION.PAGE_TITLE);
        assert.eventually.equal(page.pageTitleElement.getText(), page.translations.PUBLISH.CONFIGURATION.TITLE);
        assert.eventually.equal(page.pageDescriptionElement.getText(), page.translations.PUBLISH.CONFIGURATION.INFO);

        checkYoutubeSettings();
        checkWatcherSettings();
        checkTlsSettings();
        checkCatalogSettings();

        configurationHelper.removeAllEntities(defaultSettings);
        page.refresh();
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
    configurationHelper = new ConfigurationHelper(process.api.getCoreApi().settingProvider);
    page = new ConfigurationPage();
    page.logAsAdmin();
    configurationHelper.getEntities().then(function(settings) {
      defaultSettings = settings;
    });
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Reload page after each test and remove all configurations
  afterEach(function() {
    configurationHelper.removeAllEntities(defaultSettings);
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
