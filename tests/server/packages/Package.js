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
  var expectedPackages;
  var expectedError = new Error('Something went wrong');
  var fs;
  var mediaPackage;
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
        callback(null);
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

    mock('@openveo/api', openVeoApi);
    mock('fs', fs);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);
  });

  // Initializes tests
  beforeEach(function() {
    Package = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    mediaPackage = new Package({
      id: '42',
      originalFileName: 'file',
      metadata: {
        indexes: []
      }
    }, videoProvider, poiProvider);

    mediaPackage.init(Package.STATES.PACKAGE_SUBMITTED, Package.TRANSITIONS.INIT);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('executeTransition', function() {

    it('should emit "complete" event if package has been marked as removed', function(done) {
      mediaPackage.on('complete', function() {
        assert.ok(true);
        done();
      });

      mediaPackage.mediaPackage.removed = true;
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

      mediaPackage.mediaPackage.mergeRequired = false;
      mediaPackage.executeTransition(Package.TRANSITIONS.MERGE);
    });

  });

  describe('initMerge', function() {

    beforeEach(function() {
      expectedPackages = [
        {
          id: '43',
          originalFileName: mediaPackage.mediaPackage.originalFileName,
          state: STATES.READY
        },
        mediaPackage.mediaPackage
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
            mediaPackage.mediaPackage.id,
            'Expected package to be set as package to be merged'
          );
          assert.ok(data.mergeRequired, 'Expected package to be marked as package to be merged');
        } else if (updateOneCount === 1) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            expectedPackages[0].id,
            'Expected searched package not to have the same id as the package'
          );
          assert.equal(data.lockedByPackage, mediaPackage.mediaPackage.id, 'Wrong lock');
          assert.equal(data.state, STATES.WAITING_FOR_MERGE, 'Wrong locked state');
        }

        updateOneCount++;
        callback(null, 1);
      });

      videoProvider.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          mediaPackage.mediaPackage.originalFileName,
          'Wrong original file name'
        );
        callback(null, expectedPackages);
      });

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(2);

        assert.equal(mediaPackage.mediaPackage.mergeRequired, true, 'Expected package to be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should skip merge if package has been locked by another package', function() {
      var concurrentPackage = {
        id: '44',
        originalFileName: mediaPackage.mediaPackage.originalFileName,
        state: STATES.INITIALIZING_MERGE
      };
      expectedPackages.push(concurrentPackage);
      mediaPackage.mediaPackage.lockedByPackage = concurrentPackage.id;

      return mediaPackage.initMerge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getAll.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);

        assert.equal(mediaPackage.mediaPackage.mergeRequired, false, 'Expected package to not be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should lock the oldest package with same name if no package locked and no package ready', function() {
      var oldestPackage = {
        id: '44',
        originalFileName: mediaPackage.mediaPackage.originalFileName,
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
          assert.equal(data.lockedByPackage, mediaPackage.mediaPackage.id, 'Wrong lock');
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

        assert.equal(mediaPackage.mediaPackage.mergeRequired, true, 'Expected package to not be marked for merge');
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

        assert.equal(mediaPackage.mediaPackage.mergeRequired, true, 'Expected package to be marked for merge');
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if setting package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        if (id === mediaPackage.mediaPackage.id) {
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

        assert.isUndefined(mediaPackage.mediaPackage.mergeRequired, 'Expected package not to be marked for merge');
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

        assert.isUndefined(mediaPackage.mediaPackage.mergeRequired, 'Expected package not to be marked for merge');
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

        assert.ok(mediaPackage.mediaPackage.mergeRequired, 'Expected package to be marked for merge');
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

        assert.ok(mediaPackage.mediaPackage.mergeRequired, 'Expected package to be marked for merge');
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

        assert.ok(mediaPackage.mediaPackage.mergeRequired, 'Expected package to be marked for merge');
      });
    });

  });

  describe('merge', function() {

    it('should resolve promise', function() {
      return mediaPackage.merge().then(function() {
        assert.ok(true);
      }).catch(function(error) {
        assert.fail('Unexpected error');
      });
    });

  });

  describe('finalizeMerge', function() {

    beforeEach(function() {
      expectedPackages = [
        {
          id: '43',
          originalFileName: mediaPackage.mediaPackage.originalFileName,
          state: STATES.WAITING_FOR_MERGE,
          lockedByPackage: mediaPackage.mediaPackage.id
        }
      ];
    });

    it('should change package state to FINALIZING_MERGE and release package with same name', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, mediaPackage.mediaPackage.id, 'Wrong package id');
        assert.equal(state, STATES.FINALIZING_MERGE, 'Wrong package state');
        callback(null, 1);
      });

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          mediaPackage.mediaPackage.originalFileName,
          'Getting wrong locked package file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          mediaPackage.mediaPackage.id,
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
      }).catch(function(error) {
        assert.fail('Unexpected error');
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
        assert.equal(id, mediaPackage.mediaPackage.id, 'Wrong package id');
        assert.equal(state, STATES.REMOVING, 'Wrong package state');
        callback(null, 1);
      });

      videoProvider.removeLocal = chai.spy(function(filter, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          mediaPackage.mediaPackage.id,
          'Wrong package to remove'
        );
        callback(null, 1);
      });

      return mediaPackage.removePackage().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);

        assert.equal(mediaPackage.mediaPackage.removed, true, 'Expected package to be marked as removed');
      }).catch(function(error) {
        assert.fail('Unexpected error');
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

        assert.isUndefined(mediaPackage.mediaPackage.removed, 'Expected package to not be marked as removed');
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

        assert.isUndefined(mediaPackage.mediaPackage.removed, 'Expected package to not be marked as removed');
      });
    });

  });

});

