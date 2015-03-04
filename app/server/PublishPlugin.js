"use scrict"

// Module dependencies
var util = require("util");
var express = require("express");
var openVeoAPI = require("openveo-api");

function PublishPlugin(){

  // Creates admin and front new routers
  this.router = express.Router();
  this.adminRouter = express.Router();
  
  // Define routes directly here or in the configuration file
  
}

module.exports = PublishPlugin;
util.inherits(PublishPlugin, openVeoAPI.Plugin);