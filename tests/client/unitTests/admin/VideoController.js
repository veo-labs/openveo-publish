"use strict"

window.assert = chai.assert;

describe("VideoController", function(){

  beforeEach(module("ov.publish"));

  var $rootScope, $controller, $httpBackend, $scope;

  beforeEach(inject(function(_$rootScope_, _$controller_, _$httpBackend_){
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
    $scope = $rootScope.$new();
  }));

  afterEach(function(){
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe("toggleVideoDetails", function(){

    it("Should be able to open the video details", function(){
      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 },
              { id : 2, status : 1 }
            ]
          }
        }
      });

      $scope.toggleVideoDetails($scope.videos[0]);
      assert.ok($scope.videos[0].opened);
      assert.notOk($scope.videos[1].opened);
    });

    it("Should not open video details if video is not in success", function(){
      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 0 }
            ]
          }
        }
      });

      $scope.toggleVideoDetails($scope.videos[0]);
      assert.notOk($scope.videos[0].opened);
    });

    it("Should not open / close video details if video is saving", function(){
      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 0 }
            ]
          }
        }
      });

      $scope.videos[0].saving = true;
      $scope.toggleVideoDetails($scope.videos[0]);
      assert.notOk($scope.videos[0].opened);
    });

  });

  describe("publishVideo", function(){

    it("Should be able to publish a video if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/publishVideo/1").respond(200, { state : 7 });
      $httpBackend.expectGET("/admin/publish/publishVideo/1");

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.videos[0].saving = true;
      $scope.publishVideo($scope.videos[0]);

      $scope.videos[0].saving = false;
      $scope.publishVideo($scope.videos[0]);
      $httpBackend.flush();
      assert.equal($scope.videos[0].state, 7);
      assert.notOk($scope.videos[0].saving);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/publishVideo/1").respond(401);
      $httpBackend.expectGET("/admin/publish/publishVideo/1");

      $rootScope.logout = function(){
        done();
      };

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.publishVideo($scope.videos[0]);
      $httpBackend.flush();
    });

  });

  describe("unpublishVideo", function(){

    it("Should be able to unpublish a video if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/unpublishVideo/1").respond(200, { state : 6 });
      $httpBackend.expectGET("/admin/publish/unpublishVideo/1");

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.videos[0].saving = true;
      $scope.unpublishVideo($scope.videos[0]);

      $scope.videos[0].saving = false;
      $scope.unpublishVideo($scope.videos[0]);
      $httpBackend.flush();
      assert.equal($scope.videos[0].state, 6);
      assert.notOk($scope.videos[0].saving);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/unpublishVideo/1").respond(401);
      $httpBackend.expectGET("/admin/publish/unpublishVideo/1");

      $rootScope.logout = function(){
        done();
      };

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.unpublishVideo($scope.videos[0]);
      $httpBackend.flush();
    });

  });

  describe("removeVideo", function(){

    it("Should be able to remove a video if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/removeVideo/1").respond(200);
      $httpBackend.expectGET("/admin/publish/removeVideo/1");

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.videos[0].saving = true;
      $scope.removeVideo($scope.videos[0]);

      $scope.videos[0].saving = false;
      $scope.removeVideo($scope.videos[0]);
      $httpBackend.flush();
      assert.equal($scope.videos.length, 0);
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/removeVideo/1").respond(401);
      $httpBackend.expectGET("/admin/publish/removeVideo/1");

      $rootScope.logout = function(){
        done();
      };

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      $scope.removeVideo($scope.videos[0]);
      $httpBackend.flush();
    });

  });

  describe("saveVideo", function(){

    it("Should be able to save a video if not already saving", function(done){
      $httpBackend.when("POST", "/admin/publish/updateVideo/1").respond(200);
      $httpBackend.expectPOST("/admin/publish/updateVideo/1");

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1, properties : [] }
            ]
          }
        }
      });

      var form = {
        edition : true,
        closeEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };

      $scope.videos[0].saving = true;
      $scope.saveVideo(form, $scope.videos[0]);

      $scope.videos[0].saving = false;
      $scope.videos[0].title = "title";
      $scope.saveVideo(form, $scope.videos[0]);
      $httpBackend.flush();
    });

    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("POST", "/admin/publish/updateVideo/1").respond(401);
      $httpBackend.expectPOST("/admin/publish/updateVideo/1");

      $rootScope.logout = function(){
        done();
      };

      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1, properties : [] }
            ]
          }
        }
      });

      $scope.saveVideo({}, $scope.videos[0]);
      $httpBackend.flush();
    });

  });

  describe("toggleEdition", function(){

    it("Should be able to cancel properties edition", function(done){
      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      var form = {
        edition : true,
        cancelEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };

      $scope.cancelEdition(form);

    });

    it("Should be able to open properties edition", function(done){
      $controller("VideoController", {
        $scope: $scope,
        videos : {
          data : {
            videos : [
              { id : 1, status : 1 }
            ]
          }
        }
      });

      var form = {
        edition : false,
        openEdition : function(){
          assert.ok(this.edition);
          done();
        }
      };

      $scope.openEdition(form);

    });

  });

});