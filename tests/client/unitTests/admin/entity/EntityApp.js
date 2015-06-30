(function(angular){

  "use strict"

  var app = angular.module("ov.entity", []);
  app.factory("entityService", EntityService);
  EntityService.$inject = ["$http", "$q"];

  function EntityService($http, $q){
    var basePath = "/admin/";
     
    var addEntity = function(entityType, data){
      return $http.put(basePath + "crud/" + entityType, data);
    };

    var updateEntity = function(entityType, id, data){
      return $http.post(basePath + "crud/" + entityType + "/" + id, data);
    };

    var removeEntity = function(entityType, id){
      return $http.delete(basePath + "crud/" + entityType + "/" + id);
    };  

    return{
      addEntity: addEntity,
      updateEntity: updateEntity,
      removeEntity: removeEntity
    };

  }

})(angular);