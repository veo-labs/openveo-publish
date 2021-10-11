'use strict';

/**
 * @module publish/controllers/PropertyController
 */

var util = require('util');
var openVeoApi = require('@openveo/api');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var EntityController = openVeoApi.controllers.EntityController;
var ResourceFilter = openVeoApi.storages.ResourceFilter;

/**
 * Defines a controller to handle actions relative to properties' routes.
 *
 * @class PropertyController
 * @extends EntityController
 * @constructor
 * @see {@link https://github.com/veo-labs/openveo-api|OpenVeo API documentation} for more information about EntityController
 */
function PropertyController() {
  PropertyController.super_.call(this);
}

module.exports = PropertyController;
util.inherits(PropertyController, EntityController);

/**
 * Gets the list of custom property types.
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
PropertyController.prototype.getPropertyTypesAction = function(request, response, next) {
  response.send({
    types: PropertyProvider.availableTypes
  });
};

/**
 * Gets custom properties.
 *
 * @example
 * // Response example
 * {
 *   "entities" : [ ... ],
 *   "pagination" : {
 *     "limit": ..., // The limit number of custom properties by page
 *     "page": ..., // The actual page
 *     "pages": ..., // The total number of pages
 *     "size": ... // The total number of custom properties
 * }
 *
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} [request.query] Request's query
 * @param {(String|Array)} [request.query.include] The list of fields to include from returned properties
 * @param {(String|Array)} [request.query.exclude] The list of fields to exclude from returned properties. Ignored if
 * include is also specified.
 * @param {String} [request.query.query] Search query to search on both name and description
 * @param {Number} [request.query.useSmartSearch=1] 1 to use a more advanced search mechanism, 0 to use a simple search
 * based on a regular expression
 * @param {Array} [request.query.types] To filter properties by type
 * @param {String} [request.query.page=0] The expected page
 * @param {String} [request.query.limit=10] The expected limit
 * @param {String} [request.query.sortBy="name"] The field to sort properties by (either **name** or **description**)
 * @param {String} [request.query.sortOrder="desc"] The sort order (either **asc** or **desc**)
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
PropertyController.prototype.getEntitiesAction = function(request, response, next) {
  var params;
  var provider = this.getProvider();

  try {
    params = openVeoApi.util.shallowValidateObject(request.query, {
      include: {type: 'array<string>'},
      exclude: {type: 'array<string>'},
      query: {type: 'string'},
      useSmartSearch: {type: 'number', in: [0, 1], default: 1},
      types: {type: 'array<string>'},
      limit: {type: 'number', gt: 0},
      page: {type: 'number', gte: 0, default: 0},
      sortBy: {type: 'string', in: ['name', 'description'], default: 'name'},
      sortOrder: {type: 'string', in: ['asc', 'desc'], default: 'desc'}
    });
  } catch (error) {
    return next(HTTP_ERRORS.GET_PROPERTIES_WRONG_PARAMETERS);
  }

  // Build sort
  var sort = {};
  sort[params.sortBy] = params.sortOrder;

  // Build filter
  var filter = new ResourceFilter();

  // Add search query
  if (params.query) {
    if (params.useSmartSearch)
      filter.search('"' + params.query + '"');
    else {
      var queryRegExp = new RegExp(openVeoApi.util.escapeTextForRegExp(params.query), 'i');
      filter.or([
        new ResourceFilter().regex('name', queryRegExp),
        new ResourceFilter().regex('description', queryRegExp)
      ]);
    }
  }

  // Add property types
  if (params.types && params.types.length) filter.in('type', params.types);

  provider.get(
    filter,
    {
      exclude: params.exclude,
      include: params.include
    },
    params.limit,
    params.page,
    sort,
    function(error, customProperties, pagination) {
      if (error) {
        process.logger.error(error.message, {error: error, method: 'getEntitiesAction'});
        return next(HTTP_ERRORS.GET_PROPERTIES_ERROR);
      }
      response.send({
        entities: customProperties,
        pagination: pagination
      });
    }
  );
};

/**
 * Gets associated provider.
 *
 * @return {module:publish/providers/PropertyProvider~PropertyProvider} The provider associated to the controller
 */
PropertyController.prototype.getProvider = function(request) {
  return new PropertyProvider(process.api.getCoreApi().getDatabase());
};
