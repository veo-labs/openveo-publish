'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var api = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = api.storages.ResourceFilter;
var databaseErrors = api.storages.databaseErrors;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 6.0.0', function() {
  var migration;
  var database;
  var VideoProvider;
  var expectedMedias;
  var expectedRoles;
  var coreApi;
  var realCoreApi;
  var settingProvider;
  var roleProvider;

  // Mocks
  beforeEach(function() {
    expectedMedias = [];
    expectedRoles = [];

    VideoProvider = function() {};
    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    };
    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    settingProvider = {
      add: chai.spy(function(settings, callback) {
        callback(null, settings);
      })
    };

    roleProvider = {
      getAll: function(filter, fields, sort, callback) {
        callback(null, expectedRoles);
      },
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      })
    };

    database = {
      get: function(location, filter, fields, limit, page, sort, callback) {
        callback(null, expectedMedias);
      },
      removeCollection: function(name, callback) {
        callback();
      }
    };

    coreApi = {
      getDatabase: function() {
        return database;
      },
      getCoreApi: function() {
        return coreApi;
      },
      settingProvider: settingProvider,
      roleProvider: roleProvider
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/6.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should change image processing on timecodes from "thumb=small" to "style=publish-thumb-200"', function(done) {
    var expectedFileName = 'file.jpg';
    expectedMedias = [
      {
        id: '42',
        timecodes: [
          {
            id: '42',
            image: {
              small: expectedFileName + '?thumb=small'
            }
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
      assert.equal(
        modifications.timecodes[0].image.small,
        expectedFileName + '?style=publish-thumb-200',
        'Wrong image processing'
      );
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias without timecodes', function(done) {
    expectedMedias = [
      {
        id: '42'
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

  it('should execute callback with an error if getting all medias failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(expectedError);
    };

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
        timecodes: [
          {
            id: '42',
            image: {
              small: 'file.jpg?thumb=small'
            }
          }
        ]
      }
    ];

    VideoProvider.prototype.updateOne = function(filter, fields, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

  it('should migrate configuration from "publish_configuration" to core settings', function(done) {
    var expectedConfiguration = [
      {
        googleOAuthTokens: {}
      },
      {
        publishDefaultUpload: {}
      }
    ];

    database.get = function(location, filter, fields, limit, page, sort, callback) {
      assert.equal(limit, 2, 'Wrong limit');
      callback(null, expectedConfiguration);
    };

    settingProvider.add = chai.spy(function(settings, callback) {
      assert.equal(settings[0].id, 'publish-googleOAuthTokens', 'Wrong id');
      assert.strictEqual(
        settings[0].value,
        expectedConfiguration[0].googleOAuthTokens,
        'Wrong googleOAuthTokens configuration'
      );

      assert.equal(settings[1].id, 'publish-defaultUpload', 'Wrong id');
      assert.strictEqual(
        settings[1].value,
        expectedConfiguration[1].publishDefaultUpload,
        'Wrong publishDefaultUpload configuration'
      );
      callback(null, settings);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      settingProvider.add.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if getting configuration failed', function(done) {
    var expectedError = new Error('Something went wrong');

    database.get = function(location, filter, fields, limit, page, sort, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      settingProvider.add.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if adding settings to core settings failed', function(done) {
    var expectedError = new Error('Something went wrong');

    settingProvider.add = chai.spy(function(settings, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      done();
    });
  });

  it('should remove "publish_configurations" collection', function(done) {
    database.removeCollection = chai.spy(function(collection, callback) {
      assert.equal(collection, 'publish_configurations', 'Wrong collection');
      callback();
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      database.removeCollection.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not do anything if "publish_configurations" collection does not exist', function(done) {
    database.removeCollection = chai.spy(function(collection, callback) {
      callback({
        code: databaseErrors.REMOVE_COLLECTION_NOT_FOUND_ERROR
      });
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      database.removeCollection.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if removing collection failed', function(done) {
    var expectedError = new Error('Something went wrong');

    database.removeCollection = chai.spy(function(collection, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Unexpected error');
      done();
    });
  });

  it('should remove system paths from media tags', function(done) {
    expectedMedias = [
      {
        id: '42',
        tags: [
          {
            file: {
              path: 'path',
              destination: 'destinationPath'
            }
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
      assert.notProperty(modifications.tags[0].file, 'path', 'Unexpected file path');
      assert.notProperty(modifications.tags[0].file, 'destination', 'Unexpected destination path');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        tags: [
          {
            file: {
              path: 'path',
              destination: 'destinationPath'
            }
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

  it('should rename "publish-chapter-videos" into "publish-editor-videos"', function(done) {
    expectedRoles = [
      {
        id: '42',
        permissions: ['publish-chapter-videos']
      }
    ];

    roleProvider.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedRoles[0].id,
        'Wrong id'
      );
      assert.equal(modifications.permissions[0], 'publish-editor-videos', 'Wrong permission id');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      roleProvider.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update roles if no roles found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      roleProvider.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting roles failed', function(done) {
    var expectedError = new Error('Something went wrong');

    roleProvider.getAll = function(filter, fields, sort, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      roleProvider.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a role failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedRoles = [
      {
        id: '42',
        permissions: ['publish-chapter-videos']
      }
    ];

    roleProvider.updateOne = function(filter, modifications, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      done();
    });
  });

});
