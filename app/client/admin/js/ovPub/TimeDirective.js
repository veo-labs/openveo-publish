'use strict';

(function(app) {

  /**
   * Time directive
   *
   * Provide a new HTML element ovp-time. This element will create three input (hours, minutes and
   * seconds) for selecting time. Theese inputs will be joined in a single string (hh:mm:ss) to set
   * the viewValue and will be converted in milliseconds for the modelValue.
   *
   * The attribute milliseconds-max must be set to validate the value range.
   *
   * @module ov.publish
   * @class ovpTime
   */
  function ovpTime($filter) {
    return {
      restrict: 'E',
      require: ['?ngModel'],
      replace: true,
      templateUrl: 'ov-publish-time.html',
      scope: {},
      link: function(scope, el, attrs, controllers) {
        var ngModelCtrl = controllers[0];
        var time;

        // Convert one digit integer to two chars string (ex: 2 to '02')
        var pad = function(value) {
          return ('0' + value).slice(-2);
        };

        // Convert viewValue to modelValue (hh:mm:ss to ms)
        ngModelCtrl.$parsers.push($filter('timeToMilliseconds'));

        // Convert modelValue to viewValue (ms to hh:mm:ss)
        ngModelCtrl.$formatters.push($filter('millisecondsToTime'));

        ngModelCtrl.$render = function() {
          if (undefined === ngModelCtrl.$viewValue) {
            return;
          }

          var matches = ngModelCtrl.$viewValue.match(/^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/);

          if (null === matches) {
            return;
          }

          scope.hours = matches[1];
          scope.minutes = matches[2];
          scope.seconds = matches[3];
        };

        /**
         * notEmpty Constraints
         *
         * If the parser can't convert the viewValue, the modelValue be undefined.
         */
        ngModelCtrl.$validators.notEmpty = function(modelValue, viewValue) {
          return modelValue !== undefined;
        };

        /**
         * range Constraints
         *
         * The model value must be greater or equals to zero and can't exceed
         * the max value setted in the attributes.
         */
        ngModelCtrl.$validators.range = function(modelValue, viewValue) {
          return modelValue >= 0 && modelValue <= attrs.millisecondsMax;
        };

        /**
         * Set the viewValue on change events
         */
        scope.updateTime = function() {
          time = pad(scope.hours) + ':' + pad(scope.minutes) + ':' + pad(scope.seconds);

          ngModelCtrl.$setViewValue(time);
        };

        /**
         * Add zero below the input's value to match the two digits string pattern
         * on blur event.
         */
        scope.formatInputs = function() {
          if (ngModelCtrl.$valid) {
            scope.hours = pad(scope.hours);
            scope.minutes = pad(scope.minutes);
            scope.seconds = pad(scope.seconds);
          }
        };
      }
    };
  }

  app.directive('ovpTime', ovpTime);
  ovpTime.$inject = ['$filter'];

})(angular.module('ov.publish'));
