'use strict';

(function(angular) {

  function EntityService($http) {
    var basePath = '/admin/';
    var entityCache = {};

    var addEntity = function(entityType, data) {
      return $http.put(basePath + 'crud/' + entityType, data);
    };

    var updateEntity = function(entityType, id, data) {
      return $http.post(basePath + 'crud/' + entityType + '/' + id, data);
    };

    var removeEntity = function(entityType, id) {
      return $http.delete(basePath + 'crud/' + entityType + '/' + id);
    };

    var getAllEntities = function(entityType) {
      return $http.get(basePath + 'crud/' + entityType);
    };

    var deleteCache = function(entity) {
      delete entityCache[entity];
    };

    return {
      addEntity: addEntity,
      updateEntity: updateEntity,
      removeEntity: removeEntity,
      getAllEntities: getAllEntities,
      deleteCache: deleteCache
    };

  }

  var app = angular.module('ov.entity', []);
  app.factory('entityService', EntityService);
  EntityService.$inject = ['$http'];

})(angular);
