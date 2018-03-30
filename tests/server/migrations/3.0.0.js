'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 3.0.0', function() {
  var migration;
  var database;
  var VideoProvider;
  var expectedMedias;
  var coreApi;
  var realCoreApi;
  var coreConf;
  var openVeoApi;
  var oldAnonymousId = '42';

  // Mocks
  beforeEach(function() {
    expectedMedias = [];

    VideoProvider = function() {};
    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    };
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

    coreConf = {
      anonymousUserId: oldAnonymousId
    };

    openVeoApi = {
      fileSystem: {
        getConfDir: function() {
          return '';
        }
      },
      storages: api.storages
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
    mock('@openveo/api', openVeoApi);
    mock('core/conf.json', coreConf);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/3.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should change the id of the user of all medias owned by the anonymous user', function(done) {
    expectedMedias = [
      {
        id: '42',
        metadata: {
          user: oldAnonymousId
        }
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.user, '1', 'Wrong user id');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias if anonymous id is already "1"', function(done) {
    expectedMedias = [
      {
        id: '42',
        metadata: {
          user: '42'
        }
      }
    ];

    coreConf.anonymousUserId = '1';

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias if anonymous id is not defined in configuration', function(done) {
    expectedMedias = [
      {
        id: '42',
        metadata: {
          user: '42'
        }
      }
    ];

    coreConf.anonymousUserId = null;

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update media if owner is not the old anonymous user', function(done) {
    expectedMedias = [
      {
        id: '42',
        metadata: {
          user: 'somethingElse'
        }
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if gettings all medias failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        metadata: {
          user: oldAnonymousId
        }
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should generate an id for existing medias chapters', function(done) {
    expectedMedias = [
      {
        id: '42',
        chapters: [
          {
            name: 'Chapter',
            value: 42000
          }
        ]
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.isNotEmpty(modifications.chapters[0].id, 'Wrong chapter id');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update chapters which already have an id', function(done) {
    expectedMedias = [
      {
        id: '42',
        chapters: [
          {
            id: '42',
            name: 'Chapter',
            value: 42000
          }
        ]
      }
    ];

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating chapters failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        chapters: [
          {
            name: 'Chapter',
            value: 42000
          }
        ]
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

});
