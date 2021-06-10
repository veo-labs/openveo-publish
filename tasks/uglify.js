'use strict';

module.exports = {

  // Compress back office client libraries
  'admin-libraries': {
    files: [
      {

        // Enable the following options
        expand: true,

        // Base path for patterns
        cwd: '<%= publish.beJS %>/',

        // Match all JavaScript library files
        src: ['multirange/*.js'],

        // Set destination directory
        dest: '<%= publish.uglify %>/',

        // Generated files extension
        ext: '.min.js'

      }
    ]
  },

  // Compress back office client JavaScript files
  admin: {
    files: [
      {

        // Enable dynamic expansion
        expand: true,

        // Src matches are relative to this path
        cwd: '<%= publish.beJS %>/',

        // Actual pattern(s) to match
        src: ['ovPub/*.js'],

        // Destination path prefix
        dest: '<%= publish.uglify %>/',

        // Dest filepaths will have this extension
        ext: '.min.js',

        // Extensions in filenames begin after the first dot
        extDot: 'first'
      }
    ]
  },
  frontJS: {
    files: [
      {

        // Enable the following options
        expand: true,

        // Base path for patterns
        cwd: '<%= publish.playerJS %>/',

        // Match all JavaScript files in base path
        src: ['**/*.js'],

        // Set destination directory
        dest: '<%= publish.uglify %>/',

        // Generated files extension
        ext: '.min.js'

      }
    ]
  }
};
