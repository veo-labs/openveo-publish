'use strict';

/**
 * @module packages
 */

/**
 * Defines the list of package publication states.
 *
 * @class STATES
 * @static
 */

var STATES = {

  /**
   * Package is on error.
   *
   * @property ERROR
   * @type Number
   * @default 0
   * @final
   */
  ERROR: 0,

  /**
   * Package is in the queue waiting to be processed.
   *
   * @property PENDING
   * @type Number
   * @default 1
   * @final
   */
  PENDING: 1,

  /**
   * Package is copying.
   *
   * @property COPYING
   * @type Number
   * @default 2
   * @final
   */
  COPYING: 2,

  /**
   * Package is extracting.
   *
   * @property EXTRACTING
   * @type Number
   * @default 3
   * @final
   */
  EXTRACTING: 3,

  /**
   * Package is validating.
   *
   * @property VALIDATING
   * @type Number
   * @default 4
   * @final
   */
  VALIDATING: 4,

  /**
   * Package is preparing.
   *
   * @property PREPARING
   * @type Number
   * @default 5
   * @final
   */
  PREPARING: 5,

  /**
   * Package is waiting for a user action to be uploaded to the platform.
   *
   * @property WAITING_FOR_UPLOAD
   * @type Number
   * @default 6
   * @final
   */
  WAITING_FOR_UPLOAD: 6,

  /**
   * Package is uploading to the platform.
   *
   * @property UPLOADING
   * @type Number
   * @default 7
   * @final
   */
  UPLOADING: 7,

  /**
   * Media information are being synchronized with the platform.
   *
   * @property SYNCHRONIZING
   * @type Number
   * @default 8
   * @final
   */
  SYNCHRONIZING: 8,

  /**
   * Package is saving timecodes.
   *
   * @property SAVING_TIMECODES
   * @type Number
   * @default 9
   * @final
   */
  SAVING_TIMECODES: 9,

  /**
   * Package is copying images.
   *
   * @property COPYING_IMAGES
   * @type Number
   * @default 10
   * @final
   */
  COPYING_IMAGES: 10,

  /**
   * Package is processed but not published.
   *
   * @property READY
   * @type Number
   * @default 11
   * @final
   */
  READY: 11,

  /**
   * Package is processed and published.
   *
   * @property PUBLISHED
   * @type Number
   * @default 12
   * @final
   */
  PUBLISHED: 12,

  /**
   * Package is generating thumbnail.
   *
   * @property GENERATE_THUMB
   * @type Number
   * @default 13
   * @final
   */
  GENERATE_THUMB: 13,

  /**
   * Package is analyzing media for more information.
   *
   * @property GET_METADATA
   * @type Number
   * @default 14
   * @final
   */
  GET_METADATA: 14,

  /**
   * Package is defragmenting the mp4.
   * @type Number
   * @default 15
   * @final
   */
  DEFRAGMENT_MP4: 15,

  /**
   * Package is grouping with another one.
   * @type Number
   * @default 16
   * @final
   */
  GROUPING: 16

};
Object.freeze(STATES);
module.exports = STATES;
