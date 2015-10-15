'use strict';

(function(app) {

  /**
   * Defines a publish service to get publish information.
   */
  function PublishService($http, $q, entityService, jsonPath) {
    var basePath = '/be/';
    var properties;
    var categories;
    var categoriesOptions;
    var categoriesByKey;
    var platforms;
    var videoChapter = {};

    /**
     * Retries the given video.
     * @param {String} id The id of the video to retry
     * @return {Promise} The HTTP promise
     */
    function retryVideo(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/retryVideo/' + id);
    }

    /**
     * Publishes the given video.
     * @param {String} id The id of the video to publish
     * @return {Promise} The HTTP promise
     */
    function publishVideo(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/publishVideo/' + id);
    }

    /**
     * Unpublishes the given video.
     * @param {String} id The id of the video to unpublish
     * @return {Promise} The HTTP promise
     */
    function unpublishVideo(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/unpublishVideo/' + id);
    }

    /**
     * Gets watcher status.
     * @return {Promise} The HTTP promise
     */
    function getWatcherStatus() {
      return $http.get(basePath + 'publish/watcherStatus');
    }

    /**
     * Starts the watcher.
     * @return {Promise} The HTTP promise
     */
    function startWatcher() {
      return $http.get(basePath + 'publish/startWatcher');
    }

    /**
     * Stops the watcher.
     * @return {Promise} The HTTP promise
     */
    function stopWatcher() {
      return $http.get(basePath + 'publish/stopWatcher');
    }

    /**
     * Loads the list of properties from server.
     * @return {Promise} The promise used to retrieve properties
     * from server
     */
    function loadProperties() {
      if (!properties) {
        return entityService.getAllEntities('property').success(function(propertiesObj) {
          properties = propertiesObj.entities;
        });

      }

      return $q.when({
        data: {
          entities: properties
        }
      });
    }

    /**
     * Gets list of properties.
     * @return {Promise} The HTTP promise
     */
    function getProperties() {
      return properties;
    }

    /**
     * Loads the list of available media platforms from server.
     * @return {Promise} The promise used to retrieve platforms from server
     */
    function loadPlatforms() {
      if (!platforms) {
        return $http.get(basePath + 'publish/getPlatforms').success(function(platformsObj) {
          platforms = platformsObj.platforms;
        });
      }

      return $q.when({
        data: {
          platforms: platforms
        }
      });
    }

    /**
     * Gets the list of available platforms.
     * @return {Promise} The HTTP promise
     */
    function getPlatforms() {
      return platforms;
    }

    /**
     * Asks server to start uploading the video.
     * @param {String} id The id of the video to start uploading
     * @param {String} platform The video platform to upload to
     * @return {Promise} The HTTP promise
     */
    function startVideoUpload(id, platform) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/startUpload/' + id + '/' + platform);
    }

    /**
     * Loads the list of media categories.
     * @return {Promise} The HTTP promise
     */
    function loadCategories() {
      if (!categories) {
        // Get categories from server
        return $http.get(basePath + 'gettaxonomy/categories').success(function(taxonomyObj) {
          categories = taxonomyObj;
          categoriesByKey = {};
          categoriesOptions = [];
          var categoriestmp = jsonPath(taxonomyObj, '$..*[?(@.id)]');
          if (categoriestmp)
            categoriestmp.map(function(obj) {
              var children = jsonPath(obj, '$..*[?(@.id)].id');
              var rubric = {
                value: obj.id,
                name: obj.title,
                children: children ? children.join(',') : ''
              };
              categoriesByKey[obj.id] = rubric;
              categoriesOptions.push(rubric);
              return obj;
            });
        });
      }
      return $q.when({
        data: categories
      });
    }

    /**
     * Gets list of Categories.
     * @return {Array} The list of categories
     */
    function getCategories() {
      return categories;
    }

    /**
     * Gets list of Categories formatted for select options.
     * @return {Array} The list of categories
     */
    function getCategoriesOptions() {
      return categoriesOptions;
    }

    /**
     * Gets list of Categories by key.
     * @return {Object} The list of categories by key:value
     */
    function getCategoriesByKey() {
      return categoriesByKey;
    }

    /**
     * Loads a video by its id.
     * @param {String} id The video id
     * @return {Promise} The HTTP promise
     */
    function loadVideo(id) {
      if (!videoChapter[id]) {
        return entityService.getEntity('video', id).success(function(obj) {
          videoChapter[id] = obj;
        });
      }
      return $q.when({
        data: videoChapter[id]
      });
    }

    /**
     * Deletes cache for the given entity.
     * @param {String} type The entity type
     */
    function cacheClear(type) {
      if (!type) {
        properties = categories = null;
        videoChapter = {};
      }
      else
        switch (type) {
          case 'properties':
            properties = null;
            break;
          case 'categories':
            categories = null;
            categoriesOptions = null;
            categoriesByKey = null;
            break;
          case 'chapter':
            videoChapter = {};
            break;
          default:
            return;
        }
    }

    return {
      retryVideo: retryVideo,
      publishVideo: publishVideo,
      unpublishVideo: unpublishVideo,
      startVideoUpload: startVideoUpload,
      loadProperties: loadProperties,
      getProperties: getProperties,
      loadCategories: loadCategories,
      getCategories: getCategories,
      getCategoriesOptions: getCategoriesOptions,
      getCategoriesByKey: getCategoriesByKey,
      loadPlatforms: loadPlatforms,
      getPlatforms: getPlatforms,
      getWatcherStatus: getWatcherStatus,
      startWatcher: startWatcher,
      stopWatcher: stopWatcher,
      loadVideo: loadVideo,
      cacheClear: cacheClear
    };

  }

  app.factory('publishService', PublishService);
  PublishService.$inject = ['$http', '$q', 'entityService', 'jsonPath'];

})(angular.module('ov.publish'));
