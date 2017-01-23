'use strict';

/**
 * @module controllers
 */

var util = require('util');
var openVeoApi = require('@openveo/api');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var EntityController = openVeoApi.controllers.EntityController;

/**
 * Defines a controller to handle actions relative to properties' routes.
 *
 * @class PropertyController
 * @extends EntityController
 * @constructor
 */
function PropertyController() {
  PropertyController.super_.call(this, PropertyModel, PropertyProvider);
}

module.exports = PropertyController;
util.inherits(PropertyController, EntityController);

/**
 * Gets the list of custom property types.
 *
 * @method getPropertyTypesAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
PropertyController.prototype.getPropertyTypesAction = function(request, response, next) {
  response.send({
    types: PropertyModel.availableTypes
  });
};

/**
 * Gets a list of properties.
 *
 * @method getEntitiesAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.query Request's query
 * @param {String} request.query.query Search query to search on both properties name and description
 * @param {Array} request.query.types To filter properties by type
 * @param {String} request.query.page The expected page
 * @param {String} request.query.limit The expected limit
 * @param {String} request.query.sortBy To sort properties by name or description (default is name)
 * @param {String} request.query.sortOrder Sort order (either asc or desc)
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
PropertyController.prototype.getEntitiesAction = function(request, response, next) {
  var model = this.getModel(request);
  var params;

  try {
    params = openVeoApi.util.shallowValidateObject(request.query, {
      query: {type: 'string'},
      types: {type: 'array<string>'},
      limit: {type: 'number', gt: 0},
      page: {type: 'number', gt: 0, default: 1},
      sortBy: {type: 'string', in: ['name', 'description'], default: 'name'},
      sortOrder: {type: 'string', in: ['asc', 'desc'], default: 'desc'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_PROPERTIES_WRONG_PARAMETERS);
  }

  // Build sort
  var sort = {};
  sort[params.sortBy] = params.sortOrder === 'asc' ? 1 : -1;

  // Build filter
  var filter = {};

  // Add search query
  if (params.query) {
    filter.$text = {
      $search: '"' + params.query + '"'
    };
  }

  // Add property types
  if (params.types && params.types.length) {
    filter.type = {
      $in: params.types
    };
  }

  model.getPaginatedFilteredEntities(
    filter,
    params.limit,
    params.page,
    sort,
    null,
    function(error, entities, pagination) {
      if (error) {
        process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
        next(HTTP_ERRORS.GET_PROPERTIES_ERROR);
      } else {
        response.send({
          entities: entities,
          pagination: pagination
        });
      }
    }
  );
};

/**
 * Gets an instance of the property model.
 *
 * @method getModel
 * @param {Object} request The HTTP request
 * @return {PropertyModel} The PropertyModel instance
 */
PropertyController.prototype.getModel = function(request) {
  var coreApi = openVeoApi.api.getCoreApi();
  return new this.Model(new this.Provider(coreApi.getDatabase()), new VideoProvider(coreApi.getDatabase()));
};
