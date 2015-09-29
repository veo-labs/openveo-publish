'use strict';

module.exports = {
  basePath: ['.'],
  app: ['<%= publish.basePath %>/app'],
  be: ['<%= publish.app %>/client/admin'],
  player: ['<%= publish.app %>/client/front'],
  beJS: ['<%= publish.be %>/js/'],
  playerJS: ['<%= publish.player %>/js/'],
  sass: ['<%= publish.be %>/compass/sass'],
  playerAssets: ['<%= publish.basePath %>/assets/player'],
  beAssets: ['<%= publish.basePath %>/assets/be'],
  beCSSAssets: ['<%= publish.beAssets %>/css'],
  beJSAssets: ['<%= publish.beAssets %>/js'],
  playerJSAssets: ['<%= publish.playerAssets %>/js'],
  uglify: ['<%= publish.basePath %>/build/uglify']
};
