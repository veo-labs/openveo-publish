'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   *
   * @class CategoriesController
   * @memberof module:ov.publish
   * @inner
   * @ignore
   */
  function CategoriesController($scope, $filter, entityService, categories, publishName, publishService) {
    var entityType = 'categories';
    $scope.categoryTaxonomy = categories.data || {};

    /**
     * Handles success when a category is added or updated.
     *
     * @memberof module:ov.publish~CategoriesController
     * @instance
     * @private
     */
    function successCb(taxonomy) {
      $scope.categoryTaxonomy.id = taxonomy.id;
      $scope.saveIsDisabled = $scope.list.length == 0;
      $scope.listback = angular.copy($scope.list);
      publishService.cacheClear(entityType);
      $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.CATEGORIES.SAVE_SUCCESS'), 4000);
    }

    /**
     * Handles error when a category is added or updated.
     *
     * @memberof module:ov.publish~CategoriesController
     * @instance
     * @private
     */
    function errorCb() {
      $scope.saveIsDisabled = $scope.list.length == 0;
    }

    /**
     * Checks that category name field is not empty.
     *
     * @memberof module:ov.publish~CategoriesController
     * @instance
     * @private
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
        entityService.addEntities('taxonomies', null, [{
          name: 'categories',
          tree: $scope.list
        }]).then(function(response) {
          $scope.rights.add = false;
          $scope.rights.edit = $scope.rights.save = $scope.checkAccess('core-update-taxonomies');
          successCb(response.data.entities[0]);
        }).catch(errorCb);
      } else {

        // Else : Do update
        entityService.updateEntity('taxonomies', null, $scope.categoryTaxonomy.id, {
          tree: $scope.list
        }).then(function(response) {
          response.data.entity = {id: $scope.categoryTaxonomy.id};
          successCb(response.data.entity);
        }).catch(errorCb);

      }
    };

    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('core-add-taxonomies') && !$scope.categoryTaxonomy.id;
    $scope.rights.edit = (
      $scope.checkAccess('core-update-taxonomies') && $scope.categoryTaxonomy.id
    ) || $scope.rights.add;
    $scope.rights.save = $scope.rights.add || $scope.rights.edit;
  }

  app.controller('CategoriesController', CategoriesController);
  CategoriesController.$inject = ['$scope', '$filter', 'entityService', 'categories', 'publishName', 'publishService'];

})(angular.module('ov.publish'));
