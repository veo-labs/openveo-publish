'use strict';

/**
 * @module publish/providers/mediaPlatforms/types
 */

/**
 * Defines the list of media platforms types.
 *
 * @namespace
 */

var TYPES = {

  /**
   * Vimeo provider.
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  VIMEO: 'vimeo',

  /**
   * Youtube provider.
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  YOUTUBE: 'youtube',

  /**
   * Wowza provider.
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  WOWZA: 'wowza',

  /**
   * Local provider.
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  LOCAL: 'local',

  /**
   * TLS provider.
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  TLS: 'tls'

};
Object.freeze(TYPES);
module.exports = TYPES;
