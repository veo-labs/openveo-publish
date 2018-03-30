'use strict';

/**
 * @module publish
 */

/**
 * Defines the list of hooks sent by publish.
 *
 * @example
 *     var publishApi = process.api.getApi('publish');
 *     var PUBLISH_HOOKS = publishApi.getHooks();
 *     publishApi.registerAction(PUBLISH_HOOKS.PROPERTIES_DELETED, function(ids, callback) {
 *       console.log(ids);
 *       callback();
 *     );
 *
 * @class PUBLISH_HOOKS
 * @static
 */

var PUBLISH_HOOKS = {

  /**
   * One or several properties have been deleted.
   *
   * With:
   * - **Array** The list of deleted properties ids
   * - **Function** The function to call when action is done
   *
   * @property PROPERTIES_DELETED
   * @type String
   * @default 'properties.deleted'
   * @final
   */
  PROPERTIES_DELETED: 'properties.deleted'

};

Object.freeze(PUBLISH_HOOKS);
module.exports = PUBLISH_HOOKS;
