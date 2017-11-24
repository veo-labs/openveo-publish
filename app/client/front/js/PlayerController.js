'use strict';

(function(app) {

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, $sce, mediaService, ovPublishTranslations) {
    $scope.ready = false;

    var urlChunks = /.*\/([^\/]*)\/?/.exec($location.path());

    // Got a media id from url
    if (urlChunks.length) {
      var mediaId = urlChunks[1];

      mediaService.getMedia(mediaId, function(media) {
        if (media) {

          // Retrieve url parameters
          var urlParams = $location.search();
          $scope.data = media;
          $scope.language = urlParams['lang'] || navigator.language || navigator.browserLanguage;
          $scope.publishLanguage = ovPublishTranslations[$scope.language] ? angular.copy($scope.language) : 'en';

          var dictionary = ovPublishTranslations[$scope.publishLanguage];
          $scope.availabilityMessage = $sce.trustAsHtml(dictionary['AVAILABILITY_MESSAGE']);

          if (media.available || $scope.data.type == 'youtube') {
            $scope.isFullViewport = urlParams['fullscreen'] || false;
            $scope.autoPlay = urlParams['auto-play'] || false;
            $scope.playerType = $scope.data.type == 'youtube' ? 'youtube' : urlParams['type'] || 'html';
            $scope.ready = true;
          }
        } else
          $window.location.href = '/notFound';

      });
    }
  }

  app.controller('PlayerController', PlayerController);
  PlayerController.$inject = ['$scope', '$window', '$location', '$sce', 'mediaService', 'ovPublishTranslations'];

})(angular.module('ov.publish.player'));
