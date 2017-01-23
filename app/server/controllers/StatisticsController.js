'use strict';

/**
 * @module controllers
 */

var util = require('util');
var openVeoApi = require('@openveo/api');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var Controller = openVeoApi.controllers.Controller;

/**
 * Defines a controller to handle actions relative to statistics' routes.
 *
 * @class StatisticsController
 * @extends Controller
 * @constructor
 */
function StatisticsController() {
  StatisticsController.super_.call(this);
}

module.exports = StatisticsController;
util.inherits(StatisticsController, Controller);

/**
 * Route statistics.
 *
 * Check if stats ar available
 * before executing the stat function.
 *
 * @method statisticsAction
 * @async
 * @param {Request} request ExpressJS HTTP Request
 * @param {Object} request.params Request's parameters
 * @param {String} request.params.entity The entity type to work on ("video")
 * @param {String} request.params.type The statistic type to work on ("views")
 * @param {String} request.params.id The entity id
 * @param {Object} [request.body] Required for entity "video" and type "views"
 * @param {String} request.body.count Number to add to existing count (or to initialize)
 * @param {Response} response ExpressJS HTTP Response
 * @param {Function} next Function to defer execution to the next registered middleware
 */
StatisticsController.prototype.statisticsAction = function(request, response, next) {
  switch (request.params.entity) {
    case 'video':
      switch (request.params.type) {
        case 'views':
          if (request.params.id) {
            var body = request.body;
            if (!body.count) {
              next(HTTP_ERRORS.STATISTICS_MISSING_COUNT_PARAMETERS);
              return;
            }
            var coreApi = openVeoApi.api.getCoreApi();
            var videoProvider = new VideoProvider(coreApi.getDatabase());
            var propertyProvider = new PropertyProvider(coreApi.getDatabase());
            var videoModel = new VideoModel(null, videoProvider, propertyProvider);
            videoModel.increaseVideoViews(request.params.id, body.count, function(error, done) {
              if (error || !done) {
                next(HTTP_ERRORS.STATISTICS_UPDATE_ERROR);
              } else {
                response.send({done: done});
              }
            });
          } else {

            // Missing type and / or id of the video
            next(HTTP_ERRORS.STATISTICS_MISSING_ID_PARAMETERS);
          }
          break;
        default:
          next(HTTP_ERRORS.STATISTICS_PROPERTY_UNKNOWN);
      }
      break;
    default:
      next(HTTP_ERRORS.STATISTICS_ENTITY_UNKNOWN);
  }
};

