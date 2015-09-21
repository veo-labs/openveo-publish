"use strict";

/**
 * @module publish-packages
 */

// Module dependencies
var util = require("util");
var fs = require("fs");
var events = require("events");
var path = require("path");
var StateMachine = require("javascript-state-machine");
var openVeoAPI = require("@openveo/api");
var VideoModel = process.requirePublish("app/server/models/VideoModel.js");
var VideoPlatformProvider = process.requirePublish("app/server/providers/VideoPlatformProvider.js");
var publishConf = process.requirePublish("config/publishConf.json");
var videoPlatformConf = process.requirePublish("config/videoPlatformConf.json");
var errors = process.requirePublish("app/server/packages/errors.js");

// Package states
Package.PACKAGE_SUBMITTED_STATE = "packageSubmitted";
Package.PACKAGE_INITIALIZED_STATE = "packageInitialized";
Package.PACKAGE_COPIED_STATE = "packageCopied";
Package.ORIGINAL_PACKAGE_REMOVED_STATE = "originalPackageRemoved";
Package.MEDIA_UPLOADED_STATE = "mediaUploaded";
Package.MEDIA_CONFIGURED_STATE = "mediaConfigured";
Package.FILE_CLEANED_STATE = "fileCleaned";

// Package transitions (from one state to another)
Package.INIT_TRANSITION = "initPackage";
Package.COPY_PACKAGE_TRANSITION = "copyPackage";
Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION = "removeOriginalPackage";
Package.UPLOAD_MEDIA_TRANSITION = "uploadMedia";
Package.CONFIGURE_MEDIA_TRANSITION = "configureMedia";
Package.CLEAN_FILE_TRANSITION = "cleanFile";

// Define the order in which transitions will be executed for a Package
Package.stateTransitions = [
  Package.INIT_TRANSITION,
  Package.COPY_PACKAGE_TRANSITION,
  Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
  Package.UPLOAD_MEDIA_TRANSITION,
  Package.CONFIGURE_MEDIA_TRANSITION,
  Package.CLEAN_FILE_TRANSITION
];

// Define machine state authorized transitions depending on previous and
// next states
Package.stateMachine = [
  {
    name: Package.INIT_TRANSITION,
    from: Package.PACKAGE_SUBMITTED_STATE,
    to: Package.PACKAGE_INITIALIZED_STATE 
  },
  {
    name: Package.COPY_PACKAGE_TRANSITION,
    from: Package.PACKAGE_INITIALIZED_STATE,
    to: Package.PACKAGE_COPIED_STATE 
  },
  {
    name: Package.REMOVE_ORIGINAL_PACKAGE_TRANSITION,
    from: Package.PACKAGE_COPIED_STATE,
    to: Package.ORIGINAL_PACKAGE_REMOVED_STATE 
  },
  { 
    name: Package.UPLOAD_MEDIA_TRANSITION,
    from: Package.ORIGINAL_PACKAGE_REMOVED_STATE,
    to: Package.MEDIA_UPLOADED_STATE 
  },
  {
    name: Package.CONFIGURE_MEDIA_TRANSITION,
    from: Package.MEDIA_UPLOADED_STATE,
    to: Package.MEDIA_CONFIGURED_STATE
  },
  {
    name: Package.CLEAN_FILE_TRANSITION,
    from: Package.MEDIA_CONFIGURED_STATE,
    to: Package.FILE_CLEANED_STATE 
  }
];

/**
 * Defines a Package class to manage publication of a media file.
 *
 * @example
 *     // media package object example
 *     {
 *       "type": "vimeo", // Platform type
 *       "originalPackagePath": "/tmp/2015-03-09_16-53-10_rich-media.tar" // Package file
 *     } 
 *
 * @class Package
 * @constructor
 * @param {Object} mediaPackage Information about the media
 * @param {Object} logger A Winston logger
 * Package emits the following events : 
 *  - Event *error* An error occured
 *    - **Error** The error
 *  - Event *complete* A package was successfully published
 *    - **Object** The published package 
 */
function Package(mediaPackage, logger){
  this.publishConf = publishConf;
  
  // Validate temporary directory
  if(!this.publishConf.videoTmpDir || (typeof this.publishConf.videoTmpDir !== "string"))
    this.emit("error", new PackageError("videoTmpDir in publishConf.json must be a String"), errors.INVALID_CONFIGURATION);
  
  this.videoModel = new VideoModel();
  this.mediaPackage = mediaPackage;
  this.logger = logger;
  this.videoPlatformConf = videoPlatformConf;
}

util.inherits(Package, events.EventEmitter);
module.exports = Package;

/**
 * Gets an instance of a Package depending on package file type (factory).
 *
 * @method getPackage
 * @static
 * @param {String} type The type of the package platform to instanciate
 * @param {Object} mediaPackage Information about the media
 * @param {Object} logger A Winston logger
 * @return {Package} An instance of a Package sub class
 */
