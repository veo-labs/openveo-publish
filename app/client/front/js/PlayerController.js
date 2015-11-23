'use strict';

(function(app) {

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, $sce, videoService, ovPublishTranslations) {
    $scope.ready = false;

    var urlChunks = /.*\/([^\/]*)\/?/.exec($location.path());

    // Got a video id from url
    if (urlChunks.length) {
      var mediaId = urlChunks[1];

      videoService.getVideo(mediaId, function(video) {
        if (video) {

          // Retrieve url parameters
          var urlParams = $location.search();
          $scope.data = video;
          $scope.language = urlParams['lang'] || navigator.language || navigator.browserLanguage;
          $scope.publishLanguage = ovPublishTranslations[$scope.language] ? angular.copy($scope.language) : 'en';

          var dictionary = ovPublishTranslations[$scope.publishLanguage];
          $scope.availabilityMessage = $sce.trustAsHtml(dictionary['AVAILABILITY_MESSAGE']);

          if (video.available) {
            $scope.isFullViewport = urlParams['fullscreen'] || false;
            $scope.playerType = urlParams['type'] || 'html';
            $scope.ready = true;
          }
        }
        else
          $window.location.href = '/notFound';

      });
    }
  }

  app.controller('PlayerController', PlayerController);
  PlayerController.$inject = ['$scope', '$window', '$location', '$sce', 'videoService', 'ovPublishTranslations'];

})(angular.module('ov.publish.player'));
