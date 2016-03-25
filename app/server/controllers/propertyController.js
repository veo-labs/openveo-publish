'use strict';

/**
 * @module publish-controllers
 */

/**
 * Provides route actions for all requests relative to properties.
 *
 * @class propertyController
 */

var openVeoAPI = require('@openveo/api');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');
var errors = process.requirePublish('app/server/httpErrors.js');

var propertyModel = new PropertyModel();

/**
 * Gets the list of custom property types.
 *
 * @method getPropertyTypesAction
 * @static
 */
module.exports.getPropertyTypesAction = function(request, response, next) {
  response.send({
    types: PropertyModel.availableTypes
  });
};

/**
 * Gets a property.
 *
 * Expects one GET parameter :
 *  - **id** The id of the property
 *
 * @method getPropertyAction
 * @static
 */
module.exports.getPropertyAction = function(request, response, next) {
  if (request.params.id) {
    propertyModel.getOne(request.params.id, function(error, property) {
      if (error)
        next(errors.GET_PROPERTY_ERROR);
      else
        response.send({
          property: property
        });
    });
  } else {

    // Missing type and / or id of the property
    next(errors.GET_PROPERTY_MISSING_PARAMETERS);

  }
};

/**
 * Gets a list of properties.
 *
 * Parameters :
 *  - **query** Search query to search on both properties name and description
 *  - **types** To filter properties by type
 *  - **page** The expected page
 *  - **limit** The expected limit
 *  - **sortBy** To sort properties by name or description (default is name)
 *  - **sortOrder** Sort order (either asc or desc)
 *
 * @method getPropertiesAction
 * @static
 */
module.exports.getPropertiesAction = function(request, response, next) {
  var orderedProperties = ['name', 'description'];
  var params;

  try {
    params = openVeoAPI.util.shallowValidateObject(request.query, {
      query: {type: 'string'},
      types: {type: 'array<string>'},
      limit: {type: 'number', gt: 0},
      page: {type: 'number', gt: 0, default: 1},
      sortBy: {type: 'string', in: orderedProperties, default: 'name'},
      sortOrder: {type: 'string', in: ['asc', 'desc'], default: 'desc'}
    });
  } catch (error) {
    return response.status(500).send({
      error: {
        message: error.message
      }
    });
  }

  // Build sort
  var sort = {};
  sort[params.sortBy] = params.sortOrder === 'asc' ? 1 : -1;

  // Build filter
  var filter = {};

  // Add search query
  if (params.query) {
    filter.$text = {
      $search: params.query
    };
  }

  // Add property types
  if (params.types && params.types.length) {
    filter.type = {
      $in: params.types
    };
  }

  propertyModel.getPaginatedFilteredEntities(
    filter,
    params.limit,
    params.page,
    sort,
    null,
    function(error, properties, pagination) {
      if (error) {
        process.logger.error(error);
        next(errors.GET_PROPERTIES_ERROR);
      } else {
        response.send({
          properties: properties,
          pagination: pagination
        });
      }
    }
  );
};
