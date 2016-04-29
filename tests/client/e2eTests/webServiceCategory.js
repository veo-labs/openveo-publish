'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var CategoryModel = process.requirePublish('app/server/models/CategoryModel.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Web service /category', function() {
  var page;
  var webServiceClient;
  var categoryHelper;

  before(function() {
    var application = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsCategories.name
    );
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    categoryHelper = new CategoryHelper(new CategoryModel());
    page = new WatcherPage();

    page.logAsAdmin();
    page.load();
  });

  // Logout when its done
  after(function() {
    page.logout();
  });

  // Remove all categories after each test
  afterEach(function() {
    categoryHelper.removeAllEntities();
  });

  it('should be able to get a category by its id', function() {
    var deferred = protractor.promise.defer();

    var initialTree = [
      {
        id: '0',
        title: 'Category 1',
        items: [
          {
            id: '1',
            title: 'Sub category 1',
            items: []
          },
          {
            id: '2',
            title: 'Sub category 2',
            items: []
          }
        ]
      }
    ];

    categoryHelper.addEntities(initialTree).then(function(addedTree) {
      page.refresh();

      webServiceClient.get('publish/categories/' + addedTree.tree[0].id).then(function(results) {
        var category = results.entity;
        assert.eventually.isDefined(protractor.promise.fulfilled(category));
        assert.eventually.equal(protractor.promise.fulfilled(category.id), addedTree.tree[0].id);
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

  it('should not return any category if it does not exist', function() {
    var deferred = protractor.promise.defer();

    var initialTree = [
      {
        id: '0',
        title: 'Category 1',
        items: []
      }
    ];

    categoryHelper.addEntities(initialTree).then(function(addedTree) {
      page.refresh();

      webServiceClient.get('publish/categories/unkown').then(function(results) {
        assert.eventually.isUndefined(protractor.promise.fulfilled(results.entity));
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

  it('should not be able to get a category without permission', function() {
    var deferred = protractor.promise.defer();
    var unAuthorizedApplication = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsNoPermission.name
    );
    var client = new OpenVeoClient(
      process.protractorConf.webServiceUrl,
      unAuthorizedApplication.id,
      unAuthorizedApplication.secret
    );

    var initialTree = [
      {
        id: '0',
        title: 'Category 1',
        items: []
      }
    ];

    categoryHelper.addEntities(initialTree).then(function(addedTree) {
      page.refresh();

      client.get('publish/categories/' + addedTree.tree[0].id).then(function(results) {
        assert.eventually.ok(protractor.promise.fulfilled(false),
                             'Application without permission should not be able to get categories');
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
