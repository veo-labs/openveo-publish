"use strict"

var path = require("path");
var assert = require("chai").assert;

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

describe("watcherController", function(){
  
  var watcherController, request, response;
  
  before(function(){
    request = { params : {} };
    response = { locals : {} };
    process.rootPublish = path.join(__dirname);
    watcherController =  process.requirePublish("../../app/server/controllers/watcherController.js");
  });   
    
  after(function(){
    process.rootPublish = path.join(__dirname, "../../");
  });
  
  describe("getStatusAction", function(){

    it("should be able to send back the status of the watcher as a JSON object", function(done){

      var response = {
        send: function(data){
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.getStatusAction(request, response);
    });
    
  });
  
  describe("stopAction", function(){
  
    it("should be able to stop the watcher and send back its status as a JSON object", function(done){

      var response = {
        send: function(data){
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.stopAction(request, response);
    });    
    
  });
  
  describe("startAction", function(){
  
    it("should be able to start the watcher and send back its status as a JSON object", function(done){

      var response = {
        send: function(data){
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.startAction(request, response);
    });    
    
  });  
  
});