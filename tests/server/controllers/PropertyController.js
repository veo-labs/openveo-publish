'use strict';

var path = require('path');
var async = require('async');
var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('PropertyController', function() {
  var request;
  var response;
  var propertyController;
  var expectedProperties;
  var expectedPagination;
  var PropertyProvider;
  var openVeoApi;
  var originalCoreApi;
  var coreApi;

  // Mocks
  beforeEach(function() {
    expectedProperties = [];
    expectedPagination = [];

    PropertyProvider = function() {};
    PropertyProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedProperties);
    };
    PropertyProvider.prototype.add = function(resources, callback) {
      callback(null, expectedProperties.length, resources);
    };
    PropertyProvider.prototype.getOne = function(filter, fields, callback) {
      callback(null, expectedProperties[0]);
    };
    PropertyProvider.prototype.remove = function(filter, callback) {
      callback(null, expectedProperties.length);
    };
    PropertyProvider.prototype.updateOne = function(filter, modifications, callback) {
      callback(null, 1);
    };
    PropertyProvider.TYPES = {
      TEXT: 'text',
      LIST: 'list',
      BOOLEAN: 'boolean'
    };
    PropertyProvider.availableTypes = [
      PropertyProvider.TYPES.TEXT,
      PropertyProvider.TYPES.LIST,
      PropertyProvider.TYPES.BOOLEAN
    ];

    openVeoApi = {
      controllers: {
        EntityController: api.controllers.EntityController
      },
      storages: {
        ResourceFilter: api.storages.ResourceFilter
      },
      util: api.util
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      getDatabase: function() {
        return {};
      }
    };

    request = {
      body: {},
      params: {},
      query: {},
      user: {
        id: '42'
      },
      isAuthenticated: function() {
        return true;
      }
    };
    response = {
      locals: {}
    };

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'), PropertyProvider);
  });

  // Initializes tests
  beforeEach(function() {
    var PropertyController = mock.reRequire(
      path.join(process.rootPublish, 'app/server/controllers/PropertyController.js')
    );
    propertyController = new PropertyController();
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = originalCoreApi;
  });

  describe('getPropertyTypesAction', function() {

    it('should send available property types', function(done) {
      response.send = function(data) {
        assert.deepEqual(data.types, PropertyProvider.availableTypes, 'Wrong types');
        done();
      };

      propertyController.getPropertyTypesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

  });

  describe('getEntitiesAction', function() {

    it('should send the first page of custom properties with pagination', function(done) {
      expectedProperties = [{id: 42}];
      request.query = {};

      PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.isNull(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.SEARCH),
          'Unexpected search query'
        );
        assert.isNull(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'type'),
          'Unexpected type'
        );
        assert.isUndefined(fields.include, 'Unexpected include');
        assert.isUndefined(fields.exclude, 'Unexpected exclude');
        assert.isUndefined(limit, 'Unexpected limit');
        assert.equal(page, 0, 'Unexpected page');
        assert.deepEqual(sort, {name: 'desc'}, 'Unexpected sort');
        callback(null, expectedProperties, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedProperties, 'Wrong properties');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        done();
      };

      propertyController.getEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should be able to search by indexed fields', function(done) {
      expectedProperties = [{id: 42}];
      request.query = {query: 'search text'};

      PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.SEARCH).value,
          '"' + request.query.query + '"',
          'Wrong filter'
        );
        callback(null, expectedProperties, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedProperties, 'Wrong properties');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        done();
      };

      propertyController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should be able to deactivate the smart search', function(done) {
      var expectedQuery = '42';
      request.query = {query: expectedQuery, useSmartSearch: 0};

      PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.REGEX, 'name').value,
          '/' + expectedQuery + '/i',
          'Wrong operation on "name"'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.REGEX, 'description').value,
          '/' + expectedQuery + '/i',
          'Wrong operation on "description"'
        );
        callback();
      };

      response.send = function(data) {
        done();
      };

      propertyController.getEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next middleware');
      });
    });

    it('should be able to sort results by either name or description', function(done) {
      var asyncActions = [];
      var orderedProperties = ['name', 'description'];
      expectedProperties = [{id: 42}];

      function test(property, order, callback) {
        request.query = {sortOrder: order, sortBy: property};
        PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
          assert.equal(sort[property], order, 'Unexpected ' + property + ' ' + order + ' sort');
          callback(null, expectedProperties, expectedPagination);
        };

        response.send = function(data) {
          assert.strictEqual(data.entities, expectedProperties, 'Wrong properties');
          assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
          callback();
        };

        propertyController.getEntitiesAction(request, response, function() {
          assert.ok(false, 'Unexpected call to next for property=' + property + ' and order=' + order);
        });
      }

      orderedProperties.forEach(function(property) {
        asyncActions.push(function(callback) {
          test(property, 'asc', callback);
        });
        asyncActions.push(function(callback) {
          test(property, 'desc', callback);
        });
      });

      async.parallel(asyncActions, function() {
        done();
      });
    });

    it('should be able to exclude fields from results', function(done) {
      request.query = {exclude: ['field1']};

      PropertyProvider.prototype.get = function(filter, fields, page, limit, sort, callback) {
        assert.deepEqual(fields.exclude, request.query.exclude, 'Wrong excluded fields');
        callback(null, expectedProperties, expectedPagination);
      };

      response.send = function(data) {
        done();
      };

      propertyController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should be able to include fields in results', function(done) {
      request.query = {include: ['field1']};

      PropertyProvider.prototype.get = function(filter, fields, page, limit, sort, callback) {
        assert.deepEqual(fields.include, request.query.include, 'Wrong included fields');
        callback(null, expectedProperties, expectedPagination);
      };

      response.send = function(data) {
        done();
      };

      propertyController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if sortBy property is not valid', function(done) {
      request.query = {sortBy: 'wrong property'};
      PropertyProvider.prototype.get = function() {
        assert.ok(false, 'Unexpected call to get');
      };
      propertyController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_PROPERTIES_WRONG_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if sortOrder value is not valid', function(done) {
      request.query = {sortOrder: 'wrong order'};
      PropertyProvider.prototype.get = function() {
        assert.ok(false, 'Unexpected call to get');
      };
      propertyController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_PROPERTIES_WRONG_PARAMETERS);
        done();
      });
    });

    it('should be able to filter results by types', function(done) {
      expectedProperties = [{id: 42}];
      request.query = {types: ['type1']};

      PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'type').value,
          request.query.types,
          'Unexpected filters'
        );
        callback(null, expectedProperties, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedProperties, 'Wrong properties');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        done();
      };

      propertyController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should call next with an error if a getting medias failed', function(done) {
      PropertyProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        callback(new Error('Something went wrong'));
      };
      propertyController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_PROPERTIES_ERROR);
        done();
      });
    });

  });

});
