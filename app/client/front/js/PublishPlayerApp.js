'use strict';

(function(angular) {

  var app = angular.module('ov.publish.player', ['ngAnimate', 'ov.player']);

  /**
   * Configures the ov.publish application by adding new routes.
   */
  app.config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
  }]);

  // Translations
  app.constant('ovPublishTranslations', {
    en: {
      AVAILABILITY_MESSAGE: 'This video is not yet available on the streaming platform.<br/>Please retry later.'
    },
    fr: {
      AVAILABILITY_MESSAGE: 'Cette vidéo n\'est pas encore disponible sur la plateforme vidéo.<br/>' +
      'Veuillez réessayer plus tard.'
    }
  });

})(angular);
