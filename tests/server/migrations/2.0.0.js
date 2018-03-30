'use strict';

var path = require('path');
var chai = require('chai');
var spies = require('chai-spies');
var openVeoApi = require('@openveo/api');
var mock = require('mock-require');
var ResourceFilter = openVeoApi.storages.ResourceFilter;
var databaseErrors = openVeoApi.storages.databaseErrors;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('Migration 2.0.0', function() {
  var migration;
  var database;
  var VideoProvider;
  var roleProvider;
  var expectedMedias;
  var expectedRoles;
  var coreApi;
  var realCoreApi;
  var renameOperations = [
    {
      name: 'properties',
      newName: 'publish_properties'
    },
    {
      name: 'configurations',
      newName: 'publish_configurations'
    },
    {
      name: 'videos',
      newName: 'publish_videos'
    }
  ];

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
    VideoProvider.prototype.removeField = chai.spy(function(field, filter, callback) {
      callback(null, 1);
    });

    roleProvider = {
      getAll: function(filter, fields, sort, callback) {
        callback(null, expectedRoles);
      },
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      })
    };

    database = {
      renameCollection: function(name, newName, callback) {
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
      roleProvider: roleProvider
    };

    realCoreApi = process.api;
    process.api = coreApi;
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/2.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  renameOperations.forEach(function(operation) {

    describe('rename collection "' + operation.name + '" into "' + operation.newName + '"', function() {

      it('should rename collection "' + operation.name + '" into "' + operation.newName + '"', function(done) {
        var ok = false;

        database.renameCollection = chai.spy(function(name, newName, callback) {
          if (name === operation.name && newName === operation.newName) ok = true;
          callback();
        });

        migration.update(function(error) {
          assert.isUndefined(error, 'Unexpected error');
          database.renameCollection.should.have.been.called.at.least(1);
          assert.ok(ok, 'Expected collection to be renamed');
          done();
        });
      });

      it(
        'should execute callback with an error if renaming collection "' + operation.name + '" failed',
        function(done) {
          var expectedError = new Error('Something went wrong');

          database.renameCollection = function(name, newName, callback) {
            if (name === operation.name && newName === operation.newName) return callback(expectedError);
            callback();
          };

          migration.update(function(error) {
            assert.strictEqual(error, expectedError, 'Wrong error');
            done();
          });
        }
      );

      it('should not execute callback with an error if collection "clients" does not exist', function(done) {
        var ok = false;

        database.renameCollection = chai.spy(function(name, newName, callback) {
          if (name === operation.name && newName === operation.newName) {
            ok = true;
            return callback({code: databaseErrors.RENAME_COLLECTION_NOT_FOUND_ERROR});
          }

          callback();
        });

        migration.update(function(error) {
          assert.isUndefined(error, 'Unexpected error');
          database.renameCollection.should.have.been.called.at.least(1);
          assert.ok(ok, 'Expected collection to be renamed');
          done();
        });
      });

    });

  });

  it('should rename roles permissions', function(done) {
    var renameOperations = [
      {
        name: 'create-property',
        newName: 'publish-add-properties'
      },
      {
        name: 'update-property',
        newName: 'publish-update-properties'
      },
      {
        name: 'delete-property',
        newName: 'publish-delete-properties'
      },
      {
        name: 'create-video',
        newName: 'publish-add-videos'
      },
      {
        name: 'update-video',
        newName: 'publish-update-videos'
      },
      {
        name: 'delete-video',
        newName: 'publish-delete-videos'
      },
      {
        name: 'access-videos-page',
        newName: 'publish-access-videos-page'
      },
      {
        name: 'access-properties-page',
        newName: 'publish-access-properties-page'
      },
      {
        name: 'access-categories-page',
        newName: 'publish-access-categories-page'
      },
      {
        name: 'access-watcher-page',
        newName: 'publish-access-watcher-page'
      },
      {
        name: 'manage-watcher',
        newName: 'publish-manage-watcher'
      },
      {
        name: 'access-conf-page',
        newName: 'publish-access-conf-page'
      },
      {
        name: 'manage-publish-config',
        newName: 'publish-manage-publish-config'
      },
      {
        name: 'publish-video',
        newName: 'publish-publish-videos'
      },
      {
        name: 'chapter-video',
        newName: 'publish-chapter-videos'
      },
      {
        name: 'retry-video',
        newName: 'publish-retry-videos'
      },
      {
        name: 'upload-video',
        newName: 'publish-upload-videos'
      }
    ];

    var permissions = [];
    renameOperations.forEach(function(renameOperation) {
      permissions.push(renameOperation.name);
    });

    expectedRoles = [
      {
        id: '42',
        permissions: permissions
      }
    ];

    roleProvider.updateOne = chai.spy(function(filter, modifications, callback) {
      for (var i = 0; i < modifications.permissions.length; i++)
        assert.equal(modifications.permissions[i], renameOperations[i].newName);

      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedRoles[0].id,
        'Wrong id'
      );

      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      roleProvider.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update permissions if no roles found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Wrong error');
      roleProvider.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting roles failed while renaming permissions', function(done) {
    var expectedError = new Error('Something went wrong');

    expectedRoles = [
      {
        id: '42',
        permissions: []
      }
    ];

    roleProvider.getAll = function(filter, fields, sort, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      roleProvider.updateOne.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a role failed while renaming permissions', function(done) {
    var expectedError = new Error('Something went wrong');

    expectedRoles = [
      {
        id: '42',
        permissions: []
      }
    ];

    roleProvider.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      roleProvider.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should prefix video thumbnail path by "/publish/"', function(done) {
    expectedMedias = [
      {
        id: '42',
        thumbnail: 'thumbnail'
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(modifications.thumbnail, '/publish/' + expectedMedias[0].thumbnail, 'Wrong thumbnail path');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should place videos files into a property "sources" and remove property "files"', function(done) {
    expectedMedias = [
      {
        id: '42',
        files: []
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.strictEqual(modifications.sources.files, expectedMedias[0].files, 'Wrong files');
      callback(null, 1);
    });

    VideoProvider.prototype.removeField = chai.spy(function(field, filter, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        expectedMedias[0].id,
        'Wrong id'
      );
      assert.equal(field, 'files', 'Wrong field');
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      VideoProvider.prototype.removeField.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not update medias if no medias found', function(done) {
    migration.update(function(error) {
      assert.isUndefined(error, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      VideoProvider.prototype.removeField.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if getting medias failed', function(done) {
    var expectedError = new Error('Something went wrong');

    VideoProvider.prototype.getAll = chai.spy(function(filter, modifications, sort, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
      VideoProvider.prototype.removeField.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if updating a media failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        files: []
      }
    ];

    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      VideoProvider.prototype.removeField.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if removing field "files" failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedMedias = [
      {
        id: '42',
        files: []
      }
    ];

    VideoProvider.prototype.removeField = chai.spy(function(field, filter, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
      VideoProvider.prototype.removeField.should.have.been.called.exactly(1);
      done();
    });
  });

});
