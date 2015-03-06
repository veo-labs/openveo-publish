"use strict"

// Module dependencies
var path = require("path");
var async = require("async");
var fs = require("fs");
var winston = require("winston");
var openVeoAPI = require("openveo-api");
var VideoProvider = openVeoAPI.VideoProvider;
var applicationStorage = openVeoAPI.applicationStorage;

// Retrieve logger
var logger = winston.loggers.get("openveo");

var videoProvider = new VideoProvider(applicationStorage.getDatabase());

/**
 * Gets the list of videos.
 * Return the list of videos as a JSON object.
 */
module.exports.getVideosAction = function(request, response, next){
  videoProvider.getVideos(function(error, videos){
    if(error)
      response.status(500).send();
    else
      response.send({ videos : videos });
  });
};

/**
 * Displays video player template.
 * Checks first if the video id is valid before returning the template.
 */
module.exports.displayVideoAction = function(request, response, next){
  response.locals.scripts = [];
  response.locals.css = [];

  // Retrieve openveo sub plugins
  var plugins = applicationStorage.getPlugins();

  // Got sub plugins
  if(plugins){
    var player = false;
    plugins.forEach(function(subPlugin){
      if(subPlugin.name === "publish"){
        if(subPlugin.custom){
          response.locals.scripts = response.locals.scripts.concat(subPlugin.custom.scriptFiles || []);
          response.locals.css = response.locals.css.concat(subPlugin.custom.cssFiles || []);
        }
      }
    });

    response.render("player", response.locals);
  }
  
  // No sub plugins
  else
    next();
};

/**
 * Gets information about a video and return it as JSON.
 */
module.exports.getVideoAction = function(request, response, next){
  var videoInfo, timecodesFilePath, timecodes;
  
  async.series([
    
    // Retrieve video information from database
    function(callback){
      videoProvider.getVideo(request.params.id, function(error, video){

        if(error){
          callback(error);
          return;
        }
        else if(video && video.status === "success"){

          // Retreive video timecode file
          videoInfo = video;
          videoInfo.timecodes = {};
          timecodesFilePath = path.normalize(process.rootPublish + "/public/publish/videos/" + videoInfo.id + "/synchro.json");
        }

        callback();

      });
    },

    // Retrieve video timecodes
    function(callback){
      if(timecodesFilePath){
        fs.exists(timecodesFilePath, function(exists){
          if(exists){

            try{
              timecodes = require(timecodesFilePath);
            }
            catch(e){
              callback(new Error(e.message));
              return;
            }

          }
          callback();
        });
      }
      else
        callback();
    }

  ], function(error){
    if(error){
      logger.error(error && error.message);
      response.status(500).send();
    }
    else if(!videoInfo)
      response.status(404).send();
    else{
      
      // Got timecodes for this video
      if(timecodes){
        
        for(var time in timecodes){          
          videoInfo.timecodes[parseInt(time)] = {};
          videoInfo.timecodes[parseInt(time)]["image"] = {
            "small" : "/publish/videos/" + videoInfo.id + "/" + timecodes[time]["image"]["small"],
            "large" : "/publish/videos/" + videoInfo.id + "/" + timecodes[time]["image"]["large"]
          };
        }
        
      }
      
      response.send({ video : videoInfo });
    }
    
  });
  
};