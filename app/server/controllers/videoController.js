"use strict"

// Module dependencies
var winston = require("winston");
var openVeoAPI = require("openveo-api");

var VideoModel = process.requirePublish("app/server/models/VideoModel.js");
var videoModel = new VideoModel();
var applicationStorage = openVeoAPI.applicationStorage;

// Retrieve logger
var logger = winston.loggers.get("openveo");

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
 *  - id The id of the video
 * Return information about the video as a JSON object :
 * {
 *   video : {
 *     id : 123456789,
 *     ...
 *   }
 * }
 */
module.exports.getVideoAction = function(request, response, next){
  if(request.params.id){
    videoModel.getOne(request.params.id, function(error, video){
      if(error){
        logger.error(error && error.message);
        response.status(500).send();
      }
      else
        response.send({ video : video });
    });
  }

  // Missing id of the video
  else
    response.status(400).send();
};

/**
 * Publishes a video.
 * Expects one GET parameter :
 *  - id The id of the video
 * Change the state of the video to published
 * Return the new video state as a JSON object :
 * e.g.
 * {
 *   state : 7
 * }
 */
module.exports.publishVideoAction = function(request, response, next){
  if(request.params.id){
    videoModel.publishVideo(request.params.id, function(error){
      if(error)
        response.status(500).send();
      else
        response.send({state : VideoModel.PUBLISHED_STATE});
    });
  }

  // Missing type and / or id of the video
  else
    response.status(400).send();
};

/**
 * Unpublishes a video.
 * Expects one GET parameter :
 *  - id The id of the video
 * Change the state of the video to unpublished.
 * Return the new video state as a JSON object :
 * e.g.
 * {
 *   state : 6
 * }
 */
module.exports.unpublishVideoAction = function(request, response, next){
  if(request.params.id){
    videoModel.unpublishVideo(request.params.id, function(error){
      if(error)
        response.status(500).send();
      else
        response.send({state : VideoModel.SENT_STATE});
    });
  }

  // Missing type and / or id of the video
  else
    response.status(400).send();
};