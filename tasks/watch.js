'use strict';

module.exports = {

  // Automatically rebuild back office when a file is modified
  admin: {
    files: [
      '<%= publish.be %>/**/*',
      '<%= publish.beViewsAssets %>/**/*',
      '<%= publish.basePath %>/conf.js'
    ],
    tasks: ['build-back-office-client']
  },

  // Automatically rebuild front office when a file is modified
  front: {
    files: [
      '<%= publish.player %>/**/*',
      '<%= publish.basePath %>/conf.js'
    ],
    tasks: ['build-front-office-client']
  }

};
