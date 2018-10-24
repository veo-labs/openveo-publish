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

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('publish/videoPlatformConf.json', videoPlatformConf);
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'), PropertyProvider);
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

    it('should send response with TLS configuration', function(done) {
      var count = 0;
      videoPlatformConf.youtube = false;
      expectedSettings = [
        {
          id: 'publish-watcher',
          value: 'Watcher settings'
        },
        {
          id: 'publish-tls',
          value: 'TLS settings'
        }
      ];

      coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
        if (count === 1) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            'publish-tls',
            'Wrong setting id'
          );
        }
        callback(null, expectedSettings[count++]);
      });

      response.send = function(configurations) {
        assert.equal(configurations['publishTls'], expectedSettings[1].value, 'Wrong TLS settings');
        coreApi.settingProvider.getOne.should.have.been.called.exactly(2);
        done();
      };

      controller.getConfigurationAllAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should send response without TLS configuration if TLS is not activated', function(done) {
      videoPlatformConf.youtube = false;
      videoPlatformConf.tls = false;
      expectedSettings = [
        {
          id: 'publish-watcher',
          value: 'Medias settings'
        }
      ];

      response.send = function(configurations) {
        assert.notProperty(configurations, 'publishTls', 'Unexpected settings');
        coreApi.settingProvider.getOne.should.have.been.called.exactly(1);
        done();
      };

      controller.getConfigurationAllAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should send response with empty TLS configuration if TLS configuration does not exist', function(done) {
      var count = 0;
      videoPlatformConf.youtube = false;
      expectedSettings = [
        {
          id: 'publish-watcher',
          value: 'Medias settings'
        }
      ];

      coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(null, (count === 0) ? expectedSettings[count++] : null);
      });

      response.send = function(configurations) {
        assert.isEmpty(configurations['publishTls'], 'Unexpected settings');
        coreApi.settingProvider.getOne.should.have.been.called.exactly(2);
        done();
      };

      controller.getConfigurationAllAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if getting TLS configuration failed', function(done) {
      var count = 0;
      var expectedError = new Error('Something went wrong');
      videoPlatformConf.youtube = false;
      expectedSettings = [
        {
          id: 'publish-watcher',
          value: 'Medias settings'
        }
      ];

      coreApi.settingProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback((count === 1) ? expectedError : null, (count === 0) ? expectedSettings[count++] : null);
      });

      response.send = function(configurations) {
        assert.ok(false, 'Unexpected response');
      };

      controller.getConfigurationAllAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_CONFIGURATION_ERROR, 'Wrong error');
        coreApi.settingProvider.getOne.should.have.been.called.exactly(2);
        done();
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

});
