"use scrict"

// Module dependencies
var util = require("util");
var fs = require("fs");
var events = require("events");
var path = require("path");
var async = require("async");
var openVeoAPI = require("openveo-api");
var xml2js = require("xml2js");
var VideoProvider = openVeoAPI.VideoProvider;
var VideoPlatformProvider = process.requirePublish("app/server/providers/VideoPlatformProvider.js");
var publishConf = process.requirePublish("config/publishConf.json");

var maxConcurrentPublish = publishConf.maxConcurrentPublish || 3;
var acceptedImagesExtensions = ["jpeg", "jpg", "gif", "bmp"];

/**
 * Creates a PublishManager to retrieve, validate and publish
 * a video pacakge. 
 * @param Database database A database to store information about the videos
 * @param Object videoProviderConf Video platforms provider configuration
 * {
 *   "vimeo" : {
 *     "clientId" : "****",
 *     "clientSecret" : ""****",
 *     "accessToken" : ""****"
 *   }
 * }
 * @param Object logger A Winston logger
 * PublishManager emits the following events : 
 *  - Event "error" An error occured
 *    * Error The error
 *  - Event "complete" A video package was successfully published
 *    * Object The published video package
 */
function PublishManager(database, videoProviderConf, logger){
  this.queue = [];
  this.pendingVideos = [];
  this.videoProvider = new VideoProvider(database);
  this.videoProviderConf = videoProviderConf;
  this.logger = logger;

  // Validate conf

  // Validate video temporary directory
  if(!publishConf.videoTmpDir || (typeof publishConf.videoTmpDir !== "string"))
    throw new Error("videoTmpDir in publishConf.json must be a String");
  
  // Validate package timecode file name
  if(!publishConf.timecodeFileName || (typeof publishConf.timecodeFileName !== "string"))
    throw new Error("timecodeFileName in publishConf.json must be a String");
  
  // Validate package metadata file name
  if(!publishConf.metadataFileName || (typeof publishConf.metadataFileName !== "string"))
    throw new Error("metadataFileName in publishConf.json must be a String");  
}

util.inherits(PublishManager, events.EventEmitter);
module.exports = PublishManager;

/**
 * Publishes the given package.
 *
 * 1. Copy the package to the temporary directory
 * 2. Extract the package to the temporary directory
 * 3. Validate the package
 * 4. Create a public directory to hold the video package files
 * 5. Publish package
 * 6. Clean up the temporary directory removing extracted files
 *
 * Package must be a valid tar file containing : 
 *  - A video file
 *  - A list of image files in jpeg format
 *  - A .session file describing the video package content. e.g
 *    {
 *      "profile": "2",
 *      "audio-input": "analog-top",
 *      "date": "13/01/1970 20:36:15",
 *      "format": "mix-pip",
 *      "rich-media": true,
 *      "profile-settings": {
 *        "video-bitrate": 1000000,
 *        "id": "2",
 *        "video-height": 720,
 *        "audio-bitrate": 128000,
 *        "name": "Haute définition"
 *      },
 *      "id": "1970-01-13_20-36-15",
 *      "format-settings": {
 *        "source": "mix-raw",
 *        "id": "mix-pip",
 *        "name": "Mélangé caméra incrustée",
 *        "template": "pip"
 *      },
 *      "date-epoch": 1107375,
 *      "storage-directory": "/data/1970-01-13_20-36-15",
 *      "filename": "video.mp4",
 *      "duration": 20
 *    }
 *  - A synchro.xml file with the mapping image / video for 
 *    a timecode. e.g
 *    <?xml version="1.0"?>
 *    <player>
 *      <synchro id="slide_00000.jpeg" timecode="0"/>
 *      <synchro id="slide_00001.jpeg" timecode="1200"/>
 *    </player>
 *
 * @param Object videoPackage Video package to publish e.g
 *   {
 *     "type" : "vimeo", // The video platform to use
 *     "path" : "C:/Temp/", // The path of the hot folder
 *     "originalPackagePath" : "C:/Temp/video-package.tar" // Path of package to publish
 *   }
 */
