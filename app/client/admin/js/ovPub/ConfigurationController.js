'use strict';

(function(app) {

  /**
   * Defines the configuration controller for the configuration page.
   */
  function ConfigurationController($scope, publishConf, publishService, utilService, $filter, groups, users) {
    var publishMedias = publishConf.data.publishMedias;

    /**
     * Gets the name of a group.
     *
     * @param {String} id The id of the group
     * @return {String} The name of the group
     */
    function getGroupName(id) {
      for (var i = 0; i < groups.data.entities.length; i++) {
        if (groups.data.entities[i].id === id)
          return groups.data.entities[i].name;
      }
      return null;
    }

    /**
     * Gets the name of a user.
     *
     * @param {String} id The id of the user
     * @return {String} The name of the user
     */
    function getUserName(id) {
      for (var i = 0; i < groups.data.entities.length; i++) {
        if (users.data.entities[i].id === id)
          return users.data.entities[i].name;
      }
      return null;
    }

    // Youtube settings
    $scope.youtubeConf = publishConf.data.youtube;

    // Medias settings
    $scope.mediasSettings = {
      owner: {
        name: getUserName(publishMedias && publishMedias.owner),
        value: publishMedias && publishMedias.owner
      },
      group: {
        name: getGroupName(publishMedias && publishMedias.group),
        value: publishMedias && publishMedias.group
      },
      availableOwners: utilService.buildSelectOptions(users.data.entities),
      availableGroups: utilService.buildSelectOptions(groups.data.entities),
      isFormSaving: false
    };

    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('publish-manage-publish-config');

    /**
     * Saves medias settings.
     */
    $scope.saveMediasSettings = function() {
      $scope.mediasSettings.isFormSaving = true;

      return publishService.saveMediasSettings({
        owner: $scope.mediasSettings.owner.value,
        group: $scope.mediasSettings.group.value
      }).then(function() {
        $scope.mediasSettings.isFormSaving = false;
        $scope.$emit('setAlert', 'success', $filter('translate')('CORE.UI.SAVE_SUCCESS'), 4000);
      }).catch(function() {
        $scope.mediasSettings.isFormSaving = false;
      });
    };
  }

  app.controller('ConfigurationController', ConfigurationController);
  ConfigurationController.$inject = [
    '$scope', 'publishConf', 'publishService', 'utilService', '$filter', 'groups', 'users'];

})(angular.module('ov.publish'));
