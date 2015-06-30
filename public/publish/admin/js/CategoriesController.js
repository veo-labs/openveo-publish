(function(app){
  
  "use strict"

  app.controller("CategoriesController", CategoriesController);

  CategoriesController.$inject = ["$scope", "entityService","alertService", "categories"];
  /**
   * Defines the categories controller for the categories page.
   */
  
  function CategoriesController($scope, entityService, alertService, categories){
    
    $scope.newItem = "";
    $scope.list = categories.data.taxonomy.tree;
    if($scope.list.length>0)
      $scope.listback = $scope.list.slice();
    else $scope.listback = [];
    $scope.saveIsDisabled = $scope.list.length==0;
    
    $scope.options = {
      
    }


    $scope.newSubItem = function(scope) {
      $scope.list.push({
        id: Date.now()+'',
        title: $scope.newItem,
        items: []
      });
      $scope.newItem = ""; 
      $scope.saveIsDisabled = $scope.list.length==0;
    };
    $scope.resetCategory = function(scope){
       $scope.list = $scope.listback.slice();
       alertService.add('warning', 'All categories changes canceled.',0);
    }
    
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
        $scope.listback = $scope.list.slice();
        alertService.add('success', 'Categories saved.',2000);
    }
    function errorCb(data, status, headers, config){
        $scope.saveIsDisabled = $scope.list.length==0;
        alertService.add('danger','Fail to save categories! Try later.',2000);
        if(status === 401)
          $scope.$parent.logout();
    }
  }

})(angular.module("ov.publish"));