PublishManager.prototype.publish = function(videoPackage){
  
  if(videoPackage && (typeof videoPackage === "object")){
    var self = this;
    videoPackage.id = Date.now();
    
    async.series([
      
      // Queue management PHASE
      function(callback){
        self.logger.debug("Queue management PHASE " + videoPackage.originalPackagePath);
        self.logger.debug("Pending videos : " + self.pendingVideos.length);
        
        // Too much videos actually publishing
        if(self.pendingVideos.length >= maxConcurrentPublish){

          // Add package to queue
          self.queue.push(videoPackage);
          self.logger.debug("Add package " + videoPackage.originalPackagePath + " to queue");
          
          callback("Too much concurrent publishing, add package " + videoPackage.id + " to queue");
        }

        // Process can deal with the package
        else{

          // Add video package to the list of pending packages
          self.pendingVideos.push(videoPackage);
          videoPackage.status = VideoProvider.PENDING_STATUS;
          videoPackage.state = VideoProvider.PENDING_STATE;
          videoPackage.link = null;
          videoPackage.videoId = null;
          videoPackage.published = false;
          videoPackage.errorCode = -1;
          videoPackage.properties = [];

          // Save video package information into database
          self.videoProvider.add(videoPackage, function(error){
            if(error)
              callback(new PublishError(error.message, VideoProvider.SAVE_VIDEO_DATA_ERROR));
            else
              callback();
          });

        }

      },

      // Copy PHASE
      function(callback){
        self.logger.debug("Copy PHASE " + videoPackage.originalPackagePath);
        self.videoProvider.updateState(videoPackage.id, VideoProvider.COPYING_STATE);
        
        // Copy package file to tmp directory
        var destinationFilePath = path.join(publishConf.videoTmpDir, videoPackage.id + ".tar");
        openVeoAPI.fileSystem.copy(videoPackage.originalPackagePath, destinationFilePath, function(copyError){

          // An error occurred during the copy
          if(copyError){
            callback(new PublishError(copyError.message, VideoProvider.COPY_ERROR));
          }
          else{
            videoPackage.packagePath = destinationFilePath;
            callback();
          }

        });

      },
      
      // Extraction PHASE
      function(callback){
        self.logger.debug("Extraction PHASE " + videoPackage.originalPackagePath);
        
        // Try to remove the source package
        fs.unlink(videoPackage.originalPackagePath, function(unlinkError){
          if(unlinkError)
            self.emit("error", new PublishError(unlinkError.message, VideoProvider.UNLINK_ERROR));

        });

        var extractDirectory = path.join(publishConf.videoTmpDir, "/" + videoPackage.id);

        // Extract package
        self.videoProvider.updateState(videoPackage.id, VideoProvider.EXTRACTING_STATE);
        openVeoAPI.fileSystem.extract(videoPackage.packagePath, extractDirectory, function(error){

          // Extraction failed
          if(error){
            callback(new PublishError(error.message, VideoProvider.EXTRACT_ERROR));
          }

          // Extraction done
          else
            callback();

        });
      },
      
      // Validation PHASE
      function(callback){
        self.logger.debug("Validation PHASE " + videoPackage.originalPackagePath);
        self.videoProvider.updateState(videoPackage.id, VideoProvider.VALIDATING_STATE);
        
        // Validate package content
        validatePackage.call(self, videoPackage, function(error, metadata){
          
          if(error)
            callback(new PublishError(error.message, VideoProvider.VALIDATION_ERROR));
          else{
            videoPackage.metadata = metadata;
            self.videoProvider.updateMetadata(videoPackage.id, videoPackage.metadata);
            callback();
          }
        });
        
      },

      // Videos directory preparation PHASE
      function(callback){
        self.logger.debug("Videos directory preparation PHASE " + videoPackage.originalPackagePath);
        
        // Test if video temporary directory exists
        var videosDirectoryPath = path.normalize(process.rootPublish + "/public/publish/videos");

        fs.exists(videosDirectoryPath, function(exists){
          if(exists)
            callback();
          else{

            // Create videos public directory
            fs.mkdir(videosDirectoryPath, function(error){
              if(error)
                callback(new PublishError(error.message, VideoProvider.CREATE_VIDEOS_PUBLIC_DIR_ERROR));
              else
                callback();
            });
          }
        });
      },
      
      // Video directory preparation PHASE
      function(callback){
        self.logger.debug("Video directory preparation PHASE " + videoPackage.originalPackagePath);
        self.videoProvider.updateState(videoPackage.id, VideoProvider.PREPARING_STATE);
        
        // Create video public directory
 fs.mkdir(path.normalize(process.rootPublish + "/public/publish/videos/" + videoPackage.id), function(error){
          if(error)
            callback(new PublishError(error.message, VideoProvider.CREATE_VIDEO_PUBLIC_DIR_ERROR));
          else
            callback();
        });

      },
      
      // Publication PHASE
      function(callback){
        self.logger.debug("Publication PHASE " + videoPackage.originalPackagePath);
        self.videoProvider.updateState(videoPackage.id, VideoProvider.SENDING_STATE);

        startPublishing.call(self, videoPackage, function(error, uploadedVideo){

          if(error)
            callback(error);
          else{
            videoPackage = uploadedVideo;
            callback();
          }

        });
      },

      // Clean up PHASE
      function(callback){
        self.logger.debug("Clean up PHASE " + videoPackage.originalPackagePath);

        // Uncomment this code while the issue on the vimeo api
        // is corrected. An issue is opened on project's page at 
        // https://github.com/vimeo/vimeo.js/issues/20
        // Clean up the tmp directory
        openVeoAPI.fileSystem.rmdir(path.join(publishConf.videoTmpDir, "/" + videoPackage.id), function(error){
          if(error)
            self.logger.error("Couldn't remove directory " + path.join(publishConf.videoTmpDir, "/" + videoPackage.id), {"action" : "cleanUp", "videoId" : videoPackage.id});
          
          callback();
        });
        
      },
    ], function(error, results){
      
      // An error occurred
      if(error && (typeof error !== "string")){
        self.videoProvider.updateState(videoPackage.id, VideoProvider.ERROR_STATE);
        self.videoProvider.updateErrorCode(videoPackage.id, error.code);
        self.videoProvider.updateStatus(videoPackage.id, VideoProvider.ERROR_STATUS);
        self.emit("error", error);
      }
      else if(!error){
        
        // Mark package as success in the database
        self.videoProvider.updateStatus(videoPackage.id, VideoProvider.SUCCESS_STATUS);
        self.videoProvider.updateState(videoPackage.id, VideoProvider.SENT_STATE);
        self.videoProvider.updateLink(videoPackage.id, "/publish/video/" + videoPackage.id);
        self.videoProvider.updateVideoId(videoPackage.id, videoPackage.videoId);
        self.emit("complete", videoPackage);

      }
      
      // For both error and complete publication
      // Remove video from pending videos and launch
      // next queued video
      if(!error || (typeof error !== "string")){

        // Remove video from pending videos
        removeFromPending.call(self, videoPackage.id);

        // Publish pending package from FIFO queue
        if(self.queue.length)
          self.publish(self.queue.shift(0));
      }

    });

  }
  else
    this.emit("error", new PublishError("videoPackage argument must be an Object", VideoProvider.PACKAGE_NOT_DEFINED_ERROR));
};

