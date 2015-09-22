'use strict';

(function(angular) {

  function OvRouteProvider($routeProvider) {
    this.when = $routeProvider.when;
    this.$get = function() {
    };
  }

  var app = angular.module('ov.route', ['ngRoute']);

  app.provider('ovRoute', OvRouteProvider);
  OvRouteProvider.$inject = ['$routeProvider'];

})(angular);
