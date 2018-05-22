'use strict';

(function(app) {

  /**
   * Defines the configuration controller for the configuration page.
   */
  function ConfigurationController($scope, publishConf, publishService, utilService, $filter, groups, users) {
    $scope.youtubeConf = publishConf.data.youtube;
    var publishDefaultUpload = publishConf.data.publishDefaultUpload;

    $scope.default = {
      owner: publishDefaultUpload ? publishDefaultUpload.owner : null,
      group: publishDefaultUpload ? publishDefaultUpload.group : null
    };

    $scope.options = {
      owners: utilService.buildSelectOptions(users.data.entities),
      groups: utilService.buildSelectOptions(groups.data.entities)
    };

    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('publish-manage-publish-config');

    $scope.saveOptions = function() {
      return publishService.saveUploadConfig($scope.default).then(function() {
        $scope.$emit('setAlert', 'success', $filter('translate')('CORE.UI.SAVE_SUCCESS'), 4000);
      });
    };
  }

  app.controller('ConfigurationController', ConfigurationController);
  ConfigurationController.$inject = [
    '$scope', 'publishConf', 'publishService', 'utilService', '$filter', 'groups', 'users'];

})(angular.module('ov.publish'));
