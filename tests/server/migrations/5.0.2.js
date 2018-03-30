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

describe('Migration 5.0.2', function() {
  var migration;
  var database;
  var roleProvider;
  var expectedRoles;
  var coreApi;
  var realCoreApi;

  // Mocks
  beforeEach(function() {
    expectedRoles = [];

    roleProvider = {
      getAll: function(filter, fields, sort, callback) {
        callback(null, expectedRoles);
      },
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      })
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
    mock(path.join(process.rootPublish, 'app/server/providers/RoleProvider.js'), roleProvider);
  });

  // Initializes tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/5.0.2.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
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
