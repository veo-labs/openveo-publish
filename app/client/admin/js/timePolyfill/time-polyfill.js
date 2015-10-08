'use strict';
(function() {

  // if time is not suported, the expression returns "text"
  var isTimeInputSupported = angular.element('<input type="time"/>')[0].type === 'time';

  /**
   * Configuration of the angular-time-polyfill module
   * @param {type} $provide The $provide service
   */
  function config($provide) {
    /**
     * Executes when "link"ing a time input
     *
     * @param {object} scope       The scope to be used by the directive for registering watches
     * @param {object} element     The element where the directive is to be used.
     * @param {object} attributes  Normalized list of attributes declared on this element
     * @param {array} controllers The directive's required controller instance(s)
     * @param {object} $compile    The $ccompile service
     * @param {object} $filter     The $filter service
     * @param {object} $parse      The parse service
     */
    function postLink(scope, element, attributes, controllers, $compile, $filter, $parse) {
      if (!controllers[0]) {
        return;
      }
      var modelAccessor = $parse(attributes['ngModel']);
      var ngModelCtrl = controllers[0];

      scope.step = attributes.step && attributes.step !== 'any' ? parseFloat(attributes.step) : 1;

      scope.addToModel = function(toAdd) {
        var value = modelAccessor(scope);
        if (angular.isDate(value)) {
          var newModelValue = new Date(value.getTime()); // clone the date object
          newModelValue.setSeconds(newModelValue.getSeconds() + toAdd);
          var newViewValue = $filter('date')(newModelValue, 'HH:mm:ss');

          // update the view only if date is inside the min and max bounds
          if ((!ngModelCtrl.$validators.min || ngModelCtrl.$validators.min(newViewValue)) &&
                  (!ngModelCtrl.$validators.max || ngModelCtrl.$validators.max(newViewValue))) {

            value.setSeconds(newModelValue.getSeconds());
            ngModelCtrl.$setViewValue(newViewValue);
            ngModelCtrl.$render();
          }
        }
      };

      // parsing and formmating to remove the trailing microseconds
      ngModelCtrl.$formatters.unshift(function(value) {
        var matches;
        if ((matches = /^(\d\d:\d\d(?::(?:\d\d))?)(?:\.\d{1,3})?$/.exec(value)) !== null) {
          value = matches[1];
        }
        return value;
      });
      ngModelCtrl.$parsers.unshift(function(value) {
        if (/^\d\d:\d\d:\d\d$/.test(value)) {
          value += '.000';
        }
        return value;
      });

      var halfHeight = (element[0].offsetHeight / 2) + 'px';
      var wrapper = angular.element('<div></div>');
      element.wrap(wrapper);
      var btnContainer = angular.element(
              '<div class="time-polyfill-btn-container">' +
              '<div' +
              ' class="time-polyfill-btn time-polyfill-btn-up"' +
              ' ng-click="addToModel(step)"' +
              ' style="height: ' + halfHeight + ';"></div>' +
              '<div' +
              ' class="time-polyfill-btn time-polyfill-btn-down"' +
              ' ng-click="addToModel(-step)"' +
              ' style="height: ' + halfHeight + ';"></div>' +
              '</div>');
      element.after($compile(btnContainer)(scope));
      element.css('width', element[0].offsetWidth - btnContainer[0].offsetWidth - 1 + 'px');
      element.css('display', 'inline-block');
    }

    if (!isTimeInputSupported) {
      $provide.decorator('inputDirective', ['$delegate', '$compile', '$filter', '$parse',
        function($delegate, $compile, $filter, $parse) {
          var directive = $delegate[0];
          if (!directive.link) {
            directive.link = {};
          }
          var previous = angular.isFunction(directive.link) ? directive.link :
                  (angular.isFunction(directive.link.post) ? directive.link.post : null);
          directive.link.post = function(scope, element, attributes, controllers) {
            if (previous) {
              previous.apply(this, arguments);
            }

            // only decorate time input
            if (attributes.type === 'time') {
              postLink(scope, element, attributes, controllers, $compile, $filter, $parse);
            }
          };

          return $delegate;
        }
      ]);
    }
  }
  angular.module('angular-time-polyfill', []).config(['$provide', config]);
})();
