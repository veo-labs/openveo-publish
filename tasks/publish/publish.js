'use strict';

module.exports = {
  basePath: ['.'],
  app: ['<%= publish.basePath %>/app'],
  admin: ['<%= publish.app %>/client/admin'],
  front: ['<%= publish.app %>/client/front'],
  srcjs: ['<%= publish.admin %>/js/'],
  playerJS: ['<%= publish.front %>/js/'],
  sass: ['<%= publish.admin %>/compass/sass'],
  public: ['<%= publish.basePath %>/public'],
  css: ['<%= publish.public %>/publish/css'],
  js: ['<%= publish.public %>/publish/js'],
  uglify: ['<%= publish.basePath %>/build/uglify']
};
