(function(app){
  
  "use strict"

  app.controller("VideoController", VideoController);
  VideoController.$inject = ["$scope", "$interval", "publishService", "videos"];

  /**
   * Defines the video controller for the videos page.
   */
  function VideoController($scope, $interval, publishService, videos){
    $scope.videos = videos.data.videos;

    // Iterate through the list of videos, if at least one video
    // is pending, poll each 10 seconds to be informed of 
    // its status
    var pollVideosPromise = $interval(function(){
      publishService.getVideos().success(function(data, status, headers, config){
        $scope.videos = data.videos;
      }).error(function(data, status, headers, config){
        if(status === 401)
          $scope.$parent.logout();
      });
    }, 20000);

    // Listen to destroy event on the view to update
    $scope.$on("$destroy", function(event){
      $interval.cancel(pollVideosPromise);
    });
  
  }

})(angular.module("ov.publish"));