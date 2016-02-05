'use strict';

(function(app) {

  /**
   * Defines the configuration controller for the configuration page.
   */
  function ConfigurationController($scope, publishConf) {
    $scope.youtubeConf = publishConf.data.youtube;
    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('manage-publish-config');
  }

  app.controller('ConfigurationController', ConfigurationController);
  ConfigurationController.$inject = ['$scope', 'publishConf'];


})(angular.module('ov.publish'));
