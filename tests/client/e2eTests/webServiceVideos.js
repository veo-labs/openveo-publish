'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Web service /videos', function() {
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
      propertiesQuery += 'properties[' + encodeURIComponent(properties[i].name) + ']=' +
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
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    mediaHelper = new MediaHelper(new VideoModel());
    propertyHelper = new PropertyHelper(new PropertyModel());
    page = new WatcherPage();

    for (var i = 0; i < propertyNames.length; i++) {
      properties.push({
        name: propertyNames[i],
        description: propertyNames[i] + ' description',
        type: PropertyModel.TYPE_TEXT
      });
    }

    propertyHelper.addEntities(properties).then(function(addedLines) {
      addedProperties = addedLines;
    });

    page.logAsAdmin();
    page.load();
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

  it('should be able to get the list of videos', function() {
    var deferred = protractor.promise.defer();

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), addedVideos.length);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);
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

  it('should return an empty array if no videos found', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/videos').then(function(results) {
      var videos = results.videos;
      assert.eventually.equal(protractor.promise.fulfilled(videos.length), 0);
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should be able to filter videos by custom properties', function() {
    var deferred = protractor.promise.defer();

    var properties = {};
    var propertiesQuery = '';
    properties[addedProperties[0].id] = 'Property 1 value';
    properties[addedProperties[1].id] = 'Property 2 value';
    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        properties: properties
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      propertiesQuery = buildPropertiesQuery([
        {
          name: addedProperties[0].name,
          value: properties[addedProperties[0].id]
        },
        {
          name: addedProperties[1].name,
          value: properties[addedProperties[1].id]
        }
      ]);

      webServiceClient.get('publish/videos?' + propertiesQuery).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);

        propertiesQuery = buildPropertiesQuery([
          {
            name: addedProperties[0].name,
            value: 'unknown'
          }
        ]);
        return webServiceClient.get('publish/videos?' + propertiesQuery);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 0);
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

  it('should return an error if a specified property is unknown', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/videos?properties[unknown]=unknown').then(function(results) {
      assert.eventually.ok(protractor.promise.fulfilled(false), 'Unknown property should not return results');
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

  it('should not be able to search for videos without permissions', function() {
    var deferred = protractor.promise.defer();
    var unAuthorizedApplication = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsNoPermission.name
    );
    var client = new OpenVeoClient(
      process.protractorConf.webServiceUrl,
      unAuthorizedApplication.id,
      unAuthorizedApplication.secret
    );

    client.get('publish/videos').then(function(results) {
      assert.eventually.ok(protractor.promise.fulfilled(false), 'Application without permission should not get videos');
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

  it('should be able to search text into title and description', function() {
    var deferred = protractor.promise.defer();

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 1',
        description: 'Video description 1'
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 2',
        description: 'Video description 2'
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos?query=' + encodeURIComponent('video')).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
        return webServiceClient.get('publish/videos?query=' + encodeURIComponent('2'));
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?query=' + encodeURIComponent('"video description"'));
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
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

  it('should be able to filter by states', function() {
    var deferred = protractor.promise.defer();

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.READY_STATE,
        title: 'Video title 1'
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 2'
      },
      {
        id: '2',
        state: VideoModel.ERROR_STATE,
        title: 'Video title 3'
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos?states=' + VideoModel.READY_STATE).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?states[]=' + VideoModel.READY_STATE + '&states[]=' +
                                   VideoModel.PUBLISHED_STATE);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
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

  it('should be able to filter by date', function() {
    var deferred = protractor.promise.defer();
    var dateLiteral1 = '03/22/2016';
    var dateLiteral2 = '03/23/2016';
    var dateLiteral3 = '03/24/2016';
    var date1 = new Date(dateLiteral1);
    var date2 = new Date(dateLiteral2);
    var date3 = new Date(dateLiteral3);

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 1',
        date: date1.getTime()
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 2',
        date: date2.getTime()
      },
      {
        id: '2',
        state: VideoModel.ERROR_STATE,
        title: 'Video title 3',
        date: date3.getTime()
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos?dateStart=' + dateLiteral1).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 3, 'Wrong number of results');
        return webServiceClient.get('publish/videos?dateStart=' + dateLiteral2);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
        return webServiceClient.get('publish/videos?dateStart=' + dateLiteral3);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?dateEnd=' + dateLiteral3);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
        return webServiceClient.get('publish/videos?dateStart=' + dateLiteral2 + '&dateEnd=' + dateLiteral3);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?dateStart=03/25/2016');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 0, 'Wrong number of results');
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

  it('should be able to filter by categories', function() {
    var deferred = protractor.promise.defer();

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.READY_STATE,
        title: 'Video title 1',
        category: '1'
      },
      {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Video title 2',
        category: '2'
      },
      {
        id: '2',
        state: VideoModel.ERROR_STATE,
        title: 'Video title 3',
        category: '3'
      }
    ];

    mediaHelper.addEntities(linesToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos?categories=1').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?categories[]=2&categories[]=3');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
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

  it('should be able to filter by groups', function() {
    var deferred = protractor.promise.defer();
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
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1, 'Wrong number of results');
        return webServiceClient.get('publish/videos?groups[]=' + group1Id + '&groups[]=' + group2Id);
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2, 'Wrong number of results');
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
    var addedVideos;

    beforeEach(function() {
      var videosToAdd = [
        {
          id: '0',
          state: VideoModel.READY_STATE,
          title: 'First video',
          description: 'First video description',
          date: '03/22/2016'
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Second video',
          description: 'Second video description',
          date: '03/23/2016'
        }
      ];

      mediaHelper.addEntities(videosToAdd).then(function(addedLines) {
        addedVideos = addedLines;
      });
      page.refresh();
    });

    it('should be able to sort videos by title', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?sortBy=title').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), addedVideos.length);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[1].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[0].id);

        return webServiceClient.get('publish/videos?sortBy=title&sortOrder=asc');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), addedVideos.length);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[1].id);
        return deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should be able to sort videos by description', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?sortBy=description').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[1].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[0].id);

        return webServiceClient.get('publish/videos?sortBy=description&sortOrder=asc');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[1].id);
        return deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should be able to sort videos by date', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?sortBy=date').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[1].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[0].id);

        return webServiceClient.get('publish/videos?sortBy=date&sortOrder=asc');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[1].id);
        return deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should be able to sort videos by state', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?sortBy=state').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[1].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[0].id);

        return webServiceClient.get('publish/videos?sortBy=state&sortOrder=asc');
      }).then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.equal(protractor.promise.fulfilled(videos[0].id), addedVideos[0].id);
        assert.eventually.equal(protractor.promise.fulfilled(videos[1].id), addedVideos[1].id);
        return deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });
  });

  // Sort
  describe('Pagination', function() {

    beforeEach(function() {
      var videosToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'First video',
          description: 'First video description',
          date: '03/22/2016'
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Second video',
          description: 'Second video description',
          date: '03/23/2016'
        }
      ];

      mediaHelper.addEntities(videosToAdd);
      page.refresh();
    });

    it('should be able to paginate results', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?page=1&limit=1').then(function(results) {
        var videos = results.videos;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), 2);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), 2);
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

      webServiceClient.get('publish/videos?limit=1').then(function(results) {
        var videos = results.videos;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), 2);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), 2);
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

      webServiceClient.get('publish/videos?page=1').then(function(results) {
        var videos = results.videos;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 2);
        assert.eventually.isUndefined(protractor.promise.fulfilled(results.pagination));
        deferred.fulfill();
      }).catch(function(error) {
        assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
        deferred.fulfill();
      });

      return page.flow.execute(function() {
        return deferred.promise;
      });
    });

    it('should not return any videos if the specified page is outside the pagination', function() {
      var deferred = protractor.promise.defer();

      webServiceClient.get('publish/videos?limit=1&page=10').then(function(results) {
        var videos = results.videos;
        var pagination = results.pagination;
        assert.eventually.equal(protractor.promise.fulfilled(videos.length), 0);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.limit), 1);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.page), 10);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.pages), 2);
        assert.eventually.equal(protractor.promise.fulfilled(pagination.size), 2);
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
