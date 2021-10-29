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
  var ArchivePackage;
  var archivePackage;
  var expectedError = new Error('Something went wrong');
  var expectedPackage;
  var expectedPackages;
  var fs;
  var openVeoApi;
  var poiProvider;
  var publishConf;
  var videoPlatformConf;
  var videoProvider;
  var xml2js;

  // Mocks
  beforeEach(function() {
    expectedPackages = [];

    videoProvider = {
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedPackages[0]);
      }),
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      }),
      updateMediaId: chai.spy(function(id, mediaId, callback) {
        callback(null, 1);
      }),
      updateMetadata: chai.spy(function(id, metadata, callback) {
        callback(null, 1);
      }),
      updateState: chai.spy(function(id, state, callback) {
        callback(null, 1);
      })
    };

    poiProvider = {
      add: chai.spy(function(pois, callback) {
        callback(null, pois.length, pois);
      }),
      getAll: chai.spy(function(filter, fields, sort, callback) {
        callback(null, []);
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
        ACTIONS: api.fileSystem.ACTIONS,
        getConfDir: function() {
          return '/conf/dir';
        },
        performActions: chai.spy(function(actions, callback) {
          callback();
        })
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
      readdir: chai.spy(function(directoryPath, callback) {
        callback(null, []);
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

    expectedPackage = {
      id: '42',
      packageType: openVeoApi.fileSystem.FILE_TYPES.TAR,
      originalFileName: 'file',
      metadata: {
        indexes: []
      }
    };
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    ArchivePackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/ArchivePackage.js'));
    archivePackage = new ArchivePackage(expectedPackage, videoProvider, poiProvider);
    archivePackage.fsm = {};
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('savePointsOfInterest', function() {

    it('should update package state', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedPackage.id, 'Wrong id');
        assert.equal(state, STATES.SAVING_POINTS_OF_INTEREST, 'Wrong state');
        callback();
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if updating state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected resolve');
      }).catch(function(error) {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should save media package tags based on package metadata', function() {
      expectedPackage.metadata.indexes = [
        {
          type: 'tag',
          timecode: 42000,
          data: {
            tagname: 'tag1'
          }
        }
      ];
      var expectedTag = expectedPackage.metadata.indexes[0];
      var expectedTagId = '42';

      poiProvider.add = chai.spy(function(pois, callback) {
        pois[0].id = expectedTagId;
        assert.lengthOf(pois, expectedPackage.metadata.indexes.length, 'Wrong number of tags');
        assert.equal(pois[0].name, expectedTag.data.tagname, 'Wrong tag name');
        assert.equal(pois[0].value, expectedTag.timecode, 'Wrong tag value');
        callback(null, pois.length, pois);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong media package id'
        );

        assert.sameMembers(modifications.tags, [expectedTagId], 'Wrong tags associated to the media');
        callback(null, 1);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should generate a tag name if not specified', function() {
      expectedPackage.metadata.indexes = [
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
        videoProvider.updateState.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if adding tags failed', function() {
      expectedPackage.metadata.indexes = [
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
        videoProvider.updateState.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should set package as on error if updating media failed', function() {
      expectedPackage.metadata.indexes = [
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
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should save media package images', function() {
      expectedPackage.metadata.indexes = [
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
            expectedPackage.id,
            expectedPackage.metadata.indexes[0].data.filename
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
        var expectedImage = expectedPackage.metadata.indexes[0];
        var expectedImageReference = expectedImagesReferences[0];

        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(
          modifications.timecodes,
          expectedPackage.metadata.indexes.length,
          'Wrong number of images'
        );
        assert.isString(modifications.timecodes[0].id, 'Expected image id to be generated');
        assert.equal(modifications.timecodes[0].timecode, expectedImage.timecode, 'Wrong image timecode');
        assert.equal(
          modifications.timecodes[0].image.large,
          '/publish/' + expectedPackage.id + '/' + expectedImage.data.filename,
          'Wrong image URL');
        assert.equal(
          modifications.timecodes[0].image.small.url,
          '/publish/' + expectedPackage.id + '/' + expectedImageReference.sprite.replace('/sprite/', ''),
          'Wrong image sprite URL'
        );
        assert.equal(modifications.timecodes[0].image.small.x, expectedImageReference.x, 'Wrong x coordinate');
        assert.equal(modifications.timecodes[0].image.small.y, expectedImageReference.y, 'Wrong y coordinate');
        callback(null, 1);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if generating sprite failed', function() {
      expectedPackage.metadata.indexes = [
        {
          type: 'image',
          timecode: 42000,
          data: {
            filename: 'filename.jpg'
          }
        }
      ];

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST, 'Wrong error code');
      });
    });

    it('should retrieve points of interest images from synchro.xml if not specified in metadata', function() {
      expectedPackage.metadata.indexes = null;
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
            expectedPackage.id,
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
          expectedPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(
          modifications.timecodes,
          expectedPackage.metadata.indexes.length,
          'Wrong number of images'
        );

        assert.isString(modifications.timecodes[0].id, 'Expected image id to be generated');
        assert.equal(modifications.timecodes[0].timecode, parseInt(expectedImage.timecode[0]), 'Wrong image timecode');
        assert.equal(
          modifications.timecodes[0].image.large,
          '/publish/' + expectedPackage.id + '/' + expectedImage.id[0],
          'Wrong image URL');
        assert.equal(
          modifications.timecodes[0].image.small.url,
          '/publish/' + expectedPackage.id + '/' + expectedImageReference.sprite.replace('/sprite/', ''),
          'Wrong image sprite URL'
        );
        assert.equal(modifications.timecodes[0].image.small.x, expectedImageReference.x, 'Wrong x coordinate');
        assert.equal(modifications.timecodes[0].image.small.y, expectedImageReference.y, 'Wrong y coordinate');
        callback(null, 1);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.exactly(1);
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
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedPackage.id, 'Wrong id');
        assert.equal(state, STATES.EXTRACTING, 'Wrong state');
        callback();
      });

      return archivePackage.extractPackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should set package as on error if updating state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected resolve');
      }).catch(function(error) {
        videoProvider.updateState.should.have.been.called.exactly(1);
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
            expectedPackage.id,
            expectedPackage.id + '.' + expectedPackage.packageType
          ),
          'Wrong package path'
        );

        assert.equal(
          destinationDirectory,
          path.join(publishConf.videoTmpDir, expectedPackage.id),
          'Wrong package path'
        );
        callback();
      });

      return archivePackage.extractPackage().then(function() {
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should set package as on error if extraction failed', function() {
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

  describe('merge', function() {
    var expectedPackagePublicDirectory;
    var expectedPackageTags;
    var expectedSprites;
    var expectedTimecodes;
    var lockedPackage;
    var lockedPackageSprites;
    var lockedPackagePublicDirectory;

    beforeEach(function() {
      var lockedPackageId = '43';

      expectedPackage.state = STATES.INITIALIZING_MERGE;
      expectedPackage.mediaId = ['1'];
      expectedPackage.tags = ['1', '2'];
      expectedPackage.timecodes = [
        {
          id: '1',
          timecode: 3000,
          image: {
            small: {
              url: '/publish/' + expectedPackage.id + '/points-of-interest-images.jpg',
              x: 0,
              y: 0
            },
            large: '/publish/' + expectedPackage.id + '/slide_00001.jpeg'
          }
        },
        {
          id: '2',
          timecode: 2000,
          image: {
            small: {
              url: '/publish/' + expectedPackage.id + '/points-of-interest-images-1.jpg',
              x: 0,
              y: 0
            },
            large: '/publish/' + expectedPackage.id + '/slide_00002.jpeg'
          }
        }
      ];
      expectedPackageTags = [
        {
          id: '1',
          name: 'Tag1',
          value: 2000
        },
        {
          id: '2',
          name: 'Tag2',
          value: 3000
        }
      ];
      expectedPackagePublicDirectory = path.join(archivePackage.mediasPublicPath, expectedPackage.id);

      lockedPackage = {
        id: lockedPackageId,
        lockedByPackage: expectedPackage.id,
        mediaId: ['2'],
        originalFileName: expectedPackage.originalFileName,
        state: STATES.WAITING_FOR_MERGE,
        tags: ['3', '4'],
        timecodes: [
          {
            id: '1',
            timecode: 1000,
            image: {
              small: {
                url: '/publish/' + lockedPackageId + '/points-of-interest-images.jpg',
                x: 0,
                y: 0
              },
              large: '/publish/' + lockedPackageId + '/slide_00001.jpeg'
            }
          },
          {
            id: '2',
            timecode: 4000,
            image: {
              small: {
                url: '/publish/' + lockedPackageId + '/points-of-interest-images-1.jpg',
                x: 0,
                y: 0
              },
              large: '/publish/' + lockedPackageId + '/slide_00002.jpeg'
            }
          }
        ]
      };
      lockedPackagePublicDirectory = path.join(archivePackage.mediasPublicPath, lockedPackage.id);
      lockedPackageSprites = [
        'points-of-interest-images.jpg',
        'points-of-interest-images-1.jpg'
      ];

      expectedSprites = lockedPackage.timecodes.concat(expectedPackage.timecodes).map(function(timecode, index) {
        var imageName = path.basename(timecode.image.large);
        return {
          sprite: path.join(lockedPackagePublicDirectory, 'points-of-interest-images-' + index + '.jpg'),
          image: path.join(
            lockedPackagePublicDirectory,
            (index < expectedPackage.timecodes.length ? imageName : expectedPackage.id + '-' + imageName)
          ),
          x: 0,
          y: 0
        };
      });
      expectedTimecodes = lockedPackage.timecodes.concat(expectedPackage.timecodes).map(function(timecode, index) {
        return {
          timecode: timecode.timecode,
          image: {
            large: '/publish/' + lockedPackageId + '/' + path.basename(expectedSprites[index].image),
            small: {
              url: '/publish/' + lockedPackageId + '/' + path.basename(expectedSprites[index].sprite),
              x: expectedSprites[index].x,
              y: expectedSprites[index].y
            }
          }
        };
      }).sort(function(timecode1, timecode2) {
        return timecode1.timecode - timecode2.timecode;
      });

      expectedPackages = [lockedPackage];

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(
        imagesPaths,
        destinationPath,
        width,
        height,
        totalColumns,
        maxRows,
        quality,
        temporaryDirectoryPath,
        callback
      ) {
        callback(null, expectedSprites);
      });

      fs.readdir = chai.spy(function(directoryPath, callback) {
        callback(null, lockedPackageSprites);
      });

      poiProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(null, expectedPackageTags);
      });

      poiProvider.add = chai.spy(function(pois, callback) {
        callback(null, expectedPackageTags.length, expectedPackageTags.map(function(tag) {
          return {
            id: tag.id + '-new',
            name: tag.name,
            value: tag.value
          };
        }));
      });

      ArchivePackage.super_.prototype.merge = chai.spy(function() {
        return Promise.resolve();
      });
    });

    it('should set package state to MERGING and merge medias', function() {
      return archivePackage.merge().then(function() {
        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should reject promise if setting package state failed', function() {
      ArchivePackage.super_.prototype.merge = chai.spy(function() {
        return Promise.reject(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        fs.readdir.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should merge points of interest into locked package', function() {
      var performActionsCount = 0;

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'state').value,
          STATES.WAITING_FOR_MERGE,
          'Searching for wrong locked package state'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          archivePackage.mediaPackage.originalFileName,
          'Searching for wrong locked package original file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          archivePackage.mediaPackage.id,
          'Searching for wrong locked package locker'
        );

        callback(null, lockedPackage);
      });

      fs.readdir = chai.spy(function(directoryPath, callback) {
        assert.equal(
          directoryPath,
          lockedPackagePublicDirectory,
          'Wrong locked package public directory'
        );

        callback(null, lockedPackageSprites);
      });

      openVeoApi.fileSystem.performActions = chai.spy(function(actions, callback) {
        if (performActionsCount === 0) {
          assert.equal(actions.length, lockedPackageSprites.length);

          for (var i = 0; i < lockedPackageSprites.length; i++) {
            assert.equal(actions[i].type, openVeoApi.fileSystem.ACTIONS.REMOVE, 'Expected sprite to be removed');
            assert.equal(
              actions[i].sourcePath,
              path.join(lockedPackagePublicDirectory, lockedPackageSprites[i]),
              'Wrong sprite path'
            );
          }
        } else if (performActionsCount === 1) {
          assert.equal(actions.length, expectedPackage.timecodes.length);

          for (var j = 0; j < actions.length; j++) {
            assert.equal(actions[j].type, openVeoApi.fileSystem.ACTIONS.COPY, 'Expected timecode image to be copied');
            assert.equal(
              actions[j].sourcePath,
              path.join(
                expectedPackagePublicDirectory,
                path.basename(expectedPackage.timecodes[j].image.large)
              ),
              'Wrong timecode image'
            );
            assert.equal(
              actions[j].destinationPath,
              path.join(
                lockedPackagePublicDirectory,
                expectedPackage.id + '-' + path.basename(expectedPackage.timecodes[j].image.large)
              ),
              'Wrong timecode image destination'
            );
          }
        }

        performActionsCount++;
        callback();
      });

      poiProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          expectedPackage.tags,
          'Searching for wrong points of interest'
        );
        callback(null, expectedPackageTags);
      });

      poiProvider.add = chai.spy(function(pois, callback) {
        for (var i = 0; i < pois.length; i++) {
          assert.isUndefined(pois[i].id, 'Unexpected point of interest id');
          assert.equal(pois[i].name, expectedPackageTags[i].name, 'Wrong point of interest name');
          assert.equal(pois[i].value, expectedPackageTags[i].value, 'Wrong point of interest value');
        }

        callback(null, expectedPackageTags.length, expectedPackageTags.map(function(tag) {
          return {
            id: tag.id + '-new',
            name: tag.name,
            value: tag.value
          };
        }));
      });

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(
        imagesPaths,
        destinationPath,
        width,
        height,
        totalColumns,
        maxRows,
        quality,
        temporaryDirectoryPath,
        callback
      ) {
        assert.sameMembers(
          imagesPaths,
          expectedPackage.timecodes.map(function(timecode) {
            return path.join(
              lockedPackagePublicDirectory,
              expectedPackage.id + '-' + path.basename(timecode.image.large)
            );
          }).concat(lockedPackage.timecodes.map(function(timecode) {
            return path.join(
              lockedPackagePublicDirectory,
              path.basename(timecode.image.large)
            );
          })),
          'Wrong base images for sprites'
        );
        assert.equal(
          destinationPath,
          path.join(lockedPackagePublicDirectory, 'points-of-interest-images.jpg'),
          'Wrong sprites destination file'
        );
        assert.equal(width, 142, 'Wrong sprites width');
        assert.equal(height, 80, 'Wrong sprites height');
        assert.equal(totalColumns, 5, 'Wrong sprites number of columns');
        assert.equal(maxRows, 5, 'Wrong sprites number of rows');
        assert.equal(quality, 90, 'Wrong sprites quality');
        assert.isNull(temporaryDirectoryPath, 'Unexpected sprites temporary directory');

        callback(null, expectedSprites);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          lockedPackage.id,
          'Expected points of interest of locked package to be updated'
        );

        assert.equal(
          modifications.timecodes.length,
          expectedTimecodes.length,
          'Wrong number of locked package timecodes'
        );

        for (var i = 0; i < modifications.timecodes.length; i++) {
          assert.isDefined(modifications.timecodes[i].id, 'Wrong locked package timecode id');
          assert.equal(
            modifications.timecodes[i].timecode,
            expectedTimecodes[i].timecode,
            'Wrong locked package timecode id'
          );
          assert.equal(
            modifications.timecodes[i].image.large,
            expectedTimecodes[i].image.large,
            'Wrong locked package timecode large image'
          );
          assert.equal(
            modifications.timecodes[i].image.small.url,
            expectedTimecodes[i].image.small.url,
            'Wrong locked package timecode sprite image'
          );
          assert.equal(
            modifications.timecodes[i].image.small.x,
            expectedTimecodes[i].image.small.x,
            'Wrong locked package timecode sprite image x coordinate'
          );
          assert.equal(
            modifications.timecodes[i].image.small.y,
            expectedTimecodes[i].image.small.y,
            'Wrong locked package timecode sprite image y coordinate'
          );
        }

        assert.sameMembers(
          modifications.tags,
          lockedPackage.tags.concat(expectedPackageTags.map(function(tag) {
            return tag.id + '-new';
          })),
          'Wrong locked package tags'
        );

        callback(null, 1);
      });

      return archivePackage.merge().then(function() {
        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(2);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should not merge points of interest if package has none', function() {
      expectedPackage.timecodes = [];
      expectedPackage.tags = [];

      return archivePackage.merge().then(function() {
        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(0);
        poiProvider.getAll.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should not remove sprites of locked package if none', function() {
      lockedPackage.timecodes = [];
      lockedPackageSprites = ['not-a-sprite.jpg'];

      openVeoApi.fileSystem.performActions = chai.spy(function(actions, callback) {
        for (var i = 0; i < actions.length; i++) {
          assert.equal(actions[i].type, openVeoApi.fileSystem.ACTIONS.COPY, 'Expected timecode image to be copied');
        }

        callback();
      });
      return archivePackage.merge().then(function() {
        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(1);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

    it('should reject promise if getting locked package with same name failed', function() {
      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GET_PACKAGE_WITH_SAME_NAME, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(0);
        poiProvider.getAll.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if reading locked package public directory failed', function() {
      fs.readdir = chai.spy(function(directoryPath, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_READ_PACKAGE_WITH_SAME_NAME_PUBLIC_DIRECTORY, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(0);
        poiProvider.getAll.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if removing locked package sprites failed', function() {
      openVeoApi.fileSystem.performActions = chai.spy(function(actions, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_REMOVE_PACKAGE_WITH_SAME_NAME_SPRITES, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(1);
        poiProvider.getAll.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if copying timecodes images to locked package public directory failed', function() {
      lockedPackage.timecode = [];
      lockedPackageSprites = [];

      openVeoApi.fileSystem.performActions = chai.spy(function(actions, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_COPY_IMAGES, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(1);
        poiProvider.getAll.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting points of interest of type "tag" failed', function() {
      poiProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GET_POINTS_OF_INTEREST, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(2);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if duplicating points of interest of type "tag" failed', function() {
      poiProvider.add = chai.spy(function(pois, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_DUPLICATE_POINTS_OF_INTEREST, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(2);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if generating locked package sprites failed', function() {
      openVeoApi.imageProcessor.generateSprites = chai.spy(function(
        imagesPaths,
        destinationPath,
        width,
        height,
        totalColumns,
        maxRows,
        quality,
        temporaryDirectoryPath,
        callback
      ) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GENERATE_SPRITES, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(2);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating locked package failed', function() {
      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        return callback(expectedError);
      });

      return archivePackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_POINTS_OF_INTEREST_UPDATE_PACKAGE, 'Wrong error code');

        ArchivePackage.super_.prototype.merge.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        fs.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.performActions.should.have.been.called.exactly(2);
        poiProvider.getAll.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

});
