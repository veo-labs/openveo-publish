'use strict';

(function(app) {

  /**
   * Defines a publish service to manage medias, categories and properties.
   *
   * @module ov.publish
   * @class publishService
   */
  function PublishService($http, $q, entityService, jsonPath, publishName, Upload) {
    var basePath = '/be/';
    var properties;
    var taxonomyCategory;
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
      entityService.deleteCache('videos', publishName);
      return $http.post(basePath + 'publish/retryVideo/' + id);
    }

    /**
     * Publishes the given media.
     *
     * @param {String} id The id of the media to publish
     * @return {Promise} The HTTP promise
     * @method publishMedia
     */
    function publishMedia(id) {
      entityService.deleteCache('videos', publishName);
      return $http.post(basePath + 'publish/publishVideo/' + id);
    }

    /**
     * Unpublishes the given media.
     *
     * @param {String} id The id of the media to unpublish
     * @return {Promise} The HTTP promise
     * @method unpublishMedia
     */
    function unpublishMedia(id) {
      entityService.deleteCache('videos', publishName);
      return $http.post(basePath + 'publish/unpublishVideo/' + id);
    }

    /**
     * Loads all properties from server.
     *
     * @return {Promise} The HTTP promise
     * @method loadProperties
     */
    function loadProperties() {
      if (!properties) {
        return entityService.getAllEntities('properties', publishName).then(function(results) {
          properties = results.data.entities;
          return $q.when(results);
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
        return $http.get(basePath + 'publish/getPlatforms').then(function(results) {
          platforms = results.data.platforms;
          return $q.when(results);
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
      entityService.deleteCache('videos', publishName);
      return $http.post(basePath + 'publish/startUpload/' + id + '/' + platform);
    }

    /**
     * Loads taxonomy "categories".
     *
     * @return {Promise} The HTTP promise
     * @method loadTaxonomyCategory
     */
    function loadTaxonomyCategory() {
      if (!taxonomyCategory) {

        // Get taxonomy "categories" from server
        return $http.get(basePath + 'taxonomies?query=categories').then(function(results) {
          taxonomyCategory = results.data.entities && results.data.entities[0];
          categoriesByKey = {};
          categoriesOptions = [];
          var categoriestmp = jsonPath(taxonomyCategory, '$..*[?(@.id)]');
          if (categoriestmp) {
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
          }
          return $q.when({
            data: taxonomyCategory
          });
        });

      }
      return $q.when({
        data: taxonomyCategory
      });
    }

    /**
     * Gets the taxonomy "categories".
     *
     * @return {Object} The taxonomy
     * @method getTaxonomyCategory
     */
    function getTaxonomyCategory() {
      return taxonomyCategory;
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
        return entityService.getEntity('videos', publishName, id).then(function(results) {
          mediaChapter[id] = results.data.entity;
          return $q.when(results);
        });
      }
      return $q.when({
        data: {
          entity: mediaChapter[id]
        }
      });
    }

    /**
     * Saves watcher settings.
     *
     * @method saveWatcherSettings
     * @param {Object} data The watcher settings
     * @return {HttpPromise} The HTTP promise
     */
    function saveWatcherSettings(data) {
      return $http.post(basePath + 'publish/configuration/watcher/', data);
    }

    /**
     * Saves TLS settings.
     *
     * @method saveTlsSettings
     * @param {Object} data The TLS settings
     * @return {HttpPromise} The HTTP promise
     */
    function saveTlsSettings(data) {
      return $http.post(basePath + 'publish/configuration/tls/', data);
    }

    /**
     * Saves catalog settings.
     *
     * @method saveCatalogSettings
     * @param {Object} data The catalog settings
     * @return {HttpPromise} The HTTP promise
     */
    function saveCatalogSettings(data) {
      return $http.post(basePath + 'publish/configuration/catalog/', data);
    }

    /**
     * Updates a chapter associated to the specified media.
     *
     * @method updateChapter
     * @param {String} id The media id
     * @param {Object} chapter Information about the chapter
     * @param {String} [chapter.id] The chapter id
     * @param {Number} [chapter.value] The chapter time in milliseconds
     * @param {String} [chapter.name] The chapter name
     * @param {String} [chapter.description] The chapter description
     * @return {HttpPromise} The HTTP promise
     */
    function updateChapter(id, chapter) {
      return $http.post(basePath + 'publish/videos/' + id + '/chapters/' + (chapter.id || ''), chapter);
    }

    /**
     * Updates a tag associated to the specified media.
     *
     * @method updateTag
     * @param {String} id The media id
     * @param {Object} file The file to upload
     * @param {Object} tag Information about the tag
     * @param {String} [tag.id] The tag id
     * @param {Number} [tag.value] The tag time in milliseconds
     * @param {String} [tag.name] The tag name
     * @param {String} [tag.description] The tag description
     * @return {Promise} The HTTP promise
     */
    function updateTag(id, file, tag) {
      return Upload.upload({
        url: '/be/publish/videos/' + id + '/tags/' + (tag.id || ''),
        data: {info: Upload.json(tag), file: file}
      });
    }

    /**
     * Remove tags from media.
     *
     * @method removeTags
     * @param {String} id The media id
     * @param {Array} tagIds The list of tag ids to remove
     * @return {Promise} The HTTP promise
     */
    function removeTags(id, tagIds) {
      return $http.delete(basePath + 'publish/videos/' + id + '/tags/' + tagIds.join(','));
    }

    /**
     * Removes chapters from media.
     *
     * @method removeChapters
     * @param {String} id The media id
     * @param {Array} chapterIds The list of chapter ids to remove
     * @return {HttpPromise} The HTTP promise
     */
    function removeChapters(id, chapterIds) {
      return $http.delete(basePath + 'publish/videos/' + id + '/chapters/' + chapterIds.join(','));
    }

    /**
     * Clears a publish service cache.
     *
     * @param {String} [type] The cache element to clear (**properties**, **categories** or **editor**), null to
     * clear all caches
     * @method cacheClear
     */
    function cacheClear(type) {
      if (!type) {
        properties = taxonomyCategory = null;
        mediaChapter = {};
      } else
        switch (type) {
          case 'properties':
            properties = null;
            break;
          case 'categories':
            taxonomyCategory = null;
            categoriesOptions = null;
            categoriesByKey = null;
            break;
          case 'editor':
            mediaChapter = {};
            break;
          default:
            return;
        }
    }

    /**
     * Retrieves publish plugin configuration.
     *
     * @return {Promise} The HTTP promise
     * @method getConfiguration
     */
    function getConfiguration() {
      return $http.get(basePath + 'publish/configuration/all');
    }

    /**
     * Adds a media.
     *
     * @param {Object} Information about the media
     * @return {Promise} An HTTP promise resolving when media has been added
     * @method addMedia
     */
    function addMedia(data) {
      var file = data.file;
      var thumbnail = data.thumbnail;
      delete data.file;
      delete data.thumbnail;

      return Upload.upload({
        url: '/be/publish/addMedia',
        data: {info: Upload.json(data), file: file, thumbnail: thumbnail}
      });
    }

    /**
     * Update a media
     *
     * @param {Object} Information about the media
     * @return {Promise} An HTTP promise resolving when media has been updated
     * @method updateMedia
     */
    function updateMedia(id, data) {
      var thumbnail = data.thumbnail;

      delete data.thumbnail;

      entityService.deleteCache('videos', publishName);

      return Upload.upload({
        url: '/be/publish/videos/' + id,
        data: {info: Upload.json(data), thumbnail: thumbnail}
      });
    }

    return {
      addMedia: addMedia,
      updateMedia: updateMedia,
      retryMedia: retryMedia,
      publishMedia: publishMedia,
      unpublishMedia: unpublishMedia,
      startMediaUpload: startMediaUpload,
      loadProperties: loadProperties,
      getProperties: getProperties,
      loadTaxonomyCategory: loadTaxonomyCategory,
      getTaxonomyCategory: getTaxonomyCategory,
      getCategoriesOptions: getCategoriesOptions,
      getCategoriesByKey: getCategoriesByKey,
      loadPlatforms: loadPlatforms,
      getPlatforms: getPlatforms,
      loadMedia: loadMedia,
      getConfiguration: getConfiguration,
      saveWatcherSettings: saveWatcherSettings,
      saveTlsSettings: saveTlsSettings,
      saveCatalogSettings: saveCatalogSettings,
      updateTag: updateTag,
      updateChapter: updateChapter,
      removeTags: removeTags,
      removeChapters: removeChapters,
      cacheClear: cacheClear
    };

  }

  app.factory('publishService', PublishService);
  PublishService.$inject = ['$http', '$q', 'entityService', 'jsonPath', 'publishName', 'Upload'];

})(angular.module('ov.publish'));
