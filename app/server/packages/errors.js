'use strict';

/**
 * @module publish/packages/errors
 */

/**
 * Defines the list of package publication errors.
 *
 * @namespace
 */

var ERRORS = {

  /**
   * No error.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  NO_ERROR: -1,

  /**
   * Error involving a server error.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UNKNOWN: 0,

  /**
   * Package type is not supported.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INVALID_PACKAGE_TYPE: 1,

  /**
   * Package copy failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  COPY: 2,

  /**
   * Removing original package failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UNLINK: 3,

  /**
   * Extracting an archive package failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  EXTRACT: 4,

  /**
   * Package does not respect the expected format for its type.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  VALIDATION: 5,

  /**
   * Saving package data into database failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_PACKAGE_DATA: 7,

  /**
   * Creating synchro.json file failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_TIMECODE: 8,

  /**
   * Uploading media to media platform failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MEDIA_UPLOAD: 9,

  /**
   * Synchronizing media to the media platform failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MEDIA_SYNCHRONIZE: 10,

  /**
   * Scanning package temporary directory failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SCAN_FOR_IMAGES: 11,

  /**
   * Cleaning package temporary directory failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  CLEAN_DIRECTORY: 13,

  /**
   * Retrying / uploading package failed.
   *
   * Package was not found.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  PACKAGE_NOT_FOUND: 14,

  /**
   * Executing a state machine transition failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  TRANSITION: 15,

  /**
   * Package configuration is not valid when creating a Package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INVALID_CONFIGURATION: 16,

  /**
   * Generating media thumbnail failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB: 17,

  /**
   * Getting media metadata failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GET_METADATA: 18,

  /**
   * Copying media thumbnail failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  COPY_THUMB: 19,

  /**
   * Defragmentation of the mp4 failed
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  DEFRAGMENTATION: 20,

  /**
   * Remove fragmented file
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UNLINK_FRAGMENTED: 21,

  /**
   * Replacing fragmented file
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  REPLACE_FRAGMENTED: 22,

  /**
   * A media with the same file name as already been published.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  DUPLICATE_MEDIA: 23,

  /**
   * Merging the media failed while changing state.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_CHANGE_MEDIA_STATE: 24,

  /**
   * Merging the media failed while trying to get a media with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_GET_MEDIA_ERROR: 25,

  /**
   * Merging the media failed while waiting for a media with the same name to have a stable state.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_WAIT_FOR_MEDIA_ERROR: 26,

  /**
   * Merging the media failed while changing state of the other media.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_CHANGE_OTHER_MEDIA_STATE: 27,

  /**
   * Merging the media failed while merging medias.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_MEDIAS: 28,

  /**
   * Merging the media failed while removing the not chosen media.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_REMOVE_NOT_CHOSEN: 29

};

Object.freeze(ERRORS);
module.exports = ERRORS;
