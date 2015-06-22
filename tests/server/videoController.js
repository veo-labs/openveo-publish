"use strict"

// Module dependencies
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");
var ut = require("openveo-test").generator;
var applicationStorage = openVeoAPI.applicationStorage;

// videoController.js
describe("videoController", function(){
  var request, response, videoController, VideoModel, FakeSuccessDatabase;
  
  // Load depdendencies
  before(function(){
    VideoModel = process.requirePublish("app/server/models/VideoModel.js");
  });

  // Intializes tests
  beforeEach(function(){
    request = { params : {} };
    response = { locals : {} };
    ut.generateSuccessDatabase();
    videoController = process.requirePublish("app/server/controllers/videoController.js");
    applicationStorage.setPlugins([{name : "player"}]);
  });

  // displayVideoAction method
  describe("displayVideoAction", function(){

    it("Should display the video page", function(done){
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
    
  });
  
  // publishVideoAction method
  describe("publishVideoAction", function(){

    it("Should be able to publish a video (changing its state to published)", function(done){
      request.params.id = "1";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        assert.isDefined(data);
        assert.equal(data.state, VideoModel.PUBLISHED_STATE);
        done();
      };

      videoController.publishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("Should return a 400 bad request if video id is not provided", function(done){
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.publishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("Should return an error 500 if trying to publish a video which is not in state sent", function(done){
      request.params.id = "2";
      response.status = function(status){
        assert.equal(status, 500);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.publishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

  });

  // unpublishVideoAction method
  describe("unpublishVideoAction", function(){

    it("Should be able to unpublish a video (changing its state to sent)", function(done){
      request.params.id = "3";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        assert.isDefined(data);
        assert.equal(data.state, VideoModel.SENT_STATE);
        done();
      };

      videoController.unpublishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("Should return a 400 bad request if video id is not provided", function(done){
      request.params.id = null;
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.unpublishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("Should return an error 500 if trying to unpublish a video which is not in state published", function(done){
      request.params.id = "4";
      response.status = function(status){
        assert.equal(status, 500);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.unpublishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

  });

  // getVideoAction method
  describe("getVideoAction", function(){
    
    it("Should be able to retrieve a video", function(done){
      request.params.id = "1";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false);
      });

    });
    
    it("Should return an HTTP code 400 if id is not found in url parameters", function(done){
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };
      response.send = function(data){
        assert.ok(true);
        done();
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false);
      });
    });
    
    it("Should return an HTTP code 500 if something wen't wrong", function(done){
      request.params = { id: "1" };
      ut.generateFailDatabase();

      response.status = function(status){
        assert.equal(status, 500);
        return this;
      };
      
      response.send = function(data){
        assert.ok(true);
        done();
      };

      videoController.getVideoAction(request, response, function(){
        assert.ok(false);
      });
    });
    
  });

});