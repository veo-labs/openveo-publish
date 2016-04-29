'use strict';

/**
 * @module statistics-controllers
 */

var util = require('util');
var openVeoAPI = require('@openveo/api');
var errors = process.requirePublish('app/server/httpErrors.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var Controller = openVeoAPI.controllers.Controller;

var videoModel = new VideoModel();

/**
 * Provides route actions for all requests relative to statistics.
 *
 * @class StatisticsController
 * @constructor
 * @extends Controller
 */
function StatisticsController() {
  Controller.call(this);
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
 */
StatisticsController.prototype.statisticsAction = function(request, response, next) {
  switch (request.params.entity) {
    case 'video':
      switch (request.params.type) {
        case 'views':
          if (request.params.id) {
            var body = request.body;
            if (!body.count) {
              next(errors.STATISTICS_MISSING_COUNT_PARAMETERS);
              return;
            }
            videoModel.increaseVideoViews(request.params.id, body.count, function(error, done) {
              if (error || !done) {
                next(errors.STATISTICS_UPDATE_ERROR);
              } else {
                response.send({done: done});
              }
            });
          } else {

            // Missing type and / or id of the video
            next(errors.STATISTICS_MISSING_ID_PARAMETERS);
          }
          break;
        default:
          next(errors.STATISTICS_PROPERTY_UNKNOWN);
      }
      break;
    default:
      next(errors.STATISTICS_ENTITY_UNKNOWN);
  }
};

