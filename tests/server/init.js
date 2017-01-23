'use strict';

var path = require('path');
var openVeoApi = require('@openveo/api');

// Set module root directory
process.rootPublish = path.join(__dirname, '../../');
process.requirePublish = function(filePath) {
  return require(path.normalize(process.rootPublish + '/' + filePath));
};

process.logger = openVeoApi.logger.add('openveo');
