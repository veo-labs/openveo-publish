(function(app){
  
  "use strict"

  app.controller("PropertiesController", PropertiesController);
  PropertiesController.$inject = ["$scope", "$interval", "entityService", "properties"];

  /**
   * Defines the properties controller for the properties page.
   */
  function PropertiesController($scope, $interval, entityService, properties){
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
     * Toggles the property detail.
     * Can't open / close detail of the property if its saving.
     * @param Object property The property associated to the form
     */
    $scope.togglePropertyDetails = function(property){
      if(!property.saving){
        for(var i = 0 ; i < $scope.properties.length ; i++){
          $scope.properties[i].opened = ($scope.properties[i].id === property.id) ? !$scope.properties[i].opened : false;
        }
      }
    };
    
    /**
     * Removes the property.
     * Can't remove a property if its saving.
     * @param Object property The property to remove
     */
    $scope.removeProperty = function(property){
      if(!property.saving){
        property.saving = true;
        entityService.removeEntity('property',property.id).success(function(data, status, headers, config){
          var index = 0;

          // Look for property index
          for(index = 0 ; index < $scope.properties.length ; index++){
            if($scope.properties[index].id === property.id)
              break;
          }

          // Remove property from the list of properties
          $scope.properties.splice(index, 1);

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
        $scope.togglePropertyDetails(property);
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
        form.saving = false;
        resetAddForm(form);
        $scope.properties.push(data.entity);
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