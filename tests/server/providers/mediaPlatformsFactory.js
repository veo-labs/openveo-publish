'use strict';

var util = require('util');
var assert = require('chai').assert;

// factory.js
describe('Media platforms factory', function() {
  var CorePlugin;
  var corePlugin;
  var TlsProvider;
  var openVeoApi;
  var factory;
  var TYPES;
  var YoutubeProvider;
  var VimeoProvider;
  var WowzaProvider;
  var LocalProvider;

  // Requirements
  before(function() {
    TlsProvider = process.requirePublish('app/server/providers/mediaPlatforms/tls/TlsProvider.js');
    openVeoApi = require('@openveo/api');
    factory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
    TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
    YoutubeProvider = process.requirePublish('app/server/providers/mediaPlatforms/youtube/YoutubeProvider.js');
    VimeoProvider = process.requirePublish('app/server/providers/mediaPlatforms/VimeoProvider.js');
    WowzaProvider = process.requirePublish('app/server/providers/mediaPlatforms/WowzaProvider.js');
    LocalProvider = process.requirePublish('app/server/providers/mediaPlatforms/LocalProvider.js');
  });

  // Mocks
  beforeEach(function() {
    CorePlugin = function() {};
    util.inherits(CorePlugin, openVeoApi.plugin.Plugin);
  });

  // Prepare tests
  beforeEach(function() {
    corePlugin = new CorePlugin();
    corePlugin.name = 'core';
    corePlugin.api = {
      getDatabase: function() {
        return new openVeoApi.database.Database({});
      }
    };

    process.api.addPlugin(corePlugin);
  });

  // Clean up tests
  afterEach(function() {
    process.api.removePlugins();
  });

  // get method
  describe('get', function() {

    it('should be able to instanciate a YoutubeProvider', function() {
      assert.instanceOf(factory.get(TYPES.YOUTUBE, {}), YoutubeProvider);
    });

    it('should be able to instanciate a VimeoProvider', function() {
      assert.instanceOf(factory.get(TYPES.VIMEO, {}), VimeoProvider);
    });

    it('should be able to instanciate a WowzaProvider', function() {
      assert.instanceOf(factory.get(TYPES.WOWZA, {
        host: 'host',
        user: 'user',
        pwd: 'pwd'
      }), WowzaProvider);
    });

    it('should be able to instanciate a TlsProvider', function() {
      assert.instanceOf(factory.get(TYPES.TLS, {
        nfsPath: '/path/to/nfs/directory',
        mediaDirectoryPath: 'path/to/media/directory',
        accessToken: 'access token',
        url: 'https://tls.local/ws'
      }), TlsProvider);
    });

    it('should be able to instanciate a LocalProvider', function() {
      assert.instanceOf(factory.get(TYPES.LOCAL, {}), LocalProvider);
    });

    it('should throw an error if type is unknown', function() {
      assert.throws(function() {
        factory.get('wrong type', {});
      });
    });

    it('should return null if type is missing', function() {
      assert.isNull(factory.get(null, {}));
    });

    it('should return null if configuration is missing', function() {
      assert.isNull(factory.get(TYPES.LOCAL));
    });

  });

});
