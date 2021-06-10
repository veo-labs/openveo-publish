'use strict';

module.exports = {

  // Build the back office stylesheet
  // Use grunt compass:admin --with-source-maps to add source maps generation
  admin: {
    options: {
      sourcemap: process.withSourceMaps,
      sassDir: '<%= publish.sass %>',
      cssDir: '<%= publish.beCSSAssets %>',
      environment: 'production',
      outputStyle: 'compressed',
      force: true
    }
  }

};
