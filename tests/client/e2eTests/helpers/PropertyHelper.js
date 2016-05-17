'use strict';

var util = require('util');
var shortid = require('shortid');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;

/**
 * Creates a new PropertyHelper to help manipulate properties without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {PropertyModel} model The entity model that will be used by the Helper
 */
function PropertyHelper(model) {
  PropertyHelper.super_.call(this, model);
  this.textSearchProperties = ['name', 'description'];
  this.sortProperties = [
    {
      name: 'name',
      type: 'string'
    },
    {
      name: 'description',
      type: 'string'
    }
  ];
}

module.exports = PropertyHelper;
util.inherits(PropertyHelper, Helper);

/**
 * Adds multiple entities at the same time with automatic index.
 *
 * This method bypass the web browser to directly add entities into database.
 *
 * All created entities will have the same name suffixed by the index.
 *
 * @method addEntitiesAuto
 * @param {String} name Base name of the entities to add
 * @param {Number} total Number of entities to add
 * @param {Number} [offset=0] Index to start from for the name suffix
 * @return {Promise} Promise resolving with the added entities
 */
PropertyHelper.prototype.addEntitiesAuto = function(name, total, offset) {
  var entities = [];
  offset = offset || 0;

  for (var i = offset; i < total; i++) {
    entities.push({
      name: name + ' ' + i,
      description: name + ' description ' + i,
      type: 'text'
    });
  }

  return this.addEntities(entities);
};

/**
 * Gets entity object example to use with web service put /entityName.
 *
 * If the entity managed by the Helper is registered to be tested automatically by the core, it needs to implement
 * this method which will be used to perform a put /entityName.
 *
 * @method getAddExample
 * @return {Object} The data to add
 */
PropertyHelper.prototype.getAddExample = function() {
  return {
    id: shortid.generate(),
    name: 'Property example',
    description: 'Property example description',
    type: 'text'
  };
};

/**
 * Gets entity object example to use with web service post /entityName.
 *
 * If the entity managed by the Helper is registered to be tested automatically by the core, it needs to implement
 * this method which will be used to perform a post /entityName.
 *
 * @method getUpdateExample
 * @return {Object} The data to perform the update
 */
PropertyHelper.prototype.getUpdateExample = function() {
  return {
    name: 'Property example new name',
    description: 'Property example new description',
    type: 'boolean'
  };
};
