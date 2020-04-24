'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoPackageError = process.requirePublish('app/server/packages/VideoPackageError.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VideoPackage', function() {
  var videoPackage;
  var videoProvider;
  var poiProvider;
  var expectedMedias;
  var openVeoApi;
  var fs;

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    poiProvider = {};
    videoProvider = {
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedMedias[0]);
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

    var Package = function() {};
    Package.TRANSITIONS = {};
    Package.STATES = {};
    Package.stateMachine = [];

    mock('@openveo/api', openVeoApi);
    mock('fs', fs);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), videoProvider);
    mock(path.join(process.rootPublish, 'app/server/packages/Package.js'), Package);
  });

  // Initializes tests
  beforeEach(function() {
    var VideoPackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    videoPackage = new VideoPackage();
    videoPackage.mediaPackage = {
      id: '42',
      originalFileName: 'file',
      metadata: {
        indexes: []
      }
    };

    videoPackage.videoProvider = videoProvider;
    videoPackage.poiProvider = poiProvider;
    videoPackage.updateState = chai.spy(function(id, state, callback) {
      callback();
    });
    videoPackage.selectMultiSourcesMedia = chai.spy(videoPackage.selectMultiSourcesMedia);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('merge', function() {

    it('should merge current package with the first video found having the same original file name', function() {
      var updateStateCount = 0;
      var videoPackageId = '42';
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoPackage.updateState = chai.spy(function(id, state, callback) {
        var expectedId = updateStateCount === 0 ? videoPackage.mediaPackage.id : expectedMedias[0].id;
        assert.equal(id, expectedId, 'Wrong id');
        assert.equal(state, STATES.MERGING, 'Wrong state');
        updateStateCount++;
        callback();
      });

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.NOT_EQUAL, 'id').value,
          videoPackage.mediaPackage.id,
          'Wrong media package id'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          videoPackage.mediaPackage.originalFileName,
          'Wrong original file name'
        );
        assert.isNull(fields, 'Wrong getOne fields');

        callback(null, expectedMedias[0]);
      });

      videoProvider.updateMediaId = chai.spy(function(id, mediaId, callback) {
        assert.equal(id, expectedMedias[0].id, 'Wrong chosen media id');
        assert.sameOrderedMembers(
          mediaId,
          [expectedMedias[0].mediaId[0], videoPackage.mediaPackage.mediaId[0]],
          'Wrong list of medias'
        );
        callback();
      });

      videoProvider.removeLocal = chai.spy(function(filter, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          videoPackageId,
          'Wrong package removed'
        );
        callback();
      });

      return videoPackage.merge().then(function() {
        videoPackage.updateState.should.have.been.called.exactly(2);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error.message);
      });
    });

    it('should wait for the other media to be in READY or PUBLISHED state', function() {
      var getOneCount = 0;
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.MERGING,
        mediaId: ['1']
      }];

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        if (getOneCount === 0) {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.NOT_EQUAL, 'id').value,
            videoPackage.mediaPackage.id,
            'Wrong media package id'
          );
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
            videoPackage.mediaPackage.originalFileName,
            'Wrong original file name'
          );
        } else {
          assert.equal(
            filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
            expectedMedias[0].id,
            'Wrong media package id'
          );
        }
        if (getOneCount === 2) expectedMedias[0].state = STATES.READY;
        assert.isNull(fields, 'Wrong getOne fields');

        getOneCount++;
        callback(null, expectedMedias[0]);
      });

      return videoPackage.merge().then(function() {
        videoPackage.updateState.should.have.been.called.exactly(2);
        videoProvider.getOne.should.have.been.called.exactly(3);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing the package state failed', function() {
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoPackage.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_CHANGE_MEDIA_STATE, 'Wrong error code');
      });
    });

    it('should reject promise if trying to find another video with the same name failed', function() {
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GET_MEDIA_ERROR, 'Wrong error code');
      });
    });

    it('should reject promise if waiting for the other video to be in READY state failed', function() {
      var getOneCount = 0;
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.MERGING,
        mediaId: ['1']
      }];

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        if (getOneCount === 0) {
          getOneCount++;
          return callback(null, expectedMedias[0]);
        }
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(2);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_WAIT_FOR_MEDIA_ERROR, 'Wrong error code');
      });
    });

    it('should reject promise if changing the package state failed', function() {
      var updateStateCount = 0;
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoPackage.updateState = chai.spy(function(id, state, callback) {
        if (updateStateCount === 0) {
          updateStateCount++;
          return callback(null, expectedMedias[0]);
        }
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(2);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(0);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_CHANGE_OTHER_MEDIA_STATE, 'Wrong error code');
      });
    });

    it('should reject promise if merging medias failed', function() {
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoProvider.updateMediaId = chai.spy(function(id, mediaId, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(2);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(0);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_MEDIAS, 'Wrong error code');
      });
    });

    it('should reject promise if removing media failed', function() {
      var expectedError = new Error('Something went wrong');
      videoPackage.mediaPackage.mediaId = ['2'];
      expectedMedias = [{
        id: '43',
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.READY,
        mediaId: ['1']
      }];

      videoProvider.removeLocal = chai.spy(function(filter, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected transition');
      }).catch(function(error) {
        videoPackage.updateState.should.have.been.called.exactly(2);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateMediaId.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(1);

        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_REMOVE_NOT_CHOSEN, 'Wrong error code');
      });
    });

  });

});

