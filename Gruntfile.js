"use strict";

// Module dependencies
var path = require("path");
var util = require("util");

process.rootPublish = __dirname;
process.requirePublish = function(filePath){
  return require(path.normalize(process.rootPublish + "/" + filePath));
};

/**
 * Loads a bunch of grunt configuration files from the given directory.
 *
 * Loaded configurations can be referenced using the configuration file name.
 * For example, if myConf.js describes a property "test", it will be accessible
 * using myConf.test.
 *
 * @param String path Path of the directory containing configuration files
 * @return Object The list of configurations indexed by filename without
 * the extension
 */
function loadConfig(path){
  var glob = require("glob");
  var object = {};
  var key;

  glob.sync("*", {cwd: path}).forEach(function(option){
    key = option.replace(/\.js$/, "");
    object[key] = require(path + "/" + option);
  });

  return object;
}

module.exports = function(grunt){

  var config = {
    pkg: grunt.file.readJSON("package.json"),
    env: process.env,
  };

  grunt.initConfig(config);
  grunt.config.merge(loadConfig("./tasks/publish"));

  grunt.loadNpmTasks("grunt-contrib-compass");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-yuidoc");
  grunt.loadNpmTasks("grunt-mocha-test");
  grunt.loadNpmTasks("grunt-karma");

  // only watch core scss
  grunt.registerTask("default", ["compass:publishdev", "watch"]);
  
  // uglify and concat publish JavaScript files
  grunt.registerTask("concatpublish", ["uglify", "concat"]);
  
  // core Prod process (CSS+JS)
  grunt.registerTask("prod", ["compass:publishdist", "concatpublish"]);
};