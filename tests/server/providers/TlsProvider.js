'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('TlsProvider', function() {
  var TlsClient;
  var TlsProvider;
  var openVeoApi;

  // Mocks
  beforeEach(function() {
    TlsClient = chai.spy(function() {});
    TlsClient.prototype.put = chai.spy(function() {
      return Promise.resolve();
    });
    TlsClient.prototype.get = chai.spy(function() {
      return Promise.resolve();
    });
    TlsClient.prototype.delete = chai.spy(function() {
      return Promise.resolve();
    });

    openVeoApi = {
      fileSystem: {
        copy: chai.spy(function(resourcePath, destinationPath, callback) {
          callback();
        }),
        rm: chai.spy(function(resourcePath, callback) {
          callback();
        })
      }
    };

    mock(path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/tls/TlsClient.js'), TlsClient);
    mock('@openveo/api', openVeoApi);
  });

  // Initializes tests
  beforeEach(function() {
    TlsProvider = mock.reRequire(
      path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/tls/TlsProvider.js')
    );
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('constructor', function() {

    it('should instanciate a TlsClient', function() {
      new TlsProvider({
        nfsPath: '/path/to/nfs/directory'
      });
      TlsClient.should.have.been.called.exactly(1);
    });

    it('should build mediaDirectoryPath', function() {
      var expectedNfsPath = '/path/to/nfs/directory/';
      var expectedMediaDirectoryPath = '/media/directory/path/';
      var provider = new TlsProvider({
        nfsPath: expectedNfsPath,
        mediaDirectoryPath: expectedMediaDirectoryPath
      });
      assert.equal(
        provider.mediaDirectoryPath,
        path.join(expectedNfsPath, expectedMediaDirectoryPath),
        'Wrong mediaDirectoryPath'
      );
    });

    it('should throw an error if configuration is not provided', function() {
      assert.throws(function() {
        new TlsProvider();
      }, Error);
    });

    it('should throw an error if nfsPath is not provided', function() {
      assert.throws(function() {
        new TlsProvider({});
      }, Error);
    });

  });

  describe('upload', function() {
    var provider;

    beforeEach(function() {
      provider = new TlsProvider({
        nfsPath: '/path/to/nfs/directory/',
        mediaDirectoryPath: '/media/directory/path/'
      });
    });

    it('should save the media file on local file system', function(done) {
      var expectedMediaFilePath = '/path/to/media/file.mp4';

      openVeoApi.fileSystem.copy = chai.spy(function(resourcePath, destinationPath, callback) {
        assert.equal(resourcePath, expectedMediaFilePath, 'Wrong resource path');
        assert.match(
          destinationPath,
          new RegExp(provider.mediaDirectoryPath + '[^\/]+\/video.mp4'),
          'Wrong destination path'
        );
        callback();
      });

      provider.upload(expectedMediaFilePath, function(error) {
        assert.isNull(error, 'Unexpected error');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should send media information to TLS', function(done) {
      TlsClient.prototype.put = chai.spy(function(endPoint, body) {
        assert.match(endPoint, /videos\/[^\/]+/, 'Wrong end point');
        assert.match(
          body.path,
          new RegExp(provider.conf.mediaDirectoryPath + '[^\/]+\/video.mp4'),
          'Wrong media file path'
        );
        return Promise.resolve();
      });

      provider.upload('/path/to/media/file.mp4', function(error, mediaId) {
        assert.isNull(error, 'Unexpected error');
        assert.isNotEmpty(mediaId, 'Expecting a media id');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if saving file on file system failed', function(done) {
      var expectedError = new Error('Something went wrong');
      openVeoApi.fileSystem.copy = chai.spy(function(resourcePath, destinationPath, callback) {
        callback(expectedError);
      });

      provider.upload('/path/to/media/file.mp4', function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if sending media information to TLS failed', function(done) {
      var expectedError = new Error('Something went wrong');
      TlsClient.prototype.put = chai.spy(function(endPoint, body) {
        return Promise.reject(expectedError);
      });

      provider.upload('/path/to/media/file.mp4', function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        TlsClient.prototype.put.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should remove media from file system if sending media information to TLS failed', function(done) {
      var expectedError = new Error('Something went wrong');

      openVeoApi.fileSystem.rm = chai.spy(function(resourcePath, callback) {
        assert.match(resourcePath, new RegExp(provider.mediaDirectoryPath + '[^\/]+'), 'Wrong resource path');
        callback();
      });

      TlsClient.prototype.put = chai.spy(function(endPoint, body) {
        return Promise.reject(expectedError);
      });

      provider.upload('/path/to/media/file.mp4', function(error) {
        assert.instanceOf(error, Error, 'Wrong error');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        TlsClient.prototype.put.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if removing media from file system failed', function(done) {
      var expectedError = new Error('Something went wrong also here');

      openVeoApi.fileSystem.rm = chai.spy(function(resourcePath, callback) {
        callback(expectedError);
      });

      TlsClient.prototype.put = chai.spy(function(endPoint, body) {
        return Promise.reject(new Error('Something went wrong'));
      });

      provider.upload('/path/to/media/file.mp4', function(error) {
        assert.instanceOf(error, Error, 'Wrong error');
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        TlsClient.prototype.put.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('getMediaInfo', function() {
    var provider;

    beforeEach(function() {
      provider = new TlsProvider({
        nfsPath: '/path/to/nfs/directory/',
        mediaDirectoryPath: '/media/directory/path/'
      });
    });

    it('should get all media associated resources from TLS', function(done) {
      var count = 0;
      var expectedMediaIds = ['42', '43'];
      var expectedResources = [
        {
          available: true,
          link: 'https://link42-to-hsl'
        },
        {
          available: true,
          link: 'https://link43-to-hsl'
        }
      ];

      TlsClient.prototype.get = chai.spy(function(endPoint) {
        var response = expectedResources[count];
        assert.equal(endPoint, 'videos/' + expectedMediaIds[count], 'Wrong end point for media ' + count);
        count++;
        return Promise.resolve(response);
      });

      provider.getMediaInfo(expectedMediaIds, null, function(error, data) {
        assert.isNull(error, 'Unexpected error');
        assert.ok(data.available, 'Expected media to be available');

        for (var i = 0; i < data.sources.length; i++) {
          var source = data.sources[i];
          assert.equal(source.adaptive[0].mimeType, 'application/x-mpegURL', 'Wrong source MIME type for source ' + i);
          assert.equal(source.adaptive[0].link, expectedResources[i].link, 'Wrong source link for source ' + i);
        }

        TlsClient.prototype.get.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

    it('should set media as not available if one of the resources is unavailable', function(done) {
      var count = 0;
      var expectedMediaIds = ['42', '43'];
      var expectedResources = [
        {
          available: true,
          link: 'https://link42-to-hsl'
        },
        {
          available: false,
          link: 'https://link43-to-hsl'
        }
      ];

      TlsClient.prototype.get = chai.spy(function(endPoint) {
        var response = expectedResources[count];
        count++;
        return Promise.resolve(response);
      });

      provider.getMediaInfo(expectedMediaIds, null, function(error, data) {
        assert.isNull(error, 'Unexpected error');
        assert.notOk(data.available, 'Expected media to be available');
        TlsClient.prototype.get.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

    it('should set media as available if no resource', function(done) {
      var expectedMediaIds = [];

      provider.getMediaInfo(expectedMediaIds, null, function(error, data) {
        assert.isNull(error, 'Unexpected error');
        assert.isEmpty(data.sources, 'Wrong sources');
        assert.ok(data.available, 'Expected media to be available');
        TlsClient.prototype.get.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

    it('should execute callback with an error if getting a resource from TLS failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedMediaIds = ['42'];

      TlsClient.prototype.get = chai.spy(function(endPoint) {
        return Promise.reject(expectedError);
      });

      provider.getMediaInfo(expectedMediaIds, null, function(error, data) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(data, 'Unexpected data');
        TlsClient.prototype.get.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

  });

  describe('remove', function() {
    var provider;

    beforeEach(function() {
      provider = new TlsProvider({
        nfsPath: '/path/to/nfs/directory/',
        mediaDirectoryPath: '/media/directory/path/'
      });
    });

    it('should send an instruction to TLS to remove the resources', function(done) {
      var count = 0;
      var expectedMediaIds = ['42', '43'];

      TlsClient.prototype.delete = chai.spy(function(endPoint) {
        assert.equal(endPoint, 'videos/' + expectedMediaIds[count], 'Wrong end point');
        count++;
        return Promise.resolve();
      });

      provider.remove(expectedMediaIds, function(error) {
        assert.isNull(error, 'Unexpected error');
        TlsClient.prototype.delete.should.have.been.called.exactly(expectedMediaIds.length);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

    it('should remove media from local file system', function(done) {
      var count = 0;
      var expectedMediaIds = ['42', '43'];

      openVeoApi.fileSystem.rm = chai.spy(function(resourcePath, callback) {
        assert.equal(resourcePath, path.join(provider.mediaDirectoryPath, expectedMediaIds[count]), 'Wrong path');
        count++;
        callback();
      });

      provider.remove(expectedMediaIds, function(error) {
        assert.isNull(error, 'Unexpected error');
        TlsClient.prototype.delete.should.have.been.called.exactly(expectedMediaIds.length);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

    it('should execute callback with an error if sending instruction to TLS failed', function(done) {
      var expectedMediaIds = ['42'];
      var expectedError = new Error('Something went wrong');

      TlsClient.prototype.delete = chai.spy(function(endPoint) {
        return Promise.reject(expectedError);
      });

      provider.remove(expectedMediaIds, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        TlsClient.prototype.delete.should.have.been.called.exactly(expectedMediaIds.length);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if removing media from local file system failed', function(done) {
      var expectedMediaIds = ['42'];
      var expectedError = new Error('Something went wrong');

      openVeoApi.fileSystem.rm = chai.spy(function(resourcePath, callback) {
        callback(expectedError);
      });

      provider.remove(expectedMediaIds, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        TlsClient.prototype.delete.should.have.been.called.exactly(expectedMediaIds.length);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(expectedMediaIds.length);
        done();
      });
    });

  });

});