Package.getPackage = function(type, mediaPackage, logger){
  if(type){

    switch(type){
        
      case "tar":
        var TarPackage = process.requirePublish("app/server/packages/TarPackage.js");
        return new TarPackage(mediaPackage, logger);
      break;
        
      case "mp4":
        var VideoPackage = process.requirePublish("app/server/packages/VideoPackage.js");
        return new VideoPackage(mediaPackage, logger);
      break;

      default:
        self.emit("error", new PackageError("Package type is not valid (" + mediaPackage.packageType + ")", errors.INVALID_PACKAGE_TYPE_ERROR));
    }

  }
};

/**
 * Creates a state machine to publish the package.
 *
 * @method init
 * @param {String} initialState Initial machine state
 * @param {String} initialTransition Initial machine transition
*/
Package.prototype.init = function(initialState, initialTransition){
  var self = this;
  
  // Get the list of package stack transitions
  var transitions = this.getTransitions(this);
  
  // Look for the initial transition in the stack of transitions
  var transitionIndex = transitions.indexOf(initialTransition);
  var transition = transitionIndex >= 0 ? transitionIndex : 0;
  
  // Create a new final state machine
  this.fsm = StateMachine.create({
    initial: initialState,
    events: this.getStateMachine()
  });
  
  // Handle each enter state event to launch automatically the next 
  // transition regarding the stack of transitions
  this.fsm.onenterstate = function(event, from, to){
    self.logger.verbose("State = " + self.fsm.current);
    self.executeTransition((transitions[transition + 1]) ? transitions[++transition] : null);
  };

  // Handle each leave state event to execute the corresponding transition
  this.fsm.onleavestate = function(event, from, to){
    self.logger.verbose("Transition = " + event);

    // Executes function corresponding to transition
    if(self[event])
      self[event]();
    else{
      self.emit("error", new PackageError("Transition " + event + " does not exist", errors.TRANSITION_ERROR));
      return false;
    }

    return StateMachine.ASYNC;
  };
};

/**
 * Starts executing at the given transition.
 *
 * The rest of the transitions stack will be executed.
 *
 * @method executeTransition 
 * @param {String} transition The transition to launch
 */
Package.prototype.executeTransition = function(transition){
  
  // Package is initialized
  // Memorize the last state and last transition of the package
  this.videoModel.updateLastState(this.mediaPackage.id, this.fsm.current);
  this.videoModel.updateLastTransition(this.mediaPackage.id, transition);
  
  // If no more transition or upload transition reached without platform type
  // The publication is considered done
  if(!transition || (transition === Package.UPLOAD_MEDIA_TRANSITION && !this.mediaPackage.type)){
    
    // Package has not been uploaded yet and request a manual upload
    // Change package state
    if(transition === Package.UPLOAD_MEDIA_TRANSITION){
      this.logger.debug("Package " + this.mediaPackage.id + " is waiting for manual upload");
      this.videoModel.updateState(this.mediaPackage.id, VideoModel.WAITING_FOR_UPLOAD_STATE);
    }
    else
      this.videoModel.updateState(this.mediaPackage.id, VideoModel.READY_STATE);
    
    // Done, final state reached
    this.emit("complete", this.mediaPackage);
  }
  
  // Continue by executing the next transition in the stack
  else
    this.fsm[transition]();
}

/**
 * Initializes and stores the package.
 *
 * This is a transition.
 *
 * @method initPackage 
 * @private 
 */
