'use strict';

var util = require('util');
var openVeoApi = require('@openveo/api');
var CategoryProvider = process.requirePublish('tests/client/e2eTests/providers/CategoryProvider.js');

function CategoryModel() {
  var coreApi = openVeoApi.api.getCoreApi();
  CategoryModel.super_.call(this, new CategoryProvider(coreApi.getDatabase()));
}

module.exports = CategoryModel;
util.inherits(CategoryModel, openVeoApi.models.EntityModel);
