'use strict';

var fs = require('fs');
var path = require('path');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var openVeoTest = require('@openveo/test');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var ConfigurationPage = process.requirePublish('tests/client/e2eTests/pages/ConfigurationPage.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PoiProvider = process.requirePublish('app/server/providers/PoiProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var PoiHelper = process.requirePublish('tests/client/e2eTests/helpers/PoiHelper.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');
var check = openVeoTest.util.check;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Videos web service', function() {
  var page;
  var webServiceClient;
  var mediaHelper;
  var poiHelper;
  var propertyHelper;
  var categoryHelper;
  var addedProperties;
  var addedCategories;

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
    var poiProvider = new PoiProvider(coreApi.getDatabase());
    var propertyProvider = new PropertyProvider(coreApi.getDatabase());
    var taxonomyProvider = process.api.getCoreApi().taxonomyProvider;
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    mediaHelper = new MediaHelper(videoProvider);
    poiHelper = new PoiHelper(poiProvider);
    propertyHelper = new PropertyHelper(propertyProvider);
    categoryHelper = new CategoryHelper(taxonomyProvider);
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

    categoryHelper.addEntities([
      {
        title: 'Category 1',
        id: 'category1',
        items: [
          {
            title: 'Sub category 1',
            id: 'category11',
            items: [
              {
                title: 'Sub sub category 1',
                id: 'category111'
              }
            ]
          },
          {
            title: 'Sub category 2',
            id: 'category12'
          }
        ]
      }
    ]).then(function(addedLines) {
      addedCategories = addedLines.tree;
    });

    page.refresh();
  });

  // Remove custom properties and logout
  after(function() {
    propertyHelper.removeAllEntities();
    categoryHelper.removeAllEntities();
    page.logout();
  });

  // Remove all videos after each test
  afterEach(function() {
    mediaHelper.removeAllEntities();
    poiHelper.removeAllEntities();
  });

  describe('get /publish/videos', function() {

    it('should be able to search videos by keywords without smart search', function(done) {
      var searchQuery = 'keyword';
      var mediasToAdd = [
        {
          id: '0',
          description: 'Description: ' + searchQuery
        },
        {
          id: '1',
          title: 'Title: ' + searchQuery
        }
      ];

      mediaHelper.addEntities(mediasToAdd).then(function(addedMedias) {
        return webServiceClient.get(
          'publish/videos?useSmartSearch=0&query=' + encodeURIComponent(searchQuery.slice(0, 2))
        ).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, mediasToAdd.length, 'Unexpected number of videos');
            assert.equal(videos[0].id, mediasToAdd[0].id, 'Wrong video 1');
            assert.equal(videos[1].id, mediasToAdd[1].id, 'Wrong video 2');
          }, done, true);
          return webServiceClient.get('publish/videos?query=' + encodeURIComponent(searchQuery.slice(0, 2)));
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 0, 'Unexpected videos');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to search videos by keywords in tags and chapters', function(done) {
      var searchQuery = 'keyword';
      var poisToAdd = [
        {
          id: '0',
          value: 0,
          name: 'Tag name: ' + searchQuery
        },
        {
          id: '1',
          value: 1000,
          name: 'Tag description: ' + searchQuery
        },
        {
          id: '2',
          value: 2000,
          name: 'Chapter name: ' + searchQuery
        },
        {
          id: '3',
          value: 3000,
          name: 'Chapter description: ' + searchQuery
        }
      ];
      var mediasToAdd = [
        {
          id: '0',
          tags: [poisToAdd[0].id]
        },
        {
          id: '1',
          tags: [poisToAdd[1].id]
        },
        {
          id: '2',
          chapters: [poisToAdd[2].id]
        },
        {
          id: '3',
          chapters: [poisToAdd[3].id]
        }
      ];

      poiHelper.addEntities(poisToAdd).then(function(addedPois) {
        return mediaHelper.addEntities(mediasToAdd);
      }).then(function(addedMedias) {
        return webServiceClient.get(
          'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery)
        ).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, mediasToAdd.length, 'Unexpected number of videos');
            assert.equal(videos[0].id, mediasToAdd[0].id, 'Wrong video 1');
            assert.equal(videos[1].id, mediasToAdd[1].id, 'Wrong video 2');
            assert.equal(videos[2].id, mediasToAdd[2].id, 'Wrong video 3');
            assert.equal(videos[3].id, mediasToAdd[3].id, 'Wrong video 4');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should score results when searching videos by keywords', function(done) {
      var searchQuery = 'keyword';
      var poisToAdd = [
        {
          id: '0',
          value: 1000,
          name: 'Tag name: ' + searchQuery
        },
        {
          id: '1',
          value: 1000,
          name: 'Chapter',
          description: 'Chapter description: ' + searchQuery
        }
      ];
      var mediasToAdd = [
        {
          id: '0',
          chapters: [poisToAdd[1].id]
        },
        {
          id: '1',
          description: 'Media description: ' + searchQuery
        },
        {
          id: '2',
          tags: [poisToAdd[0].id]
        },
        {
          id: '3',
          title: 'Media title: ' + searchQuery
        }
      ];

      poiHelper.addEntities(poisToAdd).then(function(addedPois) {
        return mediaHelper.addEntities(mediasToAdd);
      }).then(function(addedMedias) {
        return webServiceClient.get(
          'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery)
        ).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, mediasToAdd.length, 'Unexpected number of videos');
            assert.equal(videos[0].id, mediasToAdd[3].id, 'Wrong video 1');
            assert.equal(videos[1].id, mediasToAdd[1].id, 'Wrong video 2');
            assert.equal(videos[2].id, mediasToAdd[0].id, 'Wrong video 3');
            assert.equal(videos[3].id, mediasToAdd[2].id, 'Wrong video 4');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to combine search by keywords and filtering', function(done) {
      var searchQuery = 'keyword';
      var poisToAdd = [
        {
          id: '0',
          value: 1000,
          name: 'Tag name: ' + searchQuery
        }
      ];
      var mediasToAdd = [
        {
          id: '0',
          tags: [poisToAdd[0].id],
          state: STATES.PUBLISHED
        },
        {
          id: '1',
          state: STATES.READY
        },
        {
          id: '2',
          title: 'Media title: ' + searchQuery
        }
      ];

      poiHelper.addEntities(poisToAdd).then(function(addedPois) {
        return mediaHelper.addEntities(mediasToAdd);
      }).then(function(addedMedias) {
        return webServiceClient.get(
          'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery) + '&states[]=' + STATES.READY
        ).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, 0, 'Unexpected videos');
          }, done, true);
          return webServiceClient.get(
            'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery) + '&states[]=' + STATES.PUBLISHED
          );
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, 1, 'Wrong number of videos');
            assert.equal(videos[0].id, mediasToAdd[0].id, 'Wrong video');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

    it('should be able to combine search by keywords and sorting', function(done) {
      var searchQuery = 'keyword';
      var poisToAdd = [
        {
          id: '0',
          value: 1000,
          name: 'Tag name: ' + searchQuery
        }
      ];
      var mediasToAdd = [
        {
          id: '0',
          tags: [poisToAdd[0].id],
          date: new Date('01/01/2020')
        },
        {
          id: '1',
          title: 'Media title: ' + searchQuery,
          date: new Date('02/02/2020')
        },
        {
          id: '2',
          title: 'Media title: ' + searchQuery,
          date: new Date('03/03/2020')
        }
      ];

      poiHelper.addEntities(poisToAdd).then(function(addedPois) {
        return mediaHelper.addEntities(mediasToAdd);
      }).then(function(addedMedias) {
        return webServiceClient.get(
          'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery) + '&sortOrder=desc'
        ).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, mediasToAdd.length, 'Wrong number of videos');
            assert.equal(videos[0].id, mediasToAdd[2].id, 'Wrong video 1');
            assert.equal(videos[1].id, mediasToAdd[1].id, 'Wrong video 2');
            assert.equal(videos[2].id, mediasToAdd[0].id, 'Wrong video 3');
          }, done, true);
          return webServiceClient.get(
            'publish/videos?searchInPois=1&query=' + encodeURIComponent(searchQuery) + '&sortOrder=asc'
          );
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.lengthOf(videos, mediasToAdd.length, 'Wrong number of videos');
            assert.equal(videos[0].id, mediasToAdd[1].id, 'Wrong video 1');
            assert.equal(videos[1].id, mediasToAdd[2].id, 'Wrong video 2');
            assert.equal(videos[2].id, mediasToAdd[0].id, 'Wrong video 3');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, error.message);
          }, done);
        });
      });
    });

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
            assert.equal(videos.length, 3, 'Wrong number of results');
          }, done, true);
          return webServiceClient.get('publish/videos?dateStart=' + dateLiteral2 + '&dateEnd=' + dateLiteral3);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
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
          title: 'Video in root category',
          category: addedCategories[0].id
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video in category 1',
          category: addedCategories[0].items[0].id
        },
        {
          id: '2',
          state: STATES.ERROR,
          title: 'Video in sub category 1 of category 1',
          category: addedCategories[0].items[0].items[0].id
        },
        {
          id: '3',
          state: STATES.ERROR,
          title: 'Video in category 2',
          category: addedCategories[0].items[1].id
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        webServiceClient.get('publish/videos?categories=' + addedCategories[0].id).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 4, 'Wrong number of results');
            assert.sameMembers(
              [videos[0].id, videos[1].id, videos[2].id, videos[3].id],
              [linesToAdd[0].id, linesToAdd[1].id, linesToAdd[2].id, linesToAdd[3].id],
              'Wrong videos'
            );
          }, done, true);
          return webServiceClient.get('publish/videos?categories=' + addedCategories[0].items[0].id);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
            assert.sameMembers([videos[0].id, videos[1].id], [linesToAdd[1].id, linesToAdd[2].id], 'Wrong videos');
          }, done, true);
          return webServiceClient.get('publish/videos?categories=' + addedCategories[0].items[0].items[0].id);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 1, 'Wrong number of results');
            assert.sameMembers([videos[0].id], [linesToAdd[2].id], 'Wrong videos');
          }, done, true);
          return webServiceClient.get('publish/videos?categories[]=' + addedCategories[0].items[0].items[0].id +
                                      '&categories[]=' + addedCategories[0].items[1].id);
        }).then(function(results) {
          var videos = results.entities;
          check(function() {
            assert.equal(videos.length, 2, 'Wrong number of results');
            assert.sameMembers([videos[0].id, videos[1].id], [linesToAdd[2].id, linesToAdd[3].id], 'Wrong videos');
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
            assert.equal(Object.keys(videos[0]).length, 3, 'Wrong fields');
            assert.property(videos[0], expectedField, 'Expected field "' + expectedField + '"');
            assert.property(videos[0], 'metadata', 'Expected field "metadata"');
            assert.property(
              videos[0],
              'needPointsOfInterestUnitConversion',
              'Expected field "needPointsOfInterestUnitConversion"'
            );
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error: ' + error.message);
          }, done);
        });
      });
    });

    it('should not be able to get videos without permission', function(done) {
      var application = process.protractorConf.getWebServiceApplication(
        datas.applications.publishApplicationsNoPermission.name
      );
      var client = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
      var linesToAdd = [
        {
          id: '0',
          state: STATES.READY,
          title: 'Video title 1'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        page.refresh();

        client.get('publish/videos').then(function(results) {
          check(function() {
            assert.ok(false, 'Unexpected response');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.equal(error.httpCode, 403, 'Wrong HTTP code');
          }, done);
        });
      });
    });

  });

  describe('post /publish/videos', function() {

    /**
     * Waits for a media state.
     *
     * @param {String} id The media id
     * @param {Number} state The state to wait for
     * @return {Function} callback The function to call when expected state is reached with:
     *  - **Error** An error if something went wrong, null otherwise
     *  - **Object** The media description object
     */
    function waitForState(id, state, callback) {
      webServiceClient.get('/publish/videos/' + id).then(function(data) {
        if (data.entity.state === STATES.ERROR) return callback(new Error('Media on error'));
        if (data.entity.state === state) return callback(null, data.entity);
        waitForState(id, state, callback);
      }).catch(function(error) {
        callback(error);
      });
    }

    it('should add a video', function(done) {
      var expectedVideoTitle = 'Video title';
      var expectedFileName = 'blank';
      var expectedFileExtension = '.mp4';
      var filePath = path.join(
        process.rootPublish,
        'tests/client/e2eTests/resources/packages/' + expectedFileName + expectedFileExtension
      );
      var thumbnailPath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/images/blank.png');
      var expectedDate = new Date().getTime();
      var expectedLeadParagraph = '<h1>Lead paragraph</h1>';
      var expectedDescription = '<p>Description</p>';
      var expectedGroups = ['publishGroup1'];
      var expectedCategory = addedCategories[0].id;
      var expectedProperties = {};
      expectedProperties[addedProperties[0].id] = 'Property value';

      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify(
            {
              title: expectedVideoTitle,
              properties: expectedProperties,
              category: expectedCategory,
              date: expectedDate,
              leadParagraph: expectedLeadParagraph,
              description: expectedDescription,
              groups: expectedGroups
            }
          ),
          file: fs.createReadStream(filePath),
          thumbnail: fs.createReadStream(thumbnailPath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        waitForState(data.id, STATES.WAITING_FOR_UPLOAD, function(error, media) {
          check(function() {
            assert.isNotNull(media.date, 'Expected media to have a date');
            assert.isNotNull(media.thumbnail, 'Expected media to have a thumbnail');
            assert.equal(
              media.metadata.user,
              process.api.getCoreApi().getSuperAdminId(),
              'Expected media to belong to the super administrator'
            );
            assert.deepEqual(media.mediasHeights, [1080], 'Wrong video height');
            assert.deepEqual(media.metadata.groups, expectedGroups, 'Wrong groups');
            assert.match(media.originalFileName, new RegExp(expectedFileName + '-.*'), 'Wrong file name');
            assert.equal(media.title, expectedVideoTitle, 'Wrong title');
            assert.equal(media.category, expectedCategory, 'Wrong category');
            assert.equal(
              media.properties[addedProperties[0].id],
              expectedProperties[addedProperties[0].id],
              'Wrong properties'
            );
          }, done);
        });
      }).catch(function(error) {
        check(function() {
          assert.ok(false, 'Unexpected error: ' + error.message);
        }, done);
      });
    });

    it('should be able to add a video with just a title and a file', function(done) {
      var expectedVideoTitle = 'Video title';
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');

      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify(
            {
              title: expectedVideoTitle
            }
          ),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        waitForState(data.id, STATES.WAITING_FOR_UPLOAD, function(error, media) {
          check(function() {
            assert.equal(media.title, expectedVideoTitle, 'Wrong title');
          }, done);
        });
      }).catch(function(error) {
        check(function() {
          assert.ok(false, 'Unexpected error: ' + error.message);
        }, done);
      });
    });

    it('should be able to automatically upload the video on a configured platform', function(done) {
      var expectedVideoTitle = 'Video title';
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');

      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify(
            {
              title: expectedVideoTitle,
              platform: TYPES.LOCAL
            }
          ),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        waitForState(data.id, STATES.READY, function(error, media) {
          check(function() {
            assert.equal(media.title, expectedVideoTitle, 'Wrong title');
          }, done);
        });
      }).catch(function(error) {
        check(function() {
          assert.ok(false, 'Unexpected error: ' + error.message);
        }, done);
      });
    });

    it('should fail if body is missing', function(done) {
      webServiceClient.post(
        '/publish/videos',
        null,
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if info is missing', function(done) {
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');
      webServiceClient.post(
        '/publish/videos',
        {
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if file is missing', function(done) {
      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify(
            {
              title: 'Title'
            }
          )
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_MISSING_FILE_PARAMETER.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_MISSING_FILE_PARAMETER.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_MISSING_FILE_PARAMETER.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if file is not a MP4 nor a TAR', function(done) {
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/images/blank.png');
      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify(
            {
              title: 'Title'
            }
          ),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if title is not specified', function(done) {
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');
      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify({}),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if specified group does not exist', function(done) {
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');
      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify({
            title: 'Title',
            groups: ['unknownGroup']
          }),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should fail if specified category does not exist', function(done) {
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');
      webServiceClient.post(
        '/publish/videos',
        {
          info: JSON.stringify({
            title: 'Title',
            category: 'unknownCategory'
          }),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code,
            'Expected a message with error code ' + HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should not be able to add video without permission', function(done) {
      var application = process.protractorConf.getWebServiceApplication(
        datas.applications.publishApplicationsNoPermission.name
      );
      var client = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
      var filePath = path.join(process.rootPublish, 'tests/client/e2eTests/resources/packages/blank.mp4');
      client.post(
        '/publish/videos',
        {
          info: JSON.stringify({
            title: 'Title'
          }),
          file: fs.createReadStream(filePath)
        },
        null,
        Infinity,
        true
      ).then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.equal(error.httpCode, 403, 'Wrong HTTP code');
        }, done);
      });
    });

  });

  describe('post /publish/videos/:id/publish', function() {

    it('should publish videos', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.READY,
          title: 'Video title 1'
        },
        {
          id: '1',
          state: STATES.READY,
          title: 'Video title 2'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.post(
          '/publish/videos/' + linesToAdd[0].id + ',' + linesToAdd[1].id + '/publish'
        ).then(function(data) {
          check(function() {
            assert.equal(data.total, linesToAdd.length, 'Wrong total of published videos');
          }, done, true);
          return webServiceClient.get('/publish/videos');
        }).then(function(data) {
          check(function() {
            assert.equal(data.entities[0].state, STATES.PUBLISHED, 'Wrong state for the first video');
            assert.equal(data.entities[1].state, STATES.PUBLISHED, 'Wrong state for the second video');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error');
          }, done);
        });
      });
    });

    it('should not be able to publish videos without permission', function(done) {
      var application = process.protractorConf.getWebServiceApplication(
        datas.applications.publishApplicationsNoPermission.name
      );
      var client = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
      var linesToAdd = [
        {
          id: '0',
          state: STATES.READY,
          title: 'Video title'
        }
      ];
      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        client.post(
          '/publish/videos/' + linesToAdd[0].id + '/publish'
        ).then(function(data) {
          check(function() {
            assert.ok(false, 'Unexpected response');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.equal(error.httpCode, 403, 'Wrong HTTP code');
          }, done);
        });
      });
    });

  });

  describe('post /publish/videos/:id/unpublish', function() {

    it('should unpublish videos', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Video title 1'
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video title 2'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.post(
          '/publish/videos/' + linesToAdd[0].id + ',' + linesToAdd[1].id + '/unpublish'
        ).then(function(data) {
          check(function() {
            assert.equal(data.total, linesToAdd.length, 'Wrong total of unpublished videos');
          }, done, true);
          return webServiceClient.get('/publish/videos');
        }).then(function(data) {
          check(function() {
            assert.equal(data.entities[0].state, STATES.READY, 'Wrong state for the first video');
            assert.equal(data.entities[1].state, STATES.READY, 'Wrong state for the second video');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error');
          }, done);
        });
      });
    });

    it('should not be able to unpublish videos without permission', function(done) {
      var application = process.protractorConf.getWebServiceApplication(
        datas.applications.publishApplicationsNoPermission.name
      );
      var client = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Video title'
        }
      ];
      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        client.post(
          '/publish/videos/' + linesToAdd[0].id + '/unpublish'
        ).then(function(data) {
          check(function() {
            assert.ok(false, 'Unexpected response');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.equal(error.httpCode, 403, 'Wrong HTTP code');
          }, done);
        });
      });
    });

  });

  describe('delete /publish/videos/:id', function() {

    it('should remove videos', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Video title 1'
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Video title 2'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.delete(
          '/publish/videos/' + linesToAdd[0].id + ',' + linesToAdd[1].id
        ).then(function(data) {
          check(function() {
            assert.equal(data.total, linesToAdd.length, 'Wrong total of removed videos');
          }, done, true);
          return webServiceClient.get('/publish/videos');
        }).then(function(data) {
          check(function() {
            assert.equal(data.entities.length, 0, 'Unexpected videos');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.ok(false, 'Unexpected error');
          }, done);
        });
      });
    });

    it('should send response with an error if no video corresponds to the specified id', function(done) {
      webServiceClient.delete('/publish/videos/wrongId').then(function(data) {
        check(function() {
          assert.ok(false, 'Unexpected response');
        }, done);
      }).catch(function(error) {
        check(function() {
          assert.include(
            error.message,
            HTTP_ERRORS.REMOVE_MEDIAS_ERROR.code,
            'Expected a message with error code ' + HTTP_ERRORS.REMOVE_MEDIAS_ERROR.code
          );
          assert.equal(error.httpCode, HTTP_ERRORS.REMOVE_MEDIAS_ERROR.httpCode, 'Wrong HTTP code');
        }, done);
      });
    });

    it('should send response with an error if video is not in a stable state', function(done) {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PENDING,
          title: 'Video title 1'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        webServiceClient.delete('/publish/videos/' + linesToAdd[0].id).then(function(data) {
          check(function() {
            assert.ok(false, 'Unexpected response');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.include(
              error.message,
              HTTP_ERRORS.REMOVE_MEDIAS_STATE_ERROR.code,
              'Expected a message with error code ' + HTTP_ERRORS.REMOVE_MEDIAS_STATE_ERROR.code
            );
            assert.equal(error.httpCode, HTTP_ERRORS.REMOVE_MEDIAS_STATE_ERROR.httpCode, 'Wrong HTTP code');
          }, done);
        });
      });
    });

    it('should not be able to remove videos without permission on the end point', function(done) {
      var application = process.protractorConf.getWebServiceApplication(
        datas.applications.publishApplicationsNoPermission.name
      );
      var client = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Video title'
        }
      ];
      mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
        client.delete(
          '/publish/videos/' + linesToAdd[0].id
        ).then(function(data) {
          check(function() {
            assert.ok(false, 'Unexpected response');
          }, done);
        }).catch(function(error) {
          check(function() {
            assert.equal(error.httpCode, 403, 'Wrong HTTP code');
          }, done);
        });
      });
    });

  });

});
