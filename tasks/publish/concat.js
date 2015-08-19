"use strict"

var path = require("path");
var applicationConf = process.requirePublish("conf.json");

/**
 * Gets the list of minified JavaScript files from the given list of files.
 *
 * It will just replace ".js" by ".min.js".
 *
 * @param Array files The list of files
 * @return Array The list of minified files
 */
function getMinifiedJSFiles(files){
  var minifiedFiles = [];
  files.forEach(function(path){
    minifiedFiles.push("<%= publish.uglify %>/" + path.replace(".js", ".min.js"));
  });
  return minifiedFiles;
}

module.exports = {
  publishjs : {

    // Concatenate all back office JavaScript files
    src : getMinifiedJSFiles(applicationConf["backOffice"]["scriptFiles"]["dev"]),

    // Concatenate all files into openveoPublish.js
    dest : "<%= publish.js %>/openveoPublish.js"

  },
  frontJS : {

    // Concatenate all front JavaScript files
    src : getMinifiedJSFiles(applicationConf["custom"]["scriptFiles"]["publishPlayer"]["dev"]),

    // Concatenate all files into openveoPublishPlayer.js
    dest : "<%= publish.js %>/openveoPublishPlayer.js"

  }
}