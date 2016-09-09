'use strict';

window.ovPlayerDirectory = '/publish/lib/openveo-player/';
(function(angular) {

  var app = angular.module('ov.publish', [
    'ov.i18n',
    'ov.entity',
    'ov.player',
    'ov.multirange',
    'angular-time-polyfill'
  ]);

  /**
   * Defines a filter to print status in cells.
   *
   * This filter has one optional Number parameter which must be specified
   * if the input is equal to 8 (error status), to precise the error code.
   */
  function StatusFilter($filter) {
    return function(input, errorCode) {
      var label = $filter('translate')('PUBLISH.MEDIAS.STATE_' + input);
      var type = 'label-danger';

      // Media is published
      if (input == 12)
        type = 'label-success';

      // Media is sent
      else if (input == 11)
        type = 'label-warning';

      // All other media states
      else if (input !== 0)
        type = 'label-info';

      // Media is on error
      if (input === 0)
        label = label + '(' + errorCode + ')';

      return '<span class=\'label ' + type + '\'>' + label + '</span>';
    };
  }

  /**
   * Filter to print Category in cells.
   */
  function CategoryFilter(publishService) {
    var rubrics = publishService.getCategoriesByKey();
    return function(input) {
      if (input && rubrics[input])
        return rubrics[input].name;
      else
        return '';
    };
  }

  /**
   * Filter to print Multi Sources Media icon
   */
  function MultiSourcesFilter() {
    return function(mediaIds) {
      if (mediaIds && Array.isArray(mediaIds) && mediaIds.length)
        return '<span title="multisource" class="glyphicon glyphicon-th-large" aria-hidden="true"></span>';
      return '';
    };
  }

  app.run(['$rootScope', function($rootScope) {
    $rootScope.$on('$locationChangeStart', function(event, next, current) {

      // Specific for publish plugin
      if (current.lastIndexOf('publish') >= 0) {
        // url slug : shortening the url to stuff that follows after "#"
        current = current.slice(current.lastIndexOf('/publish/') + 9, current.length);
        next = next.slice(next.lastIndexOf('/publish/') + 9, next.length);
        if (current == 'medias-list' && next.lastIndexOf('media/') >= 0) {
          $rootScope.newAnimation = 'RL';
        } else if (current.lastIndexOf('media/') >= 0 && next == 'medias-list') {
          $rootScope.newAnimation = 'LR';
        } else {
          $rootScope.newAnimation = '';
        }
      }
    });
  }]);

  /*
   * Configures the ov.publish application by adding new routes.
   */
  app.config(['$routeProvider', function($routeProvider) {

    // Add route /publish/medias with authentication.
    // Also retrieve the list of medias
    $routeProvider.when('/publish/medias-list', {
      templateUrl: '/publish/be/views/medias.html',
      controller: 'MediaController',
      title: 'PUBLISH.MEDIAS.PAGE_TITLE',
      access: 'publish-access-videos-page',
      resolve: {
        categories: ['publishService', function(publishService) {
          return publishService.loadTaxonomyCategory();
        }],
        properties: ['publishService', function(publishService) {
          return publishService.loadProperties();
        }],
        platforms: ['publishService', function(publishService) {
          return publishService.loadPlatforms();
        }],
        groups: ['entityService', function(entityService) {
          return entityService.getAllEntities('groups');
        }],
        users: ['entityService', function(entityService) {
          return entityService.getAllEntities('users');
        }]
      }
    });

    // Add route /publish/medias/mediasId with authentication.
    // Also retrieve the list of medias
    $routeProvider.when('/publish/media/:mediaId', {
      templateUrl: '/publish/be/views/chapter.html',
      controller: 'ChapterController',
      title: 'PUBLISH.CHAPTER.PAGE_TITLE',
      access: 'publish-chapter-videos',
      resolve: {
        media: ['$q', 'publishService', 'alertService', '$route', '$filter',
          function($q, publishService, alertService, $route, $filter) {
            var deferred = $q.defer();
            var mediaId = $route.current.params.mediaId;

            publishService.loadMedia(mediaId).then(function(result) {
              if (result.data.entity) {
                if (result.data.entity.available)
                  deferred.resolve.apply(deferred, arguments);
                else {
                  publishService.cacheClear('chapter');
                  alertService.add('danger', $filter('translate')('PUBLISH.MEDIAS.NOT_READY'), 8000);
                  deferred.reject({redirect: '/publish/medias'});
                }
              } else
                deferred.reject();
            }, function() {
              deferred.reject();
            });

            return deferred.promise;
          }
        ]
      }
    });

    // Add route /publish/watcher with authentication.
    // Also retrieve the watcher status
    $routeProvider.when('/publish/watcher', {
      templateUrl: '/publish/be/views/watcher.html',
      controller: 'WatcherController',
      title: 'PUBLISH.WATCHER.PAGE_TITLE',
      access: 'publish-access-watcher-page',
      resolve: {
        watcherStatus: ['publishService', function(publishService) {
          return publishService.getWatcherStatus();
        }]
      }
    });

    // Add route /publish/properties with authentication.
    // Also retrieve the list of properties
    $routeProvider.when('/publish/properties-list', {
      templateUrl: '/publish/be/views/properties.html',
      controller: 'PropertiesController',
      title: 'PUBLISH.PROPERTIES.PAGE_TITLE',
      access: 'publish-access-properties-page'
    });

    // Add route /publish/categories with authentication.
    // Also retrieve the list of categories
    $routeProvider.when('/publish/categories-list', {
      templateUrl: '/publish/be/views/categories.html',
      controller: 'CategoriesController',
      title: 'PUBLISH.CATEGORIES.PAGE_TITLE',
      access: 'publish-access-categories-page',
      resolve: {
        categories: ['publishService', function(publishService) {
          return publishService.loadTaxonomyCategory();
        }]
      }
    });

    // Add route /publish/configuration with authentication.
    // Also retrieve the list of configurations
    $routeProvider.when('/publish/configuration', {
      templateUrl: '/publish/be/views/configuration.html',
      controller: 'ConfigurationController',
      title: 'PUBLISH.CONFIGURATION.PAGE_TITLE',
      access: 'publish-access-conf-page',
      resolve: {
        publishConf: ['publishService', function(publishService) {
          return publishService.getConfiguration();
        }],
        groups: ['entityService', function(entityService) {
          return entityService.getAllEntities('groups');
        }],
        users: ['entityService', function(entityService) {
          return entityService.getAllEntities('users');
        }]
      }
    });
  }]);

  app.filter('status', StatusFilter);
  app.filter('category', CategoryFilter);
  app.filter('multisources', MultiSourcesFilter);

  app.constant('publishName', 'publish');

  // Filter to display content in the table (cf. dataTable.html)
  StatusFilter.$inject = ['$filter'];
  CategoryFilter.$inject = ['publishService'];

})(angular);
