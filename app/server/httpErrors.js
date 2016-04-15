'use strict';

/**
 * The list of HTTP errors with, for each error, its associated
 * hexadecimal code and HTTP return code.
 * HTTP errors are sent by {{#crossLinkModule "controllers"}}{{/crossLinkModule}}.
 *
 * @example
 *     var httpErrors = process.requirePublish("app/server/httpErrors.js");
 *     console.log(httpErrors.UNKNOWN_ERROR);
 *
 * @module publish-http-errors
 * @main publish-http-errors
 */
module.exports = {

  // General errors
  UNKNOWN_ERROR: {
    code: 0x001,
    httpCode: 500,
    module: 'publish'
  },

  // Missing parameters errors
  GET_VIDEO_READY_MISSING_PARAMETERS: {
    code: 0x200,
    httpCode: 400,
    module: 'publish'
  },
  PUBLISH_VIDEO_MISSING_PARAMETERS: {
    code: 0x201,
    httpCode: 400,
    module: 'publish'
  },
  UNPUBLISH_VIDEO_MISSING_PARAMETERS: {
    code: 0x202,
    httpCode: 400,
    module: 'publish'
  },
  RETRY_VIDEO_MISSING_PARAMETERS: {
    code: 0x203,
    httpCode: 400,
    module: 'publish'
  },
  START_UPLOAD_VIDEO_MISSING_PARAMETERS: {
    code: 0x204,
    httpCode: 400,
    module: 'publish'
  },
  GET_PROPERTY_MISSING_PARAMETERS: {
    code: 0x205,
    httpCode: 400,
    module: 'publish',
    message: 'Missing property id'
  },
  GET_VIDEO_MISSING_PARAMETERS: {
    code: 0x206,
    httpCode: 400,
    module: 'publish'
  },
  GET_CATEGORY_MISSING_PARAMETERS: {
    code: 0x207,
    httpCode: 400,
    module: 'publish'
  },

  // Other errors
  GET_VIDEO_READY_ERROR: {
    code: 0x300,
    httpCode: 500,
    module: 'publish'
  },
  PUBLISH_VIDEO_ERROR: {
    code: 0x301,
    httpCode: 500,
    module: 'publish'
  },
  UNPUBLISH_VIDEO_ERROR: {
    code: 0x302,
    httpCode: 500,
    module: 'publish'
  },
  GET_CONFIGURATION_ERROR: {
    code: 0x303,
    httpCode: 500,
    module: 'publish'
  },
  GET_PROPERTY_ERROR: {
    code: 0x304,
    httpCode: 500,
    module: 'publish'
  },
  GET_PROPERTIES_ERROR: {
    code: 0x305,
    httpCode: 500,
    module: 'publish'
  },
  GET_VIDEO_ERROR: {
    code: 0x306,
    httpCode: 500,
    module: 'publish'
  },
  GET_VIDEOS_ERROR: {
    code: 0x307,
    httpCode: 500,
    module: 'publish'
  },
  GET_CATEGORY_ERROR: {
    code: 0x308,
    httpCode: 500,
    module: 'publish'
  },

  // Webservices
  UNKNOWN_PROPERTY_ERROR: {
    code: 0x400,
    httpCode: 500,
    module: 'publish',
    message: 'Unkown property'
  },
  STATISTICS_MISSING_ID_PARAMETERS: {
    code: 0x401,
    httpCode: 500,
    module: 'publish',
    message: 'Missing Id parameter'
  },
  STATISTICS_PROPERTY_UNKNOWN: {
    code: 0x402,
    httpCode: 500,
    module: 'publish',
    message: 'Unknown statistics property'
  },
  STATISTICS_ENTITY_UNKNOWN: {
    code: 0x403,
    httpCode: 500,
    module: 'publish',
    message: 'Unknown statistics entity'
  },
  STATISTICS_MISSING_COUNT_PARAMETERS: {
    code: 0x404,
    httpCode: 500,
    module: 'publish',
    message: 'Missing count parameter'
  },
  STATISTICS_UPDATE_ERROR: {
    code: 0x405,
    httpCode: 500,
    module: 'publish',
    message: 'Error updating statistics'
  }

};
