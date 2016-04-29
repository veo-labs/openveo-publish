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

  it('Should be able to ask server for watcher status', function() {
    $httpBackend.expectGET('/be/publish/watcherStatus');
    publishService.getWatcherStatus();
    $httpBackend.flush();
  });

  it('Should be able to ask server to start watcher', function() {
    $httpBackend.expectPOST('/be/publish/startWatcher');
    publishService.startWatcher();
    $httpBackend.flush();
  });

  it('Should be able to ask server to stop watcher', function() {
    $httpBackend.expectPOST('/be/publish/stopWatcher');
    publishService.stopWatcher();
    $httpBackend.flush();
  });

  it('Should be able to ask server to publish a media', function() {
    $httpBackend.expectPOST('/be/publish/publishVideo/5');
    publishService.publishMedia(5);
    $httpBackend.flush();
  });

  it('Should be able to ask server to unpublish a media', function() {
    $httpBackend.expectPOST('/be/publish/unpublishVideo/5');
    publishService.unpublishMedia(5);
    $httpBackend.flush();
  });

  it('Should be able to ask server for the list of properties', function() {
    $httpBackend.expectGET('/be/publish/properties');
    publishService.loadProperties();
    $httpBackend.flush();
  });

});
