'use strict';

/**
 * @module ov.publish/multirange
 */

angular.module('ov.multirange', ['ov.multirange.lite', 'ov.utils'])
  .directive('ovMultirange', ['ovMultirangeViews', function(ovMultirangeViews) {
    return {
      required: 'ngModel',
      scope: {
        ngModel: '=',
        _views: '=views',
        _view: '=view',
        duration: '=duration',
        onSelect: '=',
        onMouserelease: '=',
        onEnablemouseover: '='
      },
      template:
        '<div class="ov-multirange-mk2-container">' +
        '<ov-multirange-labels render="renderedStyle" duration="duration" on-enablemouseover="onEnablemouseover" ' +
        'on-select="onSelect" ng-model="ranges"></ov-multirange-labels>' +
        '<ov-multirange-lite ng-model="ranges" duration="duration" on-enablemouseover="onEnablemouseover" ' +
        'on-select="onSelect" on-mouserelease="onMouserelease" ng-style="renderedStyle.multirange" step="step">' +
        '</ov-multirange-lite>' +
        '<ov-multirange-hairlines render="renderedStyle" ng-model="units"></ov-multirange-hairlines>' +
        '</div>',
      link: function(scope) {
        scope.ranges = [];

        /**
         * Update ranges if the duration is setted
         */
        function updateRanges() {
          if (scope.duration !== undefined) {
            scope.ranges = scope.ngModel;
          }
        }

        scope.$watch('duration', updateRanges);
        scope.$watch('ngModel', updateRanges);

        scope.getPercent = function(value) {
          return (value * 100) + '%';
        };

        scope.changeView = function(n) {
          if (typeof n == 'undefined' || typeof scope.views == 'undefined')
            return;
          var l = scope.views.length - 1,
            view;
          n = (n < 0) ? 0 : ((n > l) ? l : n);
          view = scope.views[n];
          if (typeof view != 'undefined') {
            scope.zoom = view.zoom;
            scope.step = view.step;
            scope.units = view.units;
            scope.renderer();
          }
        };

        scope.$watch('_view', function(n) {
          scope.changeView(n);
        });

        scope.$watch('_views', function(n) {
          scope.views = n;
          scope.view = 0;
          scope.changeView(0);
        });

        scope.renderer = function() {
          if (typeof scope.zoom == 'undefined')
            return;
          var render = {
            container: {},
            content: {},
            multirange: {
              width: scope.getPercent(scope.zoom),
              display: 'block',
              margin: 'auto'
            }
          };

          if (scope.zoom < 1) {
            render.content.margin = '2 auto';
            render.content.width = 'calc(' + scope.getPercent(scope.zoom) + ' - 10px)';
            render.container.marginLeft = '0';
          } else {
            render.content.margin = '2 0';
            render.content.width = 'calc(' + scope.getPercent(scope.zoom) + ' - ' + (10 - (scope.zoom * 5)) + 'px)';
            render.container.marginLeft = '5px';
          }
          return scope.renderedStyle = render;
        };

        // set default view config
        if (typeof scope.views == 'undefined') {
          scope.views = ovMultirangeViews.DEFAULT;
          scope.view = 0;
          scope.changeView(0);
        }

      }
    };
  }])
  .directive('ovMultirangeLabels', function() {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=',
        render: '=',
        duration: '=',
        onSelect: '=',
        onEnablemouseover: '='
      },
      template:
        '<div class="ov-multirange-mk2-labels-container" ng-style="render.container">' +
        '<ul class="ov-multirange-mk2-labels" ng-style="render.content">' +
        '<li class="ov-multirange-mk2-label" ng-class="{\'active\':range.select}" ng-repeat="range in ngModel" ' +
        'ng-style="renderRange(range)" ng-mouseover="mouseover(range, onSelect, onEnablemouseover)" >' +
        '<span ng-if="range.name && !range.type">{{ range.name }}</span>' +
        '<span ng-if="!range.name && !range.type"><div class="glyphicon glyphicon-map-marker"></div></span>' +
        '<span ng-if="range.type && range.type==\'begin\'" ng-class="range.type">' +
        '<div class="glyphicon glyphicon-log-out">' +
        '</div></span>' +
        '<span ng-if="range.type && range.type==\'end\'" ng-class="range.type">' +
        '<div class="glyphicon glyphicon-log-in"></div></span>' +
        '</li>' +
        '</ul>' +
        '</div>',
      link: function(scope) {
        scope.renderRange = function(range) {
          return {
            left: (range.value / scope.duration) * 100 + '%',
            zIndex: range._depth
          };
        };
        scope.mouseover = function(range, select, condition) {
          if (!range.select && condition)
            select(range);
        };
      }
    };
  })
  .directive('ovMultirangeHairlines', function() {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=',
        render: '='
      },
      template:
        '<div class="ov-multirange-mk2-hairlines-container" ng-style="render.container">' +
        '<ul class="ov-multirange-mk2-hairlines" ng-style="render.content">' +
        '<li class="ov-multirange-mk2-hairline" ng-repeat="hairline in hairlines" ng-style="hairline.render">' +
        '<span>{{ hairline.label }}</span>' +
        '</li>' +
        '</ul>' +
        '</div>',
      link: function(scope) {

        scope.$watch('ngModel', function(n) {
          if (typeof n == 'undefined')
            return;
          scope.hairlines = [];
          var levels = n.length,
            hairHeight = 12,
            hairline,
            i,
            j,
            u;
          for (i = 0; i < levels; i++) {
            u = n[i];
            for (j = 0; ((j > 1) ? Math.round(j * 1000) / 1000 : j) <= 1; j = parseFloat((j + u.value).toFixed(8))) {
              hairline = {
                render: {
                  height: hairHeight * (1 - i / levels),
                  left: (j * 100) + '%'
                }
              };
              if (typeof u.labeller == 'function') {
                hairline.label = u.labeller(j);
              } else if (typeof u.labeller != 'undefined') {
                hairline.label = j;
              }
              scope.hairlines.push(hairline);
            }
          }
        });

      }
    };
  })
  .factory('ovMultirangeViews', ['ovUtils', function(ovUtils) {
    var tv = ovUtils.time.fromTimeToValue,
      vt = ovUtils.time.fromValueToTime;

    return {
      TIME: function(duration) {
        var zoomArray = [];
        var level = 0;
        if (duration > 3600000) { // 1h
          level = 1;
        } else if (duration > 1800000) { // 30min
          level = 2;
        } else if (duration > 600000) { // 10min
          level = 3;
        } else {
          level = 4;
        }
        var labeller = function(n) {
          var time = vt(n, duration);
          var label = time.hours != 0 ? time.hours + 'h' : '';
          return label + time.minutes + 'm';
        };
        var zoom = [0.9, 2, 4, 8];

        for (level; level <= 4; level++) {
          if (level == 1) {
            zoomArray.push({
              zoom: zoom[zoomArray.length],
              step: tv(0, 1, 0, duration),
              units: [
                {
                  value: tv(0, 20, 0, duration),
                  labeller: labeller
                },
                {
                  value: tv(0, 5, 0, duration)
                }
              ]
            });
          }
          if (level == 2) {
            zoomArray.push({
              zoom: zoom[zoomArray.length],
              step: tv(0, 0, 10, duration),
              units: [
                {
                  value: tv(0, 10, 0, duration),
                  labeller: labeller
                },
                {
                  value: tv(0, 2, 0, duration)
                }
              ]
            });
          }
          if (level == 3) {
            zoomArray.push({
              zoom: zoom[zoomArray.length],
              step: tv(0, 0, 1, duration),
              units: [
                {
                  value: tv(0, 5, 0, duration),
                  labeller: labeller
                },
                {
                  value: tv(0, 1, 0, duration)
                }
              ]
            });
          }
          if (level == 4) {
            zoomArray.push({
              zoom: zoom[zoomArray.length],
              step: tv(0, 0, 1, duration),
              units: [
                {
                  value: tv(0, 2, 0, duration),
                  labeller: labeller
                },
                {
                  value: tv(0, 0, 30, duration)
                }
              ]
            });
          }
        }

        return zoomArray;
      }
    };
  }]);

