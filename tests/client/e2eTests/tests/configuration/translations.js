'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var openVeoApi = require('@openveo/api');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var ConfigurationHelper = process.requirePublish('tests/client/e2eTests/helpers/ConfigurationHelper.js');
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var ConfigurationProvider = process.requirePublish('app/server/providers/ConfigurationProvider.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page translations', function() {
  var page, configurationHelper;

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

        // Youtube block title
        page.youtubeConfigurationTitleElement.getText().then(function(title) {
          assert.equal(title, page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE.toUpperCase());
        });
        page.setMouseOverYoutubeTitle();
        page.popoverElement.getAttribute('content').then(function(text) {

          // Spaces in popover are replaced by no-break space charaters
          assert.equal(text.replace(/\u00A0/g, ' '), page.translations.PUBLISH.CONFIGURATION.YOUTUBE_INFO);

        });

        // Youtube block with no associated account
        assert.eventually.equal(page.getYoutubeBlockText(),
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_NOT_ASSOCIATED_STATUS + '\n' +
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER
                             );

        // Youtube block with an associated account
        // Associate a fake Google account
        configurationHelper.addEntities([{
          googleOAuthTokens: {
            access_token: 'accessToken',
            token_type: 'Bearer',
            refresh_token: 'refreshToken',
            expiry_date: new Date().getTime()
          }
        }]);
        page.refresh();
        assert.eventually.ok(page.youtubePeerModifyLinkElement.isPresent());
        assert.eventually.equal(page.getYoutubeBlockText(),
                                page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_ASSOCIATED_STATUS + '\n' +
                                page.translations.PUBLISH.CONFIGURATION.YOUTUBE_MODIFY_PEER
                               );

        configurationHelper.removeAllEntities();
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
    var coreApi = openVeoApi.api.getCoreApi();
    var model = new ConfigurationModel(new ConfigurationProvider(coreApi.getDatabase()));
    configurationHelper = new ConfigurationHelper(model);
    page = new ConfigurationPage();
    page.logAsAdmin();
    page.load();
  });

  // Logout
  after(function() {
    page.logout();
  });

  // Reload page after each test and remove all configurations
  afterEach(function() {
    configurationHelper.removeAllEntities();
    page.refresh();
  });

  it('should be available in different languages', function() {
    return checkTranslations();
  });

});
