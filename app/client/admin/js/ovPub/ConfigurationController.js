'use strict';

(function(app) {

  /**
   * Defines the configuration controller for the configuration page.
   */
  function ConfigurationController(
  $scope,
  publishConf,
  publishService,
  utilService,
  $filter,
  groups,
  users
  ) {
    var publishMedias = publishConf.data.publishMedias;

    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('publish-manage-publish-config');

    // Youtube settings
    $scope.youtubeConf = publishConf.data.youtube;

    // Medias settings
    $scope.mediasSettings = {
      model: {
        owner: publishMedias && publishMedias.owner,
        group: publishMedias && publishMedias.group
      },
      fields: [
        {
          key: 'owner',
          type: 'editableSelect',
          wrapper: 'editableWrapper',
          templateOptions: {
            label: $filter('translate')('PUBLISH.CONFIGURATION.MEDIAS_DEFAULT_OWNER'),
            options: utilService.buildSelectOptions(users.data.entities)
          }
        },
        {
          key: 'group',
          type: 'editableSelect',
          wrapper: 'editableWrapper',
          templateOptions: {
            label: $filter('translate')('PUBLISH.CONFIGURATION.MEDIAS_DEFAULT_GROUP'),
            options: utilService.buildSelectOptions(groups.data.entities)
          }
        }
      ],
      options: {
        formState: {
          showForm: $scope.rights.edit
        }
      },
      isFormSaving: false
    };

    /**
     * Saves medias settings.
     */
    $scope.saveMediasSettings = function() {
      $scope.mediasSettings.isFormSaving = true;

      return publishService.saveMediasSettings({
        owner: $scope.mediasSettings.model.owner,
        group: $scope.mediasSettings.model.group
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
