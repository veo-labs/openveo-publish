(function(angular){

  "use strict"

  var app = angular.module("ov.publish", ["ov.route"]);

  /**
   * Configures the ov.publish application by adding new routes.
   */
  app.config(["ovRouteProvider", function(ovRouteProvider){

    // Add route /publish with authentication (will be automatically
    // mapped to /admin/publish instead of /publish)
    // Also retrieve the list of videos
    ovRouteProvider.when("/publish", {
      templateUrl: "publish/admin/views/publish.html",
      controller: "PublishController",
      title: "Publish",
      resolve: {
        watcherStatus : ["$q", "publishService", function($q, publishService){
          return publishService.getWatcherStatus();
        }],
        videos : ["$q", "publishService", function($q, publishService){
          var videosPromise = publishService.getVideos();
          
          if(videosPromise)
            return $q.when(videosPromise);
          else
            return $q.reject({ authenticated: false });
        }]
      }
    });

  }]);
  
})(angular);