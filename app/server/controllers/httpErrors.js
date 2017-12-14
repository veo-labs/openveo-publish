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

  /**
   * Attaching a file to a tag failed.
   *
   * @property UPLOAD_TAG_FILE_ERROR
   * @type Object
   * @final
   */
  UPLOAD_TAG_FILE_ERROR: {
    code: 0x011,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of groups, when adding a media, failed.
   *
   * @property ADD_MEDIA_GROUPS_ERROR
   * @type Object
   * @final
   */
  ADD_MEDIA_GROUPS_ERROR: {
    code: 0x013,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of custom properties, when adding a media, failed.
   *
   * @property ADD_MEDIA_CUSTOM_PROPERTIES_ERROR
   * @type Object
   * @final
   */
  ADD_MEDIA_CUSTOM_PROPERTIES_ERROR: {
    code: 0x014,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Parsing multipart body, when adding a media, failed.
   *
   * @property ADD_MEDIA_PARSE_ERROR
   * @type Object
   * @final
   */
  ADD_MEDIA_PARSE_ERROR: {
    code: 0x015,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Checking that media does not already exists in database, when adding a media, failed.
   *
   * @property ADD_MEDIA_CHECK_DUPLICATE_ERROR
   * @type Object
   * @final
   */
  ADD_MEDIA_CHECK_DUPLICATE_ERROR: {
    code: 0x016,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing temporary media file, when adding a media, failed.
   *
   * @property ADD_MEDIA_REMOVE_FILE_ERROR
   * @type Object
   * @final
   */
  ADD_MEDIA_REMOVE_FILE_ERROR: {
    code: 0x017,
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
   * @property UPDATE_VIDEO_TAGS_MISSING_PARAMETERS
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
  },

  /**
   * Adding a media failed, wrong parameters.
   *
   * @property ADD_MEDIA_MISSING_PARAMETERS
   * @type Object
   * @final
   */
  ADD_MEDIA_MISSING_PARAMETERS: {
    code: 0x212,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, missing the body.
   *
   * @property ADD_MEDIA_MISSING_INFO_PARAMETERS
   * @type Object
   * @final
   */
  ADD_MEDIA_MISSING_INFO_PARAMETERS: {
    code: 0x213,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, wrong file parameter.
   *
   * @property ADD_MEDIA_WRONG_FILE_PARAMETER
   * @type Object
   * @final
   */
  ADD_MEDIA_WRONG_FILE_PARAMETER: {
    code: 0x214,
    httpCode: 400,
    module: 'publish',
    message: 'Wrong file parameter'
  },

  /**
   * Adding media failed, wrong parameters.
   *
   * @property ADD_MEDIA_WRONG_PARAMETERS
   * @type Object
   * @final
   */
  ADD_MEDIA_WRONG_PARAMETERS: {
    code: 0x215,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, wrong properties parameter.
   *
   * @property ADD_MEDIA_WRONG_PROPERTIES_PARAMETER
   * @type Object
   * @final
   */
  ADD_MEDIA_WRONG_PROPERTIES_PARAMETER: {
    code: 0x216,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, file already exists.
   *
   * @property ADD_MEDIA_FILE_ALREADY_EXISTS
   * @type Object
   * @final
   */
  ADD_MEDIA_FILE_ALREADY_EXISTS: {
    code: 0x217,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Convert points of interest error.
   *
   * @property CONVERT_VIDEO_POI_ERROR
   * @type Object
   * @final
   */
  CONVERT_VIDEO_POI_ERROR: {
    code: 0x218,
    httpCode: 500,
    module: 'publish'
  }
};

Object.freeze(HTTP_ERRORS);
module.exports = HTTP_ERRORS;
