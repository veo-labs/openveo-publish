'use strict';

var util = require('util');
var openVeoAPI = require('@openveo/api');
var EntityProvider = openVeoAPI.EntityProvider;

function CategoryProvider(database) {
  EntityProvider.call(this, database, 'core_taxonomies');
}

module.exports = CategoryProvider;
util.inherits(CategoryProvider, EntityProvider);
