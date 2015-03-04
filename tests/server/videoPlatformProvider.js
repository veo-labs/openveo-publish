"use strict"

var path = require("path");
var assert = require("chai").assert;

// Set module root directory
process.rootPublish = path.join(__dirname, "../../");
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

var videoPlatformProvider = process.requirePublish("app/server/providers/videoPlatformProvider.js");
var VimeoProvider = process.requirePublish("app/server/providers/videoPlatforms/VimeoProvider.js");

describe("videoPlatformProvider", function(){
  
  describe("getProvider", function(){

    it("should be able to create a vimeo provider", function(){
      var videoProvider = videoPlatformProvider.getProvider("vimeo", {
        "clientId" : "clientId",
        "clientSecret" : "clientSecret",
        "accessToken" : "accessToken"
      });
      assert.instanceOf(videoProvider, VimeoProvider);
    });
    
  });
  
});