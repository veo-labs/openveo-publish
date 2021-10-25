'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var ArchivePackageError = process.requirePublish('app/server/packages/ArchivePackageError.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('ArchivePackage', function() {
  var archivePackage;
  var videoProvider;
  var poiProvider;
  var expectedMediaPackage;
  var openVeoApi;
  var xml2js;
  var publishConf;
  var videoPlatformConf;
  var fs;

  // Mocks
  beforeEach(function() {
    videoProvider = {
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      }),
      updateMetadata: chai.spy(function(id, metadata, callback) {
        callback(null, 1);
      })
    };

    poiProvider = {
      add: chai.spy(function(pois, callback) {
        callback(null, pois.length, pois);
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
          GIF: 'gif',
          TAR: 'tar'
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
      access: chai.spy(function(resourcePath, callback) {
        callback();
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
    mock(path.join(process.rootPublish, 'app/server/providers/PoiProvider.js'), poiProvider);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);

    expectedMediaPackage = {
      id: '42',
      packageType: openVeoApi.fileSystem.FILE_TYPES.TAR,
      metadata: {
        indexes: []
      }
    };
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    var ArchivePackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/ArchivePackage.js'));
    archivePackage = new ArchivePackage(expectedMediaPackage, videoProvider, poiProvider);
    archivePackage.fsm = {};
    archivePackage.updateState = chai.spy(function(id, state, callback) {
      callback();
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('savePointsOfInterest', function() {

    it('should update package state', function() {
      archivePackage.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedMediaPackage.id, 'Wrong id');
        assert.equal(state, STATES.SAVING_POINTS_OF_INTEREST, 'Wrong state');
        callback();
      });

      return archivePackage.savePointsOfInterest().then(function() {
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if updating state failed', function() {
      var expectedError = new Error('Something went wrong');
      archivePackage.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected resolve');
      }).catch(function(error) {
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should save media package tags based on package metadata', function() {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000,
          data: {
            tagname: 'tag1'
          }
        }
      ];
      var expectedTag = expectedMediaPackage.metadata.indexes[0];
      var expectedTagId = '42';

      poiProvider.add = chai.spy(function(pois, callback) {
        pois[0].id = expectedTagId;
        assert.lengthOf(pois, expectedMediaPackage.metadata.indexes.length, 'Wrong number of tags');
        assert.equal(pois[0].name, expectedTag.data.tagname, 'Wrong tag name');
        assert.equal(pois[0].value, expectedTag.timecode, 'Wrong tag value');
        callback(null, pois.length, pois);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMediaPackage.id,
          'Wrong media package id'
        );

        assert.sameMembers(modifications.tags, [expectedTagId], 'Wrong tags associated to the media');
        callback(null, 1);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should generate a tag name if not specified', function() {
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000
        }
      ];

      poiProvider.add = chai.spy(function(pois, callback) {
        assert.isString(pois[0].name, 'Expected tag name to be generated');
        callback(null, pois.length, pois);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        archivePackage.updateState.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if adding tags failed', function() {
      var expectedError = new Error('Something went wrong');
      expectedMediaPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000
        }
      ];

      poiProvider.add = chai.spy(function(pois, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        archivePackage.updateState.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should set package as on error if updating media failed', function() {
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

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should save media package images', function() {
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

      return archivePackage.savePointsOfInterest().then(function() {
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if generating sprite failed', function() {
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

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should retrieve points of interest images from synchro.xml if not specified in metadata', function() {
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

      return archivePackage.savePointsOfInterest().then(function() {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        archivePackage.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        xml2js.parseString.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

  });

  describe('extractPackage', function() {

    it('should update package state', function() {
      archivePackage.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedMediaPackage.id, 'Wrong id');
        assert.equal(state, STATES.EXTRACTING, 'Wrong state');
        callback();
      });

      return archivePackage.extractPackage().then(function() {
        archivePackage.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if updating state failed', function() {
      var expectedError = new Error('Something went wrong');
      archivePackage.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected resolve');
      }).catch(function(error) {
        archivePackage.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.EXTRACT, 'Wrong error code');
      });
    });

    it('should extract package into its publish temporary directory', function() {
      openVeoApi.fileSystem.extract = chai.spy(function(packageFilePath, destinationDirectory, callback) {
        assert.equal(
          packageFilePath,
          path.join(
            publishConf.videoTmpDir,
            expectedMediaPackage.id,
            expectedMediaPackage.id + '.' + expectedMediaPackage.packageType
          ),
          'Wrong package path'
        );

        assert.equal(
          destinationDirectory,
          path.join(publishConf.videoTmpDir, expectedMediaPackage.id),
          'Wrong package path'
        );
        callback();
      });

      return archivePackage.extractPackage().then(function() {
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
      }).catch(function(error) {
        console.log(error);
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should set package as on error if extraction failed', function() {
      var expectedError = new Error('Something went wrong');

      openVeoApi.fileSystem.extract = chai.spy(function(packageFilePath, destinationDirectory, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.ok(false, 'Unexpected response');
      }).catch(function(error) {
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.EXTRACT, 'Wrong error code');
      });
    });

  });

});
