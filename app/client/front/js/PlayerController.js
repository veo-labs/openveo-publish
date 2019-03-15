'use strict';

(function(app) {

  /**
   * Defines the player controller.
   */
  function PlayerController($scope, $window, $location, $sce, $http, mediaService, ovPublishTranslations) {
    $scope.ready = false;
    $scope.autoPlay = false;

    /**
     * Tests if a parameter is true.
     *
     * Some parameters are strings and must be interpreted as booleans.
     *
     * @param {String|Undefined} value The parameter value
     * @param {Boolean} defaultValue Parameter default value if undefined (true or false)
     * @return {Boolean} true if parameter is true, false otherwise
     */
    function isParameterTrue(value, defaultValue) {
      if (typeof value === 'undefined') return defaultValue;
      return JSON.parse(value);
    }

    /**
     * Configures the player using URL parameters.
     *
     * @param {Object} media The media to play
     */
    function configurePlayer(media) {
      var urlParams = $location.search();

      $scope.data = media;

      $scope.defaultTemplate = 'split_50_50';
      if ($scope.data.metadata) {
        var template = $scope.data.metadata.template || '';
        if (template.match(/^mix-/))
          $scope.defaultTemplate = 'split_1';
      }
      $scope.language = urlParams['lang'] || navigator.language || navigator.browserLanguage;
      $scope.publishLanguage = ovPublishTranslations[$scope.language] ? angular.copy($scope.language) : 'en';

      var dictionary = ovPublishTranslations[$scope.publishLanguage];
      $scope.availabilityMessage = $sce.trustAsHtml(dictionary['AVAILABILITY_MESSAGE']);

      if ($scope.data.available || $scope.data.type == 'youtube') {
        $scope.isFullViewport = isParameterTrue(urlParams['fullscreen'], false);
        $scope.autoPlay = isParameterTrue(urlParams['auto-play'], false);
        $scope.rememberPosition = isParameterTrue(urlParams['remember-position'], true);
        $scope.fullScreenIconDisplayed = isParameterTrue(urlParams['fullscreen-icon'], true);
        $scope.volumeIconDisplayed = isParameterTrue(urlParams['volume-icon'], true);
        $scope.templateIconDisplayed = isParameterTrue(urlParams['template-icon'], true);
        $scope.settingsIconDisplayed = isParameterTrue(urlParams['settings-icon'], true);
        $scope.veoLabsIconDisplayed = isParameterTrue(urlParams['veo-labs-icon'], true);
        $scope.timeDisplayed = isParameterTrue(urlParams['time'], true);
        $scope.chaptersDisplayed = isParameterTrue(urlParams['chapters'], true);
        $scope.tagsDisplayed = isParameterTrue(urlParams['tags'], true);
        $scope.cutsEnabled = isParameterTrue(urlParams['cuts'], true);
        $scope.defaultTemplate = urlParams['template'] || $scope.defaultTemplate;
        $scope.playerType = $scope.data.type == 'youtube' ? 'youtube' : urlParams['type'] || 'html';
      }
    }

    /**
     * Handles player need points of interest conversion event.
     *
     * Converts points of interest and reset player.
     *
     * @param {Event} event The needPoiConversion event
     * @param {Number} duration The media duration
     */
    function handleNeedPoiConversion(event, duration) {
      $http
        .post('/publish/videos/' + $scope.data.id + '/poi/convert', {duration: duration})
        .then(function(response) {
          $scope.data = response.data.entity;
        });
    }

    /**
     * Handles player ready event.
     *
     * Shows the player.
     *
     * @param {Event} event The ready event
     */
    function handleReady(event) {
      $scope.ready = true;
    }

    Object.defineProperties(this, {

      /**
       * Initializes the player.
       *
       * Requests the server for media information and configures the player.
       *
       * @method $onInit
       */
      $onInit: {
        value: function() {
          var urlChunks = /.*\/([^/]*)\/?/.exec($location.path());
          var player = angular.element($window.document.getElementById('opl-player'));

          player.on('needPoiConversion', handleNeedPoiConversion);
          player.on('ready', handleReady);

          // Retrieve media id from URL
          if (urlChunks.length) {
            var mediaId = urlChunks[1];

            // Get information about the media
            mediaService.getMedia(mediaId, function(media) {
              if (media) configurePlayer(media);
              else $window.location.href = '/notFound';
            });
          }
        }
      }

    });
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
