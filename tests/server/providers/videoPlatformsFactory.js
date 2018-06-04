'use strict';

var util = require('util');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var factory = process.requirePublish('app/server/providers/mediaPlatforms/factory.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var YoutubeProvider = process.requirePublish('app/server/providers/mediaPlatforms/youtube/YoutubeProvider.js');
var VimeoProvider = process.requirePublish('app/server/providers/mediaPlatforms/VimeoProvider.js');
var WowzaProvider = process.requirePublish('app/server/providers/mediaPlatforms/WowzaProvider.js');
var LocalProvider = process.requirePublish('app/server/providers/mediaPlatforms/LocalProvider.js');

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
