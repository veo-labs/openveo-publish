"use strict"

window.assert = chai.assert;

describe("PublishService", function(){
  
  beforeEach(module("ov.publish"));
    
  var $httpBackend, publishService;

  beforeEach(inject(function(_$httpBackend_, _publishService_){
    $httpBackend = _$httpBackend_;
    publishService = _publishService_;

    $httpBackend.when("GET", /.*/).respond(200, "");
  }));
  
  it("Should be able to ask server for the list of videos", function(){
    $httpBackend.expectGET("/admin/publish/videos");
    publishService.getVideos();
    $httpBackend.flush();
  });
  
  it("Should be able to ask server for watcher status", function(){
    $httpBackend.expectGET("/admin/publish/watcherStatus");
    publishService.getWatcherStatus();
    $httpBackend.flush();
  });  
  
  it("Should be able to ask server to start watcher", function(){
    $httpBackend.expectGET("/admin/publish/startWatcher");
    publishService.startWatcher();
    $httpBackend.flush();
  }); 
  
  it("Should be able to ask server to stop watcher", function(){
    $httpBackend.expectGET("/admin/publish/stopWatcher");
    publishService.stopWatcher();
    $httpBackend.flush();
  });   
  
});