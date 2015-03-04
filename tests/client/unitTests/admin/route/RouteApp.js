(function(angular){

  "use strict"

  var app = angular.module("ov.route", ["ngRoute"]);
  
  app.provider("ovRoute", OvRouteProvider);
  OvRouteProvider.$inject = ["$routeProvider"];             

  function OvRouteProvider($routeProvider){
    this.when = $routeProvider.when;
    this.$get = function(){};
  };
  
})(angular);