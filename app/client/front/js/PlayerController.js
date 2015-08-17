(function(app){

  "use strict"

  app.controller("PlayerController", PlayerController);
  PlayerController.$inject = ["$scope", "$window", "$location", "videoService"];

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, videoService){
    $scope.ready = false;
    
    var urlChunks = /.*\/([^\/]*)\/?/.exec($location.path());
    
    // Got a video id from url
    if(urlChunks.length){
      var videoId = urlChunks[1];
      
      videoService.getVideo(videoId, function(video){
        if(video){

          // Retrieve url parameters 
          var urlParams = $location.search();

          $scope.isFullViewport = urlParams["fullscreen"] || false;
          $scope.playerType = urlParams["type"] || "vimeo";
          $scope.data = video;
          $scope.ready = true;
        }
        else
          $window.location.href = "/notFound";

      });
    }
  }

})(angular.module("ov.publish.player"));