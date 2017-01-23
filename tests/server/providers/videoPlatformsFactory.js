'use strict';

var util = require('util');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var factory = process.requirePublish('app/server/providers/videoPlatforms/factory.js');
var YoutubeProvider = process.requirePublish('app/server/providers/videoPlatforms/youtube/YoutubeProvider.js');
var VimeoProvider = process.requirePublish('app/server/providers/videoPlatforms/VimeoProvider.js');
var WowzaProvider = process.requirePublish('app/server/providers/videoPlatforms/WowzaProvider.js');
var LocalProvider = process.requirePublish('app/server/providers/videoPlatforms/LocalProvider.js');

// factory.js
describe('Video platforms factory', function() {
  var CorePlugin;
  var corePlugin;

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
    openVeoApi.plugin.pluginManager.addPlugin(corePlugin);
  });

  // Clean up tests
  afterEach(function() {
    openVeoApi.plugin.pluginManager.removePlugin(corePlugin.name);
  });

  // get method
  describe('get', function() {

    it('should be able to instanciate a YoutubeProvider', function() {
      assert.instanceOf(factory.get('youtube', {}), YoutubeProvider);
    });

    it('should be able to instanciate a VimeoProvider', function() {
      assert.instanceOf(factory.get('vimeo', {}), VimeoProvider);
    });

    it('should be able to instanciate a WowzaProvider', function() {
      assert.instanceOf(factory.get('wowza', {
        host: 'host',
        user: 'user',
        pwd: 'pwd'
      }), WowzaProvider);
    });

    it('should be able to instanciate a LocalProvider', function() {
      assert.instanceOf(factory.get('local', {}), LocalProvider);
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
      assert.isNull(factory.get('local'));
    });

  });

});
