'use strict';

module.exports = {

  // Build the back office stylesheet
  // Use grunt compass:back-office --with-source-maps to add source maps generation
  'back-office': {
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
