"use strict"

window.assert = chai.assert;

// VideoController.js
describe("VideoController", function(){
  var $rootScope, $controller, $httpBackend, scope;

  // Load module publish and ngJSONPath
  beforeEach(function(){
    module("ov.publish");
    module("ngJSONPath");
  });

  // Dependencies injections
  beforeEach(inject(function(_$rootScope_, _$controller_, _$httpBackend_){
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
  }));

  // Initializes tests
  beforeEach(function(){
    scope = $rootScope.$new();
    $controller("VideoController", {
      $scope: scope,
      videos : {
        data : {
          entities : [
            { id : 1, status : 1, properties : [] },
            { id : 2, status : 1, properties : [] }
          ]
        }
      },
      categories : {
        data : {
          entities : []
        }
      }
    });
  });

  // Checks if no HTTP request stays without response
  afterEach(function(){
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  // toggleVideoDetails method
  describe("toggleVideoDetails", function(){

    it("Should be able to open the video details", function(){
      scope.toggleVideoDetails(scope.videos[0]);
      assert.ok(scope.videos[0].opened);
      assert.notOk(scope.videos[1].opened);
    });

    it("Should not open video details if video is not in success", function(){
      scope.videos[0].status = 0;
      scope.toggleVideoDetails(scope.videos[0]);
      assert.notOk(scope.videos[0].opened);
    });

    it("Should not open / close video details if video is saving", function(){
      scope.videos[0].saving = true;
      scope.toggleVideoDetails(scope.videos[0]);
      assert.notOk(scope.videos[0].opened);
    });

  });

  // publishVideo method
  describe("publishVideo", function(){

    it("Should be able to publish a video if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/publishVideo/1").respond(200, { state : 7 });
      $httpBackend.expectGET("/admin/publish/publishVideo/1");

      scope.videos[0].saving = true;
      scope.publishVideo(scope.videos[0]);

      scope.videos[0].saving = false;
      scope.publishVideo(scope.videos[0]);
      $httpBackend.flush();
      assert.equal(scope.videos[0].state, 7);
      assert.notOk(scope.videos[0].saving);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/publishVideo/1").respond(401);
      $httpBackend.expectGET("/admin/publish/publishVideo/1");

      $rootScope.logout = function(){
        done();
      };

      scope.publishVideo(scope.videos[0]);
      $httpBackend.flush();
    });

  });

  // unpublishVideo method
  describe("unpublishVideo", function(){

    it("Should be able to unpublish a video if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/unpublishVideo/1").respond(200, { state : 6 });
      $httpBackend.expectGET("/admin/publish/unpublishVideo/1");

      scope.videos[0].saving = true;
      scope.unpublishVideo(scope.videos[0]);

      scope.videos[0].saving = false;
      scope.unpublishVideo(scope.videos[0]);

      $httpBackend.flush();

      assert.equal(scope.videos[0].state, 6);
      assert.notOk(scope.videos[0].saving);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/unpublishVideo/1").respond(401);
      $httpBackend.expectGET("/admin/publish/unpublishVideo/1");

      $rootScope.logout = function(){
        done();
      };

      scope.unpublishVideo(scope.videos[0]);
      $httpBackend.flush();
    });

  });

  // removeVideo method
  describe("removeVideo", function(){

    it("Should be able to remove a video if not saving", function(){
      $httpBackend.when("DELETE", "/admin/crud/video/1").respond(200);
      $httpBackend.expectDELETE("/admin/crud/video/1");

      scope.videos[0].saving = true;
      scope.removeVideo(scope.videos[0]);

      scope.videos[0].saving = false;
      scope.removeVideo(scope.videos[0]);
      $httpBackend.flush();
      assert.equal(scope.videos.length, 1);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("DELETE", "/admin/crud/video/1").respond(401);
      $httpBackend.expectDELETE("/admin/crud/video/1");

      $rootScope.logout = function(){
        done();
      };

      scope.removeVideo(scope.videos[0]);
      $httpBackend.flush();
    });

  });

  // saveVideo method
  describe("saveVideo", function(){

    it("Should be able to save a video if not already saving", function(done){
      $httpBackend.when("POST", "/admin/crud/video/1").respond(200);
      $httpBackend.expectPOST("/admin/crud/video/1");

      var form = {
        edition : true,
        closeEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };

      scope.videos[0].saving = true;
      scope.saveVideo(form, scope.videos[0]);

      scope.videos[0].saving = false;
      scope.videos[0].title = "title";
      scope.saveVideo(form, scope.videos[0]);
      $httpBackend.flush();
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("POST", "/admin/crud/video/1").respond(401);
      $httpBackend.expectPOST("/admin/crud/video/1");

      $rootScope.logout = function(){
        done();
      };

      scope.saveVideo({}, scope.videos[0]);
      $httpBackend.flush();
    });

  });

  // toggleEdition method
  describe("toggleEdition", function(){

    it("Should be able to cancel properties edition", function(done){
      var form = {
        edition : true,
        cancelEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };

      scope.cancelEdition(form);
    });

    it("Should be able to open properties edition", function(done){
      var form = {
        edition : false,
        openEdition : function(){
          assert.ok(this.edition);
          done();
        }
      };

      scope.openEdition(form);
    });

  });

});