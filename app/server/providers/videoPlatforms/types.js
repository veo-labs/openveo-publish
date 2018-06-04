'use strict';

/**
 * @module providers
 */

/**
 * Defines the list of media platforms types.
 *
 * @class TYPES
 * @static
 */

var TYPES = {

  /**
   * Vimeo provider.
   *
   * @property VIMEO
   * @type String
   * @default 'vimeo'
   * @final
   */
  VIMEO: 'vimeo',

  /**
   * Youtube provider.
   *
   * @property YOUTUBE
   * @type String
   * @default 'youtube'
   * @final
   */
  YOUTUBE: 'youtube',

  /**
   * Wowza provider.
   *
   * @property WOWZA
   * @type String
   * @default 'wowza'
   * @final
   */
  WOWZA: 'wowza',

  /**
   * Local provider.
   *
   * @property LOCAL
   * @type String
   * @default 'local'
   * @final
   */
  LOCAL: 'local'

};
Object.freeze(TYPES);
module.exports = TYPES;
