'use strict';

/* eslint node/no-sync: 0 */
var path = require('path');
var fs = require('fs');

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

  // Set "withSourceMaps" property which will be used by grunt tasks to set appropriate configuration
  process.withSourceMaps = (process.argv.length > 3 && process.argv[3] === '--with-source-maps') ? true : false;

  grunt.initConfig(config);
  grunt.config.merge(loadConfig('./tasks'));

  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Build back office client
  grunt.registerTask('build-back-office-client', [
    'compass:back-office',
    'uglify:back-office',
    'uglify:back-office-libraries',
    'concat:back-office-libraries',
    'concat:back-office-js'
  ]);

  // Build front office client
  grunt.registerTask('build-front-office-client', ['uglify:front-office', 'concat:front-office-js']);

};
