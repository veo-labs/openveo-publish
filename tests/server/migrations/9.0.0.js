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

describe('Migration 9.0.0', function() {
  var migration;
  var coreApi;
  var realCoreApi;
  var settingProvider;
  var expectedSettings;

  // Mocks
  beforeEach(function() {
    settingProvider = {
      add: chai.spy(function(settings, callback) {
        callback(null, settings);
      }),
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedSettings[0]);
      }),
      remove: chai.spy(function(filter, callback) {
        callback(null, 1);
      })
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      settingProvider: settingProvider
    };

    realCoreApi = process.api;
    process.api = coreApi;
  });

  // Initialize tests
  beforeEach(function() {
    migration = mock.reRequire(path.join(process.rootPublish, 'migrations/9.0.0.js'));
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = realCoreApi;
  });

  it('should rename setting "publish-medias" into "publish-watcher"', function(done) {
    expectedSettings = [
      {
        id: 'publish-medias',
        value: {
          owner: 'owner-id',
          group: 'group-id'
        }
      }
    ];

    settingProvider.add = chai.spy(function(settings, callback) {
      assert.equal(settings[0].id, 'publish-watcher', 'Wrong setting id');
      assert.equal(
        settings[0].value.owner,
        expectedSettings[0].value.owner,
        'Wrong owner'
      );
      assert.equal(
        settings[0].value.group,
        expectedSettings[0].value.group,
        'Wrong group'
      );

      callback(null, settings.length, settings);
    });

    settingProvider.remove = chai.spy(function(filter, callback) {
      assert.equal(
        filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
        'publish-medias',
        'Wrong setting id'
      );
      callback(null, 1);
    });

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      settingProvider.add.should.have.been.called.exactly(1);
      settingProvider.remove.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should execute callback with an error if getting publish-medias settings failed', function(done) {
    var expectedError = new Error('Something went wrong');

    settingProvider.getOne = function(filter, fields, callback) {
      callback(expectedError);
    };

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      settingProvider.add.should.have.been.called.exactly(0);
      settingProvider.remove.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if adding publish-watcher settings failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedSettings = [
      {
        id: 'publish-medias',
        value: {
          owner: 'owner-id',
          group: 'group-id'
        }
      }
    ];

    settingProvider.add = chai.spy(function(settings, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      settingProvider.add.should.have.been.called.exactly(1);
      settingProvider.remove.should.have.been.called.exactly(0);
      done();
    });
  });

  it('should execute callback with an error if removing publish-medias settings failed', function(done) {
    var expectedError = new Error('Something went wrong');
    expectedSettings = [
      {
        id: 'publish-medias',
        value: {
          owner: 'owner-id',
          group: 'group-id'
        }
      }
    ];

    settingProvider.remove = chai.spy(function(settings, callback) {
      callback(expectedError);
    });

    migration.update(function(error) {
      assert.strictEqual(error, expectedError, 'Wrong error');
      settingProvider.add.should.have.been.called.exactly(1);
      settingProvider.remove.should.have.been.called.exactly(1);
      done();
    });
  });

  it('should not add medias settings if no actual settings found', function(done) {
    settingProvider.getOne = function(filter, fields, callback) {
      callback();
    };

    migration.update(function(error) {
      assert.isUndefined(error, 'Unexpected error');
      settingProvider.add.should.have.been.called.exactly(0);
      settingProvider.remove.should.have.been.called.exactly(0);
      done();
    });
  });

});
