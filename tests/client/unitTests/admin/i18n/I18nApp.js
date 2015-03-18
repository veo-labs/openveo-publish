(function(angular){

  "use strict"

  var app = angular.module("ov.i18n", ["ngCookies", "ngRoute"]);

  app.factory("i18nService", I18nService);
  app.filter("translate", TranslateFilter);
  I18nService.$inject = ["$http", "$route", "$cookies"];
  TranslateFilter.$inject = ["i18nService"];
  
  function I18nService($http, $route, $cookies){
    return {};
  }
  
  function TranslateFilter(i18nService){
    return function(id, dictionaryName){
      
    }
  }
  
})(angular);