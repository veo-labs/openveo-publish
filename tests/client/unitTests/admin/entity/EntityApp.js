'use strict';

(function(angular) {

  function EntityService($http) {
    var basePath = '/be/';
    var entityCache = {};

    var addEntity = function(entityType, pluginName, data) {
      var pluginPath = (!pluginName) ? '' : pluginName + '/';
      return $http.put(basePath + pluginPath + entityType, data);
    };

    var updateEntity = function(entityType, pluginName, id, data) {
      var pluginPath = (!pluginName) ? '' : pluginName + '/';
      return $http.post(basePath + pluginPath + entityType + '/' + id, data);
    };

    var removeEntity = function(entityType, pluginName, id) {
      var pluginPath = (!pluginName) ? '' : pluginName + '/';
      return $http.delete(basePath + pluginPath + entityType + '/' + id);
    };

    var getAllEntities = function(entityType, pluginName) {
      var pluginPath = (!pluginName) ? '' : pluginName + '/';
      return $http.get(basePath + pluginPath + entityType);
    };

    var deleteCache = function(entityType, pluginName) {
      if (!pluginName) pluginName = 'core';
      if (entityCache[pluginName]) delete entityCache[pluginName][entityType];
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
