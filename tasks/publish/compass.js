'use strict';

module.exports = {
  publishdev: {
    options: {
      sourcemap: true,
      sassDir: '<%= publish.sass %>',
      cssDir: '<%= publish.beCSSAssets %>',
      environment: 'development'
    }
  },
  publishdist: {
    options: {
      sourcemap: false,
      sassDir: '<%= publish.sass %>',
      cssDir: '<%= publish.beCSSAssets %>',
      environment: 'production',
      outputStyle: 'compressed',
      force: true
    }
  }
};
