'use strict';

(function(app) {

  /**
   * Defines the properties controller for the properties page.
   *
   * @class PropertiesController
   * @memberof module:ov.publish
   * @inner
   * @ignore
   */
  function PropertiesController($scope, $filter, entityService, publishService, publishName) {
    var entityType = 'properties';
    var TEXT_TYPE = 'text';
    var LIST_TYPE = 'list';
    var BOOLEAN_TYPE = 'boolean';
    var DATE_TIME_TYPE = 'dateTime';
    var supportedTypes = [
      {
        value: TEXT_TYPE,
        name: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_TEXT_TYPE')
      },
      {
        value: LIST_TYPE,
        name: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_LIST_TYPE')
      },
      {
        value: BOOLEAN_TYPE,
        name: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_BOOLEAN_TYPE')
      },
      {
        value: DATE_TIME_TYPE,
        name: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_DATE_TIME_TYPE')
      }
    ];

    /**
     * Removes a list of properties.
     *
     * @memberof module:ov.publish~PropertiesController
     * @instance
     * @private
     * @param {Array} selected The list of property ids to remove
     * @param {Function} reload The reload Function to force reloading the table
     */
    function removeRows(selected, reload) {
      entityService.removeEntities(entityType, publishName, selected.join(','))
        .then(function() {
          publishService.cacheClear(entityType);
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.PROPERTIES.REMOVE_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Adds a property.
     *
     * @memberof module:ov.publish~PropertiesController
     * @instance
     * @private
     * @param {Object} property Property data
     */
    function addProperty(property) {
      return entityService.addEntities(entityType, publishName, [property])
        .then(function() {
          publishService.cacheClear(entityType);
        });
    }

    /**
     * Saves property.
     *
     * @memberof module:ov.publish~PropertiesController
     * @instance
     * @private
     * @param {Object} property Property data
     */
    function saveProperty(property) {
      var propertyInfo = {
        name: property.name,
        description: property.description,
        type: property.type
      };

      // Add list values if any
      if (property.type === LIST_TYPE && property.listValues)
        propertyInfo.values = property.listValues;

      return entityService.updateEntity(entityType, publishName, property.id, propertyInfo).then(function() {
        publishService.cacheClear(entityType);
      });
    }

    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('publish-add-' + entityType);
    $scope.rights.edit = $scope.checkAccess('publish-update-' + entityType);
    $scope.rights.delete = $scope.checkAccess('publish-delete-' + entityType);

    /*
     *
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.pluginName = publishName;
    var filterTypeOptions = angular.copy(supportedTypes);
    filterTypeOptions.unshift({name: $filter('translate')('CORE.UI.EMPTY'), value: ''});
    scopeDataTable.entityType = entityType;
    scopeDataTable.filterBy = [
      {
        key: 'query',
        value: '',
        label: $filter('translate')('PUBLISH.PROPERTIES.QUERY_FILTER')
      },
      {
        key: 'types',
        type: 'select',
        value: '',
        label: $filter('translate')('PUBLISH.PROPERTIES.TYPE_FILTER'),
        options: filterTypeOptions
      }
    ];
    scopeDataTable.header = [{
      key: 'name',
      name: $filter('translate')('PUBLISH.PROPERTIES.NAME_COLUMN'),
      class: ['col-xs-11']
    },
    {
      key: 'action',
      name: $filter('translate')('CORE.UI.ACTIONS_COLUMN'),
      class: ['col-xs-1']
    }];

    scopeDataTable.actions = [{
      label: $filter('translate')('CORE.UI.REMOVE'),
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
    scopeEditForm.entityType = entityType;
    scopeEditForm.pluginName = publishName;
    scopeEditForm.fields = [
      {

        // the key to be used in the model values
        // so this will be bound to vm.user.username
        key: 'name',
        type: 'horizontalEditableInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_NAME'),
          required: true
        }
      },
      {
        key: 'description',
        type: 'horizontalEditableInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_DESCRIPTION'),
          required: true
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      },
      {
        key: 'type',
        type: 'horizontalEditableSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_TYPE'),
          required: true,
          options: supportedTypes
        }
      },
      {
        key: 'listValues',
        type: 'horizontalEditableTags',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_LIST_VALUES'),
          required: true,
          inputOptions: {
            type: 'editableInput'
          }
        },
        hideExpression: 'model.type !== "' + LIST_TYPE + '"'
      }
    ];
    scopeEditForm.conditionEditDetail = function(row) {
      return $scope.rights.edit && !row.locked;
    };
    scopeEditForm.init = function(row) {

      // List values are stored in entity "values" property while the model uses property "listValues"
      // Thus move values to listValues
      if (row.type === LIST_TYPE) {
        row.listValues = row.values || row.listValues;
        delete row.values;
      }

    };

    scopeEditForm.onSubmit = function(model) {
      if (model.type === LIST_TYPE) {

        // Edited custom property is a property of type list
        // Filter list to keep only non empty values
        model.listValues = model.listValues.filter(function(value) {
          return value;
        });

      } else {

        // Edited custom property is not a property of type list, thus entered list values are not needed
        delete model.listValues;

      }

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
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_NAME'),
          required: true,
          description: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_NAME_DESC')
        }
      },
      {
        key: 'description',
        type: 'horizontalInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_DESCRIPTION'),
          required: true,
          description: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_DESCRIPTION_DESC')
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      },
      {
        key: 'type',
        type: 'horizontalSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_TYPE'),
          required: true,
          description: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_TYPE_DESC'),
          options: supportedTypes
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.description' // disabled when username is blank
        }
      },
      {
        key: 'listValues',
        type: 'horizontalTags',
        templateOptions: {
          label: $filter('translate')('PUBLISH.PROPERTIES.ATTR_LIST_VALUES'),
          description: $filter('translate')('PUBLISH.PROPERTIES.FORM_ADD_LIST_VALUES_DESC'),
          required: true
        },
        hideExpression: 'model.type !== "' + LIST_TYPE + '"'
      }
    ];

    scopeAddForm.onSubmit = function(model) {
      var data = {
        name: model.name,
        description: model.description,
        type: model.type
      };

      if (model.type === LIST_TYPE) {

        // Added custom property is a property of type list
        // Filter list to keep only non empty values
        data.values = model.listValues.filter(function(value) {
          return value;
        });

      }

      return addProperty(data);
    };

  }

  app.controller('PropertiesController', PropertiesController);
  PropertiesController.$inject = ['$scope', '$filter', 'entityService', 'publishService', 'publishName'];

})(angular.module('ov.publish'));
