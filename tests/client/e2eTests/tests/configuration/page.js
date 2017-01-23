'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var ConfigurationHelper = process.requirePublish('tests/client/e2eTests/helpers/ConfigurationHelper.js');
var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var ConfigurationProvider = process.requirePublish('app/server/providers/ConfigurationProvider.js');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page', function() {
  var page, configurationHelper;

  // Prepare page
  before(function() {
    var coreApi = require('@openveo/api').api.getCoreApi();
    var model = new ConfigurationModel(new ConfigurationProvider(coreApi.getDatabase()));
    configurationHelper = new ConfigurationHelper(model);
    page = new ConfigurationPage();
    page.logAsAdmin();
    page.load();
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  // Reload page after each test and remove all configurations
  afterEach(function() {
    configurationHelper.removeAllEntities();
    page.refresh();
  });

  it('should display page title', function() {
    assert.eventually.ok(page.pageTitleElement.isPresent());
  });

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  describe('Youtube block', function() {

    it('should display configuration block', function() {
      assert.eventually.ok(page.youtubeConfigurationTitleElement.isPresent());
    });

    it('should display a specific message and link if no Google account is associated', function() {
      assert.eventually.ok(page.youtubePeerLinkElement.isPresent());
      assert.eventually.equal(page.getYoutubeBlockText(),
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_NOT_ASSOCIATED_STATUS + '\n' +
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER
                             );
    });

    it('should display a specific message and link if a Google account is associated', function() {

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
    });

  });

});
