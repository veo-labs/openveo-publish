"use strict"

// Module dependencies
var assert = require("chai").assert;

// videoPlatformProvider.js
describe("videoPlatformProvider", function(){
  var videoPlatformProvider, VimeoProvider;

  // Initializes tests
  before(function(){
    videoPlatformProvider = process.requirePublish("app/server/providers/videoPlatformProvider.js");
    VimeoProvider = process.requirePublish("app/server/providers/videoPlatforms/VimeoProvider.js");
  });
  
  // getProvider method
  describe("getProvider", function(){

    it("Should be able to create a vimeo provider", function(){
      var videoProvider = videoPlatformProvider.getProvider("vimeo", {
        "clientId" : "clientId",
        "clientSecret" : "clientSecret",
        "accessToken" : "accessToken"
      });
      assert.instanceOf(videoProvider, VimeoProvider);
    });
    
  });
  
});