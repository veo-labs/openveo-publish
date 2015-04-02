"use strict"

var path = require("path");
var fs = require("fs");
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");
var PropertyProvider = openVeoAPI.PropertyProvider;

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

var FakePropertyDatabase = require("./database/FakePropertyDatabase.js");
var applicationStorage = openVeoAPI.applicationStorage;
applicationStorage.setDatabase(new FakePropertyDatabase());
var propertyController = process.requirePublish("app/server/controllers/propertyController.js");

describe("propertyController", function(){
  var request, response;
  
  before(function(){
    request = { params : {} };
    response = { locals : {} };
  });
  
  describe("getPropertiesAction", function(){

    it("should be able to send back a list of properties as a JSON object", function(done){

      response.status = function(){};
      response.send = function(data){
        assert.isDefined(data);
        assert.isArray(data.properties);
        assert.equal(data.properties.length, 2);
        done();
      };

      propertyController.getPropertiesAction(request, response, function(){
        assert.ok(false);
      });
    });

  });  
  
  describe("addPropertyAction", function(){

    it("should be able to add a new property", function(done){
      request.params.id = null;
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      
      request.body = {
        name : "name", 
        description : "description", 
        type : "type"
      };

      response.send = function(data){
        done();
      };

      propertyController.addPropertyAction(request, response, function(){
        assert.ok(false);
      });
    });

  });
  
  describe("updatePropertyAction", function(){

    it("should be able to update property name, description and type", function(done){
      request.params.id = "1";
      request.body = {
        name : "name", 
        description : "description", 
        type : "type"
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      propertyController.updatePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });
    
    it("should be able to update only the property name", function(done){
      request.params.id = "2";
      request.body = {
        name : "name"
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      propertyController.updatePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });
    
    it("should be able to update only the property description", function(done){
      request.params.id = "3";
      request.body = {
        description : "description"
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      propertyController.updatePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });
    
    it("should be able to update only the property type", function(done){
      request.params.id = "4";
      request.body = {
        type : "type"
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      propertyController.updatePropertyAction(request, response, function(){
        assert.ok(false);
      });

    }); 
    
    it("should return a 400 bad request if property id or body is not provided", function(done){
      request.params.id = null;
      request.body = null;
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };
      
      response.send = function(data){
        done();
      };

      propertyController.updatePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });    
    
  }); 
  
  describe("removePropertyAction", function(){

    it("should be able to remove a property from database", function(done){
      request.params.id = "1";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      propertyController.removePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });
    
    it("should return a 400 bad request if property id is not provided", function(done){
      request.params.id = null;
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };
      
      response.send = function(data){
        done();
      };

      propertyController.removePropertyAction(request, response, function(){
        assert.ok(false);
      });

    });
    
  });  
  
});