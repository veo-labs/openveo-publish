'use strict';

(function(app) {

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, videoService) {
    $scope.ready = false;

    var urlChunks = /.*\/([^\/]*)\/?/.exec($location.path());

    // Got a video id from url
    if (urlChunks.length) {
      var mediaId = urlChunks[1];

      videoService.getVideo(mediaId, function(video) {
        if (video) {
          $scope.data = video;

          if (video.available) {

            // Retrieve url parameters
            var urlParams = $location.search();

            $scope.isFullViewport = urlParams['fullscreen'] || false;
            $scope.playerType = urlParams['type'] || 'html';
            $scope.language = urlParams['lang'] || navigator.language || navigator.browserLanguage;
            $scope.ready = true;
          }
        }
        else
          $window.location.href = '/notFound';

      });
    }
  }

  app.controller('PlayerController', PlayerController);
  PlayerController.$inject = ['$scope', '$window', '$location', 'videoService'];

})(angular.module('ov.publish.player'));
