"use strict"

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");
var Database = openVeoAPI.Database;

var VideoModel = process.requirePublish("app/server/models/VideoModel.js");

function FakeVideoDatabase(){}

module.exports = FakeVideoDatabase;
util.inherits(FakeVideoDatabase, Database);

FakeVideoDatabase.prototype.get = function(collection, criteria, projection, limit, callback){

  switch(collection){
    case "videos" :
      if(!criteria && !projection && limit === -1){
        callback(null, [
          { id : 1, properties : []},
          { id : 2, properties : [ { id : 2, value : "Value 2" } ] }
        ]);
      }
      else if(criteria.id === 1){
        callback(null, [{state : VideoModel.PUBLISHED_STATE, id : "1"}]);
      }
      else if(criteria.id === 0)
        callback(new Error("An error occurred while retrieving video"));
      else
        callback(new Error("Error"));
    break;
    case "properties" :
      if(!criteria && !projection && limit === -1){
        callback(null, [
          {
            id : 1,
            name : "Property 1",
            description : "Description of property 1",
            type : "text"
          },
          {
            id : 2,
            name : "Property 2",
            description : "Description of property 2",
            type : "text"
          }
        ]);
      }
    break;
  }

};

FakeVideoDatabase.prototype.update = function(collection, criteria, data, callback){

  switch(collection){
    case "videos" :
      if(criteria.id === 1 && criteria.state === VideoModel.SENT_STATE && data.state === VideoModel.PUBLISHED_STATE)
        callback();
      else if(criteria.id === 2 && criteria.state === VideoModel.SENT_STATE && data.state === VideoModel.PUBLISHED_STATE)
        callback(new Error("No video found corresponding with state sent"));
      else if(criteria.id === 3 && criteria.state === VideoModel.PUBLISHED_STATE && data.state === VideoModel.SENT_STATE)
        callback();
      else if(criteria.id === 4 && criteria.state === VideoModel.PUBLISHED_STATE && data.state === VideoModel.SENT_STATE)
        callback(new Error("No video found corresponding with state published"));
      else if(criteria.id === 6 && data.title && data.description && data.properties.length === 1)
        callback();
      else if(criteria.id === 7 && data.title && !data.description && !data.properties)
        callback();
      else if(criteria.id === 8 && !data.title && data.description && !data.properties)
        callback();
      else if(criteria.id === 9 && !data.title && !data.description && data.properties)
        callback();
      else
        callback(new Error("Error"));
    break;
  }

};

FakeVideoDatabase.prototype.insert = function(collection, data, callback){  
  switch(collection){
    case "videos":
      if(data.id === "1")
        callback();
      else
        callback(new Error("Error"));
    break;
  }
};

FakeVideoDatabase.prototype.remove = function(collection, criteria, callback){

  switch(collection){
    case "videos" :
      if(criteria.id === 1)
        callback();      
      else if(criteria.id === 5)
        callback();
      else
        callback(new Error("Error"));       
    break;
  }

};