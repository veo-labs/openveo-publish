'use strict';

(function(app) {

  /**
   * Defines a publish service to get publish information.
   */
  function PublishService($http, $q, entityService) {
    var basePath = '/admin/';
    var properties,
      videos,
      categories,
      platforms;
    var videoChapter = {};

    /**
     * Loads the list of videos from server.
     * @param {Boolean} force true to force reloading the list of videos
     * @return {Promise} The promise used to retrieve videos from server
     */
    function loadVideos(force) {
      if (!videos || force) {

        // Get videos from server
        return entityService.getAllEntities('video').success(function(videosObj) {
          videos = videosObj.entities;
        });

      }

      return $q.when({
        data: {
          entities: videos
        }
      });
    }

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
     * Gets the list of videos.
     * @return {Promise} The HTTP promise
     */
    function getVideos() {
      return videos;
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
        });

      }

      return $q.when({
        data: categories
      });
    }

    /**
     * Gets list of properties.
     * @return {Array} The list of categories
     */
    function getCategories() {
      return categories;
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
        properties = videos = categories = null;
        videoChapter = {};
      }
      else
        switch (type) {
          case 'properties':
            properties = null;
            break;
          case 'categories':
            categories = null;
            break;
          case 'videos':
            videos = null;
            break;
          case 'chapter':
            videoChapter = {};
            break;
          default:
            return;
        }
    }

    return {
      loadVideos: loadVideos,
      getVideos: getVideos,
      retryVideo: retryVideo,
      publishVideo: publishVideo,
      unpublishVideo: unpublishVideo,
      startVideoUpload: startVideoUpload,
      loadProperties: loadProperties,
      getProperties: getProperties,
      loadCategories: loadCategories,
      getCategories: getCategories,
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
  PublishService.$inject = ['$http', '$q', 'entityService'];

})(angular.module('ov.publish'));
