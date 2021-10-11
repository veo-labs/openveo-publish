'use strict';

/**
 * @module module:publish/packages/states
 */

/**
 * Defines the list of package publication states.
 *
 * @namespace
 */

var STATES = {

  /**
   * Package is on error.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  ERROR: 0,

  /**
   * Package is in the queue waiting to be processed.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  PENDING: 1,

  /**
   * Package is copying.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  COPYING: 2,

  /**
   * Package is extracting.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  EXTRACTING: 3,

  /**
   * Package is validating.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  VALIDATING: 4,

  /**
   * Package is preparing.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  PREPARING: 5,

  /**
   * Package is waiting for a user action to be uploaded to the platform.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  WAITING_FOR_UPLOAD: 6,

  /**
   * Package is uploading to the platform.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  UPLOADING: 7,

  /**
   * Media information are being synchronized with the platform.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SYNCHRONIZING: 8,

  /**
   * Package is saving timecodes.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  SAVING_TIMECODES: 9,

  /**
   * Package is copying images.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  COPYING_IMAGES: 10,

  /**
   * Package is processed but not published.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  READY: 11,

  /**
   * Package is processed and published.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  PUBLISHED: 12,

  /**
   * Package is generating thumbnail.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GENERATE_THUMB: 13,

  /**
   * Package is analyzing media for more information.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  GET_METADATA: 14,

  /**
   * Package is defragmenting the mp4.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  DEFRAGMENT_MP4: 15,

  /**
   * Package is merging with another one.
   *
   * @const
   * @type {Number}
   * @default
   * @inner
   */
  MERGING: 16

};
Object.freeze(STATES);
module.exports = STATES;
