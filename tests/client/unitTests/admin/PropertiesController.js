"use strict"

window.assert = chai.assert;

// PropertiesController.js
describe("PropertiesController", function(){
  var $rootScope, $controller, $httpBackend, scope;

  // Load module publish
  beforeEach(module("ov.publish"));

  // Dependencies injections
  beforeEach(inject(function(_$rootScope_, _$controller_, _$httpBackend_){
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
  }));

  // Initializes tests
  beforeEach(function(){
    scope = $rootScope.$new();
    $controller("PropertiesController", {
      $scope: scope,
      properties : {
        data : {
          entities : [
            { id : 1, name : "name", description : "description", type : "type" },
            { id : 2, name : "name", description : "description", type : "type" }
          ]
        }
      }
    });
  });

  // Checks if no HTTP request stays without response
  afterEach(function(){
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });
  
  // togglePropertyDetails method
  describe("togglePropertyDetails", function(){
    
    it("Should be able to open the property details", function(){
      scope.togglePropertyDetails(scope.properties[0]);
      assert.ok(scope.properties[0].opened);
      assert.notOk(scope.properties[1].opened);
    });
    
    it("Should not open / close property details if property is saving", function(){
      scope.properties[0].saving = true;
      scope.togglePropertyDetails(scope.properties[0]);
      assert.notOk(scope.properties[0].opened);
    });    

  });   
  
  // removeProperty method
  describe("removeProperty", function(){
    
    it("Should be able to remove a property if not saving", function(){
      $httpBackend.when("DELETE", "/admin/crud/property/1").respond(200);
      $httpBackend.expectDELETE("/admin/crud/property/1");
      
      scope.properties[0].saving = true;
      scope.removeProperty(scope.properties[0]);
      
      scope.properties[0].saving = false;
      scope.removeProperty(scope.properties[0]);
      
      $httpBackend.flush();
      assert.equal(scope.properties.length, 1);
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("DELETE", "/admin/crud/property/1").respond(401);
      $httpBackend.expectDELETE("/admin/crud/property/1");
      
      $rootScope.logout = function(){
        done();
      };
      
      scope.removeProperty(scope.properties[0]);
      $httpBackend.flush();
    });    

  });   
  
  // saveProperty method
  describe("saveProperty", function(){
    
    it("Should be able to save a property if not already saving", function(done){
      $httpBackend.when("POST", "/admin/crud/property/1").respond(200);
      $httpBackend.expectPOST("/admin/crud/property/1");
      
      var form = {
        edition : true,
        closeEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };
      
      scope.properties[0].saving = true;
      scope.saveProperty(form, scope.properties[0]);

      scope.properties[0].saving = false;
      scope.properties[0].title = "title";
      scope.saveProperty(form, scope.properties[0]);
      
      $httpBackend.flush();
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("POST", "/admin/crud/property/1").respond(401);
      $httpBackend.expectPOST("/admin/crud/property/1");
      
      $rootScope.logout = function(){
        done();
      };
      
      scope.saveProperty({}, scope.properties[0]);
      $httpBackend.flush();
    });    

  });    
  
  // toogleEdition method
  describe("toggleEdition", function(){
    
    it("Should be able to cancel property edition", function(done){
      var form = {
        edition : true,
        cancelEdition : function(){
          assert.notOk(this.edition);
          done();
        }
      };

      scope.cancelEdition(form);
    }); 
    
    it("Should be able to open property edition", function(done){
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
  
  // addProperty method
  describe("addProperty", function(){
    
    it("Should be able to add a new property", function(){
      $httpBackend.when("PUT", "/admin/crud/property").respond(200, { entity : {}});
      $httpBackend.expectPUT("/admin/crud/property");
      
      scope.propertyName = "name";
      scope.propertyDescription = "description";
      scope.propertyType = "type";
      
      scope.addProperty({});
      $httpBackend.flush();
      assert.equal(scope.properties.length, 3);
    });
    
    it("Should logout user if a 401 is returned by the server", function(done){
      $httpBackend.when("PUT", "/admin/crud/property").respond(401);
      $httpBackend.expectPUT("/admin/crud/property");
      
      $rootScope.logout = function(){
        done();
      };
      
      scope.propertyName = "name";
      scope.propertyDescription = "description";
      scope.propertyType = "type";
      
      scope.addProperty({});
      $httpBackend.flush();
    });    

  });
  
});