(function(app){
  
  "use strict"

  app.controller("CategoriesController", CategoriesController);

  CategoriesController.$inject = ["$scope","$filter", "entityService", "categories"];
  /**
   * Defines the categories controller for the categories page.
   */
  
  function CategoriesController($scope, $filter, entityService, categories){
    
    $scope.newitem = {
      items: []
    };
    $scope.list = categories.data.taxonomy.tree;
    if($scope.list.length>0)
      $scope.listback = angular.copy($scope.list);
    else $scope.listback = [];
    $scope.saveIsDisabled = $scope.list.length==0;
    
    $scope.options = {
    };
    
    $scope.newSubItem = function() {
      $scope.newitem.id = Date.now()+'';
      $scope.list.push(angular.copy($scope.newitem));
      $scope.newitem = {
        items: []
      };
      $scope.saveIsDisabled = $scope.list.length==0;
    };
    $scope.resetCategory = function(){
       $scope.list = angular.copy($scope.listback);
       $scope.$emit("setAlert", 'info', $filter('translate')('CATEGORIES.RESET'),4000);
    };
    
    $scope.saveCategory = function(form){
      $scope.saveIsDisabled = true;
      //If no categories exist : Do create
      if(categories.data.taxonomy.id === undefined)
        entityService.addEntity("taxonomy", {name:"categories", tree:$scope.list}).success(successCb).error(errorCb);
      //Else : Do update
      else 
        entityService.updateEntity("taxonomy", categories.data.taxonomy.id, {tree:$scope.list}).success(successCb).error(errorCb);
    };
    
    function successCb(data, status, headers, config) {
        $scope.saveIsDisabled = $scope.list.length==0;
        $scope.listback = angular.copy($scope.list);
        $scope.$emit("setAlert", 'success', $filter('translate')('CATEGORIES.SAVE_SUCCESS'),4000);
    }
    function errorCb(data, status, headers, config){
        $scope.saveIsDisabled = $scope.list.length==0;
        $scope.$emit('setAlert','danger',$filter('translate')('CATEGORIES.SAVE_FAIL'),4000);
        if(status === 401)
          $scope.$parent.logout();
    }
    
    /**
     * 
     * Rights
     * 
     */
    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('create-taxonomy');
    $scope.rights.edit = $scope.checkAccess('update-taxonomy');
    $scope.rights.delete = $scope.checkAccess('delete-taxonomy');
    
  }

})(angular.module("ov.publish"));

