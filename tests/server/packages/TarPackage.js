'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var TarPackageError = process.requirePublish('app/server/packages/TarPackageError.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('TarPackage', function() {
  var tarPackage;
  var videoProvider;
  var expectedMediaPackage;
  var openVeoApi;
  var xml2js;
  var publishConf;
  var videoPlatformConf;
  var fs;

  // Mocks
  beforeEach(function() {
    expectedMediaPackage = {
      id: '42',
      metadata: {
        indexes: []
      }
    };

    videoProvider = {
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      }),
      updateMetadata: chai.spy(function(id, metadata, callback) {
        callback(null, 1);
      })
    };

    openVeoApi = {
      fileSystem: {
        getJSONFileContent: chai.spy(function(jsonFilePath, callback) {
          callback(null, {});
        }),
        extract: chai.spy(function(packageFilePath, destinationDirectory, callback) {
          callback();
        }),
        FILE_TYPES: {
          JPG: 'jpg',
          GIF: 'gif'
        },
        getConfDir: function() {
          return '/conf/dir';
        }
      },
      storages: api.storages,
      util: api.util,
      imageProcessor: {
        generateSprites: chai.spy(function(imagesPaths, destinationPath, width, height, totalColumns, maxRows, quality,
          temporaryDirectoryPath, callback) {
          callback(null, []);
        })
      }
    };

    xml2js = {
      parseString: function(data, options, callback) {
        callback();
      }
    };

    publishConf = {
      videoTmpDir: '/tmp',
      metadataFileName: '.session'
    };

    fs = {
      exists: chai.spy(function(resourcePath, callback) {
        callback(true);
      }),
      readFile: chai.spy(function(filePath, callback) {
        callback();
      })
    };

    videoPlatformConf = {};

    mock('@openveo/api', openVeoApi);
    mock('xml2js', xml2js);
    mock('fs', fs);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), videoProvider);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    var TarPackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/TarPackage.js'));
    tarPackage = new TarPackage(expectedMediaPackage, videoProvider);
    tarPackage.fsm = {};
    tarPackage.updateState = chai.spy(function(id, state, callback) {
      callback();
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('saveTimecodes', function() {

    it('should update package state', function(done) {
      tarPackage.setError = function(error) {
        assert.fail('Unexpected error');
      };

      tarPackage.fsm.transition = function() {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        done();
      };

      tarPackage.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedMediaPackage.id, 'Wrong id');
        assert.equal(state, STATES.SAVING_TIMECODES, 'Wrong state');
        callback();
      });

      tarPackage.saveTimecodes();
    });

    it('should set package as on error if updating state failed', function(done) {
      var expectedError = new Error('Something went wrong');

      tarPackage.fsm.transition = function() {
        assert.fail('Unexpected transition');
      };

      tarPackage.setError = function(error) {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, TarPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_TIMECODE, 'Wrong error code');
        done();
      };

      tarPackage.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      tarPackage.saveTimecodes();
    });

    it('should save media package tags based on package metadata', function(done) {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000,
          data: {
            tagname: 'tag1'
          }
        }
      ];

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        var expectedTag = expectedMediaPackage.metadata.indexes[0];
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMediaPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(modifications.tags, expectedMediaPackage.metadata.indexes.length, 'Wrong number of tags');
        assert.isString(modifications.tags[0].id, 'Expected tag id to be generated');
        assert.equal(modifications.tags[0].name, expectedTag.data.tagname, 'Wrong tag name');
        assert.equal(modifications.tags[0].value, expectedTag.timecode, 'Wrong tag timecode');
        callback(null, 1);
      });

      tarPackage.setError = function(error) {
        assert.fail('Unexpected error');
      };

      tarPackage.fsm.transition = function() {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        done();
      };

      tarPackage.saveTimecodes();
    });

    it('should generate a tag name if not specified', function(done) {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000
        }
      ];

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.isString(modifications.tags[0].name, 'Expected tag name to be generated');
        callback(null, 1);
      });

      tarPackage.setError = function(error) {
        assert.fail('Unexpected error');
      };

      tarPackage.fsm.transition = function() {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        done();
      };

      tarPackage.saveTimecodes();
    });

    it('should set package as on error if updating media failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000
        }
      ];

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(expectedError);
      });

      tarPackage.setError = function(error) {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        assert.instanceOf(error, TarPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_TIMECODE, 'Wrong error code');
        done();
      };

      tarPackage.fsm.transition = function() {
        assert.fail('Unexpected transition');
      };

      tarPackage.saveTimecodes();
    });

    it('should save media package images', function(done) {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'image',
          timecode: 42000,
          data: {
            filename: 'filename.jpg'
          }
        }
      ];
      var expectedImagesReferences = [
        {
          sprite: '/sprite/path',
          image: path.join(
            publishConf.videoTmpDir,
            expectedMediaPackage.id,
            expectedMediaPackage.metadata.indexes[0].data.filename
          ),
          x: 42,
          y: 42
        }
      ];

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        callback(null, expectedImagesReferences);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        var expectedImage = expectedMediaPackage.metadata.indexes[0];
        var expectedImageReference = expectedImagesReferences[0];

        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMediaPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(
          modifications.timecodes,
          expectedMediaPackage.metadata.indexes.length,
          'Wrong number of images'
        );
        assert.isString(modifications.timecodes[0].id, 'Expected image id to be generated');
        assert.equal(modifications.timecodes[0].timecode, expectedImage.timecode, 'Wrong image timecode');
        assert.equal(
          modifications.timecodes[0].image.large,
          '/publish/' + expectedMediaPackage.id + '/' + expectedImage.data.filename,
          'Wrong image URL');
        assert.equal(
          modifications.timecodes[0].image.small.url,
          '/publish/' + expectedMediaPackage.id + '/' + expectedImageReference.sprite.replace('/sprite/', ''),
          'Wrong image sprite URL'
        );
        assert.equal(modifications.timecodes[0].image.small.x, expectedImageReference.x, 'Wrong x coordinate');
        assert.equal(modifications.timecodes[0].image.small.y, expectedImageReference.y, 'Wrong y coordinate');
        callback(null, 1);
      });

      tarPackage.setError = function(error) {
        assert.fail('Unexpected error');
      };

      tarPackage.fsm.transition = function() {
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        done();
      };

      tarPackage.saveTimecodes();
    });

    it('should set package as on error if generating sprite failed', function(done) {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'image',
          timecode: 42000,
          data: {
            filename: 'filename.jpg'
          }
        }
      ];
      var expectedError = new Error('Something went wrong');

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        callback(expectedError);
      });

      tarPackage.setError = function(error) {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, TarPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_TIMECODE, 'Wrong error code');
        done();
      };

      tarPackage.fsm.transition = function() {
        assert.fail('Unexpected transition');
      };

      tarPackage.saveTimecodes();
    });

    it('should retrieve points of interest images from synchro.xml if not specified in metadata', function(done) {
      expectedMediaPackage.metadata.indexes = null;
      var expectedXmlAsJs = {
        player: {
          synchro: [
            {
              id: ['filename.jpg'],
              timecode: ['42000']
            }
          ]
        }
      };
      var expectedImagesReferences = [
        {
          sprite: '/sprite/path',
          image: path.join(
            publishConf.videoTmpDir,
            expectedMediaPackage.id,
            expectedXmlAsJs.player.synchro[0].id[0]
          ),
          x: 42,
          y: 42
        }
      ];

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        callback(null, expectedImagesReferences);
      });

      xml2js.parseString = chai.spy(function(data, options, callback) {
        callback(null, expectedXmlAsJs);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        var expectedImage = expectedXmlAsJs.player.synchro[0];
        var expectedImageReference = expectedImagesReferences[0];

        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMediaPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(
          modifications.timecodes,
          expectedMediaPackage.metadata.indexes.length,
          'Wrong number of images'
        );

        assert.isString(modifications.timecodes[0].id, 'Expected image id to be generated');
        assert.equal(modifications.timecodes[0].timecode, parseInt(expectedImage.timecode[0]), 'Wrong image timecode');
        assert.equal(
          modifications.timecodes[0].image.large,
          '/publish/' + expectedMediaPackage.id + '/' + expectedImage.id[0],
          'Wrong image URL');
        assert.equal(
          modifications.timecodes[0].image.small.url,
          '/publish/' + expectedMediaPackage.id + '/' + expectedImageReference.sprite.replace('/sprite/', ''),
          'Wrong image sprite URL'
        );
        assert.equal(modifications.timecodes[0].image.small.x, expectedImageReference.x, 'Wrong x coordinate');
        assert.equal(modifications.timecodes[0].image.small.y, expectedImageReference.y, 'Wrong y coordinate');
        callback(null, 1);
      });

      tarPackage.setError = function(error) {
        assert.fail('Unexpected error');
      };

      tarPackage.fsm.transition = function() {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        tarPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        xml2js.parseString.should.have.been.called.exactly(1);
        done();
      };

      tarPackage.saveTimecodes();
    });

  });

});
