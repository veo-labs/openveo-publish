"use strict"

var path = require("path");
var fs = require("fs");
var assert = require("chai").assert;
var openVeoAPI = require("openveo-api");

// Set module root directory
process.root = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.root + "/" + filePath));
};

var applicationStorage = openVeoAPI.applicationStorage;
var VideoModel = process.requirePublish("app/server/models/VideoModel.js");
var FakeSuccessDatabase = require("./database/FakeVideoDatabase.js");

describe("VideoModel", function(){
  var videoModel;
  
  before(function(){
    var FakeVideoDatabase = require("./database/FakeVideoDatabase.js");
    applicationStorage.setDatabase(new FakeVideoDatabase());

    videoModel = new VideoModel();
  });
  
  after(function(){
    var videosDirectoryPath = path.normalize(__dirname + "/public/publish/videos/5");

    fs.exists(videosDirectoryPath, function(exists){
      if(!exists)
        fs.mkdir(videosDirectoryPath, function(error){});
    });
  });  
  
  it("Should be an instance of EntityModel", function(){
    assert.ok(videoModel instanceof openVeoAPI.EntityModel);
  });
  
  describe("add", function(){

    it("Should be able to add a video", function(){
      
      videoModel.add({
        id : "1", 
        status : 1,
        metadata : {},
        url : "",
        type : "type",
        errorCode : 1,
        published : 1,
        properties : {}
      }, function(error, client){
        assert.isUndefined(error);
        assert.isDefined(client);
      });
      
    });   

  });
  
  describe("get", function(){
    
    it("Should be able to get a videos and their associated custom properties", function(){
      
      videoModel.get(function(error, videos){
        assert.isNull(error);
        assert.isDefined(videos);
        assert.isArray(videos);
        assert.isArray(videos[0].properties);
      });
      
    });
    
  });
  
  describe("getOne", function(){
    
    before(function(){
      process.rootPublish = path.join(__dirname);
    });
    
    after(function(){
      process.rootPublish = path.join(__dirname, "../../");
    });    
    
    it("Should be able to get a video and the list of timecodes", function(){
      
      videoModel.getOne("1", function(error, video){
        assert.isNull(error);
        assert.isDefined(video);
        assert.isDefined(video.timecodes);
        assert.equal(Object.keys(video.timecodes).length, 14);
        assert.equal(video.state, VideoModel.PUBLISHED_STATE);
        assert.equal(video.id, "1");
        done();
      });
      
    });
    
  });  
  
  describe("remove", function(){

    before(function(){
      process.rootPublish = path.join(__dirname);
    });

    after(function(){
      process.rootPublish = path.join(__dirname, "../../");
    });

    it("Should be able to remove a video from database and its public directory", function(done){
      
      videoModel.remove("5", function(error){
        assert.isUndefined(error);
        var videosDirectoryPath = path.normalize(process.rootPublish + "/public/publish/videos/5");

        fs.exists(videosDirectoryPath, function(exists){
          assert.notOk(exists);
          done();
        });
      });

    });

  });  
  
  describe("update", function(){
    
    it("Should be able to update a video", function(){
      
      videoModel.update("6", {
        title : "title",
        description : "description",
        properties : [
          {
            id : 1,
            value : "Value 1"
          }
        ]
      }, function(error){
        assert.isUndefined(error);
      });
      
    });  
    
  }); 
  
});