"use strict"

// Module dependencies
var path = require("path");
var async = require("async");
var fs = require("fs");
var winston = require("winston");
var openVeoAPI = require("openveo-api");
var VideoProvider = openVeoAPI.VideoProvider;
var PropertyProvider = openVeoAPI.PropertyProvider;
var applicationStorage = openVeoAPI.applicationStorage;

// Retrieve logger
var logger = winston.loggers.get("openveo");

var videoProvider = new VideoProvider(applicationStorage.getDatabase());
var propertyProvider = new PropertyProvider(applicationStorage.getDatabase());

/**
 * Gets the list of videos.
 * Return the list of videos as a JSON object :
 * e.g.
 * {
 *   videos : [
 *     {
 *       id : 123456789,
 *       ...
 *     },
 *     ...
 *   ]
 * }
 */
module.exports.getVideosAction = function(request, response, next){
  var videos = [];
  var properties = [];
  var newProperties = [];

  async.parallel([

    // Get the list of videos
    function(callback){
      videoProvider.getVideos(function(error, videoList){
        videos = videoList;
        callback(error);
      });
    },

    // Get the list of custom properties
    function(callback){
      propertyProvider.getProperties(function(error, propertyList){
        properties = propertyList;
        callback(error);
      });
    }

  ], function(error, result){
    if(error){
      logger.error(error && error.message);
      response.status(500).send();
    }
    else{
      if(videos && properties){

        // Videos may not have custom properties or just some of them.
        // Furthermore only the id and value of properties are stored
        // with videos, not complete information about the properties
        // (no name, no description and no type).
        // Inject all custom properties information inside video objects

        // Videos
        for(var i in videos){
          var videoProperties = videos[i].properties;

          // Custom properties
          for(var j in properties){
            var found = false;

            // Video properties
            for(var k in videoProperties){

              // Video already has the property
              // Merge definition of the custom property to the video
              // property
              if(properties[j].id === videoProperties[k].id){
                found = true;
                openVeoAPI.util.merge(videoProperties[k], properties[j]);
                break;
              }

            }

            if(!found && videoProperties)
              videoProperties.push(properties[j]);

          }
        }

      }

      response.send({ videos : videos });
    }
  });
};

/**
 * Displays video player template.
 * Checks first if the video id is valid and if the video is published
 * before returning the template.
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
 * Gets information about a video.
 * Expects one GET parameter :
 *  - id The id of the property to update
 * Return information about the video as a JSON object :
 * {
 *   video : {
 *     id : 123456789,
 *     ...
 *   }
 * }
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
        else if(video && (video.state === VideoProvider.PUBLISHED_STATE || request.user)){

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

/**
 * Publishes a video.
 * Expects one GET parameter :
 *  - id The id of the property to update
 * Change the state of the video to published
 * Return the new video state as a JSON object :
 * e.g.
 * {
 *   state : 7
 * }
 */
module.exports.publishVideoAction = function(request, response, next){
  if(request.params.id){
    videoProvider.publishVideo(request.params.id, function(error){
      if(error)
        response.status(500).send();
      else
        response.send({state : VideoProvider.PUBLISHED_STATE});
    });
  }
  else
    response.status(400).send();
};

/**
 * Unpublishes a video.
 * Expects one GET parameter :
 *  - id The id of the property to update
 * Change the state of the video to unpublished.
 * Return the new video state as a JSON object :
 * e.g.
 * {
 *   state : 6
 * }
 */
module.exports.unpublishVideoAction = function(request, response, next){
  if(request.params.id){
    videoProvider.unpublishVideo(request.params.id, function(error){
      if(error)
        response.status(500).send();
      else
        response.send({state : VideoProvider.SENT_STATE});
    });
  }
  else
    response.status(400).send();
};

/**
 * Removes a video.
 * Expects one GET parameter :
 *  - id The id of the property to update
 * Returns either an HTTP code 500 if a server error occured, 400
 * if id parameter is not set or 200 if success.
 */
module.exports.removeVideoAction = function(request, response, next){
  if(request.params.id){

    async.parallel([

      // Remove video from database
      function(callback){
        videoProvider.removeVideo(request.params.id, function(error){
          callback(error);
        });
      },

      // Remove video's public directory
      function(callback){
        openVeoAPI.fileSystem.rmdir(path.normalize(process.rootPublish + "/public/publish/videos/" + request.params.id), function(error){
          callback(error);
        });
      }

    ], function(error, result){
      if(error){
        logger.error(error && error.message);
        response.status(500);
      }
      else
        response.send();
    });

  }
  else
    response.status(400).send();
};

/**
 * Updates video.
 * Expects one GET parameter :
 *  - id The id of the property to update
 * Expects body as :
 * {
 *   title : "Video title",
 *   description : "Video description",
 *   properties : [
 *     {
 *       "name" : "Name of the property",
 *       "description" : "Description of the property",
 *       "type" : "Type of the property"
 *     }
 *     ...
 *   ]
 * }
 * With title, description and properties as optional.
 * Returns either an HTTP code 500 if a server error occured, 400
 * if id parameter is not set or 200 if success.
 */
module.exports.updateVideoAction = function(request, response, next){
  if(request.params.id && request.body){
    var info = {};
    if(request.body.title) info["title"] = request.body.title;
    if(request.body.description) info["description"] = request.body.description;
    if(request.body.properties) info["properties"] = request.body.properties;

    videoProvider.updateVideo(request.params.id, info, function(error){
      if(error){
        logger.error(error && error.message);
        response.status(500).send();
      }
      else
        response.send();
    });
  }
  else
    response.status(400).send();
};