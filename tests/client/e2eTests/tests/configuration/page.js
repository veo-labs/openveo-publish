'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var ConfigurationHelper = process.requirePublish('tests/client/e2eTests/helpers/ConfigurationHelper.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Configuration page', function() {
  var page;
  var configurationHelper;
  var propertyHelper;
  var defaultSettings;

  // Prepare page
  before(function() {
    var coreApi = process.api.getCoreApi();
    var propertyProvider = new PropertyProvider(coreApi.getDatabase());
    configurationHelper = new ConfigurationHelper(coreApi.settingProvider);
    propertyHelper = new PropertyHelper(propertyProvider);
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
    propertyHelper.removeAllEntities();
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

  describe('Watcher', function() {

    it('should display configuration panel', function() {
      assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.WATCHER_TITLE));
    });

    it('should not display an owner nor a group by default', function() {
      assert.eventually.equal(page.getWatcherDefaultOwner(), page.translations.CORE.UI.NONE);
      assert.eventually.equal(page.getWatcherDefaultGroup(), page.translations.CORE.UI.NONE);
    });

    it('should display actual default owner and group if specified', function() {
      var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
      var expectedGroup = datas.groups.publishGroup1;
      configurationHelper.addEntities([{
        id: 'publish-watcher',
        value: {
          owner: expectedOwner.id,
          group: 'publishGroup1'
        }
      }]);

      page.refresh();

      assert.eventually.equal(page.getWatcherDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getWatcherDefaultGroup(), expectedGroup.name);
    });

    it('should be able to change the default owner and group', function() {
      var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
      var expectedGroup = datas.groups.publishGroup1;

      assert.isFulfilled(page.editWatcherSettings(expectedOwner.name, expectedGroup.name));

      assert.eventually.equal(page.getWatcherDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getWatcherDefaultGroup(), expectedGroup.name);

      page.refresh();

      assert.eventually.equal(page.getWatcherDefaultOwner(), expectedOwner.name);
      assert.eventually.equal(page.getWatcherDefaultGroup(), expectedGroup.name);
    });

    it('should be able to set no default owner nor group', function() {
      page.editWatcherSettings(page.translations.CORE.UI.NONE, page.translations.CORE.UI.NONE);
      page.refresh();
      assert.eventually.equal(page.getWatcherDefaultOwner(), page.translations.CORE.UI.NONE);
      assert.eventually.equal(page.getWatcherDefaultGroup(), page.translations.CORE.UI.NONE);
    });

  });

  describe('TLS', function() {

    it('should display configuration panel', function() {
      assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.TLS_TITLE));
    });

    it('should not display custom properties by default', function() {
      assert.eventually.deepEqual(page.getTlsProperties(), []);
    });

    it('should display actual properties if specified', function() {
      var expectedPropertyId = 'tls-property';
      var expectedPropertyName = 'TLS property';
      propertyHelper.addEntities([
        {
          id: expectedPropertyId,
          name: expectedPropertyName,
          description: 'TLS property description',
          type: PropertyProvider.TYPES.TEXT
        }
      ]);
      configurationHelper.addEntities([{
        id: 'publish-tls',
        value: {
          properties: [expectedPropertyId]
        }
      }]);

      page.refresh();

      assert.eventually.deepEqual(page.getTlsProperties(), [expectedPropertyName]);
    });

    it('should be able to change the properties', function() {
      var customPropertiesToAdd = [
        {
          id: 'tls-property-1',
          name: 'TLS property 1',
          description: 'TLS property 1 description',
          type: PropertyProvider.TYPES.TEXT
        },
        {
          id: 'tls-property-2',
          name: 'TLS property 2',
          description: 'TLS property 2 description',
          type: PropertyProvider.TYPES.LIST
        }
      ];
      propertyHelper.addEntities(customPropertiesToAdd);
      page.refresh();

      assert.isFulfilled(page.editTlsSettings([customPropertiesToAdd[0].name, customPropertiesToAdd[1].name]));
      assert.eventually.deepEqual(
        page.getTlsProperties(),
        [customPropertiesToAdd[0].name, customPropertiesToAdd[1].name]
      );

      page.refresh();

      assert.eventually.deepEqual(
        page.getTlsProperties(),
        [customPropertiesToAdd[0].name, customPropertiesToAdd[1].name]
      );
    });

    it('should be able to set no properties', function() {
      var customPropertiesToAdd = [
        {
          id: 'tls-property-1',
          name: 'TLS property 1',
          description: 'TLS property 1 description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      propertyHelper.addEntities(customPropertiesToAdd);
      configurationHelper.addEntities([{
        id: 'publish-tls',
        value: {
          properties: [customPropertiesToAdd[0].id]
        }
      }]);

      page.refresh();

      assert.isFulfilled(page.editTlsSettings([]));
      assert.eventually.isEmpty(page.getTlsProperties());

      page.refresh();

      assert.eventually.isEmpty(page.getTlsProperties());
    });

    it('should be able to set properties using auto completion', function() {
      var customPropertiesToAdd = [
        {
          id: 'tls-property-1',
          name: 'TLS property 1',
          description: 'TLS property 1 description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var availableCustomProperties = [{
        name: customPropertiesToAdd[0].name,
        value: customPropertiesToAdd[0].name
      }];
      propertyHelper.addEntities(customPropertiesToAdd);

      page.refresh();

      assert.isFulfilled(page.editTlsSettings([customPropertiesToAdd[0].name], true, availableCustomProperties));
      assert.eventually.deepEqual(page.getTlsProperties(), [customPropertiesToAdd[0].name]);

      page.refresh();

      assert.eventually.deepEqual(page.getTlsProperties(), [customPropertiesToAdd[0].name]);
    });

  });

  describe('Catalog', function() {

    it('should display configuration panel', function() {
      assert.isFulfilled(page.getPanel(page.translations.PUBLISH.CONFIGURATION.CATALOG_TITLE));
    });

    it('should not display a refresh interval by default', function() {
      assert.eventually.isEmpty(page.getCatalogRefreshInterval());
    });

    it('should display actual refresh interval if specified', function() {
      var expectedRefreshInterval = 42;
      configurationHelper.addEntities([{
        id: 'publish-catalog',
        value: {
          refreshInterval: expectedRefreshInterval
        }
      }]);

      page.refresh();

      assert.eventually.equal(page.getCatalogRefreshInterval(), expectedRefreshInterval);
    });

    it('should be able to change the refresh interval', function() {
      var expectedRefreshInterval = 42;

      assert.isFulfilled(page.editCatalogSettings(expectedRefreshInterval));

      assert.eventually.equal(page.getCatalogRefreshInterval(), expectedRefreshInterval);

      page.refresh();

      assert.eventually.equal(page.getCatalogRefreshInterval(), expectedRefreshInterval);
    });

    it('should be able to leave refresh interval field empty', function() {
      page.editCatalogSettings();
      page.refresh();
      assert.eventually.isEmpty(page.getCatalogRefreshInterval());
    });

    it('should not be able to set a refresh interval if it contains non-digit characters', function() {
      assert.isRejected(page.editCatalogSettings('Wrong refresh interval'));
    });

  });

});
