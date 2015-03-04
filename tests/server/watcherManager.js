"use strict"

var path = require("path");
var assert = require("chai").assert;

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

var watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");

describe("WatcherManager", function(){
  
  describe("start", function(){
    
    before(function(){
      process.rootPublish = path.join(__dirname);
    });
    
    after(function(){
      process.rootPublish = path.join(__dirname, "../../");
      watcherManager.stop();
    });

    it("should be able to start the watcher", function(done){
      watcherManager.start();
      
      var interval = setInterval(function(){
        if(watcherManager.getStatus() === watcherManager.STARTED_STATUS){
          clearInterval(interval);
          done();
        }
      }, 5);
      
    });
    
    it("should be able to stop the watcher", function(done){
      watcherManager.stop();
      
      var interval = setInterval(function(){
        if(watcherManager.getStatus() === watcherManager.STOPPED_STATUS){
          clearInterval(interval);
          done();
        }
      }, 5);
      
    });    
    
  });
  
});