'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var ConfigurationHelper = process.requirePublish('tests/client/e2eTests/helpers/ConfigurationHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page', function() {
  var page;
  var configurationHelper;
  var defaultSettings;

  // Prepare page
  before(function() {
    var coreApi = process.api.getCoreApi();
    configurationHelper = new ConfigurationHelper(coreApi.settingProvider);
    page = new ConfigurationPage();
    page.logAsAdmin();
    configurationHelper.getEntities().then(function(settings) {
      defaultSettings = settings;
    });
    page.load();
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  // Reload page after each test and remove all configurations
  afterEach(function() {
    configurationHelper.removeAllEntities(defaultSettings);
    page.refresh();
  });

  it('should display page title', function() {
    assert.eventually.ok(page.pageTitleElement.isPresent());
  });

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  describe('Youtube', function() {

    it('should display configuration panel', function() {
      assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE));
    });

    it('should display a specific message and link if no Google account is associated', function() {
      assert.eventually.equal(page.getYoutubePeerLink(), page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER);
      assert.eventually.equal(page.getPanelText(page.translations.PUBLISH.CONFIGURATION.YOUTUBE_TITLE),
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER_NOT_ASSOCIATED_STATUS + '\n' +
                              page.translations.PUBLISH.CONFIGURATION.YOUTUBE_PEER
                             );
    });

    it('should display a specific message and link if a Google account is associated', function() {

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
    });

  });

  describe('Medias', function() {

    it('should display configuration panel', function() {
      assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.MEDIAS_TITLE));
    });

    it('should not display an owner nor a group by default', function() {
      assert.eventually.equal(page.getMediasDefaultOwner(), page.translations.CORE.UI.NONE);
      assert.eventually.equal(page.getMediasDefaultGroup(), page.translations.CORE.UI.NONE);
    });

    it('should display actual default owner and group if specified', function() {
      var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
      var expectedGroup = datas.groups.publishGroup1;
      configurationHelper.addEntities([{
        id: 'publish-medias',
        value: {
          owner: expectedOwner.id,
          group: 'publishGroup1'
        }
      }]);

      page.refresh();

      assert.eventually.equal(page.getMediasDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getMediasDefaultGroup(), expectedGroup.name);
    });

    it('should be able to change the default owner and group', function() {
      var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
      var expectedGroup = datas.groups.publishGroup1;

      assert.isFulfilled(page.editMediasSettings(expectedOwner.name, expectedGroup.name));

      assert.eventually.equal(page.getMediasDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getMediasDefaultGroup(), expectedGroup.name);

      page.refresh();

      assert.eventually.equal(page.getMediasDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getMediasDefaultGroup(), expectedGroup.name);
    });

    it('should be able to set no default owner nor group', function() {
      page.editMediasSettings(page.translations.CORE.UI.NONE, page.translations.CORE.UI.NONE);
      page.refresh();
      assert.eventually.equal(page.getMediasDefaultOwner(), page.translations.CORE.UI.NONE);
      assert.eventually.equal(page.getMediasDefaultGroup(), page.translations.CORE.UI.NONE);
    });

  });

});
