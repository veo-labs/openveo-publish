"use strict"

// Module dependencies
var path = require("path");
var assert = require("chai").assert;

describe("WatcherManager", function(){
  var watcherManager;

  // Initializes tests
  before(function(){
   watcherManager = process.requirePublish("app/server/watcher/watcherManager.js");
  });
  
  // start method
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