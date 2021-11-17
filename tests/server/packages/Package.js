'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');

var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var PackageError = process.requirePublish('app/server/packages/PackageError.js');

var assert = chai.assert;
var ResourceFilter = api.storages.ResourceFilter;

chai.should();
chai.use(spies);

describe('Package', function() {
  var expectedPackage;
  var expectedPackages;
  var expectedPackageTemporaryDirectory;
  var expectedError = new Error('Something went wrong');
  var fs;
  var mediaPackage;
  var mediaPlatformFactory;
  var mediaPlatformProvider;
  var openVeoApi;
  var Package;
  var poiProvider;
  var publishConf;
  var videoPlatformConf;
  var videoProvider;

  // Mocks
  beforeEach(function() {
    expectedPackages = [];

    poiProvider = {};
    videoProvider = {
      add: chai.spy(function(medias, callback) {
        callback(null, medias.length, medias);
      }),
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedPackages[0]);
      }),
      getAll: chai.spy(function(filter, fields, sort, callback) {
        callback(null, expectedPackages);
      }),
      removeLocal: chai.spy(function(filter, callback) {
        callback(null, 1);
      }),
      updateErrorCode: chai.spy(function(id, code, callback) {
        callback(null, 1);
      }),
      updateMediaId: chai.spy(function(id, mediaId, callback) {
        callback(null, 1);
      }),
      updateOne: chai.spy(function(filter, data, callback) {
        callback(null, 1);
      }),
      updateLastState: chai.spy(function(id, state, callback) {
        callback(null, 1);
      }),
      updateLastTransition: chai.spy(function(id, transition, callback) {
        callback(null, 1);
      }),
      updateLink: chai.spy(function(id, link, callback) {
        callback(null, 1);
      }),
      updateState: chai.spy(function(id, state, callback) {
        callback(null, 1);
      })
    };

    fs = {
      unlink: chai.spy(function(filePath, callback) {
        callback();
      })
    };

    openVeoApi = {
      fileSystem: {
        copy: chai.spy(function(sourcePath, destinationSourcePath, callback) {
          callback();
        }),
        getConfDir: function() {
          return '/conf/dir';
        },
        rmdir: chai.spy(function(directoryPath, callback) {
          callback();
        })
      },
      storages: api.storages
    };

    publishConf = {
      videoTmpDir: '/tmp'
    };

    mediaPlatformProvider = {
      upload: chai.spy(function(mediaFilePath, callback) {
        callback(null, 'upload-id');
      })
    };

    mediaPlatformFactory = {
      get: chai.spy(function() {
        return mediaPlatformProvider;
      })
    };

    videoPlatformConf = {};

    mock('@openveo/api', openVeoApi);
    mock('fs', fs);

    mock(path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/factory.js'), mediaPlatformFactory);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);
  });

  // Initializes tests
  beforeEach(function() {
    Package = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    expectedPackage = {
      date: Date.now(),
      id: '42',
      originalFileName: 'file',
      metadata: {
        indexes: []
      },
      packageType: 'mp4',
      type: 'local'
    };
    expectedPackageTemporaryDirectory = path.join(publishConf.videoTmpDir, expectedPackage.id);

    mediaPackage = new Package(expectedPackage, videoProvider, poiProvider);
    mediaPackage.init(Package.STATES.PACKAGE_SUBMITTED, Package.TRANSITIONS.INIT);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('initPackage', function() {

    it('should set package defaults and add it to the storage', function() {
      chai.spy.on(mediaPackage, 'emit');

      return mediaPackage.initPackage().then(function() {
        assert.equal(mediaPackage.mediaPackage.state, STATES.PENDING, 'Wrong package state');
        assert.equal(mediaPackage.mediaPackage.errorCode, ERRORS.NO_ERROR, 'Wrong package error code');
        assert.equal(mediaPackage.mediaPackage.date, expectedPackage.date, 'Wrong package date');
        assert.deepEqual(mediaPackage.mediaPackage.properties, {}, 'Wrong package properties');
        assert.deepEqual(mediaPackage.mediaPackage.metadata, expectedPackage.metadata, 'Wrong package metadata');
        assert.equal(
          mediaPackage.mediaPackage.lastState,
          Package.STATES.PACKAGE_INITIALIZED,
          'Wrong package last state'
        );
        assert.equal(
          mediaPackage.mediaPackage.lastTransition,
          Package.TRANSITIONS.COPY_PACKAGE,
          'Wrong package last transition'
        );
        videoProvider.add.should.have.been.called.exactly(1);
        mediaPackage.emit.should.have.been.called.exactly(1);
        mediaPackage.emit.should.have.been.called.with('stateChanged', mediaPackage.mediaPackage);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should generate date in not specified in package', function() {
      expectedPackage.date = null;

      return mediaPackage.initPackage().then(function() {
        assert.isDefined(mediaPackage.mediaPackage.date, 'Expected date');
        videoProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if adding package to storage failed', function() {
      videoProvider.add = chai.spy(function(medias, callback) {
        callback(expectedError);
      });

      return mediaPackage.initPackage().then(function() {
        assert.fail('Unexpected promise resolution');
        videoProvider.add.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.SAVE_PACKAGE_DATA, 'Wrong error code');
      });
    });

  });

  describe('cleanDirectory', function() {

    it('should change package state to CLEANING and remove temporary directory', function() {
      return mediaPackage.cleanDirectory().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.CLEANING);
        openVeoApi.fileSystem.rmdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rmdir.should.have.been.called.with(expectedPackageTemporaryDirectory);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should remove top level temporary directory if sub directory', function() {
      var expectedTemporarySubDirectory = 'sub-directory';
      mediaPackage.packageTemporaryDirectory = path.join(
        expectedPackageTemporaryDirectory,
        expectedTemporarySubDirectory
      );
      expectedPackage.temporarySubDirectory = expectedTemporarySubDirectory;

      return mediaPackage.cleanDirectory().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.CLEANING);
        openVeoApi.fileSystem.rmdir.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rmdir.should.have.been.called.with(expectedPackageTemporaryDirectory);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return mediaPackage.cleanDirectory().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rmdir.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if removing temporary directory failed', function() {
      openVeoApi.fileSystem.rmdir = chai.spy(function(directoryPath, callback) {
        callback(expectedError);
      });

      return mediaPackage.cleanDirectory().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.CLEAN_DIRECTORY, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rmdir.should.have.been.called.exactly(1);
      });
    });

  });

  describe('executeTransition', function() {

    it('should emit "complete" event if package has been marked as removed', function(done) {
      mediaPackage.on('complete', function() {
        assert.ok(true);
        done();
      });

      expectedPackage.removed = true;
      mediaPackage.executeTransition();
    });

    it('should set package state to READY and emit "complete" event if merge is not required', function(done) {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(state, STATES.READY, 'Wrong state');
        callback();
      });

      mediaPackage.on('complete', function() {
        assert.ok(true);
        videoProvider.updateLastState.should.have.been.called.exactly(1);
        videoProvider.updateLastTransition.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.exactly(1);
        done();
      });

      expectedPackage.mergeRequired = false;
      mediaPackage.executeTransition(Package.TRANSITIONS.MERGE);
    });

  });

  describe('uploadMedia', function() {

    it('should change package state to UPLOADING and upload media file', function() {
      var expectedMediaId = '99';

      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(state, STATES.UPLOADING, 'Wrong state');
        callback();
      });

      mediaPlatformProvider.upload = chai.spy(function(mediaFilePath, callback) {
        assert.equal(
          mediaFilePath,
          path.join(
            expectedPackageTemporaryDirectory,
            expectedPackage.id + '.' + expectedPackage.packageType
          ),
          'Wrong file to upload'
        );

        callback(null, expectedMediaId);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong package updated'
        );
        assert.equal(data.link, '/publish/video/' + expectedPackage.id, 'Wrong media link');
        assert.sameMembers(data.mediaId, [expectedMediaId], 'Wrong media ids');
        callback();
      });

      return mediaPackage.uploadMedia().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not upload media if already uploaded', function() {
      expectedPackage.mediaId = ['99'];

      return mediaPackage.uploadMedia().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return mediaPackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting media file path failed', function() {
      Package.prototype.getMediaFilePath = chai.spy(function(callback) {
        callback(expectedError);
      });

      return mediaPackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.UPLOAD_GET_MEDIA_FILE_PATH, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        Package.prototype.getMediaFilePath.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if uploading media failed', function() {
      mediaPlatformProvider.upload = chai.spy(function(mediaFilePath, callback) {
        callback(expectedError);
      });

      return mediaPackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MEDIA_UPLOAD, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        callback(expectedError);
      });

      return mediaPackage.uploadMedia().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.UPLOAD_MEDIA_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        mediaPlatformProvider.upload.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

  describe('initMerge', function() {

    beforeEach(function() {
      expectedPackages = [
        {
          id: '43',
          originalFileName: expectedPackage.originalFileName,
          state: STATES.READY
        },
        expectedPackage
      ];
    });

    it('should change package state to MERGING and lock package with same name', function() {
      var updateOneCount = 0;

      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(state, STATES.INITIALIZING_MERGE, 'Wrong package state');
        callback(null, 1);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        if (updateOneCount === 0) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            expectedPackage.id,
            'Expected package to be set as package to be merged'
          );
          assert.ok(data.mergeRequired, 'Expected package to be marked as package to be merged');
        } else if (updateOneCount === 1) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            expectedPackages[0].id,
            'Expected searched package not to have the same id as the package'
          );
          assert.equal(data.lockedByPackage, expectedPackage.id, 'Wrong lock');
          assert.equal(data.state, STATES.WAITING_FOR_MERGE, 'Wrong locked state');
        }

        updateOneCount++;
        callback(null, 1);
      });

      videoProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          expectedPackage.originalFileName,
          'Wrong original file name'
        );
        callback(null, expectedPackages);
      });

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(2);

        assert.equal(expectedPackage.mergeRequired, true, 'Expected package to be marked for merge');
        assert.equal(Package.lockedPackages[expectedPackage.id], expectedPackages[0].id, 'Wrong locked package');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should skip merge if package has been locked by another package', function() {
      var concurrentPackage = {
        id: '44',
        originalFileName: expectedPackage.originalFileName,
        state: STATES.INITIALIZING_MERGE
      };
      expectedPackages.push(concurrentPackage);
      expectedPackage.lockedByPackage = concurrentPackage.id;

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.equal(expectedPackage.mergeRequired, false, 'Expected package to not be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should skip merge if package has been locked by another package even if storage is not up to date', function() {
      var concurrentPackage = {
        id: '44',
        originalFileName: expectedPackage.originalFileName,
        state: STATES.INITIALIZING_MERGE
      };
      expectedPackages.push(concurrentPackage);
      Package.lockedPackages[concurrentPackage.id] = expectedPackage.id;

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.equal(expectedPackage.mergeRequired, false, 'Expected package to not be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should lock the oldest package with same name if no package locked and no package ready', function() {
      var oldestPackage = {
        id: '44',
        originalFileName: expectedPackage.originalFileName,
        state: STATES.COPYING
      };
      var updateOneCount = 0;

      expectedPackages[0].state = STATES.COPYING;
      expectedPackages.unshift(oldestPackage);

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          oldestPackage.id,
          'Waiting for wrong media'
        );
        oldestPackage.state = STATES.READY;
        callback(null, oldestPackage);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        if (updateOneCount === 1) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            oldestPackage.id,
            'Wrong locked package'
          );
          assert.equal(data.lockedByPackage, expectedPackage.id, 'Wrong lock');
          assert.equal(data.state, STATES.WAITING_FOR_MERGE, 'Wrong locked state');
        }

        updateOneCount++;
        callback(null, 1);
      });

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.at.least(1);
        videoProvider.updateOne.should.have.been.called.exactly(2);

        assert.equal(expectedPackage.mergeRequired, true, 'Expected package to not be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should wait for package with same name to be in READY or PUBLISHED state', function() {
      expectedPackages[0].state = STATES.COPYING;

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackages[0].id,
          'Waiting for wrong media'
        );
        expectedPackages[0].state = STATES.PUBLISHED;
        callback(null, expectedPackages[0]);
      });

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.at.least(1);
        videoProvider.updateOne.should.have.been.called.at.least(2);

        assert.equal(expectedPackage.mergeRequired, true, 'Expected package to be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if setting package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        if (id === expectedPackage.id) {
          return callback(expectedError);
        }
        callback(null, 1);
      });

      return mediaPackage.initMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(0);
        videoProvider.getOne.should.have.been.called.at.least(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.isUndefined(expectedPackage.mergeRequired, 'Expected package not to be marked for merge');
      });
    });

    it('should reject promise if looking for packages with same name failed', function() {
      videoProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(expectedError);
      });

      return mediaPackage.initMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.isUndefined(expectedPackage.mergeRequired, 'Expected package not to be marked for merge');
      });
    });

    it('should reject promise if setting package as package to be merged failed', function() {
      videoProvider.updateOne = chai.spy(function(filters, data, callback) {
        callback(expectedError);
      });

      return mediaPackage.initMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.INIT_MERGE_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(1);

        assert.ok(expectedPackage.mergeRequired, 'Expected package to be marked for merge');
      });
    });

    it('should reject promise if waiting for package with same name to be in stable state failed', function() {
      expectedPackages[0].state = STATES.COPYING;

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        return callback(expectedError);
      });

      return mediaPackage.initMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.INIT_MERGE_WAIT_FOR_MEDIA, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);

        assert.ok(expectedPackage.mergeRequired, 'Expected package to be marked for merge');
      });
    });

    it('should reject promise if locking package with same name failed', function() {
      var updateOneCount = 0;

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        if (updateOneCount++ === 1) {
          callback(expectedError);
        } else {
          callback();
        }
      });

      return mediaPackage.initMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.INIT_MERGE_LOCK_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(2);

        assert.ok(expectedPackage.mergeRequired, 'Expected package to be marked for merge');
      });
    });

  });

  describe('lockPackage', function() {
    var packageToLock;

    beforeEach(function() {
      packageToLock = {
        id: '43'
      };
    });

    it('should lock a package', function() {
      mediaPackage.lockPackage(packageToLock);

      assert.equal(Package.lockedPackages[expectedPackage.id], packageToLock.id, 'Wrong locked package');
    });

    it('should not lock an already locked package', function() {
      Package.lockedPackages['44'] = packageToLock.id;

      mediaPackage.lockPackage(packageToLock);

      assert.isUndefined(Package.lockedPackages[expectedPackage.id], 'Unexpected locked package');
    });

  });

  describe('merge', function() {

    it('should resolve promise', function() {
      return mediaPackage.merge().then(function() {
        assert.ok(true);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

  });

  describe('finalizeMerge', function() {

    beforeEach(function() {
      expectedPackages = [
        {
          id: '43',
          originalFileName: expectedPackage.originalFileName,
          state: STATES.WAITING_FOR_MERGE,
          lockedByPackage: expectedPackage.id
        }
      ];
      Package.lockedPackages[expectedPackage.id] = expectedPackages[0].id;
    });

    it('should change package state to FINALIZING_MERGE and release package with same name', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedPackage.id, 'Wrong package id');
        assert.equal(state, STATES.FINALIZING_MERGE, 'Wrong package state');
        callback(null, 1);
      });

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          expectedPackage.originalFileName,
          'Getting wrong locked package file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          expectedPackage.id,
          'Getting wrong locked package locker'
        );
        callback(null, expectedPackages[0]);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackages[0].id,
          'Update wrong locked package'
        );
        assert.isNull(data.lockedByPackage, 'Expected locked package to be released');
        assert.equal(data.state, STATES.READY, 'Expected locked package state to be restored to READY');

        callback(null, 1);
      });

      return mediaPackage.finalizeMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);

        assert.isUndefined(Package.lockedPackages[expectedPackage.id], 'Unexpected lock');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if setting package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return mediaPackage.finalizeMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting locked package failed', function() {
      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      return mediaPackage.finalizeMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.FINALIZE_MERGE_GET_PACKAGE_WITH_SAME_NAME, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if releasing package failed', function() {
      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        callback(expectedError);
      });

      return mediaPackage.finalizeMerge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.FINALIZE_MERGE_RELEASE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      });
    });

  });

  describe('removePackage', function() {

    it('should remove package from OpenVeo and marked it as removed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, expectedPackage.id, 'Wrong package id');
        assert.equal(state, STATES.REMOVING, 'Wrong package state');
        callback(null, 1);
      });

      videoProvider.removeLocal = chai.spy(function(filter, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackage.id,
          'Wrong package to remove'
        );
        callback(null, 1);
      });

      return mediaPackage.removePackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);

        assert.equal(expectedPackage.removed, true, 'Expected package to be marked as removed');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if updating package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return mediaPackage.removePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.isUndefined(expectedPackage.removed, 'Expected package to not be marked as removed');
      });
    });

    it('should reject promise if removing package failed', function() {
      videoProvider.removeLocal = chai.spy(function(filter, callback) {
        callback(expectedError);
      });

      return mediaPackage.removePackage().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, PackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);

        assert.isUndefined(expectedPackage.removed, 'Expected package to not be marked as removed');
      });
    });

  });

  describe('setError', function() {

    beforeEach(function() {
      expectedError = new PackageError('Something went wrong', ERRORS.SAVE_PACKAGE_DATA);
      Package.lockedPackages[expectedPackage.id] = '43';
    });

    it('should emit "error" event, release lock, update state to ERROR and update package error code', function(done) {
      mediaPackage.on('error', function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(expectedPackage.id, STATES.ERROR);
        videoProvider.updateErrorCode.should.have.been.called.exactly(1);
        videoProvider.updateErrorCode.should.have.been.called.with(expectedPackage.id, expectedError.code);

        assert.isUndefined(Package.lockedPackages[expectedPackage.id]);
        done();
      });

      mediaPackage.setError(expectedError);
    });

    it('should not update media if doNotUpdateMedia is true', function(done) {
      mediaPackage.on('error', function() {
        videoProvider.updateState.should.have.been.called.exactly(0);
        videoProvider.updateErrorCode.should.have.been.called.exactly(0);

        assert.isUndefined(Package.lockedPackages[expectedPackage.id]);
        done();
      });

      mediaPackage.setError(expectedError, true);
    });

    it('should not do anything if error is not set', function() {
      chai.spy.on(mediaPackage, 'emit');

      mediaPackage.setError();

      mediaPackage.emit.should.have.been.called.exactly(0);
      videoProvider.updateState.should.have.been.called.exactly(0);
      videoProvider.updateErrorCode.should.have.been.called.exactly(0);
      assert.isDefined(Package.lockedPackages[expectedPackage.id], 'Expected lock');
    });

  });
});

