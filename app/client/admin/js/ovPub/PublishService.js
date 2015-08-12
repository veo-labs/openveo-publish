(function(app){

  "use strict"

  app.factory("publishService", PublishService);
  PublishService.$inject = ["$http", "$q", "entityService"];

  /**
   * Defines a publish service to get publish information.
   */
  function PublishService($http, $q, entityService){
    var basePath = "/admin/";
    var properties, videos, categories;

    /**
     * Loads the list of videos from server.
     * @return Promise The promise used to retrieve properties
     * from server
     * @param Boolean force true to force reloading the list of videos
     */
    var loadVideos = function(force){
      if(!videos || force){

        // Get videos from server
        return entityService.getAllEntities('video').success(function(videosObj){
          videos = videosObj.entities;
        });

      }

      return $q.when({data : {entities : videos}});
    };

    /**
     * Publishes the given video.
     * @param String id The id of the video to publish
     * @return HttpPromise The HTTP promise
     */
    var publishVideo = function(id){
      entityService.deleteCache("video");
      return $http.get(basePath + "publish/publishVideo/" + id);
    };

    /**
     * Unpublishes the given video.
     * @param String id The id of the video to unpublish
     * @return HttpPromise The HTTP promise
     */
    var unpublishVideo = function(id){
      entityService.deleteCache("video");
      return $http.get(basePath + "publish/unpublishVideo/" + id);
    };


    /**
     * Gets the list of videos.
     * @return HttpPromise The HTTP promise
     */
    var getVideos = function(){
      return videos;
    };

    
    /**
     * Gets watcher status.
     * @return HttpPromise The HTTP promise
     */
    var getWatcherStatus = function(){
      return $http.get(basePath + "publish/watcherStatus");
    };
    
    /**
     * Starts the watcher.
     * @return HttpPromise The HTTP promise
     */
    var startWatcher = function(){
      return $http.get(basePath + "publish/startWatcher");
    };

    /**
     * Stops the watcher.
     * @return HttpPromise The HTTP promise
     */
    var stopWatcher = function(){
      return $http.get(basePath + "publish/stopWatcher");
    };

    /**
     * Loads the list of properties from server.
     * @return Promise The promise used to retrieve properties
     * from server
     */
    var loadProperties = function(){
      if(!properties){
        return entityService.getAllEntities('property').success(function(propertiesObj){
          properties = propertiesObj.entities;
        });

      }

      return $q.when({data : {entities : properties}});
    };

    /**
     * Gets list of properties.
     * @return HttpPromise The HTTP promise
     */
    var getProperties = function(){
      return properties;
    };
    
    var loadCategories = function(){
      if(!categories){
       
        // Get categories from server
        return $http.get(basePath + "gettaxonomy/categories").success(function(taxonomyObj){
          categories = taxonomyObj;
        });

      }

      return $q.when({data : categories});
    };
    
    /**
     * Gets list of properties.
     * @return HttpPromise The HTTP promise
     */
    var getCategories = function(){
      return categories;
    };
    
    var cacheClear = function(type){
      if(!type) properties = videos = categories = null;
      else switch(type){
        case "properties":
          properties = null;
          break;
        case "categories":
          categories = null;
          break;
        case "videos":
          videos = null;
          break;
      }
    }

    return{
      loadVideos : loadVideos,
      getVideos : getVideos,
      publishVideo : publishVideo,
      unpublishVideo : unpublishVideo,
      
      loadProperties : loadProperties,
      getProperties : getProperties,

      loadCategories : loadCategories,
      getCategories : getCategories,
      
      getWatcherStatus : getWatcherStatus,
      startWatcher : startWatcher,
      stopWatcher : stopWatcher,
      
      cacheClear : cacheClear
    };

  }
  
})(angular.module("ov.publish"));