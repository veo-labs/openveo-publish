'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var OpenVeoClient = require('@openveo/rest-nodejs-client').OpenVeoClient;
var WatcherPage = process.requirePublish('tests/client/e2eTests/pages/WatcherPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Web service /video', function() {
  var page;
  var webServiceClient;
  var videoHelper;

  before(function() {
    var application = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsVideos.name
    );
    webServiceClient = new OpenVeoClient(process.protractorConf.webServiceUrl, application.id, application.secret);
    videoHelper = new MediaHelper(new VideoModel());
    page = new WatcherPage();

    page.logAsAdmin();
    page.load();
  });

  // Logout when its done
  after(function() {
    page.logout();
  });

  // Remove all videos after each test
  afterEach(function() {
    videoHelper.removeAllEntities();
  });

  it('should be able to get a video by its id', function() {
    var deferred = protractor.promise.defer();

    var videosToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE
      }
    ];

    videoHelper.addEntities(videosToAdd).then(function(addedVideos) {
      page.refresh();

      webServiceClient.get('publish/videos/' + addedVideos[0].id).then(function(results) {
        var video = results.video;
        assert.eventually.isDefined(protractor.promise.fulfilled(video));
        assert.eventually.equal(protractor.promise.fulfilled(video.id), addedVideos[0].id);
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

  it('should not return any video if it does not exist', function() {
    var deferred = protractor.promise.defer();

    webServiceClient.get('publish/videos/unkown').then(function(results) {
      assert.eventually.isUndefined(protractor.promise.fulfilled(results.video));
      deferred.fulfill();
    }).catch(function(error) {
      assert.eventually.ok(protractor.promise.fulfilled(false), error.message);
      deferred.fulfill();
    });

    return page.flow.execute(function() {
      return deferred.promise;
    });
  });

  it('should not be able to get a video without permission', function() {
    var deferred = protractor.promise.defer();
    var unAuthorizedApplication = process.protractorConf.getWebServiceApplication(
      datas.applications.publishApplicationsNoPermission.name
    );
    var client = new OpenVeoClient(
      process.protractorConf.webServiceUrl,
      unAuthorizedApplication.id,
      unAuthorizedApplication.secret
    );

    var videosToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE
      }
    ];

    videoHelper.addEntities(videosToAdd).then(function(addedVideos) {
      page.refresh();

      client.get('publish/videos/' + addedVideos[0].id).then(function(results) {
        assert.eventually.ok(protractor.promise.fulfilled(false),
                             'Application without permission should not be able to get videos');
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
