(function(app){

  "use strict"

  app.controller("PlayerController", PlayerController);
  PlayerController.$inject = ["$scope", "$location", "videoService"];

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $location, videoService){
    var videoId = /.*video\/([^\/]*)\/?/.exec($location.path())[1];

    $scope.fullscreen = false;
    $scope.ready = false;

    videoService.getVideo(videoId, function(video){
      if(video){

        // Retrieve url parameters 
        var urlParams = $location.search();

        $scope.fullscreen = urlParams["fullscreen"] || false;
        $scope.data = video;
        $scope.ready = true;
      }
    });
  }

})(angular.module("ov.publish.player"));