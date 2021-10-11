'use strict';

/**
 * @module publish/hooks
 */

/**
 * Defines the list of hooks sent by publish.
 *
 * @example
 * var publishApi = process.api.getApi('publish');
 * var PUBLISH_HOOKS = publishApi.getHooks();
 * publishApi.registerAction(PUBLISH_HOOKS.PROPERTIES_DELETED, function(ids, callback) {
 *   console.log(ids);
 *   callback();
 * );
 * @namespace
 */

var PUBLISH_HOOKS = {

  /**
   * One or several properties have been deleted.
   *
   * With:
   * - **Array** The list of deleted properties ids
   * - **Function** The function to call when action is done
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  PROPERTIES_DELETED: 'properties.deleted',

  /**
   * One or several medias have been deleted.
   *
   * With:
   * - **Array** The list of deleted medias
   * - **Function** The function to call when action is done
   *
   * @const
   * @type {String}
   * @default
   * @inner
   */
  MEDIAS_DELETED: 'medias.deleted'

};

Object.freeze(PUBLISH_HOOKS);
module.exports = PUBLISH_HOOKS;
