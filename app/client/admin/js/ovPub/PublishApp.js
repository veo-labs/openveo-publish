
var ovPlayerDirectory = "/publish/lib/openveo-player/";
(function(angular){

  "use strict"

  var app = angular.module("ov.publish", ["ov.route", "ov.i18n", "ov.entity", "ov.player", "vds.multirange",]);

  app.run(["$rootScope", "$window", function ($rootScope, $window) {
      $rootScope.$on("$locationChangeStart", function (event, next, current) {
        // url slug : shortening the url to stuff that follows after "#"
        current = current.slice(current.lastIndexOf('/publish/be/') + 12, current.length);
        next = next.slice(next.lastIndexOf('/publish/be/') + 12, next.length);
        if(current == 'videos' && next.lastIndexOf("video/")>= 0){
          $rootScope.newAnimation = "RL";
        } else if (current.lastIndexOf("video/")>= 0 && next == 'videos'){
          $rootScope.newAnimation = "LR";
        } else {
          $rootScope.newAnimation = "";
        }
      });
    }]);
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
      access: "access-videos-page",
      resolve: {
        categories : ["publishService", function(publishService){
          return publishService.loadCategories();
        }],
        properties : ["publishService", function(publishService){
          return publishService.loadProperties();
        }]
      }
    });
        
    // Add route /publish/be/videos/videosId with authentication
    // (will be automatically mapped
    // to /admin/publish/be/videos/videosId instead
    // of /publish/be/videos/videosId).
    // Also retrieve the list of properties
    ovRouteProvider.when("/publish/be/video/:videoId", {
      templateUrl: "publish/admin/views/chapter.html",
      controller: "ChapterController",
      title: "CHAPTER.PAGE_TITLE",
      access: "chapter-video",
      resolve: {
        video : ["publishService", "$route", function(publishService, $route){
          var videoId= $route.current.params.videoId;
          return publishService.getVideoChapter(videoId);
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
      access: "access-watcher-page",
      resolve: {
        watcherStatus : ["publishService", function(publishService){
          return publishService.getWatcherStatus();
        }]
      }
    });

    // Add route /publish/be/properties with authentication
    // (will be automatically mapped
    // to /admin/publish/be/properties instead
    // of /publish/be/properties).
    // Also retrieve the list of properties
    ovRouteProvider.when("/publish/be/properties", {
      templateUrl: "publish/admin/views/properties.html",
      controller: "PropertiesController",
      title: "PROPERTIES.PAGE_TITLE",
      access: "access-properties-page"
    });
    
    // Add route /publish/be/categories with authentication
    // (will be automatically mapped
    // to /admin/publish/be/categories instead
    // of /publish/be/categories).
    // Also retrieve the list of properties
    ovRouteProvider.when("/publish/be/categories", {
      templateUrl: "publish/admin/views/categories.html",
      controller: "CategoriesController",
      title: "CATEGORIES.PAGE_TITLE",
      access: "access-categories-page",
      resolve: {
        categories : ["publishService", function(publishService){
          return publishService.loadCategories();
        }]
      }
    });

  }]);
  
})(angular);