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
  var archiveFormatFactory;
  var ArchivePackage;
  var archivePackage;
  var expectedArchiveFormat;
  var expectedError = new Error('Something went wrong');
  var expectedGenerateSpritesResult;
  var expectedPackage;
  var expectedPackageTemporaryFileName;
  var expectedPackageTemporaryDirectory;
  var expectedPackageTemporaryFilePath;
  var expectedPackages;
  var expectedReaddirResult;
  var fs;
  var openVeoApi;
  var platformProvider;
  var poiProvider;
  var publishConf;
  var videoPlatformConf;
  var videoProvider;
  var xml2js;

  // Mocks
  beforeEach(function() {
    expectedPackages = [];
    expectedReaddirResult = [];

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
        }),
        readdir: chai.spy(function(directoryPath, callback) {
          callback(null, expectedReaddirResult);
        })
      },
      storages: api.storages,
      util: api.util,
      imageProcessor: {
        generateSprites: chai.spy(function(imagesPaths, destinationPath, width, height, totalColumns, maxRows, quality,
          temporaryDirectoryPath, callback) {
          callback(null, expectedGenerateSpritesResult);
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

    expectedArchiveFormat = {
      date: 42,
      medias: ['video1.mp4', 'video2.mp4'],
      metadatas: {},
      name: 'Package name',
      pointsOfInterest: [
        {
          type: 'image',
          timecode: 1000,
          data: {
            filename: 'image1.jpg'
          }
        },
        {
          type: 'tag',
          timecode: 2000,
          data: {
            tagname: 'First tag'
          }
        }
      ],
      getDate: chai.spy(function(callback) {
        callback(null, expectedArchiveFormat.date);
      }),
      getMedias: chai.spy(function(callback) {
        callback(null, expectedArchiveFormat.medias);
      }),
      getMetadatas: chai.spy(function(callback) {
        callback(null, expectedArchiveFormat.medias);
      }),
      getName: chai.spy(function(callback) {
        callback(null, expectedArchiveFormat.name);
      }),
      getPointsOfInterest: chai.spy(function(callback) {
        callback(null, expectedArchiveFormat.pointsOfInterest);
      }),
      validate: chai.spy(function(callback) {
        callback(null, true);
      })
    };

    videoPlatformConf = {};
    archiveFormatFactory = {
      get: chai.spy(function(mediaPackagePath, callback) {
        callback(null, expectedArchiveFormat);
      })
    };

    platformProvider = {
      upload: chai.spy(function(filePath, callback) {
        callback(null, '1');
      })
    };
    var mediaPlatformFactory = {
      get: chai.spy(function(type, providerConf) {
        return platformProvider;
      })
    };

    mock('@openveo/api', openVeoApi);
    mock('xml2js', xml2js);
    mock('fs', fs);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), videoProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/PoiProvider.js'), poiProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/factory.js'), mediaPlatformFactory);
    mock(path.join(process.rootPublish, 'app/server/packages/archiveFormatFactory.js'), archiveFormatFactory);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);

    expectedPackage = {
      id: '42',
      packageType: openVeoApi.fileSystem.FILE_TYPES.TAR,
      originalFileName: 'file',
      originalPackagePath: '/tmp/package.tar',
      metadata: {
        indexes: []
      },
      title: 'package'
    };

    expectedPackageTemporaryFileName = expectedPackage.id + '.' + expectedPackage.packageType;
    expectedPackageTemporaryDirectory = path.join(publishConf.videoTmpDir, expectedPackage.id);
    expectedPackageTemporaryFilePath = path.join(
      expectedPackageTemporaryDirectory,
      expectedPackageTemporaryFileName
    );

    expectedGenerateSpritesResult = expectedArchiveFormat.pointsOfInterest.reduce(
      function(filtered, pointOfInterest, index) {
        if (pointOfInterest.type === 'image') {
          filtered.push(
            {
              sprite: '/sprite/path',
              image: path.join(
                expectedPackageTemporaryDirectory,
                expectedArchiveFormat.pointsOfInterest[index].data.filename
              ),
              x: index,
              y: index
            }
          );
        }
        return filtered;
      }, []
    );
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    ArchivePackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/ArchivePackage.js'));
    archivePackage = new ArchivePackage(expectedPackage, videoProvider, poiProvider);
    archivePackage.fsm = {};
    ArchivePackage.super_.prototype.defragment = chai.spy(function(filePath, callback) {
      callback();
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('defragmentMp4', function() {

    it('should change package state to DEFRAGMENTING_MP4 and defragment all videos files of the archive', function() {
      var defragmentCount = 0;

      ArchivePackage.super_.prototype.defragment = chai.spy(function(filePath, callback) {
        assert.equal(
          filePath,
          path.join(expectedPackageTemporaryDirectory, expectedArchiveFormat.medias[defragmentCount]),
          'Wrong file to defragment'
        );

        defragmentCount++;
        callback();
      });

      return archivePackage.defragmentMp4().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(
          expectedPackage.id,
          STATES.DEFRAGMENTING_MP4
        );
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(expectedArchiveFormat.medias.length);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not do anything if no media found in the archive', function() {
      expectedArchiveFormat.medias = [];

      return archivePackage.defragmentMp4().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(0);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(0);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive format failed', function() {
      archiveFormatFactory.get = chai.spy(function(mediaPackagePath, callback) {
        callback(expectedError);
      });

      return archivePackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.DEFRAGMENT_MP4_GET_FORMAT, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(0);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting medias files paths failed', function() {
      expectedArchiveFormat.getMedias = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.DEFRAGMENT_MP4_GET_MEDIAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if defragmenting failed', function() {
      ArchivePackage.super_.prototype.defragment = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      return archivePackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.DEFRAGMENTATION, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        ArchivePackage.super_.prototype.defragment.should.have.been.called.exactly(1);
      });
    });

  });

  describe('savePointsOfInterest', function() {

    it('should change package state to SAVING_POINTS_OF_INTEREST and save points of interest', function() {
      videoProvider.updateMetadata = chai.spy(function(id, metadata, callback) {
        assert.equal(id, expectedPackage.id, 'Wrong package updated');
        assert.deepEqual(metadata, {indexes: expectedArchiveFormat.pointsOfInterest}, 'Wrong package updated');
        callback();
      });

      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        assert.sameMembers(
          imagesPaths,
          expectedArchiveFormat.pointsOfInterest.reduce(function(filtered, pointOfInterest) {
            if (pointOfInterest.type === 'image') {
              filtered.push(path.join(expectedPackageTemporaryDirectory, pointOfInterest.data.filename));
            }
            return filtered;
          }, []),
          'Wrong base images for sprite'
        );
        assert.equal(
          destinationPath,
          path.join(expectedPackageTemporaryDirectory, 'points-of-interest-images.jpg'),
          'Wrong sprite destination path'
        );
        callback(null, expectedGenerateSpritesResult);
      });

      poiProvider.add = chai.spy(function(pointsOfInterest, callback) {
        var expectedPointsOfInterest = expectedArchiveFormat.pointsOfInterest.reduce(
          function(filtered, pointOfInterest, index) {
            if (pointOfInterest.type === 'tag') {
              filtered.push({
                name: pointOfInterest.data.tagname,
                value: pointOfInterest.timecode
              });
            }
            return filtered;
          }, []
        );

        assert.lengthOf(
          pointsOfInterest,
          expectedPointsOfInterest.length,
          'Wrong number of points of interest inserted'
        );

        pointsOfInterest.forEach(function(pointOfInterest, i) {
          assert.equal(
            pointOfInterest.name,
            expectedPointsOfInterest[i].name,
            'Wrong point of interest name'
          );
          assert.equal(
            pointOfInterest.value,
            expectedPointsOfInterest[i].value,
            'Wrong point of interest value'
          );
        });

        callback(null, pointsOfInterest.length, pointsOfInterest);
      });

      videoProvider.updateOne = chai.spy(function(filter, modifications, callback) {
        var timecodeCount = 0;
        var expectedTimecodes = [];
        var expectedTags = [];

        expectedArchiveFormat.pointsOfInterest.forEach(function(pointOfInterest) {
          if (pointOfInterest.type === 'image') {
            expectedTimecodes.push({
              timecode: pointOfInterest.timecode,
              image: {
                large: '/publish/' + expectedPackage.id + '/' + pointOfInterest.data.filename,
                small: {
                  url: '/publish/' + expectedPackage.id + '/' +
                  expectedGenerateSpritesResult[timecodeCount].sprite.replace('/sprite/', ''),
                  x: expectedGenerateSpritesResult[timecodeCount].x,
                  y: expectedGenerateSpritesResult[timecodeCount].y
                }
              }
            });
            timecodeCount++;
          } else if (pointOfInterest.type === 'tag') {
            expectedTags.push(pointOfInterest.id);
          }
        });

        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong media package id'
        );
        assert.lengthOf(
          modifications.timecodes,
          expectedTimecodes.length,
          'Wrong number of timecodes'
        );

        modifications.timecodes.forEach(function(timecode, index) {
          assert.isString(timecode.id, 'Expected timecode id to be generated');
          assert.equal(timecode.timecode, expectedTimecodes[index].timecode, 'Wrong timecode timecode');
          assert.equal(
            timecode.image.large,
            expectedTimecodes[index].image.large,
            'Wrong timecode large file URL'
          );
          assert.equal(
            timecode.image.small.url,
            expectedTimecodes[index].image.small.url,
            'Wrong image sprite URL'
          );

          assert.equal(
            timecode.image.small.x,
            expectedTimecodes[index].image.small.x,
            'Wrong timecode sprite x coordinate'
          );
          assert.equal(
            timecode.image.small.y,
            expectedTimecodes[index].image.small.y,
            'Wrong timecode sprite y coordinate'
          );
        });

        assert.deepEqual(modifications.tags, expectedTags, 'Wrong updated tags');
        callback(null, 1);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.SAVING_POINTS_OF_INTEREST);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should set package as on error if updating state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(0);
        videoProvider.updateMetadata.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should use the category if tag name if not specified', function() {
      expectedArchiveFormat.pointsOfInterest = [
        {
          type: 'tag',
          timecode: 42000,
          data: {
            category: 'Category 1'
          }
        }
      ];

      poiProvider.add = chai.spy(function(pointsOfInterest, callback) {
        assert.equal(
          pointsOfInterest[0].name,
          expectedArchiveFormat.pointsOfInterest[0].data.category,
          'Wrong tag name'
        );
        callback(null, pointsOfInterest.length, pointsOfInterest);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should generate tag name if not specified nor category', function() {
      expectedArchiveFormat.pointsOfInterest = [
        {
          type: 'tag',
          timecode: 42000
        }
      ];

      poiProvider.add = chai.spy(function(pointsOfInterest, callback) {
        assert.equal(
          pointsOfInterest[0].name,
          'Tag1',
          'Wrong tag name'
        );
        callback(null, pointsOfInterest.length, pointsOfInterest);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not do anything if there is no point of interest in the archive', function() {
      expectedArchiveFormat.pointsOfInterest = [];

      return archivePackage.savePointsOfInterest().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(0);
        videoProvider.updateMetadata.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive format failed', function() {
      archiveFormatFactory.get = chai.spy(function(mediaPackagePath, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_GET_FORMAT, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(0);
        videoProvider.updateMetadata.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting points of interest failed', function() {
      expectedArchiveFormat.getPointsOfInterest = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_GET_POINTS_OF_INTEREST, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(0);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package metadata failed', function() {
      videoProvider.updateMetadata = chai.spy(function(id, metadata, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE_METADATA, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(0);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if generating sprites failed', function() {
      openVeoApi.imageProcessor.generateSprites = chai.spy(function(imagesPaths, destinationPath, width, height,
        totalColumns, maxRows, quality, temporaryDirectoryPath, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_GENERATE_SPRITES, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if saving tags failed', function() {
      poiProvider.add = chai.spy(function(tags, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_ADD_TAGS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      videoProvider.updateOne = chai.spy(function(id, data, callback) {
        callback(expectedError);
      });

      return archivePackage.savePointsOfInterest().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getPointsOfInterest.should.have.been.called.exactly(1);
        videoProvider.updateMetadata.should.have.been.called.exactly(1);
        openVeoApi.imageProcessor.generateSprites.should.have.been.called.exactly(1);
        poiProvider.add.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

  describe('extractPackage', function() {

    it('should change package state to EXTRACTING and extract archive into its temporary directory', function() {
      expectedReaddirResult = [
        {
          isDirectory: function() {
            return false;
          },
          path: expectedPackageTemporaryFilePath
        },
        {
          isDirectory: function() {
            return false;
          },
          path: path.join(expectedPackageTemporaryDirectory, 'video.mp4')
        }
      ];

      return archivePackage.extractPackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.EXTRACTING);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.with(
          expectedPackageTemporaryFilePath,
          expectedPackageTemporaryDirectory
        );
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.with(expectedPackageTemporaryDirectory);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.isUndefined(expectedPackage.temporarySubDirectory, 'Unexpected temporary sub directory');
        assert.equal(
          archivePackage.packageTemporaryDirectory,
          expectedPackageTemporaryDirectory,
          'Wrong temporary directory'
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should change package temporary directory if archive resources are embedded in a directory', function() {
      var expectedTopDirectoryName = 'test';

      expectedReaddirResult = [
        {
          isDirectory: function() {
            return false;
          },
          path: expectedPackageTemporaryFilePath
        },
        {
          isDirectory: function() {
            return true;
          },
          path: path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName)
        }
      ];

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong package updated'
        );
        assert.deepEqual(data, {temporarySubDirectory: expectedTopDirectoryName}, 'Wrong updated data');
        callback(null, 1);
      });

      return archivePackage.extractPackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);

        assert.equal(
          expectedPackage.temporarySubDirectory,
          expectedTopDirectoryName,
          'Wrong temporary sub directory'
        );
        assert.equal(
          archivePackage.packageTemporaryDirectory,
          path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName),
          'Wrong temporary directory'
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not change package temporary directory if already changed', function() {
      var expectedTopDirectoryName = 'test';

      expectedPackage.temporarySubDirectory = expectedTopDirectoryName;
      archivePackage.packageTemporaryDirectory = path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName);
      expectedReaddirResult = [
        {
          isDirectory: function() {
            return false;
          },
          path: expectedPackageTemporaryFilePath
        },
        {
          isDirectory: function() {
            return true;
          },
          path: path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName)
        }
      ];

      return archivePackage.extractPackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(1);

        assert.equal(
          expectedPackage.temporarySubDirectory,
          expectedTopDirectoryName,
          'Wrong temporary sub directory'
        );
        assert.equal(
          archivePackage.packageTemporaryDirectory,
          path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName),
          'Wrong temporary directory'
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if updating state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if extraction failed', function() {
      openVeoApi.fileSystem.extract = chai.spy(function(packageFilePath, destinationDirectory, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.EXTRACT, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if verifying extraction failed', function() {
      openVeoApi.fileSystem.readdir = chai.spy(function(directoryPath, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.EXTRACT_VERIFY, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      var expectedTopDirectoryName = 'test';

      expectedReaddirResult = [
        {
          isDirectory: function() {
            return false;
          },
          path: expectedPackageTemporaryFilePath
        },
        {
          isDirectory: function() {
            return true;
          },
          path: path.join(expectedPackageTemporaryDirectory, expectedTopDirectoryName)
        }
      ];

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        callback(expectedError);
      });

      return archivePackage.extractPackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.EXTRACT_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.extract.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.readdir.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

  describe('getMediaFilePath', function() {

    it('should get first media file path contained in the archive', function(done) {
      archivePackage.getMediaFilePath(function(error, mediaFilePath) {
        assert.isNull(error, 'Unexpected error');

        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);

        assert.equal(
          mediaFilePath,
          path.join(
            expectedPackageTemporaryDirectory,
            expectedArchiveFormat.medias[0]
          ),
          'Wrong media file path'
        );

        done();
      });
    });

    it('should execute callback with an error if getting archive format failed', function(done) {
      archiveFormatFactory.get = chai.spy(function(mediaPackagePath, callback) {
        callback(expectedError);
      });

      archivePackage.getMediaFilePath(function(error, mediaFilePath) {
        assert.strictEqual(error, expectedError);
        assert.isUndefined(mediaFilePath, 'Unexpected media file path');

        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(0);

        done();
      });
    });

    it('should execute callback with an error if getting archive medias failed', function(done) {
      expectedArchiveFormat.getMedias = chai.spy(function(callback) {
        callback(expectedError);
      });

      archivePackage.getMediaFilePath(function(error, mediaFilePath) {
        assert.strictEqual(error, expectedError);
        assert.isUndefined(mediaFilePath, 'Unexpected media file path');

        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);

        done();
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
        assert.fail(error);
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
          expectedPackage.originalFileName,
          'Searching for wrong locked package original file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          expectedPackage.id,
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
        assert.fail(error);
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
        assert.fail(error);
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
        assert.fail(error);
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

  describe('uploadMedia', function() {

    it('should change package state to UPLOADING and upload all medias to the media platform', function() {
      var expectedMediasIds = ['90', '91'];
      var uploadCount = 0;

      platformProvider.upload = chai.spy(function(filePath, callback) {
        assert.equal(filePath, path.join(
          expectedPackageTemporaryDirectory,
          expectedArchiveFormat.medias[uploadCount]
        ), 'Wrong file uploaded');
        callback(null, expectedMediasIds[uploadCount++]);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong package updated'
        );
        assert.equal(data.link, '/publish/video/' + expectedPackage.id, 'Wrong package link');
        assert.sameMembers(data.mediaId, expectedMediasIds, 'Wrong package medias ids');
        callback();
      });

      return archivePackage.uploadMedia().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.UPLOADING);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(expectedArchiveFormat.medias.length);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not upload anything if medias have already been uploaded', function() {
      expectedPackage.mediaId = expectedArchiveFormat.medias.map(function(media, index) {
        return index;
      });

      return archivePackage.uploadMedia().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should upload only not uploaded medias', function() {
      var expectedMediaId = '90';
      expectedPackage.mediaId = [expectedMediaId];

      platformProvider.upload = chai.spy(function(filePath, callback) {
        assert.equal(filePath, path.join(
          expectedPackageTemporaryDirectory,
          expectedArchiveFormat.medias[1]
        ), 'Wrong uploaded file');
        callback(null, '1');
      });

      return archivePackage.uploadMedia().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(
          expectedArchiveFormat.medias.length - 1
        );
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(0);
        platformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive format failed', function() {
      archiveFormatFactory.get = chai.spy(function(mediaPackagePath, callback) {
        callback(expectedError);
      });

      return archivePackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.UPLOAD_MEDIA_GET_FORMAT, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(0);
        platformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting medias files names failed', function() {
      expectedArchiveFormat.getMedias = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.UPLOAD_MEDIA_GET_MEDIAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if uploading a media failed', function() {
      platformProvider.upload = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      return archivePackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MEDIA_UPLOAD, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        callback(expectedError);
      });

      return archivePackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.UPLOAD_MEDIA_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMedias.should.have.been.called.exactly(1);
        platformProvider.upload.should.have.been.called.exactly(expectedArchiveFormat.medias.length);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

  describe('validatePackage', function() {

    it('should change package state to VALIDATING and get package information', function() {
      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong package updated'
        );
        assert.equal(data.date, expectedArchiveFormat.date, 'Wrong updated package date');
        assert.isDefined(data.metadata, 'Expected package metadata to be updated');
        assert.equal(data.title, expectedArchiveFormat.name, 'Wrong updated package title');
        callback();
      });

      return archivePackage.validatePackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.VALIDATING);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getName.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not modify package title if name is not in archive metadatas', function() {
      var expectedTitle = expectedPackage.title;
      expectedArchiveFormat.name = null;

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(data.title, expectedTitle, 'Wrong updated package title');
        callback();
      });

      return archivePackage.validatePackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getName.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(0);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive format failed', function() {
      archiveFormatFactory.get = chai.spy(function(mediaPackagePath, callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATE_GET_FORMAT, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(0);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if archive is not valid', function() {
      expectedArchiveFormat.validate = chai.spy(function(callback) {
        callback(null, false);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.code, ERRORS.VALIDATION, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(0);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if validating the archive failed', function() {
      expectedArchiveFormat.validate = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATION, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(0);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive metadatas failed', function() {
      expectedArchiveFormat.getMetadatas = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATE_GET_METADATAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(0);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive date failed', function() {
      expectedArchiveFormat.getDate = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATE_GET_METADATAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getName.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting archive name failed', function() {
      expectedArchiveFormat.getName = chai.spy(function(callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATE_GET_METADATAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getName.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        callback(expectedError);
      });

      return archivePackage.validatePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, ArchivePackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.VALIDATE_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        archiveFormatFactory.get.should.have.been.called.exactly(1);
        expectedArchiveFormat.validate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getMetadatas.should.have.been.called.exactly(1);
        expectedArchiveFormat.getDate.should.have.been.called.exactly(1);
        expectedArchiveFormat.getName.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

});
