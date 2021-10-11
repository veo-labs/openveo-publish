'use strict';

(function(angular, app) {

  /**
   * Convert time string (hh:mm:ss) into milliseconds
   *
   * @class TimeToMilliseconds
   * @memberof module:ov.publish
   * @inner
   */
  function TimeToMilliseconds() {

    /**
     * @method timeToMilliseconds
     * @memberof module:ov.publish~TimeToMilliseconds
     */
    return function(value) {
      if (typeof value !== 'string') {
        return undefined;
      }

      var matches = value.match(/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/);

      if (null === matches) {
        return undefined;
      }

      var hours = parseInt(matches[1]);
      var minutes = parseInt(matches[2]);
      var seconds = parseInt(matches[3]);

      return ((hours * 60 + minutes) * 60 + seconds) * 1000;
    };

  }

  app.filter('timeToMilliseconds', TimeToMilliseconds);

})(angular, angular.module('ov.publish'));
