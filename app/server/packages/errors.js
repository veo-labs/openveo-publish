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
   * Saving points of interest failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST: 8,

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
   * Initializing merge failed while looking for packages with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INIT_MERGE_GET_PACKAGES_WITH_SAME_NAME: 24,

  /**
   * Initializing merge failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INIT_MERGE_UPDATE_PACKAGE: 25,

  /**
   * Initializing merge failed while waiting for a package with the same name to be in READY or PUBLISHED state.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INIT_MERGE_WAIT_FOR_MEDIA: 26,

  /**
   * Initializing merge failed while locking the other package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  INIT_MERGE_LOCK_PACKAGE: 27,

  /**
   * Finalizing merge failed while looking for a locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  FINALIZE_MERGE_GET_PACKAGE_WITH_SAME_NAME: 28,

  /**
   * Finalizing merge failed while releasing locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  FINALIZE_MERGE_RELEASE_PACKAGE: 29,

  /**
   * Merging failed while getting locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_GET_PACKAGE_WITH_SAME_NAME: 30,

  /**
   * Merging failed while reading the public directory of the locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_READ_PACKAGE_WITH_SAME_NAME_PUBLIC_DIRECTORY: 31,

  /**
   * Merging failed while removing sprites of locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_REMOVE_PACKAGE_WITH_SAME_NAME_SPRITES: 32,

  /**
   * Merging failed while copying images to public directory of the locked package with the same name.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_COPY_IMAGES: 33,

  /**
   * Merging failed while getting package points of interest.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_GET_POINTS_OF_INTEREST: 34,

  /**
   * Merging failed while duplicating package points of interest.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_DUPLICATE_POINTS_OF_INTEREST: 35,

  /**
   * Merging failed while generating sprites of merged points of interest.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_GENERATE_SPRITES: 36,

  /**
   * Merging failed while updating locked package with the same name with new timecodes, tags and state.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_UPDATE_PACKAGE_WITH_SAME_NAME: 37,

  /**
   * Merging failed while updating medias of the locked package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGE_UPDATE_MEDIAS: 38,

  /**
   * Removing the package failed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  REMOVE_PACKAGE: 39,

  /**
   * Validating package failed while getting archive format.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  VALIDATE_GET_FORMAT: 40,

  /**
   * Validating package failed while getting archive metadatas.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  VALIDATE_GET_METADATAS: 41,

  /**
   * Validating package failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  VALIDATE_UPDATE_PACKAGE: 42,

  /**
   * Uploading media failed while getting media file path.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UPLOAD_GET_MEDIA_FILE_PATH: 43,

  /**
   * Uploading media failed while updating the package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UPLOAD_MEDIA_UPDATE_PACKAGE: 44,

  /**
   * Getting media metadata failed while getting media file path.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GET_METADATA_GET_MEDIA_FILE_PATH: 45,

  /**
   * Getting media metadata failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GET_METADATA_UPDATE_PACKAGE: 46,

  /**
   * Generating thumb failed while getting media file path.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB_GET_MEDIA_FILE_PATH: 47,

  /**
   * Generating thumb failed while copying original thumb.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB_COPY_ORIGINAL: 48,

  /**
   * Generating thumb failed while removing original thumb.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB_REMOVE_ORIGINAL: 49,

  /**
   * Generating thumb failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB_UPDATE_PACKAGE: 50,

  /**
   * Defragmenting MP4 failed while getting archive format.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  DEFRAGMENT_MP4_GET_FORMAT: 51,

  /**
   * Defragmenting MP4 failed while getting medias.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  DEFRAGMENT_MP4_GET_MEDIAS: 52,

  /**
   * Uploading media failed while getting archive format.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UPLOAD_MEDIA_GET_FORMAT: 53,

  /**
   * Uploading media failed while getting medias.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UPLOAD_MEDIA_GET_MEDIAS: 54,

  /**
   * Saving points of interest failed while getting archive format.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST_GET_FORMAT: 55,

  /**
   * Saving points of interest failed while saving package metadata.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE_METADATA: 56,

  /**
   * Saving points of interest failed while generating sprites.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST_GENERATE_SPRITES: 57,

  /**
   * Saving points of interest failed while adding tags.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST_ADD_TAGS: 58,

  /**
   * Saving points of interest failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVE_POINTS_OF_INTEREST_UPDATE_PACKAGE: 59,

  /**
   * Extracting archive failed while veryfing extracted files.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  EXTRACT_VERIFY: 60,

  /**
   * Extracting archive failed while updating package.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  EXTRACT_UPDATE_PACKAGE: 61

};

Object.freeze(ERRORS);
module.exports = ERRORS;
