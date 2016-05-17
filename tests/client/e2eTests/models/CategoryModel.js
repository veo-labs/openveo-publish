'use strict';

var util = require('util');
var openVeoAPI = require('@openveo/api');
var EntityModel = openVeoAPI.EntityModel;
var CategoryProvider = process.requirePublish('tests/client/e2eTests/providers/CategoryProvider.js');
var applicationStorage = openVeoAPI.applicationStorage;

function CategoryModel() {
  EntityModel.call(this, new CategoryProvider(applicationStorage.getDatabase()));
}

module.exports = CategoryModel;
util.inherits(CategoryModel, EntityModel);
