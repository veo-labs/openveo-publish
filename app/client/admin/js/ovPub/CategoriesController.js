'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   */
  function CategoriesController($scope, $filter, entityService, categories, publishName) {
    var entityType = 'categories';
    $scope.categoryTaxonomy = categories.data || {};

    /**
     * Handles success when a category is added or updated.
     */
    function successCb(data) {
      $scope.categoryTaxonomy.id = data.entity.id;
      $scope.saveIsDisabled = $scope.list.length == 0;
      $scope.listback = angular.copy($scope.list);
      $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.CATEGORIES.SAVE_SUCCESS'), 4000);
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
    $scope.list = $scope.categoryTaxonomy.tree || [];
    if ($scope.list.length > 0)
      $scope.listback = angular.copy($scope.list);
    else
      $scope.listback = [];
    $scope.saveIsDisabled = $scope.list.length == 0;

    $scope.options = {
    };

    $scope.newSubItem = function() {
      if (isAddFieldEmpty()) {
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.CATEGORIES.EMPTY'), 4000);
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
      $scope.$emit('setAlert', 'info', $filter('translate')('PUBLISH.CATEGORIES.RESET'), 4000);
    };

    $scope.$watchCollection('list', function() {
      $scope.saveIsEmpty = $scope.list.length == 0;
    });

    $scope.saveCategory = function() {
      $scope.saveIsDisabled = true;

      // If no categories exist : Do create
      if ($scope.categoryTaxonomy.id === undefined) {
        entityService.addEntity('taxonomies', null, {
          name: 'categories',
          tree: $scope.list
        }).success(function(data) {
          successCb(data);
        }).error(errorCb);
      } else {

        // Else : Do update
        entityService.updateEntity('taxonomies', null, $scope.categoryTaxonomy.id, {
          tree: $scope.list
        }).success(function(data) {
          data.entity = {id: $scope.categoryTaxonomy.id};
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
    $scope.rights.add = $scope.checkAccess('publish-add-' + entityType);
    $scope.rights.edit = $scope.checkAccess('publish-update-' + entityType);
    $scope.rights.delete = $scope.checkAccess('publish-delete-' + entityType);

  }

  app.controller('CategoriesController', CategoriesController);
  CategoriesController.$inject = ['$scope', '$filter', 'entityService', 'categories', 'publishName'];

})(angular.module('ov.publish'));
