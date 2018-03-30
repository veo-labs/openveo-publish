'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var openVeoTest = require('@openveo/test');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');
var check = openVeoTest.util.check;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Videos web service', function() {
  var page;
  var webServiceClient;
  var mediaHelper;
  var propertyHelper;
  var addedProperties;

  /**
   * Builds /videos properties query string based on an array.
   *
   * @param {Array} properties A list of objects containing "name" and "value" properties
   * @return {String} The computed String ready to be added to the endpoint
   */
  function buildPropertiesQuery(properties) {
    var propertiesQuery = '';

    for (var i = 0; i < properties.length; i++) {
      propertiesQuery += 'properties[' + encodeURIComponent(properties[i].id) + ']=' +
        encodeURIComponent(properties[i].value) + '&';
    }

    return propertiesQuery.replace(/&$/, '');
  }

  before(function() {
    var properties = [];
    var propertyNames = ['Property 1', 'Property 2'];
    var application = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsVideos.name
    );
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    var propertyProvider = new PropertyProvider(coreApi.getDatabase());
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    mediaHelper = new MediaHelper(videoProvider);
    propertyHelper = new PropertyHelper(propertyProvider);
    page = new ConfigurationPage();

    for (var i = 0; i < propertyNames.length; i++) {
      properties.push({
        name: propertyNames[i],
        description: propertyNames[i] + ' description',
        type: PropertyProvider.TYPES.TEXT
      });
    }

    page.logAsAdmin();
    page.load();

    propertyHelper.addEntities(properties).then(function(addedLines) {
      addedProperties = addedLines;
    });

    page.refresh();
  });

  // Remove custom properties and logout
  after(function() {
    propertyHelper.removeAllEntities();
    page.logout();
  });

  // Remove all videos after each test
  afterEach(function() {
    mediaHelper.removeAllEntities();
  });

  describe('get /publish/videos', function() {

    it('should be able to filter videos by custom properties', function(done) {
      var properties = {};
      var propertiesQuery = '';
      properties[addedProperties[0].id] = 'Property 1 value';
      properties[addedProperties[1].id] = 'Property 2 value';
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          properties: properties
        },
        {
          id: '1',
          state: STATES.PUBLISHED
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        propertiesQuery = buildPropertiesQuery([
          {
            id: addedProperties[0].id,
            value: properties[addedProperties[0].id]
          },
          {
            id: addedProperties[1].id,
            value: properties[addedProperties[1].id]
          }
        ]);

        webServiceClient.get('publish/videos?' + propertiesQuery).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1);
            assert.equal(videos[0].id, addedVideos[0].id);
          }, done, true);

          propertiesQuery = buildPropertiesQuery([
            {
              id: addedProperties[0].id,
              value: 'unknown'
            }
          ]);
          return webServiceClient.get('publish/videos?' + propertiesQuery);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 0);
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });

      });
    });

    it('should be able to filter by states', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.READY,
          title: 'Video title 1'
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video title 2'
        },
        {
          id: '2',
          state: STATES.ERROR,
          title: 'Video title 3'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        webServiceClient.get('publish/videos?states=' + STATES.READY).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?states[]=' + STATES.READY + '&states[]=' +
                                     STATES.PUBLISHED);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to filter by date', function(done) {
      var dateLiteral1 = '03/22/2016';
      var dateLiteral2 = '03/23/2016';
      var dateLiteral3 = '03/24/2016';
      var date1 = new Date(dateLiteral1);
      var date2 = new Date(dateLiteral2);
      var date3 = new Date(dateLiteral3);

      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Video title 1',
          date: date1.getTime()
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video title 2',
          date: date2.getTime()
        },
        {
          id: '2',
          state: STATES.ERROR,
          title: 'Video title 3',
          date: date3.getTime()
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        webServiceClient.get('publish/videos?dateStart=' + dateLiteral1).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 3, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateStart=' + dateLiteral2);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateStart=' + dateLiteral3);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateEnd=' + dateLiteral3);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateStart=' + dateLiteral2 + '&dateEnd=' + dateLiteral3);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateStart=03/25/2016');
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 0, 'Wrong number of results');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to filter by categories', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.READY,
          title: 'Video title 1',
          category: '1'
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video title 2',
          category: '2'
        },
        {
          id: '2',
          state: STATES.ERROR,
          title: 'Video title 3',
          category: '3'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        webServiceClient.get('publish/videos?categories=1').then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?categories[]=2&categories[]=3');
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to filter by groups', function(done) {
      var group1Id = 'publishGroupWebService1';
      var group2Id = 'publishGroupWebService2';

      var linesToAdd = [
        {
          id: '0',
          groups: [group1Id]
        },
        {
          id: '1'
        },
        {
          id: '2',
          groups: [group2Id]
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        webServiceClient.get('publish/videos?groups=' + group1Id).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?groups[]=' + group1Id + '&groups[]=' + group2Id);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to exclude fields from response', function(done) {
      var linesToAdd = [
        {
          id: '0',
          title: 'Media 0'
        }
      ];
      var unexpectedField = 'title';

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.get('/publish/videos?exclude[]=' + unexpectedField).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.notProperty(videos[0], unexpectedField);
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error: ' + error.message);
          }, done);
        });
      });
    });

    it('should be able to include only certain fields from response', function(done) {
      var linesToAdd = [
        {
          id: '0',
          title: 'Media 0'
        }
      ];
      var expectedField = 'title';

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.get('/publish/videos?include[]=' + expectedField).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.property(videos[0], expectedField);
            assert.equal(Object.keys(videos[0]).length, 1, 'Wrong fields');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error: ' + error.message);
          }, done);
        });
      });
    });

  });

});