/**
 * Validates package content.
 * A video package must contain, at least a valid package information
 * file and a video file.
 * 
 * @param Object videoPackage Video package to publish e.g
 *   {
 *     "id" : 1422731934859, // Internal video id
 *     "type" : "vimeo", // The video platform to use
 *     "path" : "C:/Temp/", // The path of the hot folder
 *     "originalPackagePath" : "C:/Temp/video-package.tar", // The original package path in hot folder
 *     "packagePath" : "E:/openveo/node_modules/openveo-publish/tmp/1422731934859.tar" // The package path inside the tmp directory
 *   }
 * @param Function callback The function to call when done
 *   - Error The error if an error occurred, null otherwise 
 *   - Object The package information object 
 */
function validatePackage(videoPackage, callback){
  var extractDirectory = path.join(publishConf.videoTmpDir, videoPackage.id + "");

  // Read package information file
  openVeoAPI.fileSystem.getJSONFileContent(path.join(extractDirectory, publishConf.metadataFileName), function(error, packageInformation){

    // Failed reading file or parsing JSON
    if(error)
      callback(new Error(error.message));
    
    // Got JSON Object
    else{

      // Got the name of the video file
      if(packageInformation.filename){

        // Test if video file really exists in package
        fs.exists(path.join(extractDirectory, "/" + packageInformation.filename), function(exists){

          if(exists)
            callback(null, packageInformation);
          else
            callback(new Error("Missing file " + packageInformation.filename));

        });

      }

      // No video file name in metadata, package is not valid
      else
        callback(new Error("No video file name found in metadata file"));

    }

  });
  
}

