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
    users,
    properties
  ) {
    var publishWatcher = publishConf.data.publishWatcher;
    var publishTls = publishConf.data.publishTls;
    var publishCatalog = publishConf.data.publishCatalog;

    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('publish-manage-publish-config');

    // Youtube settings
    $scope.youtubeConf = publishConf.data.youtube;

    // Watcher settings
    $scope.watcherSettings = {
      model: {
        owner: (publishWatcher && publishWatcher.owner) || null,
        group: (publishWatcher && publishWatcher.group) || null
      },
      fields: [
        {
          key: 'owner',
          type: 'editableSelect',
          wrapper: 'editableWrapper',
          templateOptions: {
            label: $filter('translate')('PUBLISH.CONFIGURATION.WATCHER_DEFAULT_OWNER'),
            options: utilService.buildSelectOptions(users.data.entities)
          }
        },
        {
          key: 'group',
          type: 'editableSelect',
          wrapper: 'editableWrapper',
          templateOptions: {
            label: $filter('translate')('PUBLISH.CONFIGURATION.WATCHER_DEFAULT_GROUP'),
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

    // TLS settings
    if (publishTls) {
      $scope.tlsSettings = {
        model: {
          properties: publishTls.properties || []
        },
        fields: [
          {
            key: 'properties',
            type: 'editableTags',
            wrapper: ['editableWrapper', 'bootstrapLabel', 'bootstrapHasError'],
            templateOptions: {
              label: $filter('translate')('PUBLISH.CONFIGURATION.TLS_PROPERTIES'),
              availableOptions: utilService.buildSelectOptions(properties.data.entities)
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
    }

    // Catalog settings
    $scope.catalogSettings = {
      model: {
        refreshInterval: (publishCatalog && publishCatalog.refreshInterval) || null
      },
      fields: [
        {
          key: 'refreshInterval',
          type: 'editableInput',
          wrapper: ['editableWrapper', 'bootstrapHasError'],
          validators: {
            number: {
              expression: function(viewValue, modelValue) {
                return !viewValue || /^[0-9]*$/.test(viewValue);
              }
            }
          },
          templateOptions: {
            label: $filter('translate')('PUBLISH.CONFIGURATION.CATALOG_REFRESH_INTERVAL')
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
    $scope.saveWatcherSettings = function() {
      $scope.watcherSettings.isFormSaving = true;

      return publishService.saveWatcherSettings({
        owner: $scope.watcherSettings.model.owner || undefined,
        group: $scope.watcherSettings.model.group || undefined
      }).then(function() {
        $scope.watcherSettings.isFormSaving = false;
        $scope.$emit('setAlert', 'success', $filter('translate')('CORE.UI.SAVE_SUCCESS'), 4000);
      }).catch(function() {
        $scope.watcherSettings.isFormSaving = false;
      });
    };

    /**
     * Saves TLS settings.
     */
    $scope.saveTlsSettings = function() {
      $scope.tlsSettings.isFormSaving = true;

      return publishService.saveTlsSettings({
        properties: $scope.tlsSettings.model.properties
      }).then(function() {
        $scope.tlsSettings.isFormSaving = false;
        $scope.$emit('setAlert', 'success', $filter('translate')('CORE.UI.SAVE_SUCCESS'), 4000);
      }).catch(function() {
        $scope.tlsSettings.isFormSaving = false;
      });
    };

    /**
     * Saves catalog settings.
     */
    $scope.saveCatalogSettings = function() {
      $scope.catalogSettings.isFormSaving = true;

      return publishService.saveCatalogSettings({
        refreshInterval: $scope.catalogSettings.model.refreshInterval
      }).then(function() {
        $scope.catalogSettings.isFormSaving = false;
        $scope.$emit('setAlert', 'success', $filter('translate')('CORE.UI.SAVE_SUCCESS'), 4000);
      }).catch(function() {
        $scope.catalogSettings.isFormSaving = false;
      });
    };

  }

  app.controller('ConfigurationController', ConfigurationController);
  ConfigurationController.$inject = [
    '$scope', 'publishConf', 'publishService', 'utilService', '$filter', 'groups', 'users', 'properties'];

})(angular.module('ov.publish'));
