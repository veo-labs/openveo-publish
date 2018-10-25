'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('ConfigurationController', function() {
  var controller;
  var originalCoreApi;
  var PropertyProvider;
  var expectedProperties;
  var expectedSettings;
  var openVeoApi;
  var videoPlatformConf;
  var request;
  var response;
  var coreApi;
  var GoogleOAuthHelper;

  // Mocks
  beforeEach(function() {
    expectedProperties = [];
    expectedSettings = [];

    PropertyProvider = function() {};
    PropertyProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedProperties);
    });

    openVeoApi = {
      fileSystem: {
        getConfDir: function() {
          return '';
        }
      },
      controllers: {
        Controller: api.controllers.Controller
      },
      storages: {
        ResourceFilter: api.storages.ResourceFilter
      },
      util: {
        shallowValidateObject: api.util.shallowValidateObject
      }
    };

    videoPlatformConf = {
      local: true,
      vimeo: true,
      youtube: {
        googleOAuth: true
      },
      wowza: true,
      tls: true
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      getDatabase: function() {
        return {};
      },
      settingProvider: {
        getOne: chai.spy(function(filter, fields, callback) {
          callback(null, expectedSettings[0]);
        }),
        add: chai.spy(function(settings, callback) {
          callback(null, settings.length, settings);
        })
      }
    };

    request = {
      body: {},
      params: {},
      query: {}
    };
    response = {
      locals: {}
    };

    GoogleOAuthHelper = function() {};
    GoogleOAuthHelper.prototype.hasToken = chai.spy(function(callback) {
      callback(null, 'token');
    });
    GoogleOAuthHelper.prototype.getAuthUrl = chai.spy(function(data) {
      return 'URL';
    });

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('publish/videoPlatformConf.json', videoPlatformConf);
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'), PropertyProvider);
    mock(
      path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/youtube/GoogleOAuthHelper.js'),
      GoogleOAuthHelper
    );
  });

  // Initialize tests
  beforeEach(function() {
    var ConfigurationController = mock.reRequire(
      path.join(process.rootPublish, 'app/server/controllers/ConfigurationController.js')
    );
    controller = new ConfigurationController();
  });

  afterEach(function() {
    mock.stopAll();
    process.api = originalCoreApi;
  });

  describe('getConfigurationAllAction', function() {

    it('should send response with catalog, Youtube, Watcher and TLS configurations', function(done) {
      expectedSettings = [
        {
          id: 'publish-youtube',
          value: {
            hasToken: true,
            authUrl: 'Auth URL'
          }
        },
        {
          id: 'publish-catalog',
          value: 'Catalog settings'
        },
        {
          id: 'publish-watcher',
          value: 'Watcher settings'
        },
        {
          id: 'publish-tls',
          value: 'TLS settings'
        }
      ];

      GoogleOAuthHelper.prototype.hasToken = chai.spy(function(callback) {
        callback(null, expectedSettings[0].value.hasToken);
      });
      GoogleOAuthHelper.prototype.getAuthUrl = chai.spy(function(data) {
        return expectedSettings[0].value.authUrl;
      });

      coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
        var id = filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value;
        if (id === 'publish-catalog') callback(null, expectedSettings[1]);
        else if (id === 'publish-watcher') callback(null, expectedSettings[2]);
        else if (id === 'publish-tls') callback(null, expectedSettings[3]);
        else callback();
      });

      response.send = function(configurations) {
        assert.deepEqual(configurations['youtube'], expectedSettings[0].value, 'Wrong Youtube settings');
        assert.strictEqual(configurations['publishCatalog'], expectedSettings[1].value, 'Wrong catalog settings');
        assert.strictEqual(configurations['publishWatcher'], expectedSettings[2].value, 'Wrong watcher settings');
        assert.strictEqual(configurations['publishTls'], expectedSettings[3].value, 'Wrong TLS settings');
        coreApi.settingProvider.getOne.should.have.been.called.exactly(3);
        GoogleOAuthHelper.prototype.hasToken.should.have.been.called.exactly(1);
        GoogleOAuthHelper.prototype.getAuthUrl.should.have.been.called.exactly(1);
        done();
      };

      controller.getConfigurationAllAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    describe('TLS', function() {

      it('should send response without TLS configuration if TLS is not activated', function(done) {
        videoPlatformConf.tls = false;

        coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
          assert.notEqual(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            'publish-tls',
            'Unexpected call to get TLS settings'
          );
          callback();
        });

        response.send = function(configurations) {
          assert.notProperty(configurations, 'publishTls', 'Unexpected settings');
          done();
        };

        controller.getConfigurationAllAction(request, response, function(error) {
          assert.ok(false, 'Unexpected error');
        });
      });

      it('should send response with empty TLS configuration if TLS configuration does not exist', function(done) {
        coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
          callback();
        });

        response.send = function(configurations) {
          assert.isEmpty(configurations['publishTls'], 'Unexpected settings');
          coreApi.settingProvider.getOne.should.have.been.called.at.least(1);
          done();
        };

        controller.getConfigurationAllAction(request, response, function(error) {
          assert.ok(false, 'Unexpected error');
        });
      });

      it('should execute next with an error if getting TLS configuration failed', function(done) {
        coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
          if (filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value === 'publish-tls')
            callback(new Error('Something went wrong'));
          else
            callback();
        });

        response.send = function(configurations) {
          assert.ok(false, 'Unexpected response');
        };

        controller.getConfigurationAllAction(request, response, function(error) {
          assert.strictEqual(error, HTTP_ERRORS.GET_CONFIGURATION_ERROR, 'Wrong error');
          coreApi.settingProvider.getOne.should.have.been.called.at.least(1);
          done();
        });
      });

    });

    describe('catalog', function() {

      it('should execute next with an error if getting catalog configuration failed', function(done) {
        coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
          if (filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value === 'publish-catalog')
            callback(new Error('Something went wrong'));
          else
            callback();
        });

        response.send = function(configurations) {
          assert.ok(false, 'Unexpected response');
        };

        controller.getConfigurationAllAction(request, response, function(error) {
          assert.strictEqual(error, HTTP_ERRORS.GET_CONFIGURATION_ERROR, 'Wrong error');
          coreApi.settingProvider.getOne.should.have.been.called.at.least(1);
          done();
        });
      });

    });

  });

  describe('saveTlsSettingsAction', function() {

    it('should save TLS settings', function(done) {
      expectedProperties = [
        {
          id: 'property1'
        },
        {
          id: 'property2'
        }
      ];

      request.body.properties = [expectedProperties[0].id, expectedProperties[1].id];

      coreApi.settingProvider.add = chai.spy(function(settings, callback) {
        assert.equal(settings[0].id, 'publish-tls', 'Wrong setting id');
        assert.deepEqual(settings[0].value.properties, request.body.properties, 'Wrong setting value');
        callback(null, 1, settings);
      });

      response.send = function(data) {
        coreApi.settingProvider.add.should.have.been.called.exactly(1);
        done();
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should accept an empty list of properties', function(done) {
      coreApi.settingProvider.add = chai.spy(function(settings, callback) {
        assert.equal(settings[0].id, 'publish-tls', 'Wrong setting id');
        assert.isEmpty(settings[0].value.properties, 'Wrong setting value');
        callback(null, 1, settings);
      });

      response.send = function(data) {
        coreApi.settingProvider.add.should.have.been.called.exactly(1);
        done();
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if body is empty', function(done) {
      request.body = null;

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        coreApi.settingProvider.add.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.SAVE_TLS_SETTINGS_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if properties is not an array of strings', function(done) {
      request.body.properties = {};

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        coreApi.settingProvider.add.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.SAVE_TLS_SETTINGS_WRONG_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if one of the properties is not an existing custom property', function(done) {
      expectedProperties = [
        {
          id: 'property1'
        },
        {
          id: 'property2'
        }
      ];
      request.body.properties = ['something else'];

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        coreApi.settingProvider.add.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.SAVE_TLS_SETTINGS_WRONG_PROPERTIES_PARAMETER, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if getting custom properties failed', function(done) {
      expectedProperties = [
        {
          id: 'property1'
        }
      ];
      request.body.properties = [expectedProperties[0].id];

      PropertyProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveTlsSettingsAction(request, response, function(error) {
        coreApi.settingProvider.add.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.SAVE_TLS_SETTINGS_CUSTOM_PROPERTIES_ERROR, 'Wrong error');
        done();
      });
    });

  });

  describe('saveCatalogSettingsAction', function() {

    it('should save catalog settings', function(done) {
      var expectedRefreshInterval = 42;
      request.body.refreshInterval = expectedRefreshInterval;

      coreApi.settingProvider.add = chai.spy(function(settings, callback) {
        assert.equal(settings[0].id, 'publish-catalog', 'Wrong setting id');
        assert.deepEqual(settings[0].value.refreshInterval, expectedRefreshInterval, 'Wrong setting value');
        callback(null, 1, settings);
      });

      response.send = function(data) {
        assert.equal(data.total, 1, 'Wrong total');
        assert.deepEqual(data.settings.refreshInterval, expectedRefreshInterval, 'Wrong setting value');
        coreApi.settingProvider.add.should.have.been.called.exactly(1);
        done();
      };

      controller.saveCatalogSettingsAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if body is missing', function(done) {
      request.body = null;

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveCatalogSettingsAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.SAVE_CATALOG_SETTINGS_MISSING_PARAMETERS, 'Wrong error');
        coreApi.settingProvider.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if saving catalog settings failed', function(done) {
      request.body.refreshInterval = 42;

      coreApi.settingProvider.add = chai.spy(function(settings, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      controller.saveCatalogSettingsAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.SAVE_CATALOG_SETTINGS_ERROR, 'Wrong error');
        coreApi.settingProvider.add.should.have.been.called.exactly(1);
        done();
      });
    });

  });

});
