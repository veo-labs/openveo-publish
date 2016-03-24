'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Web service /properties', function() {
  var page;
  var webServiceClient;
  var propertyHelper;

  before(function() {
    var application = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsProperties.name
    );
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    propertyHelper = new PropertyHelper(new PropertyModel());
    page = new WatcherPage();

    page.logAsAdmin();
    page.load();
  });

  // Logout when its done
  after(function() {
    page.logout();
  });

  // Remove all properties after each test
  afterEach(function() {
    propertyHelper.removeAllEntities();
  });

  it('should be able to get the list of properties', function() {
    var deferred = protractor.promise.defer();

    var propertiesToAdd = [
      {
        name: 'Get property name',
        description: 'Get property description',
        type: PropertyModel.TYPE_TEXT
      }
    ];

    propertyHelper.addEntities(propertiesToAdd).then(function(addedProperties) {
      page.refresh();

      webServiceClient.get('publish/properties').then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), propertiesToAdd.length);
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should be able to get the list of available property types', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/properties/types').then(function(results) {
      var types = results.types;
      assert.eventually.isDefined(protractor.promise.fulfilled(types));
      assert.eventually.equal(protractor.promise.fulfilled(types.length), PropertyModel.availableTypes.length);
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should return an empty array if no properties found', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/properties').then(function(results) {
      var properties = results.properties;
      var pagination = results.pagination;
      assert.eventually.equal(protractor.promise.fulfilled(properties.length), 0, 'Unexpected results');
      assert.eventually.isUndefined(protractor.promise.fulfilled(pagination), 'Unexpected pagination');
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should be able to filter properties by type', function() {
    var deferred = protractor.promise.defer();

    var propertiesToAdd = [
      {
        name: 'Get property name 1',
        description: 'Get property description 1',
        type: PropertyModel.TYPE_TEXT
      },
      {
        name: 'Get property name 2',
        description: 'Get property description 2',
        type: PropertyModel.TYPE_LIST,
        values: ['tag1', 'tag2']
      }
    ];

    propertyHelper.addEntities(propertiesToAdd).then(function(addedProperties) {
      page.refresh();

      webServiceClient.get('publish/properties?types=list').then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 1, 'Wrong number of results');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should not be able search for properties without permissions', function() {
    var deferred = protractor.promise.defer();
    var unAuthorizedApplication = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsNoPermission.name
    );
    var client = new OpenVeoClient(
      process.protractorConf.webServiceUrl,
      unAuthorizedApplication.id,
      unAuthorizedApplication.secret
    );

    client.get('publish/properties').then(function(results) {
      assert.eventually.ok(protractor.promise.fulfilled(false),
                           'Application without permission should not get properties');
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.isDefined(protractor.promise.fulfilled(error));
      assert.eventually.ok(protractor.promise.fulfilled(true));
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should be able to search text into name and description', function() {
    var deferred = protractor.promise.defer();

    var propertiesToAdd = [
      {
        name: 'Get property name 1',
        description: 'Get property description 1',
        type: PropertyModel.TYPE_TEXT
      },
      {
        name: 'Get property name 2',
        description: 'Get property description 2',
        type: PropertyModel.TYPE_LIST,
        values: ['tag1', 'tag2']
      }
    ];

    propertyHelper.addEntities(propertiesToAdd).then(function(addedProperties) {
      page.refresh();

      webServiceClient.get('publish/properties?query=' + encodeURIComponent('property')).then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        return webServiceClient.get('publish/properties?query=' + encodeURIComponent('2'));
      }).then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/properties?query=' + encodeURIComponent('"get property description"'));
      }).then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  // Sort
  describe('Sort', function() {
    var addedProperties;

    beforeEach(function() {
      var propertiesToAdd = [
        {
          name: 'First property',
          description: 'First property description',
          type: PropertyModel.TYPE_TEXT
        },
        {
          name: 'Second property',
          description: 'Second property description',
          type: PropertyModel.TYPE_LIST,
          values: ['value1', 'value2']
        }
      ];

      propertyHelper.addEntities(propertiesToAdd).then(function(addedLines) {
        addedProperties = addedLines;
      });
      page.refresh();
    });

    it('should be able to sort properties by name', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?sortBy=name').then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(properties[0].id), addedProperties[1].id,
                                'First property is wrong');
        assert.eventually.equal(protractor.promise.fulfilled(properties[1].id), addedProperties[0].id,
                                'Second property is wrong');

        return webServiceClient.get('publish/properties?sortBy=name&sortOrder=asc');
      }).then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(properties[0].id), addedProperties[0].id,
                                'First property is wrong');
        assert.eventually.equal(protractor.promise.fulfilled(properties[1].id), addedProperties[1].id,
                                'Second property is wrong');

        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should be able to sort properties by description', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?sortBy=description').then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(properties[0].id), addedProperties[1].id,
                                'First property is wrong');
        assert.eventually.equal(protractor.promise.fulfilled(properties[1].id), addedProperties[0].id,
                                'Second property is wrong');

        return webServiceClient.get('publish/properties?sortBy=description&sortOrder=asc');
      }).then(function(results) {
        var properties = results.properties;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(properties[0].id), addedProperties[0].id,
                                'First property is wrong');
        assert.eventually.equal(protractor.promise.fulfilled(properties[1].id), addedProperties[1].id,
                                'Second property is wrong');

        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

  });

  // Pagination
  describe('Pagination', function() {
    var addedProperties;

    beforeEach(function() {
      var propertiesToAdd = [
        {
          name: 'Get property name 1',
          description: 'Get property description 1',
          type: PropertyModel.TYPE_TEXT
        },
        {
          name: 'Get property name 2',
          description: 'Get property description 2',
          type: PropertyModel.TYPE_TEXT
        }
      ];

      propertyHelper.addEntities(propertiesToAdd).then(function(addedLines) {
        addedProperties = addedLines;
      });

      page.refresh();
    });

    it('should be able to paginate results', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?page=1&limit=1').then(function(results) {
        var properties = results.properties;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 1, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1, 'Wrong limit');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 1, 'Wront page');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), addedProperties.length, 'Wrong pages');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), addedProperties.length, 'Wrong size');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should choose first page if no page is precised', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?limit=1').then(function(results) {
        var properties = results.properties;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 1, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1, 'Wrong limit');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 1, 'Wront page');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), addedProperties.length, 'Wrong pages');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), addedProperties.length, 'Wrong size');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should not paginate results if limit is not defined', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?page=1').then(function(results) {
        var properties = results.properties;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 2, 'Wrong number of results');
        assert.eventually.isUndefined(protractor.promise.fulfilled(pagination), 'Unexpected pagination');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should not return any properties if the specified page is outside the pagination', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/properties?limit=1&page=10').then(function(results) {
        var properties = results.properties;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(properties.length), 0, 'Wrong number of results');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1, 'Wrong limit');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 10, 'Wrong page');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), 2, 'Wrong pages');
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), 2, 'Wrong size');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

  });

});
