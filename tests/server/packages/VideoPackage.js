'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');

var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoPackageError = process.requirePublish('app/server/packages/VideoPackageError.js');

var ResourceFilter = api.storages.ResourceFilter;
var assert = chai.assert;

chai.should();
chai.use(spies);

describe('VideoPackage', function() {
  var expectedError = new Error('Something went wrong');
  var expectedPackages;
  var fs;
  var openVeoApi;
  var poiProvider;
  var videoPackage;
  var videoProvider;

  // Mocks
  beforeEach(function() {
    expectedPackages = [];

    poiProvider = {};
    videoProvider = {
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedPackages[0]);
      }),
      updateTumbnail: chai.spy(function(id, thumbnail, callback) {
        callback(null, 1);
      }),
      removeLocal: chai.spy(function(filter, callback) {
        callback(null, 1);
      }),
      updateMetadata: chai.spy(function(id, metadata, callback) {
        callback(null, 1);
      }),
      updateMediaId: chai.spy(function(id, mediaId, callback) {
        callback(null, 1);
      }),
      updateState: chai.spy(function(id, state, callback) {
        callback(null, 1);
      })
    };

    openVeoApi = {
      fileSystem: {
        copy: chai.spy(function(sourcePath, destinationSourcePath, callback) {
          callback();
        }),
        FILE_TYPES: {
          JPG: 'jpg',
          GIF: 'gif'
        }
      },
      util: api.util,
      storages: api.storages
    };

    fs = {
      unlink: chai.spy(function(filePath, callback) {
        callback();
      }),
      rename: chai.spy(function(originalFilePath, newFilePath, callback) {
        callback();
      }),
      readdir: chai.spy(function(directoryPath, callback) {
        callback(null, []);
      })
    };

    mock('@openveo/api', openVeoApi);
    mock('fs', fs);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), videoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    var VideoPackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    videoPackage = new VideoPackage({
      id: '42',
      originalFileName: 'file',
      metadata: {
        indexes: []
      }
    }, videoProvider, poiProvider);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('merge', function() {

    beforeEach(function() {
      expectedPackages = [{
        id: '43',
        lockedByPackage: videoPackage.mediaPackage.id,
        mediaId: ['1'],
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.WAITING_FOR_MERGE
      }];
      videoPackage.mediaPackage.mediaId = ['2'];
    });

    it('should change package state to MERGING and merge package with the same file name locked package', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, videoPackage.mediaPackage.id, 'Wrong package updated');
        assert.equal(state, STATES.MERGING, 'Wrong updated package state');
        callback();
      });

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'state').value,
          STATES.WAITING_FOR_MERGE,
          'Searching for wrong locked package state'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          videoPackage.mediaPackage.originalFileName,
          'Searching for wrong locked package original file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          videoPackage.mediaPackage.id,
          'Searching for wrong locked package locker'
        );

        callback(null, expectedPackages[0]);
      });

      videoProvider.updateMediaId = chai.spy(function(id, mediaId, callback) {
        assert.equal(id, expectedPackages[0].id, 'Wrong package updated');
        assert.sameOrderedMembers(
          mediaId,
          [expectedPackages[0].mediaId[0], videoPackage.mediaPackage.mediaId[0]],
          'Wrong merged medias'
        );
        callback();
      });

      return videoPackage.merge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error.message);
      });
    });

    it('should reject promise if changing the package state failed', function() {

      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting locked package failed', function() {
      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GET_PACKAGE_WITH_SAME_NAME, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if merging medias failed', function() {
      videoProvider.updateMediaId = chai.spy(function(id, mediaId, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_UPDATE_MEDIAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(0);
      });
    });

  });

});

