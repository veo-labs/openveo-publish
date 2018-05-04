'use strict';

(function(angular) {

  function UtilService($filter) {
    function buildSelectOptions(entities) {
      var options = [{
        name: 'CORE.UI.NONE',
        value: null
      }];

      entities.forEach(function(entity) {
        options.push({
          name: entity.name,
          value: entity.id
        });
      });

      return options;
    }

    return {
      buildSelectOptions: buildSelectOptions
    };
  }

  function OvUrlFactory() {
    function setUrlParameter(url, parameter, value) {
      return url;
    }

    return {
      setUrlParameter: setUrlParameter
    };
  }


  var app = angular.module('ov.util', []);
  app.factory('utilService', UtilService);
  UtilService.$inject = ['$filter'];

  app.factory('OvUrlFactory', OvUrlFactory);
  OvUrlFactory.$inject = [];

})(angular);
