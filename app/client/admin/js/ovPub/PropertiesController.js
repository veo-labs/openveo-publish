(function (app) {

  "use strict"

  app.controller("PropertiesController", PropertiesController);
  PropertiesController.$inject = ["$scope", "$filter", "entityService"];

  /**
   * Defines the properties controller for the properties page.
   */
  function PropertiesController($scope, $filter, entityService) {
  
    /**
     * 
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.entityType = "property";
    scopeDataTable.filterBy = {
      'name': '',
      'description': ''
    };
    scopeDataTable.header = [{
        'key': "name",
        'name': $filter('translate')('PROPERTIES.NAME_COLUMN')
      },
      {
        'key': "action",
        'name': $filter('translate')('UI.ACTIONS_COLUMN')
      }];

    scopeDataTable.actions = [{
        "label": "remove",
        "callback": function (row) {
          removeRow(row);
        }
      }];



    /**
     * FORM
     */
    var scopeEditForm = $scope.editFormContainer = {};
    scopeEditForm.model = {};
    var supportedTypes = [
      {
        "value": "text",
        "name": $filter('translate')("PROPERTIES.FORM_ADD_TEXT_TYPE")
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
          required: true,
        }
      },
      {
        key: 'description',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_DESCRIPTION'),
          required: true,
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

    scopeEditForm.onSubmit = function (model, successCb, errorCb) {
      saveProperty(model, successCb, errorCb);
    }

    /**
     * Removes the property.
     * Can't remove a property if its saving.
     * @param Object property The property to remove
     */
    var removeRow = function (row) {
      if (!row.saving) {
        row.saving = true;
        entityService.removeEntity('property', row.id).error(function (data, status, headers, config) {
          $scope.$emit("setAlert", 'error', 'Fail remove property! Try later.', 4000);
          row.saving = false;
          if (status === 401)
            $scope.$parent.logout();
        });
      }
    };

    /**
     * Saves property.
     * @param Object form The angular edition form controller
     * @param Object property The property associated to the form
     */
    var saveProperty = function (property, successCb, errorCb) {
      property.saving = true;
      entityService.updateEntity('property', property.id, {
        name: property.name,
        description: property.description,
        type: property.type
      }).success(function (data, status, headers, config) {
        property.saving = false;
        successCb();
      }).error(function (data, status, headers, config) {
        property.saving = false;
        errorCb();
        if (status === 401)
          $scope.$parent.logout();
      });
    };

    /**
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
        }
      },
      {
        key: 'description',
        type: 'horizontalInput',
        templateOptions: {
          label: $filter('translate')('PROPERTIES.ATTR_DESCRIPTION'),
          required: true,
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      },
      {
        key: 'type',
        type: 'horizontalSelect',
        templateOptions: {
          label:  $filter('translate')('PROPERTIES.ATTR_TYPE'),
          required: true,
          options: supportedTypes
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.description' // disabled when username is blank
        }
      }
    ];

    scopeAddForm.onSubmit = function (model, successCb, errorCb) {
      addProperty(model, successCb, errorCb);
    }

    /**
     * Adds a property.
     * @param Object form The angular form controller
     */
    var addProperty = function (model, successCb, errorCb) {
      entityService.addEntity('property', model)
              .success(function (data, status, headers, config) {
                successCb();
              })
              .error(function (data, status, headers, config) {
                errorCb();
                if (status === 401)
                  $scope.$parent.logout();
              });
    };
  }

})(angular.module("ov.publish"));