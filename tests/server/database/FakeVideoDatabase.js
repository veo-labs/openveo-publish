"use strict"

function FakeVideoDatabase(){}

module.exports = FakeVideoDatabase;

FakeVideoDatabase.prototype.get = function(collection, criteria, callback){
  if(criteria){
    if(criteria.id === 0)
      callback(new Error("An error occurred while retrieving video"));
    else if(criteria.id === 1)
      callback(null, [{status : "success", id : "1"}]);
    else
      callback(null, []);
  }
  else
    callback(null, ["video1", "video2"]);
};