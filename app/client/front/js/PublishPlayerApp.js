(function(angular){

  "use strict"
  
  var app = angular.module("ov.publish.player", ["ngAnimate", "ov.player"]);
  
  /**
   * Configures the ov.publish application by adding new routes.
   */
  app.config(["$locationProvider", function($locationProvider){
    $locationProvider.html5Mode(true);
  }]);
  
})(angular);