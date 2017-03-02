'use strict';

/**
 * @module controllers
 */

/**
 * The list of HTTP errors with, for each error, its associated
 * hexadecimal code and HTTP return code.
 * HTTP errors are sent by controllers.
 *
 * @example
 *     var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
 *     console.log(HTTP_ERRORS.UNKNOWN_ERROR);
 *
 * @class HTTP_ERRORS
 * @static
 */

var HTTP_ERRORS = {

  // Server errors

  /**
   * Unidentified error.
   *
   * @property UNKNOWN_ERROR
   * @type Object
   * @final
   */
  UNKNOWN_ERROR: {
    code: 0x000,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting a ready video failed.
   *
   * @property GET_VIDEO_READY_ERROR
   * @type Object
   * @final
   */
  GET_VIDEO_READY_ERROR: {
    code: 0x001,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Publishing a video failed.
   *
   * @property PUBLISH_VIDEO_ERROR
   * @type Object
   * @final
   */
  PUBLISH_VIDEO_ERROR: {
    code: 0x002,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed.
   *
   * @property UNPUBLISH_VIDEO_ERROR
   * @type Object
   * @final
   */
  UNPUBLISH_VIDEO_ERROR: {
    code: 0x003,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting Publish plugin configuration failed.
   *
   * @property GET_CONFIGURATION_ERROR
   * @type Object
   * @final
   */
  GET_CONFIGURATION_ERROR: {
    code: 0x004,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of custom properties failed.
   *
   * @property GET_PROPERTIES_ERROR
   * @type Object
   * @final
   */
  GET_PROPERTIES_ERROR: {
    code: 0x005,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of videos failed.
   *
   * @property GET_VIDEOS_ERROR
   * @type Object
   * @final
   */
  GET_VIDEOS_ERROR: {
    code: 0x006,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating an entity statistics failed.
   *
   * @property STATISTICS_UPDATE_ERROR
   * @type Object
   * @final
   */
  STATISTICS_UPDATE_ERROR: {
    code: 0x007,
    httpCode: 500,
    module: 'publish',
    message: 'Error updating statistics'
  },

  /**
   * Setting Publish plugin configuration failed.
   *
   * @property SET_CONFIGURATION_ERROR
   * @type Object
   * @final
   */
  SET_CONFIGURATION_ERROR: {
    code: 0x008,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating a video tag failed.
   *
   * @property UPDATE_VIDEO_TAGS_ERROR
   * @type Object
   * @final
   */
  UPDATE_VIDEO_TAGS_ERROR: {
    code: 0x009,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Deleting a video tag failed.
   *
   * @property REMOVE_VIDEO_TAGS_ERROR
   * @type Object
   * @final
   */
  REMOVE_VIDEO_TAGS_ERROR: {
    code: 0x010,
    httpCode: 500,
    module: 'publish'
  },


  // Authentication errors

  /**
   * Getting a ready video failed, user doesn't have enough permissions.
   *
   * @property GET_VIDEO_READY_FORBIDDEN
   * @type Object
   * @final
   */
  GET_VIDEO_READY_FORBIDDEN: {
    code: 0x100,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Publishing a video failed, user doesn't have enough permissions.
   *
   * @property PUBLISH_VIDEO_FORBIDDEN
   * @type Object
   * @final
   */
  PUBLISH_VIDEO_FORBIDDEN: {
    code: 0x101,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed, user doesn't have enough permissions.
   *
   * @property UNPUBLISH_VIDEO_FORBIDDEN
   * @type Object
   * @final
   */
  UNPUBLISH_VIDEO_FORBIDDEN: {
    code: 0x102,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Updating a video tag failed, user doesn't have enough permissions.
   *
   * @property UPDATE_TAGS_VIDEO_FORBIDDEN
   * @type Object
   * @final
   */
  UPDATE_VIDEO_TAGS_FORBIDDEN: {
    code: 0x103,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Removing a video tag failed, user doesn't have enough permissions.
   *
   * @property REMOVE_TAGS_VIDEO_FORBIDDEN
   * @type Object
   * @final
   */
  REMOVE_VIDEO_TAGS_FORBIDDEN: {
    code: 0x104,
    httpCode: 403,
    module: 'publish'
  },

  // Wrong parameters

  /**
   * Getting a ready video failed, a parameter is missing.
   *
   * @property GET_VIDEO_READY_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  GET_VIDEO_READY_MISSING_PARAMETERS: {
    code: 0x200,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Publishing a video failed, a parameter is missing.
   *
   * @property PUBLISH_VIDEO_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  PUBLISH_VIDEO_MISSING_PARAMETERS: {
    code: 0x201,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed, a parameter is missing.
   *
   * @property UNPUBLISH_VIDEO_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  UNPUBLISH_VIDEO_MISSING_PARAMETERS: {
    code: 0x202,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Retrying video processing failed, a parameter is missing.
   *
   * @property RETRY_VIDEO_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  RETRY_VIDEO_MISSING_PARAMETERS: {
    code: 0x203,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Starting a video upload failed, a parameter is missing.
   *
   * @property START_UPLOAD_VIDEO_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  START_UPLOAD_VIDEO_MISSING_PARAMETERS: {
    code: 0x204,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Setting statistics about an entity failed, missing the id parameter.
   *
   * @property STATISTICS_MISSING_ID_PARAMETERS
   * @type Object
   * @final
   */
  STATISTICS_MISSING_ID_PARAMETERS: {
    code: 0x205,
    httpCode: 400,
    module: 'publish',
    message: 'Missing Id parameter'
  },

  /**
   * Setting statistics about an entity failed, unknown statistic property.
   *
   * @property STATISTICS_PROPERTY_UNKNOWN
   * @type Object
   * @final
   */
  STATISTICS_PROPERTY_UNKNOWN: {
    code: 0x206,
    httpCode: 400,
    module: 'publish',
    message: 'Unknown statistics property'
  },

  /**
   * Setting statistics about an entity failed, unknown entity.
   *
   * @property STATISTICS_ENTITY_UNKNOWN
   * @type Object
   * @final
   */
  STATISTICS_ENTITY_UNKNOWN: {
    code: 0x207,
    httpCode: 400,
    module: 'publish',
    message: 'Unknown statistics entity'
  },

  /**
   * Setting statistics about an entity failed, missing the count parameter.
   *
   * @property STATISTICS_MISSING_COUNT_PARAMETERS
   * @type Object
   * @final
   */
  STATISTICS_MISSING_COUNT_PARAMETERS: {
    code: 0x208,
    httpCode: 400,
    module: 'publish',
    message: 'Missing count parameter'
  },

  /**
   * Getting the list of videos failed, wrong parameters.
   *
   * @property GET_VIDEOS_WRONG_PARAMETERS
   * @type Object
   * @final
   */
  GET_VIDEOS_WRONG_PARAMETERS: {
    code: 0x209,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Update the video tag failed, wrong parameters.
   *
   * @property UPDATE_VIDEO_TAG_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  UPDATE_VIDEO_TAGS_MISSING_PARAMETERS: {
    code: 0x210,
    httpCode: 400,
    module: 'publish',
    message: 'Missing id parameter'
  },

  /**
   * remove the video tag failed, wrong parameters.
   *
   * @property REMOVE_VIDEO_TAG_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  REMOVE_VIDEO_TAGS_MISSING_PARAMETERS: {
    code: 0x211,
    httpCode: 400,
    module: 'publish',
    message: 'Missing id parameter'
  }
};

Object.freeze(HTTP_ERRORS);
module.exports = HTTP_ERRORS;
