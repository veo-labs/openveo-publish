'use strict';

var path = require('path');

// Set module root directory
process.rootPublish = __dirname;
process.requirePublish = function(filePath) {
  return require(path.join(process.rootPublish, filePath));
};

module.exports = process.requirePublish('app/server/PublishPlugin.js');
