(function(app){
  
  "use strict"

  app.controller("PropertiesController", PropertiesController);
  PropertiesController.$inject = ["$scope", "$http", "$interval","$filter",  "entityService", "properties", "entityService"];

  /**
   * Defines the properties controller for the properties page.
   */
  function PropertiesController($scope, $http, $interval,$filter, entityService, properties) {
    /**
     * 
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.filterBy = {
      'name': '',
      'description': ''
    };
    scopeDataTable.header = [{
            'key': "name",
            'name': $filter('translate')('PROPERTIES.NAME_COLUMN')
          },
          {
            'key': "description",
            'name': 'PROPERTIES.NAME_COLUMN'
          },
          {
            'key': "action",
            'name': $filter('translate')('PROPERTIES.ACTIONS_COLUMN')
          }];
        
    scopeDataTable.actions = [{
        "label": "remove",
        "condition": function(row){ return row.name != "Test";},
        "callback": function(row){alert('remove ' + row.name);}
      },
      {
        "label": "publish",
        "condition": function(row){ return row.name != "Auteur";},
        "callback": function(row){alert('publish ' + row.name);}
      }];
    
    
    /**
     * FORM
     */
    var scopeEditForm = $scope.formContainer = {};
    scopeEditForm.model = {};
    $scope.supportedTypes = [
      {
        "value" : "text",
        "label" : "PROPERTIES.FORM_ADD_TEXT_TYPE"
      }
    ];
    scopeEditForm.fields = [
      {
        // the key to be used in the model values
        // so this will be bound to vm.user.username
        key: 'name',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: 'Username',
          required: true,
        }
      },
      {
        key: 'description',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: 'Description',
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
          label: 'Description',
          required: true,
          options: $scope.supportedTypes
        },
        expressionProperties: {
          'templateOptions.disabled': '!model.name' // disabled when username is blank
        }
      }
    ];
  
    scopeEditForm.onSubmit = function(model){
      alert('form submitted: '+ JSON.stringify(model), null, 2);
    }
    
    
    $scope.supportedTypes = [
      {
        "value" : "text",
        "label" : "PROPERTIES.FORM_ADD_TEXT_TYPE"
      }
    ];
    $scope.propertyType = $scope.supportedTypes[0].value;
    $scope.properties = properties.data.entities;
    
    preparePropertiesTypes();
    
    
    /**
     * Removes the property.
     * Can't remove a property if its saving.
     * @param Object property The property to remove
     */
    $scope.removeProperty = function(property){
      if(!property.saving){
        property.saving = true;
        entityService.removeEntity('property',property.id).success(function(data, status, headers, config){
          $scope.reloadCallback();
//          var index = 0;
//
//          // Look for property index
//          for(index = 0 ; index < $scope.properties.length ; index++){
//            if($scope.properties[index].id === property.id)
//              break;
//          }
//
//          // Remove property from the list of properties
//          $scope.properties.splice(index, 1);

        }).error(function(data, status, headers, config){
          property.saving = false;
          if(status === 401)
            $scope.$parent.logout();
        });
      }
    };    
    
    /**
     * Saves property.
     * @param Object form The angular edition form controller
     * @param Object property The property associated to the form
     */
    $scope.saveProperty = function(form, property){
      property.saving = true;
      form.saving = true;
      
      entityService.updateEntity('property',property.id,{
        name : property.name,
        description : property.description,
        type : property.type
      }).success(function(data, status, headers, config){
        property.saving = form.saving = false;
        form.edition = false;
        form.closeEdition();
        $scope.toggleRowDetails(property);
      }).error(function(data, status, headers, config){
        property.saving = form.saving = false;
        if(status === 401)
          $scope.$parent.logout();
      });
    };
    
    /**
     * Opens property edition.
     * @param Object form The angular edition form controller
     */
    $scope.openEdition = function(form){
      form.edition = true;
      form.openEdition();
    };
    
    /**
     * Cancels property edition.
     * @param Object form The angular edition form controller
     */
    $scope.cancelEdition = function(form){
      form.edition = false;
      form.cancelEdition();
    };
    
    /**
     * Adds a property.
     * @param Object form The angular form controller
     */
    $scope.addProperty = function(form){
      form.saving = true;
      
      entityService.addEntity('property',{
        name : $scope.propertyName,
        description : $scope.propertyDescription,
        type : $scope.propertyType
      }).success(function(data, status, headers, config){
        $scope.reloadCallback();
        form.saving = false;
        resetAddForm(form);
//        $scope.properties.push(data.entity);
        preparePropertiesTypes();
       
      }).error(function(data, status, headers, config){
        form.saving = false;
        if(status === 401)
          $scope.$parent.logout();
      });
    };

    /**
     * Resets add's form values.
     * @param Object form The formular to reset
     */
    function resetAddForm(form){
      $scope.propertyName = null;
      $scope.propertyDescription = null;
      $scope.propertyType = $scope.supportedTypes[0].value;
      form.$submitted = false;
    }

    /**
     * Prepares activated scopes by application.
     */
    function preparePropertiesTypes(){

      // Prepare the list of values for application's scopes
      for(var i = 0 ; i < $scope.properties.length ; i++){
        var property = $scope.properties[i];
        property["typeValue"] = [property.type];
      }

    }

  }

})(angular.module("ov.publish"));