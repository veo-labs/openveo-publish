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

describe('Web service /property', function() {
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

  it('should be able to get a property by its id', function() {
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

      webServiceClient.get('publish/property/' + addedProperties[0].id).then(function(results) {
        var property = results.property;
        assert.eventually.isDefined(protractor.promise.fulfilled(property));
        assert.eventually.equal(protractor.promise.fulfilled(property.id), addedProperties[0].id);
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

  it('should not return any property if it does not exist', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/property/unkown').then(function(results) {
      assert.eventually.isUndefined(protractor.promise.fulfilled(results.property));
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });


  it('should return an error if no id', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/property/').then(function(results) {
      assert.eventually.ok(protractor.promise.fulfilled(false), 'Unexpected HTTP 200 response');
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(true));
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should not be able to get a property without permission', function() {
    var deferred = protractor.promise.defer();
    var unAuthorizedApplication = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsNoPermission.name
    );
    var client = new OpenVeoClient(
      process.protractorConf.webServiceUrl,
      unAuthorizedApplication.id,
      unAuthorizedApplication.secret
    );

    var propertiesToAdd = [
      {
        name: 'No permission property name',
        description: 'No permission property description',
        type: PropertyModel.TYPE_TEXT
      }
    ];

    propertyHelper.addEntities(propertiesToAdd).then(function(addedProperties) {
      page.refresh();

      client.get('publish/property/' + addedProperties[0].id).then(function(results) {
        assert.eventually.ok(protractor.promise.fulfilled(false),
                             'Application without permission should not be able to get properties');
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.isDefined(protractor.promise.fulfilled(error));
        assert.eventually.ok(protractor.promise.fulfilled(true));
        deferred.fulfill();
      });

    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

});
