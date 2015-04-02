"use strict"

var path = require("path");
var fs = require("fs");
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");
var VideoProvider = openVeoAPI.VideoProvider;

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

var FakeVideoDatabase = require("./database/FakeVideoDatabase.js");
var applicationStorage = openVeoAPI.applicationStorage;
applicationStorage.setDatabase(new FakeVideoDatabase());
var videoController = process.requirePublish("app/server/controllers/videoController.js");

describe("videoController", function(){
  var request, response;
  
  before(function(){
    request = { params : {} };
    response = { locals : {} };
    applicationStorage.setPlugins([{name : "player"}]);
  });  
  
  after(function(){
    var videosDirectoryPath = path.normalize(__dirname + "/public/publish/videos/5");

    fs.exists(videosDirectoryPath, function(exists){
      if(!exists)
        fs.mkdir(videosDirectoryPath, function(error){});
    });
  });

  describe("getVideosAction", function(){

    it("should be able to send back a list of videos with properties as a JSON object", function(done){

      response.status = function(){};
      response.send = function(data){
        assert.isDefined(data.videos);
        assert.isDefined(data.videos[0].properties);
        assert.isDefined(data.videos[1].properties);
        assert.isArray(data.videos);
        assert.equal(data.videos[0].properties[0].id, 1);
        assert.equal(data.videos[0].properties[0].name, "Property 1");
        assert.equal(data.videos[0].properties[0].description, "Description of property 1");
        assert.equal(data.videos[0].properties[0].type, "text");
        assert.equal(data.videos[0].properties[1].id, 2);
        assert.equal(data.videos[0].properties[1].name, "Property 2");
        assert.equal(data.videos[0].properties[1].description, "Description of property 2");
        assert.equal(data.videos[1].properties[0].id, 2);
        assert.equal(data.videos[1].properties[0].name, "Property 2");
        assert.equal(data.videos[1].properties[0].description, "Description of property 2");
        assert.equal(data.videos[1].properties[0].type, "text");
        assert.equal(data.videos[1].properties[0].value, "Value 2");
        assert.equal(data.videos[1].properties[1].id, 1);
        assert.equal(data.videos[1].properties[1].name, "Property 1");
        assert.equal(data.videos[1].properties[1].description, "Description of property 1");
        assert.equal(data.videos[1].properties[1].type, "text");
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
  
  describe("publishVideoAction", function(){

    it("should be able to publish a video (changing its state to published)", function(done){
      request.params.id = "1";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        assert.isDefined(data);
        assert.equal(data.state, VideoProvider.PUBLISHED_STATE);
        done();
      };

      videoController.publishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should return a 400 bad request if video id is not provided", function(done){
      request.params.id = null;
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

    it("should return an error 500 if trying to publish a video which is not in state sent", function(done){
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

  describe("unpublishVideoAction", function(){

    it("should be able to unpublish a video (changing its state to sent)", function(done){
      request.params.id = "3";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        assert.isDefined(data);
        assert.equal(data.state, VideoProvider.SENT_STATE);
        done();
      };

      videoController.unpublishVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should return a 400 bad request if video id is not provided", function(done){
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

    it("should return an error 500 if trying to unpublish a video which is not in state published", function(done){
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

  describe("removeVideoAction", function(){

    before(function(){
      process.rootPublish = path.join(__dirname);
    });

    after(function(){
      process.rootPublish = path.join(__dirname, "../../");
    });

    it("should be able to remove a video from database and public directory", function(done){
      request.params.id = "5";
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        var videosDirectoryPath = path.normalize(process.rootPublish + "/public/publish/videos/5");

        fs.exists(videosDirectoryPath, function(exists){
          assert.notOk(exists);
          done();
        });

      };

      videoController.removeVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should return a 400 bad request if video id is not provided", function(done){
      request.params.id = null;
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.removeVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

  });

  describe("updateVideoAction", function(){

    it("should be able to update video title, description and properties", function(done){
      request.params.id = "6";
      request.body = {
        title : "title",
        description : "description",
        properties : [
          {
            id : 1,
            value : "Value 1"
          }
        ]
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      videoController.updateVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should be able to update only the video title", function(done){
      request.params.id = "7";
      request.body = {
        title : "title"
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      videoController.updateVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should be able to update only the video description", function(done){
      request.params.id = "8";
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

      videoController.updateVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should be able to update only the video properties", function(done){
      request.params.id = "9";
      request.body = {
        properties : [
          {
            id : 1,
            value : "Value 1"
          }
        ]
      };
      response.status = function(status){
        assert.ok(false);
        return this;
      };
      response.send = function(data){
        done();
      };

      videoController.updateVideoAction(request, response, function(){
        assert.ok(false);
      });

    });

    it("should return a 400 bad request if video id or body is not provided", function(done){
      request.params.id = null;
      request.body = null;
      response.status = function(status){
        assert.equal(status, 400);
        return this;
      };

      response.send = function(data){
        done();
      };

      videoController.updateVideoAction(request, response, function(){
        assert.ok(false);
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
          assert.equal(data.video.state, VideoProvider.PUBLISHED_STATE);
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