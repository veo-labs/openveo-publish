"use strict"

window.assert = chai.assert;

describe("PropertiesController", function(){

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
  
  describe("togglePropertyDetails", function(){
    
    it("Should be able to open the property details", function(){
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" },
              { id : 2, name : "name", description : "description", type : "type" }
            ]
          }
        }
      });
      
      $scope.togglePropertyDetails($scope.properties[0]);
      assert.ok($scope.properties[0].opened);
      assert.notOk($scope.properties[1].opened);
    });
    
    it("Should not open / close property details if property is saving", function(){
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
            ]
          }
        }
      });
      
      $scope.properties[0].saving = true;
      $scope.togglePropertyDetails($scope.properties[0]);
      assert.notOk($scope.properties[0].opened);
    });    

  });   
  
  describe("removeProperty", function(){
    
    it("Should be able to remove a property if not saving", function(){
      $httpBackend.when("GET", "/admin/publish/removeProperty/1").respond(200);
      $httpBackend.expectGET("/admin/publish/removeProperty/1");
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
            ]
          }
        }
      });
      
      $scope.properties[0].saving = true;
      $scope.removeProperty($scope.properties[0]);
      
      $scope.properties[0].saving = false;
      $scope.removeProperty($scope.properties[0]);
      $httpBackend.flush();
      assert.equal($scope.properties.length, 0);
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("GET", "/admin/publish/removeProperty/1").respond(401);
      $httpBackend.expectGET("/admin/publish/removeProperty/1");
      
      $rootScope.logout = function(){
        done();
      };
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
            ]
          }
        }
      });
      
      $scope.removeProperty($scope.properties[0]);
      $httpBackend.flush();
    });    

  });   
  
  describe("saveProperty", function(){
    
    it("Should be able to save a property if not already saving", function(done){
      $httpBackend.when("POST", "/admin/publish/updateProperty/1").respond(200);
      $httpBackend.expectPOST("/admin/publish/updateProperty/1");
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
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
      
      $scope.properties[0].saving = true;
      $scope.saveProperty(form, $scope.properties[0]);
      
      $scope.properties[0].saving = false;
      $scope.properties[0].title = "title";
      $scope.saveProperty(form, $scope.properties[0]);
      $httpBackend.flush();
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("POST", "/admin/publish/updateProperty/1").respond(401);
      $httpBackend.expectPOST("/admin/publish/updateProperty/1");
      
      $rootScope.logout = function(){
        done();
      };
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
            ]
          }
        }
      });
      
      $scope.saveProperty({}, $scope.properties[0]);
      $httpBackend.flush();
    });    

  });    
  
  describe("toggleEdition", function(){
    
    it("Should be able to cancel property edition", function(done){
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
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
    
    it("Should be able to open property edition", function(done){
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : [
              { id : 1, name : "name", description : "description", type : "type" }
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
  
  describe("addProperty", function(){
    
    it("Should be able to add a new property", function(){
      $httpBackend.when("POST", "/admin/publish/addProperty").respond(200, { property : {}});
      $httpBackend.expectPOST("/admin/publish/addProperty");
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : []
          }
        }
      });
      
      $scope.propertyName = "name";
      $scope.propertyDescription = "description";
      $scope.propertyType = "type";
      
      $scope.addProperty({});
      $httpBackend.flush();
      assert.equal($scope.properties.length, 1);
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("POST", "/admin/publish/addProperty").respond(401);
      $httpBackend.expectPOST("/admin/publish/addProperty");
      
      $rootScope.logout = function(){
        done();
      };
      
      $controller("PropertiesController", {
        $scope: $scope,
        properties : {
          data : {
            properties : []
          }
        }
      });
      
      $scope.propertyName = "name";
      $scope.propertyDescription = "description";
      $scope.propertyType = "type";      
      
      $scope.addProperty({});
      $httpBackend.flush();
    });    

  });    
  
});