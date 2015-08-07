"use strict"

var util = require("util");
var openVeoAPI = require("openveo-api");
var Database = openVeoAPI.Database;

function FakeVideoDatabase(){}

module.exports = FakeVideoDatabase;
util.inherits(FakeVideoDatabase, Database);

FakeVideoDatabase.prototype.get = function(collection, criteria, projection, limit, callback){
  if(criteria.id === "error")
    callback(new Error("Error"));
  else
    callback(null, [{}]);
};

FakeVideoDatabase.prototype.insert = function(collection, data, callback){  
  callback(null);
};

FakeVideoDatabase.prototype.update = function(collection, criteria, data, callback){
  if(criteria.id === "error" || criteria.id.$in[0] === "error")
    callback(new Error("Error"));
  else
    callback(null);
};

FakeVideoDatabase.prototype.remove = function(collection, criteria, callback){
  callback(null);
};