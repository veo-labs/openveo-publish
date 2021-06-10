'use strict';

/* eslint no-sync: 0 */
var path = require('path');
var fs = require('fs');
var openVeoApi = require('@openveo/api');

process.rootPublish = __dirname;
process.requirePublish = function(filePath) {
  return require(path.normalize(process.rootPublish + '/' + filePath));
};

/**
 * Loads a bunch of grunt configuration files from the given directory.
 *
 * Loaded configurations can be referenced using the configuration file name.
 * For example, if myConf.js returns an object with a property "test", it will be accessible using myConf.test.
 *
 * @param {String} path Path of the directory containing configuration files
 * @return {Object} The list of configurations indexed by filename without the extension
 */
function loadConfig(path) {
  var configuration = {};
  var configurationFiles = fs.readdirSync(path);

  configurationFiles.forEach(function(configurationFile) {
    configuration[configurationFile.replace(/\.js$/, '')] = require(path + '/' + configurationFile);
  });

  return configuration;
}

module.exports = function(grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    env: process.env
  };

  grunt.initConfig(config);
  grunt.config.merge(loadConfig('./tasks'));

  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-yuidoc');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-mkdocs');
  grunt.loadNpmTasks('grunt-gh-pages');

  grunt.registerMultiTask('rename', openVeoApi.grunt.renameTask(grunt));
  grunt.registerMultiTask('remove', openVeoApi.grunt.removeTask(grunt));

  // Listen to changes on SCSS files and generate CSS files
  grunt.registerTask('default', ['compass:publishdev', 'watch']);

  // Minify and concat back end AngularJS Javascript files
  grunt.registerTask('concatpublish', ['uglify', 'concat']);

  // Prepare project for production
  grunt.registerTask('prod', ['compass:publishdist', 'concatpublish']);

  // Generate documentation
  grunt.registerTask('doc', ['remove:doc', 'mkdocs', 'yuidoc', 'rename:doc']);

};
