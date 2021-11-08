'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');

var assert = chai.assert;

chai.should();
chai.use(spies);

describe('ArchiveFormat', function() {
  var archiveFormat;
  var expectedError = new Error('Something went wrong');
  var expectedDateProperty;
  var expectedMediaPackagePath;
  var expectedMetadatas;
  var expectedMetadatasFileName;
  var expectedNameProperty;
  var openVeoApi;

  // Mocks
  beforeEach(function() {
    expectedDateProperty = 'date';
    expectedMediaPackagePath = '/tmp/42';
    expectedNameProperty = 'name';
    expectedMetadatasFileName = 'info.json';
    expectedMetadatas = {};
    expectedMetadatas[expectedDateProperty] = 438134400;
    expectedMetadatas[expectedNameProperty] = 'Archive name';

    openVeoApi = {
      fileSystem: {
        getJSONFileContent: chai.spy(function(filePath, callback) {
          callback(null, expectedMetadatas);
        })
      },
      util: api.util
    };

    mock('@openveo/api', openVeoApi);
  });

  // Initializes tests
  beforeEach(function() {
    var ArchiveFormat = mock.reRequire(
      path.join(process.rootPublish, 'app/server/packages/ArchiveFormat.js')
    );
    archiveFormat = new ArchiveFormat(
      expectedMediaPackagePath,
      expectedMetadatasFileName,
      expectedDateProperty,
      expectedNameProperty
    );
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('getMetadatas', function() {

    it('should get archive metadatas', function(done) {
      archiveFormat.getMetadatas(function(error, metadatas) {
        assert.isNull(error, 'Unexpected error');
        assert.deepEqual(metadatas, expectedMetadatas, 'Wrong metadatas');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.with(
          path.join(expectedMediaPackagePath, expectedMetadatasFileName)
        );

        done();
      });
    });

    it('should put metadatas into cache to read metadatas file only once', function(done) {
      archiveFormat.getMetadatas(function(error, metadatas) {
        archiveFormat.getMetadatas(function(error, metadatas) {
          openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);
          done();
        });
      });
    });

    it('should execute callback with an error if reading metadatas file failed', function(done) {
      openVeoApi.fileSystem.getJSONFileContent = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      archiveFormat.getMetadatas(function(error, metadatas) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(metadatas, 'Unexpected metadatas');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('getDate', function() {

    it('should get date from metadatas', function(done) {
      archiveFormat.getDate(function(error, date) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(date, expectedMetadatas[expectedDateProperty] * 1000, 'Wrong date');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.with(
          path.join(expectedMediaPackagePath, expectedMetadatasFileName)
        );

        done();
      });
    });

    it('should execute callback with an error if getting date failed', function(done) {
      openVeoApi.fileSystem.getJSONFileContent = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      archiveFormat.getDate(function(error, date) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(date, 'Unexpected date');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('getName', function() {

    it('should get name from metadatas', function(done) {
      archiveFormat.getName(function(error, name) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(name, expectedMetadatas[expectedNameProperty], 'Wrong name');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.with(
          path.join(expectedMediaPackagePath, expectedMetadatasFileName)
        );

        done();
      });
    });

    it('should execute callback with an error if getting name failed', function(done) {
      openVeoApi.fileSystem.getJSONFileContent = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      archiveFormat.getName(function(error, name) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(name, 'Unexpected name');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('getProperty', function() {

    it('should get value of a metadatas property', function(done) {
      archiveFormat.getProperty(expectedNameProperty, function(error, value) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(value, expectedMetadatas[expectedNameProperty], 'Wrong value');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

        done();
      });
    });

    it('should get metadatas from cache when available', function(done) {
      archiveFormat.getProperty(expectedNameProperty, function(error, value) {
        archiveFormat.getProperty(expectedNameProperty, function(error, value) {
          openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

          done();
        });
      });
    });

    it('should execute callback with an error if getting metadatas failed', function(done) {
      openVeoApi.fileSystem.getJSONFileContent = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      archiveFormat.getProperty(expectedNameProperty, function(error, value) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(value, 'Unexpected value');

        openVeoApi.fileSystem.getJSONFileContent.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  ['getMedias', 'getPointsOfInterest', 'validate'].forEach(function(method) {

    describe(method, function() {

      it('should throw an error indicating that the method is not implemented', function() {
        assert.throws(function() {
          archiveFormat.getMedias(function() {});
        }, Error);
      });

    });

  });

});
