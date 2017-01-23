'use strict';

var util = require('util');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');

// PropertyModel.js
describe('PropertyModel', function() {
  var TestPropertyProvider;
  var TestVideoProvider;
  var propertyModel;

  // Mocks
  beforeEach(function() {
    TestPropertyProvider = function() {};
    TestPropertyProvider.prototype.add = function(property, callback) {
    };

    TestVideoProvider = function() {

    };

    util.inherits(TestPropertyProvider, PropertyProvider);
    util.inherits(TestVideoProvider, VideoProvider);
  });

  // Initializes tests
  beforeEach(function() {
    propertyModel = new PropertyModel(
      new TestPropertyProvider(),
      new TestVideoProvider()
    );
  });

  it('should be an instance of EntityModel', function() {
    assert.ok(propertyModel instanceof openVeoApi.models.EntityModel);
  });

  describe('videoProvider', function() {

    it('should not be editable', function() {
      assert.throws(function() {
        propertyModel.videoProvider = null;
      });
    });

  });

  describe('TYPES', function() {

    it('should not be editable', function() {
      assert.throws(function() {
        PropertyModel.TYPES.TEXT = null;
      });
    });

  });

  describe('availableTypes', function() {

    it('should not be editable', function() {
      assert.throws(function() {
        PropertyModel.availableTypes.push('test');
      });
    });

  });

  // add method
  describe('add', function() {

    it('should be able to add a property', function() {
      var expectedProperty = {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.LIST,
        values: ['value1']
      };
      TestPropertyProvider.prototype.add = function(property, callback) {
        assert.isDefined(property.id, 'Expected id');
        assert.strictEqual(property.name, expectedProperty.name, 'Unexpected name');
        assert.strictEqual(property.description, expectedProperty.description, 'Unexpected description');
        assert.strictEqual(property.type, expectedProperty.type, 'Unexpected type');
        assert.strictEqual(property.values, expectedProperty.values, 'Unexpected values');
        callback(null, 1, [expectedProperty]);
      };
      propertyModel.add(expectedProperty,
      function(error, count, property) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(count, 1, 'Unexpected count');
        assert.strictEqual(property, expectedProperty, 'Unexpected property');
      });
    });

    it('should not add values property if not of type LIST', function() {
      var expectedProperty = {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.TEXT,
        values: ['value1']
      };
      TestPropertyProvider.prototype.add = function(property, callback) {
        assert.isUndefined(property.values);
        callback(null, 1, [expectedProperty]);
      };
      propertyModel.add(expectedProperty);
    });

    it('should initialize the list values if not specified', function() {
      var expectedProperty = {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.LIST
      };
      TestPropertyProvider.prototype.add = function(property, callback) {
        assert.isArray(property.values);
        callback(null, 1, [expectedProperty]);
      };
      propertyModel.add(expectedProperty);
    });

    it('should execute callback with an error if a required property is missing', function() {
      var requiredProperties = ['name', 'description', 'type'];
      TestPropertyProvider.prototype.add = function(property, callback) {
        callback(null, 1, []);
      };

      requiredProperties.forEach(function(requiredProperty) {
        var expectedProperty = {
          name: 'Name of the property',
          description: 'Description of the property',
          type: PropertyModel.TYPES.TEXT
        };
        delete expectedProperty[requiredProperty];

        propertyModel.add(expectedProperty, function(error, count, property) {
          assert.instanceOf(error, TypeError);
          assert.isUndefined(count, 'Unexpected count for missing property ' + requiredProperty);
          assert.isUndefined(property, 'Unexpected property for missing property ' + requiredProperty);
        });
      });
    });

    it('should return an error if type is not a valid type', function() {
      var expectedProperty = {
        name: 'Name of the property',
        description: 'Description of the property',
        type: 'Unkown type'
      };
      TestPropertyProvider.prototype.add = function(property, callback) {
        callback(null, 1, [expectedProperty]);
      };
      propertyModel.add(expectedProperty,
      function(error, count, property) {
        assert.instanceOf(error, TypeError);
        assert.isUndefined(count, 'Unexpected count');
        assert.isUndefined(property, 'Unexpected property');
      });

    });

  });

  // update method
  describe('update', function() {

    it('should be able to update a property', function() {
      var expectedId = '42';
      var expectedProperty = {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.LIST,
        values: ['value1']
      };
      TestPropertyProvider.prototype.update = function(id, property, callback) {
        assert.strictEqual(property.name, expectedProperty.name, 'Unexpected name');
        assert.strictEqual(property.description, expectedProperty.description, 'Unexpected description');
        assert.strictEqual(property.type, expectedProperty.type, 'Unexpected type');
        assert.strictEqual(property.values, expectedProperty.values, 'Unexpected values');
      };
      propertyModel.update(expectedId, expectedProperty);
    });

    it('should update only specified properties', function() {
      var optionalProperties = ['name', 'description', 'type'];

      optionalProperties.forEach(function(optionalProperty) {
        var expectedProperty = {
          name: 'Name of the property',
          description: 'Description of the property',
          type: PropertyModel.TYPES.TEXT
        };
        delete expectedProperty[optionalProperty];

        TestPropertyProvider.prototype.update = function(id, property, callback) {
          assert.isUndefined(property[optionalProperty], 'Unexpected property ' + optionalProperty);
        };
        propertyModel.update('42', expectedProperty);
      });
    });

    it('should initialize not specified values if type is LIST', function() {
      TestPropertyProvider.prototype.update = function(id, property, callback) {
        assert.isArray(property.values);
      };
      propertyModel.update('42', {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.LIST
      });
    });

    it('should ignore values if type is not LIST', function() {
      TestPropertyProvider.prototype.update = function(id, property, callback) {
        assert.isNull(property.values);
      };
      propertyModel.update('42', {
        name: 'Name of the property',
        description: 'Description of the property',
        type: PropertyModel.TYPES.TEXT,
        values: ['value']
      });
    });
  });

  // remove method
  describe('remove', function() {

    it('should be able to remove properties', function() {
      var expectedIds = ['41', '42'];
      TestPropertyProvider.prototype.remove = function(ids, callback) {
        assert.strictEqual(ids, expectedIds, 'Unexpected ids');
        callback(null, ids.length);
      };
      TestVideoProvider.prototype.removeProp = function(property, callback) {
        callback();
      };

      propertyModel.remove(expectedIds, function(error, count) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(count, expectedIds.length, 'Unexpected count');
      });
    });

    it('should execute callback with an error if something went wrong while removing properties', function() {
      var expectedError = new Error();
      TestPropertyProvider.prototype.remove = function(ids, callback) {
        callback(expectedError);
      };

      propertyModel.remove(['41', '42'], function(error, count) {
        assert.strictEqual(error, expectedError);
      });
    });
  });

});
