'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');
var api = require('@openveo/api');
var PUBLISH_HOOKS = process.requirePublish('app/server/hooks.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('PropertyProvider', function() {
  var PropertyProvider;
  var provider;
  var openVeoApi;
  var EntityProvider;
  var storage;
  var expectedProperties;
  var publishApi;
  var coreApi;
  var originalCoreApi;
  var expectedLocation = 'location';

  // Mocks
  beforeEach(function() {
    storage = {};
    expectedProperties = [];

    EntityProvider = function() {
      this.storage = storage;
      this.location = expectedLocation;
    };
    EntityProvider.prototype.executeCallback = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.shift();
      if (callback) return callback.apply(null, args);
    };
    EntityProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedProperties);
    });
    EntityProvider.prototype.add = chai.spy(function(resources, callback) {
      callback(null, expectedProperties.length, resources);
    });
    EntityProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
      callback(null, expectedProperties[0]);
    });
    EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedProperties.length);
    });
    EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    openVeoApi = {
      providers: {
        EntityProvider: EntityProvider
      },
      util: api.util
    };

    publishApi = {
      getHooks: function() {
        return PUBLISH_HOOKS;
      }
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      getApi: function(pluginName) {
        if (pluginName === 'publish') return publishApi;
        return null;
      },
      executeHook: chai.spy(function(hook, data, callback) {
        callback();
      })
    };

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('@openveo/api', openVeoApi);
  });

  // Initializes tests
  beforeEach(function() {
    PropertyProvider = mock.reRequire(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'));
    provider = new PropertyProvider(storage, expectedLocation);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = originalCoreApi;
  });

  describe('add', function() {

    it('should add custom properties', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT,
          unexpectedProperty: 'Unexpected property'
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(properties, callback) {
        assert.equal(properties[0].id, expectedProperties[0].id, 'Wrong id');
        assert.equal(properties[0].name, expectedProperties[0].name, 'Wrong name');
        assert.equal(properties[0].description, expectedProperties[0].description, 'Wrong description');
        assert.equal(properties[0].type, expectedProperties[0].type, 'Wrong type');
        assert.notProperty(properties[0], 'unexpectedProperty', 'Unexpected property');
        callback(null, properties.length, properties);
      });

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedProperties.length, 'Wrong total');
        assert.equal(properties[0].id, expectedProperties[0].id, 'Wrong id');
        assert.equal(properties[0].name, expectedProperties[0].name, 'Wrong name');
        assert.equal(properties[0].description, expectedProperties[0].description, 'Wrong description');
        assert.equal(properties[0].type, expectedProperties[0].type, 'Wrong type');
        assert.notProperty(properties[0], 'unexpectedProperty', 'Unexpected property');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should generate an id if not specified', function(done) {
      expectedProperties = [
        {
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(properties, callback) {
        assert.isNotEmpty(properties[0].id, 'Expected id to be generated');
        callback(null, properties.length, properties);
      });

      provider.add(expectedProperties, function(error, total, properties) {
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should add custom properties of type "list" with values', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.LIST,
          values: ['value1'],
          unexpectedProperty: 'Unexpected property'
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(properties, callback) {
        assert.equal(properties[0].id, expectedProperties[0].id, 'Wrong id');
        assert.equal(properties[0].name, expectedProperties[0].name, 'Wrong name');
        assert.equal(properties[0].description, expectedProperties[0].description, 'Wrong description');
        assert.equal(properties[0].type, expectedProperties[0].type, 'Wrong type');
        assert.deepEqual(properties[0].values, expectedProperties[0].values, 'Wrong values');
        assert.notProperty(properties[0], 'unexpectedProperty', 'Unexpected property');
        callback(null, properties.length, properties);
      });

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedProperties.length, 'Wrong total');
        assert.equal(properties[0].id, expectedProperties[0].id, 'Wrong id');
        assert.equal(properties[0].name, expectedProperties[0].name, 'Wrong name');
        assert.equal(properties[0].description, expectedProperties[0].description, 'Wrong description');
        assert.equal(properties[0].type, expectedProperties[0].type, 'Wrong type');
        assert.deepEqual(properties[0].values, expectedProperties[0].values, 'Wrong values');
        assert.notProperty(properties[0], 'unexpectedProperty', 'Unexpected property');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should initialize values to an empty array if type is "list" and no values are specified', function(done) {
      expectedProperties = [
        {
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.LIST
        }
      ];

      EntityProvider.prototype.add = chai.spy(function(properties, callback) {
        assert.isArray(properties[0].values, 'Expected values to be array');
        assert.isEmpty(properties[0].values, 'Expected values to be an empty array');
        callback(null, properties.length, properties);
      });

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNull(error, 'Unexpected error');
        EntityProvider.prototype.add.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if name is not specified', function(done) {
      expectedProperties = [
        {
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        assert.isUndefined(properties, 'Unexpected properties');
        EntityProvider.prototype.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if description is not specified', function(done) {
      expectedProperties = [
        {
          name: 'Name',
          type: PropertyProvider.TYPES.TEXT
        }
      ];

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        assert.isUndefined(properties, 'Unexpected properties');
        EntityProvider.prototype.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if type is not supported', function(done) {
      expectedProperties = [
        {
          name: 'Name',
          description: 'Description',
          type: 'wrongType'
        }
      ];

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        assert.isUndefined(properties, 'Unexpected properties');
        EntityProvider.prototype.add.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if adding properties failed', function(done) {
      expectedProperties = [
        {
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedError = new Error('Something went wrong');

      EntityProvider.prototype.add = function(properties, callback) {
        callback(expectedError);
      };

      provider.add(expectedProperties, function(error, total, properties) {
        assert.isNotNull(error, 'Expected an error');
        done();
      });
    });

  });

  describe('updateOne', function() {

    it('should update a custom property', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedProperties[0].id);
      var expectedModifications = {
        name: 'New name',
        description: 'New description',
        type: PropertyProvider.TYPES.LIST,
        values: ['value1'],
        unexpectedProperty: 'Unexpected property'
      };

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedProperties[0].id,
          'Wrong id'
        );
        assert.equal(modifications.name, expectedModifications.name, 'Wrong name');
        assert.equal(modifications.description, expectedModifications.description, 'Wrong description');
        assert.equal(modifications.type, expectedModifications.type, 'Wrong type');
        assert.deepEqual(modifications.values, expectedModifications.values, 'Wrong values');
        assert.notProperty(modifications, 'unexpectedProperty', 'Unexpected property');
        callback(null, 1);
      });

      provider.updateOne(expectedFilter, expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should remove values if property is not longer of type "list"', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.LIST,
          values: ['value']
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedProperties[0].id);
      var expectedModifications = {
        name: 'New name',
        description: 'New description',
        type: PropertyProvider.TYPES.TEXT
      };

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.isNull(modifications.values, 'Wrong values');
        callback(null, 1);
      });

      provider.updateOne(expectedFilter, expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if updating property failed', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedError = new Error('Something went wrong');
      var expectedModifications = {
        name: 'New name',
        description: 'New description',
        type: PropertyProvider.TYPES.TEXT
      };

      EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(expectedError);
      });

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        EntityProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('remove', function() {

    it('should remove properties', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedProperties[0].id);

      EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedProperties[0].id,
          'Wrong id'
        );
        callback(null, expectedProperties.length);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedProperties.length, 'Wrong total');
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute hook PROPERTIES_DELETED with the ids of the removed properties', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedProperties[0].id);

      coreApi.executeHook = chai.spy(function(hook, data, callback) {
        assert.equal(hook, PUBLISH_HOOKS.PROPERTIES_DELETED, 'Wrong hook');
        assert.deepEqual(data, [expectedProperties[0].id], 'Wrong ids');
        callback();
      });

      EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
        callback(null, expectedProperties.length);
      });

      provider.remove(expectedFilter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedProperties.length, 'Wrong total');
        coreApi.executeHook.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if executing hook failed', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedError = new Error('Something went wrong');

      coreApi.executeHook = function(hook, data, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Unexpected error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if getting properties failed', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedError = new Error('Something went wrong');

      provider.getAll = function(filter, fields, sort, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Unexpected error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if removing properties failed', function(done) {
      expectedProperties = [
        {
          id: '42',
          name: 'Name',
          description: 'Description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];
      var expectedError = new Error('Something went wrong');

      PropertyProvider.prototype.remove = function(filter, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Unexpected error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should not do anything if no properties found', function(done) {
      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        EntityProvider.prototype.remove.should.have.been.called.exactly(0);
        coreApi.executeHook.should.have.been.called.exactly(0);
        done();
      });
    });

  });

});
