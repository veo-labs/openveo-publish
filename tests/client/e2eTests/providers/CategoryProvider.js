'use strict';

var util = require('util');
var openVeoApi = require('@openveo/api');

function CategoryProvider(database) {
  CategoryProvider.super_.call(this, database, 'core_taxonomies');
}

module.exports = CategoryProvider;
util.inherits(CategoryProvider, openVeoApi.providers.EntityProvider);
