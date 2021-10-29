'use strict';

var path = require('path');

var api = require('@openveo/api');
var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');

var ERRORS = process.requirePublish('app/server/packages/errors.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var STATES = process.requirePublish('app/server/packages/states.js');

var assert = chai.assert;
var ResourceFilter = api.storages.ResourceFilter;

chai.should();
chai.use(spies);

describe('Migration 12.0.0', function() {
  var coreApi;
  var database;
  var expectedError = new Error('Something went wrong');
  var expectedMedias;
  var migration;
  var realCoreApi;
  var VideoProvider;

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    VideoProvider = function() {};
    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    });
    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    coreApi = {
      getDatabase: function() {
        return database;
      },
      getCoreApi: function() {
        return coreApi;
      }
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
  });

  // Initialize tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/12.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should replace error codes 24 and 25 by INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME', function(done) {
    var updateOneCount = 0;
    expectedMedias = [
      {
        id: '42',
        errorCode: 24
      },
      {
        id: '43',
        errorCode: 25
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[updateOneCount].id,
        'Wrong media modified'
      );
      assert.equal(modifications.errorCode, ERRORS.INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME, 'Wrong error code');

      updateOneCount++;
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should replace error code 26 by INIT_MERGE_WAIT_FOR_MEDIA', function(done) {
    expectedMedias = [
      {
        id: '42',
        errorCode: 26
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong media modified'
      );
      assert.equal(modifications.errorCode, ERRORS.INIT_MERGE_WAIT_FOR_MEDIA, 'Wrong error code');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should replace error codes 27, 28 and 29 by INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME', function(done) {
    var updateOneCount = 0;
    expectedMedias = [
      {
        id: '42',
        errorCode: 27
      },
      {
        id: '43',
        errorCode: 28
      },
      {
        id: '44',
        errorCode: 29
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[updateOneCount].id,
        'Wrong media modified'
      );
      assert.equal(modifications.errorCode, ERRORS.INIT_MERGE_LOCK_PACKAGE, 'Wrong error code');

      updateOneCount++;
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should replace state 16 by INITIALIZING_MERGE', function(done) {
    expectedMedias = [
      {
        id: '42',
        state: 16
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong media modified'
      );
      assert.equal(modifications.state, STATES.INITIALIZING_MERGE, 'Wrong state');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should replace transition state "merged" by MERGE_INITIALIZED', function(done) {
    expectedMedias = [
      {
        id: '42',
        lastState: 'merged'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong media modified'
      );
      assert.equal(modifications.lastState, Package.STATES.MERGE_INITIALIZED, 'Wrong transition state');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should replace transition "merge" by INIT_MERGE', function(done) {
    expectedMedias = [
      {
        id: '42',
        lastTransition: 'merge'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong media modified'
      );
      assert.equal(modifications.lastTransition, Package.TRANSITIONS.INIT_MERGE, 'Wrong transition');

      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(expectedMedias.length);
      done();
    });
  });

  it('should not do anything if no media', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not do anything to medias which are not concerned', function(done) {
    expectedMedias = [
      {
        id: '42',
        errorCode: ERRORS.DEFRAGMENTATION
      },
      {
        id: '43',
        state: STATES.UPLOADING
      },
      {
        id: '44',
        lastState: Package.STATES.COPIED
      },
      {
        id: '44',
        lastTransition: Package.TRANSITIONS.CLEAN_DIRECTORY
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        errorCode: 24
      }
    ];

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.at.least(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    expectedMedias = [
      {
        id: '42',
        errorCode: 24
      },
      {
        id: '43',
        errorCode: 25
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      VideoProvider.prototype.getAll.should.have.been.called.at.least(1);
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

});
