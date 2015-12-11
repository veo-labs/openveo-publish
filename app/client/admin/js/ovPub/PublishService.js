'use strict';

(function(app) {

  /**
   * Defines a publish service to manage medias, watcher, categories and properties.
   *
   * @module ov.publish
   * @class publishService
   */
  function PublishService($http, $q, entityService, jsonPath) {
    var basePath = '/be/';
    var properties;
    var categories;
    var categoriesOptions;
    var categoriesByKey;
    var platforms;
    var mediaChapter = {};

    /**
     * Retries a media.
     *
     * If a media is on error, the upload / publication process has stopped and can be retried.
     *
     * @param {String} id The id of the media to retry
     * @return {Promise} The HTTP promise
     * @method retryMedia
     */
    function retryMedia(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/retryVideo/' + id);
    }

    /**
     * Publishes the given media.
     *
     * @param {String} id The id of the media to publish
     * @return {Promise} The HTTP promise
     * @method publishMedia
     */
    function publishMedia(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/publishVideo/' + id);
    }

    /**
     * Unpublishes the given media.
     *
     * @param {String} id The id of the media to unpublish
     * @return {Promise} The HTTP promise
     * @method unpublishMedia
     */
    function unpublishMedia(id) {
      entityService.deleteCache('video');
      return $http.get(basePath + 'publish/unpublishVideo/' + id);
    }

    /**
     * Gets watcher status.
     *
     * @return {Promise} The HTTP promise
     * @method getWatcherStatus
     */
    function getWatcherStatus() {
      return $http.get(basePath + 'publish/watcherStatus');
    }

    /**
     * Starts the watcher.
     *
     * @return {Promise} The HTTP promise
     * @method startWatcher
     */
    function startWatcher() {
      return $http.get(basePath + 'publish/startWatcher');
    }

    /**
     * Stops the watcher.
     *
     * @return {Promise} The HTTP promise
     * @method stopWatcher
     */
    function stopWatcher() {
      return $http.get(basePath + 'publish/stopWatcher');
    }

    /**
     * Loads all properties from server.
     *
     * @return {Promise} The HTTP promise
     * @method loadProperties
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
     *
     * @return {Promise} The HTTP promise
     * @method getProperties
     */
    function getProperties() {
      return properties;
    }

    /**
     * Loads the list of available media platforms from server.
     *
     * @return {Promise} The promise used to retrieve platforms from server
     * @method loadPlatforms
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
     *
     * @return {Promise} The HTTP promise
     * @method getPlatforms
     */
    function getPlatforms() {
      return platforms;
    }

    /**
     * Asks server to start uploading a media waiting for manual upload.
     *
     * @param {String} id The id of the media to start uploading
     * @param {String} platform The media platform to upload to
     * @return {Promise} The HTTP promise
     * @method startMediaUpload
     */
    function startMediaUpload(id, platform) {
      entityService.deleteCache('media');
      return $http.get(basePath + 'publish/startUpload/' + id + '/' + platform);
    }

    /**
     * Loads the list of media categories.
     *
     * @return {Promise} The HTTP promise
     * @method loadCategories
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
     * Gets the list of categories.
     *
     * @return {Array} The list of categories
     * @method getCategories
     */
    function getCategories() {
      return categories;
    }

    /**
     * Gets the list of categories formatted for an HTMLSelect element.
     *
     * @return {Array} The list of categories
     * @method getCategoriesOptions
     */
    function getCategoriesOptions() {
      return categoriesOptions;
    }

    /**
     * Gets list of categories indexed by keys.
     *
     * @return {Object} The list of categories
     * @method getCategoriesByKey
     */
    function getCategoriesByKey() {
      return categoriesByKey;
    }

    /**
     * Loads a media by its id.
     *
     * @param {String} id The media id
     * @return {Promise} The HTTP promise
     * @method loadMedia
     */
    function loadMedia(id) {
      if (!mediaChapter[id]) {
        return entityService.getEntity('video', id).success(function(obj) {
          mediaChapter[id] = obj;
        });
      }
      return $q.when({
        data: mediaChapter[id]
      });
    }

    /**
     * Clears a publish service cache.
     *
     * @param {String} [type] The cache element to clear (**properties**, **categories** or **chapter**), null to
     * clear all caches
     * @method cacheClear
     */
    function cacheClear(type) {
      if (!type) {
        properties = categories = null;
        mediaChapter = {};
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
            mediaChapter = {};
            break;
          default:
            return;
        }
    }

    /**
     * Retrieve oAuth informations
     *
     * @return {Promise} The HTTP promise
     */
    function getOAuthInfos() {
      return $http.get(basePath + 'publish/configuration/oAuthInformations');
    }

    return {
      retryMedia: retryMedia,
      publishMedia: publishMedia,
      unpublishMedia: unpublishMedia,
      startMediaUpload: startMediaUpload,
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
      loadMedia: loadMedia,
      getOAuthInfos: getOAuthInfos,
      cacheClear: cacheClear
    };

  }

  app.factory('publishService', PublishService);
  PublishService.$inject = ['$http', '$q', 'entityService', 'jsonPath'];

})(angular.module('ov.publish'));
