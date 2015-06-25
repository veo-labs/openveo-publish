(function(app){
  
  "use strict"

  app.controller("CategoriesController", CategoriesController);
  CategoriesController.$inject = ["$scope", "applicationService", "categories"];

  /**
   * Defines the categories controller for the categories page.
   */
  function CategoriesController($scope, applicationService, categories){
    
    $scope.newItem = "";
    $scope.list = categories.data.taxonomy.tree;
    if($scope.list.length>0)
      $scope.listback = $scope.list.slice();
    else $scope.listback = [];
    $scope.saveIsDisabled = $scope.list.length==0;
    



    $scope.newSubItem = function(scope) {
      $scope.list.push({
        id: $scope.list.length,
        title: $scope.newItem,
        items: []
      });
      $scope.newItem = ""; 
      $scope.saveIsDisabled = $scope.list.length==0;
    };
    $scope.resetCategory = function(scope){
       $scope.list = $scope.listback.slice();
       $scope.addAlert({type: 'warning', msg: 'All categories changes canceled.'});
    }
    
    $scope.saveCategory = function(form){
      $scope.saveIsDisabled = true;
      //If no categories exist : Do create
      if(categories.data.taxonomy.id === undefined)
        applicationService.addEntity("taxonomy", {name:"categories", tree:$scope.list}).success(successCb).error(errorCb);
      //Else : Do update
      else 
        applicationService.updateEntity("taxonomy", categories.data.taxonomy.id, {tree:$scope.list}).success(successCb).error(errorCb);
    };
    
    $scope.alerts = [];
    $scope.addAlert = function(msg) {
      $scope.alerts.push(msg);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };
    
    function successCb(data, status, headers, config) {
        $scope.saveIsDisabled = $scope.list.length==0;
        $scope.listback = $scope.list.slice();
        $scope.addAlert({type: 'success', msg: 'Categories saved.'});
    }
    function errorCb(data, status, headers, config){
        $scope.saveIsDisabled = $scope.list.length==0;
        $scope.addAlert({type: 'danger', msg: 'Fail to save categories! Try later.'});
        if(status === 401)
          $scope.$parent.logout();
    }
  }

})(angular.module("ov.publish"));

