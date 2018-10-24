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
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  describe('without access', function() {

    // Log with a user without access permission
    before(function() {
      page.logAs(datas.users.publishGuest);
    });

    it('should not access the page', function() {
      page.load().then(function() {
        assert.ok(false, 'User has access to configuration page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without manage permission', function() {

    // Log with a user without manage permission
    before(function() {
      page.logAs(datas.users.publishConfigurationNoManage);
      page.load();
    });

    // Remove all entities added during tests and reload page after each test
    afterEach(function() {
      configurationHelper.removeAllEntities(defaultSettings);
      propertyHelper.removeAllEntities();
      page.refresh();
    });

    it('should not have link to associate a Youtube account', function() {
      assert.isRejected(page.getYoutubePeerLink());
    });

    describe('Watcher', function() {

      it('should not be able to edit settings', function() {
        var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
        var expectedGroup = datas.groups.publishGroup1;

        assert.isRejected(page.editWatcherSettings(expectedOwner.name, expectedGroup.name));
      });

      it('should display settings as literals', function() {
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

        assert.eventually.equal(page.getWatcherDefaultOwner(true), expectedOwner.name);
        assert.eventually.equal(page.getWatcherDefaultGroup(true), expectedGroup.name);
      });

      it('should display a generic text if no values', function() {
        assert.eventually.equal(page.getWatcherDefaultOwner(true), page.translations.CORE.UI.NONE);
        assert.eventually.equal(page.getWatcherDefaultGroup(true), page.translations.CORE.UI.NONE);
      });

    });

    describe('TLS', function() {

      it('should not be able to edit settings', function() {
        var customPropertiesToAdd = [
          {
            id: 'tls-property-1',
            name: 'TLS property 1',
            description: 'TLS property 1 description',
            type: PropertyProvider.TYPES.TEXT
          }
        ];
        propertyHelper.addEntities(customPropertiesToAdd);

        page.refresh();

        assert.isRejected(page.editWatcherSettings([customPropertiesToAdd[0].name]));
      });

      it('should display settings as literals', function() {
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
            type: PropertyProvider.TYPES.TEXT
          }
        ];
        propertyHelper.addEntities(customPropertiesToAdd);
        configurationHelper.addEntities([{
          id: 'publish-tls',
          value: {
            properties: [customPropertiesToAdd[0].id, customPropertiesToAdd[1].id]
          }
        }]);

        page.refresh();

        assert.eventually.equal(
          page.getTlsProperties(true),
          [customPropertiesToAdd[0].name, customPropertiesToAdd[1].name].join(', ')
        );
      });

      it('should display a generic text if no values', function() {
        assert.eventually.equal(page.getTlsProperties(true), page.translations.CORE.UI.EMPTY);
      });

    });

  });

});
