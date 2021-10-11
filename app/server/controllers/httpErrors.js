'use strict';

/**
 * @module publish/controllers/httpErrors
 */

/**
 * The list of HTTP errors with, for each error, its associated
 * hexadecimal code and HTTP return code.
 * HTTP errors are sent by controllers.
 *
 * @example
 * var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
 * console.log(HTTP_ERRORS.UNKNOWN_ERROR);
 *
 * @namespace
 */

var HTTP_ERRORS = {

  // Server errors

  /**
   * Unidentified error.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNKNOWN_ERROR: {
    code: 0x000,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting a ready video failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_ERROR: {
    code: 0x001,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Publishing a video failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  PUBLISH_VIDEOS_ERROR: {
    code: 0x002,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNPUBLISH_VIDEOS_ERROR: {
    code: 0x003,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting Publish plugin configuration failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_CONFIGURATION_ERROR: {
    code: 0x004,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of custom properties failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_PROPERTIES_ERROR: {
    code: 0x005,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of videos failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_ERROR: {
    code: 0x006,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating an entity statistics failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  STATISTICS_UPDATE_ERROR: {
    code: 0x007,
    httpCode: 500,
    module: 'publish',
    message: 'Error updating statistics'
  },

  /**
   * Saving watcher settings failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_WATCHER_SETTINGS_ERROR: {
    code: 0x008,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Attaching a file to a point of interest failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_UPLOAD_ERROR: {
    code: 0x009,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of groups, when adding a media, failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_GROUPS_ERROR: {
    code: 0x00a,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting the list of custom properties, when adding a media, failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_CUSTOM_PROPERTIES_ERROR: {
    code: 0x00b,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Parsing multipart body, when adding a media, failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_PARSE_ERROR: {
    code: 0x00c,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Checking that media does not already exists in database, when adding a media, failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_CHECK_DUPLICATE_ERROR: {
    code: 0x00d,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing temporary media file, when adding a media, failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_REMOVE_FILE_ERROR: {
    code: 0x00e,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting a ready media failed, media is not ready.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_NOT_READY_ERROR: {
    code: 0x00f,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting a ready media failed when getting video platform information.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR: {
    code: 0x010,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating a media failed when getting the media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_GET_ONE_ERROR: {
    code: 0x011,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting medias failed when getting custom properties.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_GET_PROPERTIES_ERROR: {
    code: 0x012,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Publishing medias failed when getting medias.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  PUBLISH_VIDEOS_GET_VIDEOS_ERROR: {
    code: 0x013,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Unpublishing medias failed when getting medias.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNPUBLISH_VIDEOS_GET_VIDEOS_ERROR: {
    code: 0x014,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating point of interest failed when getting the media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_GET_ONE_ERROR: {
    code: 0x015,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating point of interest failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_UPDATE_ERROR: {
    code: 0x017,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing media points of interest failed when getting the media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_GET_ONE_ERROR: {
    code: 0x019,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing points of interest failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_REMOVE_ERROR: {
    code: 0x01a,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Converting points of interest failed when getting media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_GET_MEDIA_ERROR: {
    code: 0x01d,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Converting points of interest failed, media is not ready.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_MEDIA_NOT_READY_ERROR: {
    code: 0x01e,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating media statistics failed when getting media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  STATISTICS_GET_ONE_ERROR: {
    code: 0x01f,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Convert points of interest failed when updating the media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_UPDATE_MEDIA_ERROR: {
    code: 0x020,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Invalid video thumbnail.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  INVALID_VIDEO_THUMBNAIL: {
    code: 0x021,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating a media failed when parsing body.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_PARSE_ERROR: {
    code: 0x022,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating a media failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_ERROR: {
    code: 0x023,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting media failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_ERROR: {
    code: 0x024,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting media failed when getting video platform information.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR: {
    code: 0x025,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting custom properties failed while saving TLS settings.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_TLS_SETTINGS_CUSTOM_PROPERTIES_ERROR: {
    code: 0x026,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Saving TLS settings failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_TLS_SETTINGS_ERROR: {
    code: 0x027,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Synchronizing media with media platform failed while updating media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_SYNCHRONIZE_ERROR: {
    code: 0x028,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing medias failed, a media is not in a stable state.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_MEDIAS_STATE_ERROR: {
    code: 0x029,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing medias failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_MEDIAS_ERROR: {
    code: 0x02a,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing medias failed when getting the list of medias.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_MEDIAS_GET_MEDIAS_ERROR: {
    code: 0x02b,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting medias failed when getting the list of categories.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_GET_CATEGORIES_ERROR: {
    code: 0x02c,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Saving catalog settings failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_CATALOG_SETTINGS_ERROR: {
    code: 0x02d,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Adding media failed when verifying the owner.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_VERIFY_OWNER_ERROR: {
    code: 0x02e,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Creating point of interest failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_CREATE_ERROR: {
    code: 0x02f,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Updating point of interest of a media failed.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_UPDATE_MEDIA_ERROR: {
    code: 0x030,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Removing points of interest when updating the media.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_UPDATE_MEDIA_ERROR: {
    code: 0x031,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting a ready video failed when getting points of interest.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_POPULATE_WITH_POIS_ERROR: {
    code: 0x032,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting media failed when populating with points of interest.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_POPULATE_WITH_POIS_ERROR: {
    code: 0x033,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Converting points of interest failed when getting points of interest.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_GET_POIS_ERROR: {
    code: 0x034,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Converting points of interest failed when updating a point of interest.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_UPDATE_POI_ERROR: {
    code: 0x035,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting medias failed when getting the list of categories.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_POPULATE_WITH_POIS_ERROR: {
    code: 0x036,
    httpCode: 500,
    module: 'publish'
  },

  /**
   * Getting medias failed when searching in points of interest.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_SEARCH_IN_POIS_ERROR: {
    code: 0x037,
    httpCode: 500,
    module: 'publish'
  },

  // Authentication errors

  /**
   * Getting a ready video failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_FORBIDDEN: {
    code: 0x100,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Publishing a video failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  PUBLISH_VIDEOS_FORBIDDEN: {
    code: 0x101,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNPUBLISH_VIDEOS_FORBIDDEN: {
    code: 0x102,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Updating a media point of interest failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_FORBIDDEN: {
    code: 0x103,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Updating a media failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_FORBIDDEN: {
    code: 0x104,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Removing media points of interest failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_FORBIDDEN: {
    code: 0x106,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Converting points of interest failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_FORBIDDEN: {
    code: 0x108,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Getting media failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_FORBIDDEN: {
    code: 0x109,
    httpCode: 403,
    module: 'publish'
  },

  /**
   * Removing medias failed, user doesn't have enough privilege.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_MEDIAS_FORBIDDEN: {
    code: 0x10a,
    httpCode: 403,
    module: 'publish'
  },

  // Wrong parameters

  /**
   * Getting a ready video failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_MISSING_PARAMETERS: {
    code: 0x200,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Publishing a video failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  PUBLISH_VIDEOS_MISSING_PARAMETERS: {
    code: 0x201,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Unpublishing a video failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNPUBLISH_VIDEOS_MISSING_PARAMETERS: {
    code: 0x202,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Retrying video processing failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  RETRY_VIDEOS_MISSING_PARAMETERS: {
    code: 0x203,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Starting a video upload failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  START_UPLOAD_VIDEOS_MISSING_PARAMETERS: {
    code: 0x204,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Setting statistics about an entity failed, missing the id parameter.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
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
   * @const
   * @type {Object}
   * @default
   * @inner
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
   * @const
   * @type {Object}
   * @default
   * @inner
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
   * @const
   * @type {Object}
   * @default
   * @inner
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
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_WRONG_PARAMETERS: {
    code: 0x209,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Updating a media point of interest failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_MISSING_PARAMETERS: {
    code: 0x20a,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Removing media points of interest failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_MISSING_PARAMETERS: {
    code: 0x20b,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding a media failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_MISSING_PARAMETERS: {
    code: 0x20c,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, missing the body.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_MISSING_INFO_PARAMETERS: {
    code: 0x20d,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, wrong file parameter.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_WRONG_FILE_PARAMETER: {
    code: 0x20e,
    httpCode: 400,
    module: 'publish',
    message: 'Wrong file parameter'
  },

  /**
   * Adding media failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_WRONG_PARAMETERS: {
    code: 0x20f,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, wrong properties parameter.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_WRONG_PROPERTIES_PARAMETER: {
    code: 0x210,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving watcher settings failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_WATCHER_SETTINGS_MISSING_PARAMETERS: {
    code: 0x211,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving watcher settings failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_WATCHER_SETTINGS_WRONG_PARAMETERS: {
    code: 0x212,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Getting video ready failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_WRONG_PARAMETERS: {
    code: 0x213,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Publishing videos failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  PUBLISH_VIDEOS_WRONG_PARAMETERS: {
    code: 0x214,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Unpublishing videos failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UNPUBLISH_VIDEOS_WRONG_PARAMETERS: {
    code: 0x215,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Starting videos upload failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  START_UPLOAD_VIDEOS_WRONG_PARAMETERS: {
    code: 0x216,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Updating a media point of interest failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_POI_WRONG_PARAMETERS: {
    code: 0x217,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Removing media points of interest failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_POIS_WRONG_PARAMETERS: {
    code: 0x21a,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Converting points of interest failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_MISSING_PARAMETERS: {
    code: 0x21d,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Converting points of interest failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  CONVERT_POIS_WRONG_PARAMETERS: {
    code: 0x21e,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Getting media failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_WRONG_PARAMETERS: {
    code: 0x21f,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Getting media failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_MISSING_PARAMETERS: {
    code: 0x220,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Retrying video processing failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  RETRY_VIDEOS_WRONG_PARAMETERS: {
    code: 0x221,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Getting the list of videos failed, wrong custom properties values.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEOS_CUSTOM_PROPERTIES_WRONG_PARAMETERS: {
    code: 0x222,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving TLS settings failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_TLS_SETTINGS_WRONG_PARAMETERS: {
    code: 0x223,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving TLS settings failed, one or more custom properties do not exist.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_TLS_SETTINGS_WRONG_PROPERTIES_PARAMETER: {
    code: 0x224,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, missing the media file.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_MISSING_FILE_PARAMETER: {
    code: 0x225,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Removing medias failed, missing the media ids.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  REMOVE_MEDIAS_MISSING_PARAMETERS: {
    code: 0x226,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving catalog settings failed, wrong parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_CATALOG_SETTINGS_WRONG_PARAMETERS: {
    code: 0x227,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Saving catalog settings failed, missing parameters.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  SAVE_CATALOG_SETTINGS_MISSING_PARAMETERS: {
    code: 0x228,
    httpCode: 400,
    module: 'publish'
  },

  /**
   * Adding media failed, specified user does not exist.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  ADD_MEDIA_WRONG_USER_PARAMETER: {
    code: 0x229,
    httpCode: 400,
    module: 'publish'
  },

  // Not found errors

  /**
   * Ready video was not found.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_VIDEO_READY_NOT_FOUND: {
    code: 0x300,
    httpCode: 404,
    module: 'publish'
  },

  /**
   * Media was not found.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  GET_MEDIA_NOT_FOUND: {
    code: 0x301,
    httpCode: 404,
    module: 'publish'
  },

  /**
   * Media was not found when trying to update it.
   *
   * @const
   * @type {Object}
   * @default
   * @inner
   */
  UPDATE_MEDIA_NOT_FOUND_ERROR: {
    code: 0x302,
    httpCode: 404,
    module: 'publish'
  }

};

Object.freeze(HTTP_ERRORS);
module.exports = HTTP_ERRORS;
