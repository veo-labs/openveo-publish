'use strict';

(function(app) {

  /**
   * Defines the properties controller for the properties page.
   */
  function PropertiesController($scope, $filter, entityService, publishService) {

    /**
     * Removes a list of properties.
     * @param {Array} selected The list of property ids to remove
     * @param {Function} reload The reload Function to force reloading the table
     */
    function removeRows(selected, reload) {
      entityService.removeEntity('property', selected.join(','))
        .then(function() {
          publishService.cacheClear('properties');
          $scope.$emit('setAlert', 'success', $filter('translate')('PROPERTIES.REMOVE_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Adds a property.
     * @param {Object} property Property data
     */
    function addProperty(property) {
      return entityService.addEntity('property', property)
        .then(function() {
          publishService.cacheClear('properties');
        });
    }

    /**
     * Saves property.
     * @param Object property Property data
     */
    function saveProperty(property) {
      return entityService.updateEntity('property', property.id, {
        name: property.name,
        description: property.description,
        type: property.type
      }).then(function() {
        publishService.cacheClear('properties');
      });
    }

    /*
     *
     * RIGHTS
     *
     */
    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('create-property');
    $scope.rights.edit = $scope.checkAccess('update-property');
    $scope.rights.delete = $scope.checkAccess('delete-property');

    /*
     *
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.entityType = 'property';
    scopeDataTable.filterBy = [
      {
        key: 'name',
        value: '',
        label: $filter('translate')('PROPERTIES.TITLE_FILTER')
      },
      {
        key: 'description',
        value: '',
        label: $filter('translate')('PROPERTIES.DESCRIPTION_FILTER')
      }
    ];
    scopeDataTable.header = [{
      key: 'name',
      name: $filter('translate')('PROPERTIES.NAME_COLUMN'),
      class: ['col-xs-11']
    },
    {
      key: 'action',
      name: $filter('translate')('UI.ACTIONS_COLUMN'),
      class: ['col-xs-1']
    }];

    scopeDataTable.actions = [{
      label: $filter('translate')('UI.REMOVE'),
      warningPopup: true,
      condition: function(row) {
        return $scope.rights.delete && !row.locked && !row.saving;
      },
      callback: function(row, reload) {
        removeRows([row.id], reload);
      },
      global: function(selected, reload) {
        removeRows(selected, reload);
      }
    }];

    /*
     * FORM
     */
    var scopeEditForm = $scope.editFormContainer = {};
    scopeEditForm.model = {};
    scopeEditForm.entityType = 'property';
    var supportedTypes = [
      {
        value: 'text',
        name: $filter('translate')('PROPERTIES.FORM_ADD_TEXT_TYPE')
      }
    ];
    scopeEditForm.fields = [
      {

        // the key to be used in the model values
        // so this will be bound to vm.user.username
        key: 'name',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_NAME'),
          required: true
        }
      },
      {
        key: 'description',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_DESCRIPTION'),
          required: true
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      },
      {
        key: 'type',
        type: 'horizontalExtendSelect',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_TYPE'),
          required: true,
          options: supportedTypes
        }
      }
    ];
    scopeEditForm.conditionEditDetail = function(row) {
      return $scope.rights.edit && !row.locked;
    };

    scopeEditForm.onSubmit = function(model) {
      return saveProperty(model);
    };

    /*
     *  FORM Add Property
     *
     */
    var scopeAddForm = $scope.addFormContainer = {};
    scopeAddForm.model = {};
    scopeAddForm.fields = [
      {

        // the key to be used in the model values
        // so this will be bound to vm.user.username
        key: 'name',
        type: 'horizontalInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_NAME'),
          required: true,
          description: $filter('translate')('PROPERTIES.FORM_ADD_NAME_DESC')
        }
      },
      {
        key: 'description',
        type: 'horizontalInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_DESCRIPTION'),
          required: true,
          description: $filter('translate')('PROPERTIES.FORM_ADD_DESCRIPTION_DESC')
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      },
      {
        key: 'type',
        type: 'horizontalSelect',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_TYPE'),
          required: true,
          description: $filter('translate')('PROPERTIES.FORM_ADD_TYPE_DESC'),
          options: supportedTypes
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.description' // disabled when username is blank
        }
      }
    ];

    scopeAddForm.onSubmit = function(model) {
      return addProperty(model);
    };

  }

  app.controller('PropertiesController', PropertiesController);
  PropertiesController.$inject = ['$scope', '$filter', 'entityService', 'publishService'];

})(angular.module('ov.publish'));
