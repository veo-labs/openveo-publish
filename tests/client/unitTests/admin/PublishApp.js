"use strict"

window.assert = chai.assert;

describe("PublishApp", function(){
  
  beforeEach(module("ov.publish"));
    
  var $httpBackend, $route, $location;

  beforeEach(inject(function(_$httpBackend_, _$route_, _$location_){
    $httpBackend = _$httpBackend_;
    $route = _$route_;
    $location = _$location_;

    $httpBackend.when("GET", /.*/).respond(200, "");
  }));
  
  it("Should register routes to pages videos and watcher", function(){
    assert.isDefined($route.routes["/publish/be/videos"]);
    assert.isDefined($route.routes["/publish/be/watcher"]);
  });
  
  it("Should be able to route to videos page after retrieving the list of videos", function(){
    $httpBackend.expectGET("/admin/crud/video");
    $httpBackend.expectGET("publish/admin/views/videos.html");

    $location.path("/publish/be/videos");
    $httpBackend.flush();
    assert.equal($location.path(), "/publish/be/videos");
  });

  it("Should be able to route to watcher page after retrieving the watcher status", function(){
    $httpBackend.expectGET("/admin/publish/watcherStatus");
    $httpBackend.expectGET("publish/admin/views/watcher.html");

    $location.path("/publish/be/watcher");
    $httpBackend.flush();
    assert.equal($location.path(), "/publish/be/watcher");
  });

  it("Should be able to route to properties page after retrieving the list of properties", function(){
    $httpBackend.expectGET("/admin/crud/property");
    $httpBackend.expectGET("publish/admin/views/properties.html");

    $location.path("/publish/be/properties");
    $httpBackend.flush();
    assert.equal($location.path(), "/publish/be/properties");
  });
  
});