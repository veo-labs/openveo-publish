'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   */
  function CategoriesController($scope, $filter, entityService, categories) {

    /**
     * Handles success when a category is added or updated.
     */
    function successCb(data) {
      categories.data.taxonomy.id = data.entity.id;
      $scope.saveIsDisabled = $scope.list.length == 0;
      $scope.listback = angular.copy($scope.list);
      $scope.$emit('setAlert', 'success', $filter('translate')('CATEGORIES.SAVE_SUCCESS'), 4000);
    }

    /**
     * Handles error when a category is added or updated.
     *
     * @param {Object} data Response data
     * @param {Number} status HTTP code
     */
    function errorCb(data, status) {
      $scope.saveIsDisabled = $scope.list.length == 0;
    }

    /**
     * Checks that category name field is not empty.
     */
    function isAddFieldEmpty() {
      if ($scope.newitem.title == undefined) {
        return true;
      } else if ($scope.newitem.title.length == 0) {
        return true;
      } else {
        return false;
      }
    }
    $scope.newitem = {
      items: []
    };
    $scope.list = categories.data.taxonomy.tree;
    if ($scope.list.length > 0)
      $scope.listback = angular.copy($scope.list);
    else
      $scope.listback = [];
    $scope.saveIsDisabled = $scope.list.length == 0;

    $scope.options = {
    };

    $scope.newSubItem = function() {
      if (isAddFieldEmpty()) {
        $scope.$emit('setAlert', 'warning', $filter('translate')('CATEGORIES.EMPTY'), 4000);
      } else {
        $scope.newitem.id = String(Date.now());
        $scope.list.push(angular.copy($scope.newitem));
        $scope.newitem = {
          items: []
        };
        $scope.saveIsDisabled = $scope.list.length == 0;
      }
    };
    $scope.resetCategory = function() {
      $scope.list = angular.copy($scope.listback);
      $scope.$emit('setAlert', 'info', $filter('translate')('CATEGORIES.RESET'), 4000);
    };

    $scope.$watchCollection('list', function() {
      $scope.saveIsEmpty = $scope.list.length == 0;
    });

    $scope.saveCategory = function() {
      $scope.saveIsDisabled = true;

      // If no categories exist : Do create
      if (categories.data.taxonomy.id === undefined) {
        entityService.addEntity('category', {
          name: 'categories',
          tree: $scope.list
        }).success(function(data) {
          successCb(data);
        }).error(errorCb);
      } else {

        // Else : Do update
        entityService.updateEntity('category', categories.data.taxonomy.id, {
          tree: $scope.list
        }).success(function(data) {
          data.entity = {id: categories.data.taxonomy.id};
          successCb(data);
        }).error(errorCb);
      }
    };

    /*
     *
     * Rights
     *
     */
    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('create-category');
    $scope.rights.edit = $scope.checkAccess('update-category');
    $scope.rights.delete = $scope.checkAccess('delete-category');

  }

  app.controller('CategoriesController', CategoriesController);
  CategoriesController.$inject = ['$scope', '$filter', 'entityService', 'categories'];

})(angular.module('ov.publish'));
