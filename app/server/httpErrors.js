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
  GET_VIDEO_MISSING_PARAMETERS: {
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

  // Other errors
  GET_VIDEO_ERROR: {
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
  }

};
