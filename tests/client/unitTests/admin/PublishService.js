'use strict';

window.assert = chai.assert;

// PublishService.js
describe('PublishService', function() {
  var $httpBackend,
    publishService;

  // Load module publish
  beforeEach(function() {
    module('ngJSONPath');
    module('ov.publish');
  });

  // Dependencies injections
  beforeEach(inject(function(_$httpBackend_, _publishService_) {
    $httpBackend = _$httpBackend_;
    publishService = _publishService_;
  }));

  // Initializes tests
  beforeEach(function() {
    $httpBackend.when('GET', /.*/).respond(200, '');
    $httpBackend.when('POST', /.*/).respond(200, '');
    $httpBackend.when('DELETE', /.*/).respond(200, '');
    $httpBackend.when('PUT', /.*/).respond(200, '');
  });

  it('Should be able to ask server for the list of videos', function() {
    $httpBackend.expectGET('/admin/crud/video');
    publishService.loadVideos();
    $httpBackend.flush();
  });

  it('Should be able to ask server for watcher status', function() {
    $httpBackend.expectGET('/admin/publish/watcherStatus');
    publishService.getWatcherStatus();
    $httpBackend.flush();
  });

  it('Should be able to ask server to start watcher', function() {
    $httpBackend.expectGET('/admin/publish/startWatcher');
    publishService.startWatcher();
    $httpBackend.flush();
  });

  it('Should be able to ask server to stop watcher', function() {
    $httpBackend.expectGET('/admin/publish/stopWatcher');
    publishService.stopWatcher();
    $httpBackend.flush();
  });

  it('Should be able to ask server to publish a video', function() {
    $httpBackend.expectGET('/admin/publish/publishVideo/5');
    publishService.publishVideo(5);
    $httpBackend.flush();
  });

  it('Should be able to ask server to unpublish a video', function() {
    $httpBackend.expectGET('/admin/publish/unpublishVideo/5');
    publishService.unpublishVideo(5);
    $httpBackend.flush();
  });

  it('Should be able to ask server for the list of properties', function() {
    $httpBackend.expectGET('/admin/crud/property');
    publishService.loadProperties();
    $httpBackend.flush();
  });

});
