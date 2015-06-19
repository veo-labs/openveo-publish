(function(app){

  "use strict"

  app.factory("publishService", PublishService);
  PublishService.$inject = ["$http", "$q"];

  /**
   * Defines a publish service to get publish information.
   */
  function PublishService($http, $q){
    var basePath = "/admin/";
    var properties, videos;

    /**
     * Loads the list of videos from server.
     * @return Promise The promise used to retrieve properties
     * from server
     * @param Boolean force true to force reloading the list of videos
     */
    var loadVideos = function(force){
      if(!videos || force){

        // Get videos from server
        return $http.get(basePath + "crud/video").success(function(videosObj){
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
      return $http.get(basePath + "publish/publishVideo/" + id);
    };

    /**
     * Unpublishes the given video.
     * @param String id The id of the video to unpublish
     * @return HttpPromise The HTTP promise
     */
    var unpublishVideo = function(id){
      return $http.get(basePath + "publish/unpublishVideo/" + id);
    };

    /**
     * Removes the given video.
     * @param String id The id of the video to remove
     * @return HttpPromise The HTTP promise
     */
    var removeVideo = function(id){
      return $http.delete(basePath + "crud/video/" + id);
    };

    /**
     * Gets the list of videos.
     * @return HttpPromise The HTTP promise
     */
    var getVideos = function(){
      return videos;
    };

    /**
     * Updates video properties.
     * @param String id The id of the video to update
     * @param String title The title of the video
     * @param String description The description of the video
     * @param Array properties The list of properties of the video
     * @return HttpPromise The HTTP promise
     */
    var updateVideo = function(id, title, description, properties){

      // Only save property's value and id
      var filteredProperties = [];

      for(var i = 0 ; i < properties.length ; i++){
        filteredProperties.push({
          id : properties[i].id,
          value : properties[i].value
        });
      }

      return $http.post(basePath + "crud/video/" + id, {
        title : title,
        description : description,
        properties : filteredProperties
      });
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

        // Get properties from server
        return $http.get(basePath + "crud/property").success(function(propertiesObj){
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

    /**
     * Adds a new property.
     * @param String name The name of the property
     * @param String description The description of the property
     * @param String type The type of the property
     */
    var addProperty = function(name, description, type){
      return $http.put(basePath + "crud/property", {
        name : name,
        description : description,
        type : type
      });
    };

    /**
     * Updates property.
     * @param String id The id of the property to update
     * @param String name The name of the property
     * @param String description The description of the property
     * @return HttpPromise The HTTP promise
     */
    var updateProperty = function(id, name, description, type){
      return $http.post(basePath + "crud/property/" + id, {
        name : name,
        description : description,
        type : type
      });
    };

    /**
     * Removes a property.
     * @param String id The id of the property to remove
     * @return HttpPromise The HTTP promise
     */
    var removeProperty = function(id){
      return $http.delete(basePath + "crud/property/" + id);
    };    

    return{
      loadVideos : loadVideos,
      getVideos : getVideos,
      getWatcherStatus : getWatcherStatus,
      startWatcher : startWatcher,
      stopWatcher : stopWatcher,
      publishVideo : publishVideo,
      unpublishVideo : unpublishVideo,
      removeVideo : removeVideo,
      updateVideo : updateVideo,
      getProperties : getProperties,
      addProperty : addProperty,
      updateProperty : updateProperty,
      removeProperty : removeProperty,
      loadProperties : loadProperties
    };

  }
  
})(angular.module("ov.publish"));