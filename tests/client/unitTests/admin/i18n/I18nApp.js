'use strict';

(function(angular) {

  function I18nService() {
    return {};
  }

  function TranslateFilter() {
    return function() {

    };
  }

  var app = angular.module('ov.i18n', ['ngCookies', 'ngRoute']);

  app.factory('i18nService', I18nService);
  app.filter('translate', TranslateFilter);
  I18nService.$inject = [];
  TranslateFilter.$inject = ['i18nService'];

})(angular);
