'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VimeoProvider', function() {
  var Vimeo;
  var provider;
  var VimeoProvider;

  // Mocks
  beforeEach(function() {
    Vimeo = chai.spy(function(clientId, clientSecret, accessToken) {});
    Vimeo.prototype.request = chai.spy(function(datas, callback) {
      callback();
    });

    mock('vimeo', {
      Vimeo: Vimeo
    });
  });

  // Initializes tests
  beforeEach(function() {
    VimeoProvider = mock.reRequire(
      path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/VimeoProvider.js')
    );
    provider = new VimeoProvider({
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      accessToken: 'accessToken'
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('update', function() {

    it('should update media resources on Vimeo with the new media title', function(done) {
      var count = 0;
      var expectedMedia = {
        mediaId: ['42', '43']
      };
      var expectedData = {
        title: 'New media title'
      };

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.method, 'PATCH', 'Wrong HTTP method');
        assert.equal(data.path, '/videos/' + expectedMedia.mediaId[count], 'Wrong end point');
        assert.equal(data.query.name, expectedData.title, 'Wrong title');
        count++;
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMedia.mediaId.length);
        done();
      });
    });

    it('should keep only the first 128 characters of the title', function(done) {
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: ''
      };

      // Create a title of more than 128 characters
      for (var i = 0; i < 200; i++)
        expectedData.title += 'a';

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.query.name, expectedData.title.substring(0, 128), 'Wrong title');
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should not update platform if title hasn\'t changed', function(done) {
      var expectedMedia = {
        mediaId: ['42'],
        title: 'New media title'
      };
      var expectedData = {};
      expectedData.title = expectedMedia.title;

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isUndefined(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should update platform if title hasn\'t changed and force is set to true', function(done) {
      var expectedMedia = {
        mediaId: ['42'],
        title: 'New media title'
      };
      var expectedData = {};
      expectedData.title = expectedMedia.title;

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.method, 'PATCH', 'Wrong HTTP method');
        assert.equal(data.path, '/videos/' + expectedMedia.mediaId[0], 'Wrong end point');
        assert.equal(data.query.name, expectedData.title, 'Wrong title');
        callback();
      });

      provider.update(expectedMedia, expectedData, true, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if updating platform failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: 'New media title'
      };

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        callback(expectedError);
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

  });

});