/**
 * Publishes the video package.
 * 
 * 1. Translate XML timecode file into a JSON equivalent
 * 2. Upload the video to the video platform
 * 3. TODO Resize presentation images
 * 4. Copy package images to public directory
 *
 * @param Object videoPackage Video package to publish e.g
 *   {
 *     "id" : 1422731934859, // Internal video id
 *     "type" : "vimeo", // The video platform to use
 *     "path" : "C:/Temp/", // The path of the hot folder
 *     "originalPackagePath" : "C:/Temp/video-package.tar", // The original package path in hot folder
 *     "packagePath" : "E:/openveo/node_modules/openveo-publish/tmp/1422731934859.tar", // The package path inside the tmp directory
 *     "metadata" : {
 *       "profile": "2",
 *       "audio-input": "analog-top",
 *       "date": "13/01/1970 20:36:15",
 *       "format": "mix-pip",
 *       "rich-media": true,
 *       "profile-settings": {
 *         "video-bitrate": 1000000,
 *         "id": "2",
 *         "video-height": 720,
 *         "audio-bitrate": 128000,
 *         "name": "Haute définition"
 *       },
 *       "id": "1970-01-13_20-36-15",
 *       "format-settings": {
 *         "source": "mix-raw",
 *         "id": "mix-pip",
 *         "name": "Mélangé caméra incrustée",
 *         "template": "pip"
 *       },
 *       "date-epoch": 1107375,
 *       "storage-directory": "/data/1970-01-13_20-36-15",
 *       "filename": "video.mp4",
 *       "duration": 20
 *     }
 *   }
 * @param Function callback The function to call when done
 *   - Error The error if an error occurred, null otherwise 
 */
function startPublishing(videoPackage, callback){
  var self = this;
  
  var extractDirectory = path.join(publishConf.videoTmpDir, videoPackage.id + "");
  var videoFinalDir = path.normalize(process.rootPublish + "/public/publish/videos/" + videoPackage.id);

  async.parallel([
    
    // Translate xml timecode file into a JSON file
    function(callback){
      saveTimecode(path.join(extractDirectory, publishConf.timecodeFileName), path.join(videoFinalDir, "synchro.json"), function(error){
        if(error)
          callback(new PublishError(error.message, VideoProvider.SAVE_TIMECODE_ERROR));

        callback();
      });
    },

    // Upload video to video platform
    function(callback){
      var videoPlatformProvider = VideoPlatformProvider.getProvider(videoPackage.type, self.videoProviderConf[videoPackage.type]);

      // Start uploading the video to the platform
      videoPlatformProvider.upload(videoPackage, function(error, videoId){
        if(error)
          callback(new PublishError(error.message, VideoProvider.UPLOAD_ERROR));
        else{
          videoPackage.videoId = videoId;
          callback();
        }
      });

    },
    
    // Copy images to public directory
    function(callback){

      // Scan directory for images
      fs.readdir(extractDirectory, function(error, files){
        if(error)
          callback(new PublishError(error.message, VideoProvider.SCAN_FOR_IMAGES_ERROR));
        else{

          var filesToCopy = [];
          files.forEach(function(file){

            // File extension is part of the accepted extensions
 if(acceptedImagesExtensions.indexOf(path.extname(file).slice(1)) >= 0)
              filesToCopy.push(file);
            
          });
          
          var filesLeftToCopy = filesToCopy.length;
          filesToCopy.forEach(function(file){
            
            openVeoAPI.fileSystem.copy(path.join(extractDirectory, file), path.join(videoFinalDir, file), function(error){

              if(error)
                self.logger.warn(error.message, {"action" : "copyImages", "videoId" : videoPackage.id});
              
              filesLeftToCopy--;

              if(filesLeftToCopy === 0)
                callback();

            });
            
          });
        }
      });
      
    }

  ], function(error, result){

    if(error)
      callback(error);
    else
      callback(null, videoPackage);

  });
}

