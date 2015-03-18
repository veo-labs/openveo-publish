(function(angular){

  "use strict"

  var app = angular.module("ov.publish", ["ov.route", "ov.i18n"]);

  /**
   * Configures the ov.publish application by adding new routes.
   */
  app.config(["ovRouteProvider", function(ovRouteProvider){

    // Add route /publish/be/videos with authentication
    // (will be automatically mapped to /admin/publish/be/videos
    // instead of /publish/be/videos).
    // Also retrieve the list of videos
    ovRouteProvider.when("/publish/be/videos", {
      templateUrl: "publish/admin/views/videos.html",
      controller: "VideoController",
      title: "VIDEOS.PAGE_TITLE",
      resolve: {
        videos : ["$q", "publishService", function($q, publishService){
          var videosPromise = publishService.getVideos();
          
          if(videosPromise)
            return $q.when(videosPromise);
          else
            return $q.reject({ authenticated: false });
        }]
      }
    });

    // Add route /publish/be/watcher with authentication
    // (will be automatically mapped to /admin/publish/be/watcher instead
    // of /publish/be/watcher).
    // Also retrieve the watcher status
    ovRouteProvider.when("/publish/be/watcher", {
      templateUrl: "publish/admin/views/watcher.html",
      controller: "WatcherController",
      title: "WATCHER.PAGE_TITLE",
      resolve: {
        watcherStatus : ["$q", "publishService", function($q, publishService){
          return publishService.getWatcherStatus();
        }]
      }
    });

  }]);
  
})(angular);