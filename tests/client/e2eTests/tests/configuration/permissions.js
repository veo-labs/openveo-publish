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
      page.refresh();
    });

    it('should not have link to associate a Youtube account', function() {
      assert.isRejected(page.getYoutubePeerLink());
    });

    describe('Medias', function() {

      it('should not be able to edit settings', function() {
        var expectedOwner = process.protractorConf.getUser(datas.users.publishGuest.name);
        var expectedGroup = datas.groups.publishGroup1;

        assert.isRejected(page.editMediasSettings(expectedOwner.name, expectedGroup.name));
      });

      it('should display settings as literals', function() {
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

        assert.eventually.equal(page.getMediasDefaultOwner(true), expectedOwner.name);
        assert.eventually.equal(page.getMediasDefaultGroup(true), expectedGroup.name);
      });

      it('should display a generic text if no values', function() {
        assert.eventually.equal(page.getMediasDefaultOwner(true), page.translations.CORE.UI.NONE);
        assert.eventually.equal(page.getMediasDefaultGroup(true), page.translations.CORE.UI.NONE);
      });

    });

  });
});
