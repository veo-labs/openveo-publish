'use strict';

(function(angular) {

  /**
   * Service reload Table
   */
  function TableReloadEventService($rootScope) {
    var sharedService = {};
    sharedService.broadcast = function() {
      $rootScope.$broadcast('reloadDataTable');
    };
    return sharedService;
  }

  var app = angular.module('ov.tableForm', []);

  app.factory('tableReloadEventService', TableReloadEventService);


  // Service to reload a displayed table
  TableReloadEventService.$inject = ['$rootScope'];

})(angular);
