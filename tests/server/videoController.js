"use strict"

var path = require("path");
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

var FakeVideoDatabase = require("./database/FakeVideoDatabase.js");
var applicationStorage = openVeoAPI.applicationStorage;
applicationStorage.setDatabase(new FakeVideoDatabase());
var videoController = process.requirePublish("app/server/controllers/videoController.js");

// Set fake plugins
describe("videoController", function(){
  var request, response;
  
  before(function(){
    request = { params : {} };
    response = { locals : {} };
    applicationStorage.setPlugins([{name : "player"}]);
  });  
  
  describe("getVideosAction", function(){

    it("should be able to send back a list of videos as a JSON object", function(done){

      response.status = function(){};
      response.send = function(data){
        assert.isDefined(data);
        assert.isDefined(data.videos);
        assert.isArray(data.videos);
        assert.equal(data.videos.length, 2);
        done();
      };

      videoController.getVideosAction(request, response, function(){
        assert.ok(false);
      });
    });
    
  });
  
  describe("displayVideoAction", function(){

    it("should display the video page", function(done){
      request.params.id = "1";
      response.render = function(templateName, variables){
        assert.equal(templateName, "player");
        assert.isDefined(variables.scripts);
        assert.isDefined(variables.css);
        done();
      };

      videoController.displayVideoAction(request, response, function(){
        assert.ok(false);
      });

    }); 
    
    it("should not display the video page while video is unknown", function(done){
      request.params.id = "0";
      response.render = function(templateName, variables){
        assert.ok(false);  
      };

      videoController.displayVideoAction(request, response, function(){
        done();
      });

    });
    
  });
  
  describe("getVideoAction", function(){
    
    before(function(){
      process.rootPublish = path.join(__dirname);
    });
    
    after(function(){
      process.rootPublish = path.join(__dirname, "../../");
    });
    
    it("should be able to send back a video (by its id) as a JSON object", function(done){
      request.params.id = "1";
      response = {
        status : function(status){
          assert.ok(false);
          return this;
        },
        send: function(data){
          assert.isDefined(data);
          assert.isDefined(data.video.timecodes);
          assert.equal(Object.keys(data.video.timecodes).length, 14);
          assert.equal(data.video.status, "success");
          assert.equal(data.video.id, "1");
          done();
        }
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false); 
      });
    });
    
    it("should send a 404 Not Found if video id doesn't exist in database", function(done){
      request.params.id = "2";
      response = {
        status : function(status){
          assert.equal(status, 404);
          return this;
        },
        send: function(data){
          assert.isUndefined(data);
          done();
        }
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false); 
      });
    });    
    
    it("should send an error 500 if an error occurred", function(done){
      request.params.id = "0";
      response = {
        status : function(status){
          assert.equal(status, 500);
          return this;
        },
        send: function(data){
          assert.isUndefined(data);
          done();
        }
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false); 
      });
    });    
    
  });

});