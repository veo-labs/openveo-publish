'use strict';

(function(app) {

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, $sce, $http, mediaService, ovPublishTranslations) {
    $scope.ready = false;
    $scope.autoPlay = false;

    var urlChunks = /.*\/([^\/]*)\/?/.exec($location.path());
    var player = document.getElementById('ov-player');

    angular.element(player).on('needPoiConversion', function(event, duration) {
      $http
        .post('/publish/videos/' + $scope.data.id + '/poi/convert', {duration: duration})
        .then(function(response) {
          $scope.data = response.data.entity;
        });
    });

    // Got a media id from url
    if (urlChunks.length) {
      var mediaId = urlChunks[1];

      mediaService.getMedia(mediaId, function(media) {
        if (media) {

          // Retrieve url parameters
          var urlParams = $location.search();
          $scope.defaultMode = 'both';
          if (media.metadata) {
            var template = media.metadata.template || '';
            if (template.match(/^mix-/))
              $scope.defaultMode = 'media';
          }
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
  PlayerController.$inject = [
    '$scope',
    '$window',
    '$location',
    '$sce',
    '$http',
    'mediaService',
    'ovPublishTranslations'
  ];

})(angular.module('ov.publish.player'));
