"use strict"

// Module dependencies
var util = require("util");
var openVeoAPI = require("openveo-api");
var Database = openVeoAPI.Database;

function FakePropertyDatabase(){}

module.exports = FakePropertyDatabase;
util.inherits(FakePropertyDatabase, Database);

FakePropertyDatabase.prototype.get = function(collection, criteria, projection, limit, callback){
  
  switch(collection){
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

FakePropertyDatabase.prototype.insert = function(collection, data, callback){  
  
  switch(collection){
    case "properties":
      if(data.name === "name")
        callback();
      else if(data.name === "name1")
        callback();      
      else
        callback(new Error("Error"));      
    break;
  }
};

FakePropertyDatabase.prototype.update = function(collection, criteria, data, callback){

  switch(collection){
    case "properties":
      if(criteria.id === 1 && data.name && data.description && data.type)
        callback();
      else if(criteria.id === 2 && data.name && !data.description && !data.type)
        callback();
      else if(criteria.id === 3 && !data.name && data.description && !data.type)
        callback();
      else if(criteria.id === 4 && !data.name && !data.description && data.type)
        callback();      
      else
        callback(new Error("Error")); 
    break;
  }
  
};

FakePropertyDatabase.prototype.remove = function(collection, criteria, callback){  
  switch(collection){
    case "properties" : 
      if(criteria.id === 1)
        callback();
      else
        callback(new Error("Error"));       
    break;
  }
};