/**
 * Removes a video package from pending packages.
 * @param Number packageId The package id to remove
 */
function removeFromPending(packageId){
  for(var i = 0 ; i < this.pendingVideos.length ; i++){
    if(this.pendingVideos[i]["id"] === packageId)
      this.pendingVideos.splice(i, 1);
  }
}

/**
 * Saves the XML timecode file into a JSON equivalent.
 * This will check if the file exists first.
 *
 * 1. Test if timecode xml file exists
 * 2. Transcode XML file to a JSON equivalent 
 *    e.g.
 *    {
 *      "player": {
 *        "synchro": 
 *        [
 *          {
 *            "id": ["slide_00000.jpeg"],
 *            "timecode": ["0"]
 *          }, {
 *            "id": ["slide_00001.jpeg"],
 *            "timecode": ["1200"]
 *          }
 *        ]
 *      }
 *    }
 * 3. Format JSON
 *    e.g.
 *    {
 *      "0": {
 *        "image": {
 *          "small": "slide_00000.jpeg",
 *          "large": "slide_00000.jpeg"
 *        }
 *      },
 *      "1200": {
 *        "image": {
 *          "small": "slide_00001.jpeg",
 *          "large": "slide_00001.jpeg"
 *        }
 *      }
 *    }
 *
 * @param String xmlTimecodeFilePath The timecode file to save
 * @param String destinationFilePath The JSON timecode file path
 * @param Function callback The function to call when done
 *   - Error The error if an error occurred, null otherwise
 */
function saveTimecode(xmlTimecodeFilePath, destinationFilePath, callback){

  async.series([
    function(callback){

      // Check if XML file exists
      fs.exists(xmlTimecodeFilePath, function(exists){

        if(exists)
          callback();
        else
          callback(new Error("Missing timecode file " + xmlTimecodeFilePath));

      });
    },
    function(callback){

      // Transcode XML to JSON
      fs.readFile(xmlTimecodeFilePath, function(error, data){

        if(error)
          callback(error);
        else{
          xml2js.parseString(data, {mergeAttrs : true}, function(error, timecodes){

            var formattedTimecodes = {};
            
            // Transform timecode format to
            if(timecodes && timecodes.player && timecodes.player.synchro){
              
              // Iterate through the list of timecodes
              // Change JSON organization to be more accessible
              timecodes.player.synchro.forEach(function(timecodeInfo){
                
                if(timecodeInfo["timecode"] && timecodeInfo["timecode"].length){
                  var timecode = timecodeInfo["timecode"][0];
                  formattedTimecodes[timecode] = { "image" : {}};

                  if(timecodeInfo["id"] && timecodeInfo["id"].length){
                    formattedTimecodes[timecode]["image"] = {
                      "small" : timecodeInfo["id"][0],
                      "large" : timecodeInfo["id"][0]
                    };
                  }
                }
              });

            }

            callback(error, formattedTimecodes);
          });
        }

      });

    }
  ], function(error, results){
    if(error){
      callback(error); 
    }
    else{
      fs.writeFile(destinationFilePath, JSON.stringify(results[1]), {encoding : "utf8"}, function(error){
          callback(error);
        }
      );
    }
  });

}

/**
 * Defines a custom error with an error code.
 * @param String message The error message
 * @param String code The error code
 */
function PublishError(message, code){
  this.name = "PublishError";
  this.message = message || "";
  this.code = code;
}
util.inherits(PublishError, Error);