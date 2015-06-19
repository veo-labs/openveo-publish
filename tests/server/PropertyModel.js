"use strict"

var path = require("path");
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");

// Set module root directory
process.root = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.root + "/" + filePath));
};

var applicationStorage = openVeoAPI.applicationStorage;
var PropertyModel = process.requirePublish("app/server/models/PropertyModel.js");
var FakeSuccessDatabase = require("./database/FakeSuccessDatabase.js");

describe("PropertyModel", function(){
  var propertyModel;
  
  before(function(){
    var FakePropertyDatabase = require("./database/FakeSuccessDatabase.js");
    applicationStorage.setDatabase(new FakeSuccessDatabase());

    propertyModel = new PropertyModel();
  });
  
  it("Should be an instance of EntityModel", function(){
    assert.ok(propertyModel instanceof openVeoAPI.EntityModel);
  });
  
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