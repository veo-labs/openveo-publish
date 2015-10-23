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
      var label = $filter('translate')('VIDEOS.STATE_' + input);
      var type = 'label-danger';

      // Video is published
      if (input == 12)
        type = 'label-success';

      // Video is sent
      else if (input == 11)
        type = 'label-warning';

      // All other video states
      else if (input !== 0)
        type = 'label-info';

      // Video is on error
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

  app.run(['$rootScope', function($rootScope) {
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      // url slug : shortening the url to stuff that follows after "#"
      current = current.slice(current.lastIndexOf('/publish/') + 9, current.length);
      next = next.slice(next.lastIndexOf('/publish/') + 9, next.length);
      if (current == 'videos' && next.lastIndexOf('video/') >= 0) {
        $rootScope.newAnimation = 'RL';
      } else if (current.lastIndexOf('video/') >= 0 && next == 'videos') {
        $rootScope.newAnimation = 'LR';
      } else {
        $rootScope.newAnimation = '';
      }
    });
  }]);

  /*
   * Configures the ov.publish application by adding new routes.
   */
  app.config(['$routeProvider', function($routeProvider) {

    // Add route /publish/videos with authentication.
    // Also retrieve the list of videos
    $routeProvider.when('/publish/videos', {
      templateUrl: '/publish/be/views/videos.html',
      controller: 'VideoController',
      title: 'VIDEOS.PAGE_TITLE',
      access: 'access-videos-page',
      resolve: {
        categories: ['publishService', function(publishService) {
          return publishService.loadCategories();
        }],
        properties: ['publishService', function(publishService) {
          return publishService.loadProperties();
        }],
        platforms: ['publishService', function(publishService) {
          return publishService.loadPlatforms();
        }]
      }
    });

    // Add route /publish/videos/videosId with authentication.
    // Also retrieve the list of videos
    $routeProvider.when('/publish/video/:videoId', {
      templateUrl: '/publish/be/views/chapter.html',
      controller: 'ChapterController',
      title: 'CHAPTER.PAGE_TITLE',
      access: 'chapter-video',
      resolve: {
        video: ['$q', 'publishService', 'alertService', '$route', '$filter',
          function($q, publishService, alertService, $route, $filter) {
            var deferred = $q.defer();
            var videoId = $route.current.params.videoId;

            publishService.loadVideo(videoId).then(function(result) {
              if (result.data.entity) {
                result.data.entity.files = [];
                if (result.data.entity.files && result.data.entity.files.length)
                  deferred.resolve.apply(deferred, arguments);
                else {
                  publishService.cacheClear('chapter');
                  alertService.add('danger', $filter('translate')('VIDEOS.NOT_READY'), 8000);
                  deferred.reject({redirect: '/publish/videos'});
                }
              }
              else
                deferred.reject();
            }, function() {
              deferred.reject();
            });

            return deferred.promise;
          }]
      }
    });

    // Add route /publish/watcher with authentication.
    // Also retrieve the watcher status
    $routeProvider.when('/publish/watcher', {
      templateUrl: '/publish/be/views/watcher.html',
      controller: 'WatcherController',
      title: 'WATCHER.PAGE_TITLE',
      access: 'access-watcher-page',
      resolve: {
        watcherStatus: ['publishService', function(publishService) {
          return publishService.getWatcherStatus();
        }]
      }
    });

    // Add route /publish/properties with authentication.
    // Also retrieve the list of properties
    $routeProvider.when('/publish/properties', {
      templateUrl: '/publish/be/views/properties.html',
      controller: 'PropertiesController',
      title: 'PROPERTIES.PAGE_TITLE',
      access: 'access-properties-page'
    });

    // Add route /publish/categories with authentication.
    // Also retrieve the list of categories
    $routeProvider.when('/publish/categories', {
      templateUrl: '/publish/be/views/categories.html',
      controller: 'CategoriesController',
      title: 'CATEGORIES.PAGE_TITLE',
      access: 'access-categories-page',
      resolve: {
        categories: ['publishService', function(publishService) {
          return publishService.loadCategories();
        }]
      }
    });

  }]);

  app.filter('status', StatusFilter);
  app.filter('category', CategoryFilter);

  // Filter to display content in the table (cf. dataTable.html)
  StatusFilter.$inject = ['$filter'];
  CategoryFilter.$inject = ['publishService'];

})(angular);
