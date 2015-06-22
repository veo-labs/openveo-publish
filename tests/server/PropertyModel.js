"use strict"

// Module dependencies
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");
var ut = require("openveo-test").generator;
var applicationStorage = openVeoAPI.applicationStorage;

// PropertyModel.js
describe("PropertyModel", function(){
  var propertyModel, FakeSuccessDatabase;
  
  // Initializes tests
  before(function(){
    var PropertyModel = process.requirePublish("app/server/models/PropertyModel.js");
    ut.generateSuccessDatabase();
    propertyModel = new PropertyModel();
  });
  
  it("Should be an instance of EntityModel", function(){
    assert.ok(propertyModel instanceof openVeoAPI.EntityModel);
  });
  
  // add method
  describe("add", function(){

    it("Should be able to add a property", function(){
      propertyModel.add({
        "name" : "Name of the property",
        "description" : "Description of the property",
        "type" : "Type of the property"
      }, function(error, client){
        assert.isNull(error);
        assert.isDefined(client);
      });
      
    });
    
    it("Should return an error if name is missing", function(){
      propertyModel.add({
        "description" : "Description of the property",
        "type" : "Type of the property"
      }, function(error, client){
        assert.isDefined(error);
        assert.isUndefined(client);
      });
      
    });
    
    it("Should return an error if description is missing", function(){
      propertyModel.add({
        "name" : "Name of the property",
        "type" : "Type of the property"
      }, function(error, client){
        assert.isDefined(error);
        assert.isUndefined(client);
      });
      
    }); 
    
    it("Should return an error if type is missing", function(){
      propertyModel.add({
        "description" : "Description of the property",
        "name" : "Name of the property"
      }, function(error, client){
        assert.isDefined(error);
        assert.isUndefined(client);
      });
      
    });     

  });
  
  // update method
  describe("update", function(){
    
    it("Should be able to update a property", function(){
      propertyModel.update("1", {
        "name" : "Name of the property",
        "description" : "Description of the property",
        "type" : "Type of the property"
      }, function(error){
        assert.isNull(error);
      });
      
    });
    
  });
  
});