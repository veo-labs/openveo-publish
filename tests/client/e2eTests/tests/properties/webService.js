'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var openVeoTest = require('@openveo/test');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');
var check = openVeoTest.util.check;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Properties web service', function() {
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

  describe('get /publish/propertiesTypes', function() {

    it('should be able to get the list of available property types', function(done) {
      webServiceClient.get('publish/propertiesTypes').then(function(results) {
        var types = results.types;
        check(function() {
          assert.isDefined(types);
          assert.equal(types.length, PropertyModel.availableTypes.length);
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.ok(false, error.message);
        }, done);
      });
    });

  });

  describe('get /publish/properties', function() {

    it('should be able to filter properties by type', function(done) {
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
          var properties = results.entities;
          check(function() {
            assert.equal(properties.length, 1, 'Wrong number of results');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

  });

});
