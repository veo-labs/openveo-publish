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
  
  it("Should register /publish route", function(){
    assert.isDefined($route.routes["/publish"]);
  });
  
  it("Should be able to route to /publish after retrieving the watcher status and the list of videos", function(){
    $httpBackend.expectGET("/admin/publish/watcherStatus");
    $httpBackend.expectGET("/admin/publish/videos");
    $httpBackend.expectGET("publish/admin/views/publish.html");
    
    $location.path("/publish");
    $httpBackend.flush();
    assert.equal($location.path(), "/publish");
  });
  
});