angular.module('ov.multirange.lite', [])
  .directive('ovMultirangeLite', function() {
    return {
      required: 'ngModel',
      scope: {
        ngModel: '=',
        step: '=',
        duration: '=',
        onSelect: '=',
        onMouserelease: '=',
        onEnablemouseover: '='
      },
      template:
        '<div class="ov-multirange-container" ng-mousemove="onMouseMove($event, onEnablemouseover)">' +
        '<div class="ov-multirange-track"></div>' +
        '<div class="ov-multirange-wrapper" ng-repeat="range in ngModel" ng-style="computeDepth(range)" ' +
        'ng-mouseup="mouserelease(onMouserelease, range)" ' +
        'ng-mouseover="mouseover(range, onSelect, onEnablemouseover)" >' +
        '<ov-range class="ov-multirange" duration="duration" ng-class="{\'active\':range.select}" ' +
        'position="range.value" min="0" max="{{ duration }}" step="{{ preciseStep }}">' +
        '</div>' +
        '</div>',
      link: function(scope, elem) {
        var mousex;
        scope.precision = scope.duration;
        scope.preciseStep = 1000;
        scope.onMouseMove = function(evt, condition) {
          if (condition) {
            var bound = elem[0].getBoundingClientRect();
            mousex = Math.min((evt.pageX - bound.left) / bound.width, 1);
          }
        };
        scope.mouserelease = function(release, range) {
          release(range);
        };
        scope.mouseover = function(range, select, condition) {
          if (!range.select && condition)
            select(range);
        };
        scope.computeDepth = function(range) {
          range._depth = 100 - Math.round(Math.abs(mousex - range.value / scope.duration) * 100);
          return {
            zIndex: range._depth
          };
        };
      }
    };
  })
  .directive('ovRange', function() {
    return {
      template: '<input type="range" ng-model="position">',
      require: ['?ngModel'],
      restrict: 'E',
      replace: true,
      scope: {
        position: '='
      },
      link: function(scope, elem, attr, controllers) {
        var ngModelCtrl = controllers[0];

        ngModelCtrl.$parsers.push(function(n) {
          return parseInt(n);
        });

        elem.bind('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
        });
      }
    };
  });

angular.module('ov.utils', [])
  .factory('ovUtils', function() {
    return {
      time: {
        fromTimeToValue: function(hours, minutes, second, dayConst) {
          var d = new Date(0);
          d.setUTCHours(hours);
          d.setUTCMinutes(minutes);
          d.setUTCSeconds(second);
          return d.getTime() / dayConst;
        },
        fromValueToTime: function(value, dayConst) {
          var d = new Date(Math.round(dayConst * value));
          return {
            hours: d.getUTCHours() + ((d.getUTCDate() - 1) * 24),
            minutes: d.getUTCMinutes(),
            seconds: d.getUTCSeconds()
          };
        }
      },
      format: {
        padZeroes: function(num, size) {
          var s = '000000000' + num;
          return s.substr(s.length - size);
        }
      }
    };
  });