Package.prototype.initPackage = function(){
  this.logger.debug("Init package " + this.mediaPackage.id);
  
  var self = this;
  this.mediaPackage.state = VideoModel.PENDING_STATE;
  this.mediaPackage.link = null;
  this.mediaPackage.mediaId = null;
  this.mediaPackage.published = false;
  this.mediaPackage.errorCode = -1;
  this.mediaPackage.properties = [];
  this.mediaPackage.lastState = Package.PACKAGE_INITIALIZED_STATE;
  this.mediaPackage.lastTransition = Package.COPY_PACKAGE_TRANSITION;
  this.mediaPackage.date = Date.now();

  // Save package information into database
  this.videoModel.add(this.mediaPackage, function(error){
    if(error)
      self.emit("error", new PackageError(error.message, errors.SAVE_PACKAGE_DATA_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Copies package from its submitted directory to temporary directory.
 *
 * This is a transition.
 *
 * @method copyPackage 
 * @private 
 */
Package.prototype.copyPackage = function(){
  var self = this;
  
  // Destination of the copy
  var destinationFilePath = path.join(this.publishConf.videoTmpDir, this.mediaPackage.id + "." + this.mediaPackage.packageType);
  
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.COPYING_STATE);
  
  // Copy package
  this.logger.debug("Copy " + this.mediaPackage.originalPackagePath + " to " + destinationFilePath);
  openVeoAPI.fileSystem.copy(this.mediaPackage.originalPackagePath, destinationFilePath, function(copyError){
    if(copyError)
      self.setError(new PackageError(copyError.message, errors.COPY_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Removes original package.
 *
 * This is a transition. 
 *
 * @method removeOriginalPackage 
 * @private 
 */
Package.prototype.removeOriginalPackage = function(){
  var self = this;

  // Try to remove the original package
  this.logger.debug("Remove original package " + this.mediaPackage.originalPackagePath);
  fs.unlink(this.mediaPackage.originalPackagePath, function(error){
    if(error)
      self.setError(new PackageError(error.message, errors.UNLINK_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Uploads the media to the video platform.
 *
 * This is a transition. 
 *
 * @method uploadMedia 
 * @private  
 */
Package.prototype.uploadMedia = function(){
  var self = this;
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.UPLOADING_STATE);

  // Get video plaform provider from package type
  var videoPlatformProvider = VideoPlatformProvider.getProvider(this.mediaPackage.type, this.videoPlatformConf[this.mediaPackage.type]);

  // Start uploading the media to the platform
  this.logger.debug("Upload media " + this.mediaPackage.id);
  videoPlatformProvider.upload(this.getMediaFilePath(), function(error, mediaId){
    if(error)
      self.setError(new PackageError(error.message, errors.MEDIA_UPLOAD_ERROR));
    else{
      self.mediaPackage.mediaId = mediaId;
      self.videoModel.updateLink(self.mediaPackage.id, "/publish/video/" + self.mediaPackage.id);
      self.videoModel.updateMediaId(self.mediaPackage.id, self.mediaPackage.mediaId);
      self.fsm.transition();
    }
  });
};

/**
 * Configures uploaded media in video platform.
 *
 * This is a transition. 
 *
 * @method configureMedia 
 * @private  
 */
Package.prototype.configureMedia = function(){
  var self = this;
  this.logger.debug("Configure media " + this.mediaPackage.id);
  this.videoModel.updateState(this.mediaPackage.id, VideoModel.CONFIGURING_STATE);

  // Get video plaform provider from package type
  var videoPlatformProvider = VideoPlatformProvider.getProvider(this.mediaPackage.type, this.videoPlatformConf[this.mediaPackage.type]);
  
  // Configure media
  videoPlatformProvider.configure(this.mediaPackage.mediaId, function(error){
    if(error)
      self.setError(new PackageError(error.message, errors.MEDIA_CONFIGURE_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Removes package from temporary directory.
 *
 * This is a transition.
 *
 * @method cleanFile 
 * @private  
 */
Package.prototype.cleanFile = function(){
  var self = this;
  var fileToRemove = path.join(this.publishConf.videoTmpDir, "/" + this.mediaPackage.id + "." + this.mediaPackage.packageType);
  
  // Remove package temporary file
  this.logger.debug("Remove temporary file " + fileToRemove);
  fs.unlink(fileToRemove, function(error){
    if(error)
      self.setError(new PackageError(error.message, errors.CLEAN_FILE_ERROR));
    else
      self.fsm.transition();
  });
};

/**
 * Gets the stack of transitions corresponding to the package.
 *
 * Each package has its own way to be published, thus transitions stack
 * is different by package.
 *
 * @return {Array} The stack of transitions
 * @method getTransitions 
 */
Package.prototype.getTransitions = function(){
  return Package.stateTransitions;
};

/**
 * Gets the list of transitions states corresponding to the package.
 *
 * @return {Array} The list of states/transitions
 * @method getStateMachine
 */
Package.prototype.getStateMachine = function(){
  return Package.stateMachine;
};

/**
 * Gets the media file path of the package.
 *
 * @return {String} System path of the media file
 * @method getMediaFilePath 
 */
Package.prototype.getMediaFilePath = function(){
  return path.join(this.publishConf.videoTmpDir, "/" + this.mediaPackage.id + "." + this.mediaPackage.packageType);
};

/**
 * Sets a package as in error.
 *
 * @param {PublishError} error The package error
 * @method setError  
 * @private  
 */
Package.prototype.setError = function(error){
      
  // An error occurred
  if(error){
    this.videoModel.updateState(this.mediaPackage.id, VideoModel.ERROR_STATE);
    this.videoModel.updateErrorCode(this.mediaPackage.id, error.code);
    this.emit("error", error);
  }

};

/**
 * Defines a custom error with an error code.
 *
 * @class PackageError
 * @constructor
 * @extends Error
 * @param {String} message The error message
 * @param {String} code The error code
 */
function PackageError(message, code){
  this.name = "PackageError";
  this.message = message || "";
  this.code = code;
}