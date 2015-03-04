(function(app){

  "use strict"

  app.factory("publishService", PublishService);
  PublishService.$inject = ["$http"];

  /**
   * Defines a publish service to get publish information.
   */
  function PublishService($http){
    var basePath = "/admin/publish/";

    /**
     * Gets the list of videos.
     * @return HttpPromise The HTTP promise
     */
    var getVideos = function(){
      return $http.get(basePath + "videos");
    };
    
    /**
     * Gets watcher status.
     * @return HttpPromise The HTTP promise
     */
    var getWatcherStatus = function(){
      return $http.get(basePath + "watcherStatus");
    };
    
    /**
     * Starts the watcher.
     * @return HttpPromise The HTTP promise
     */
    var startWatcher = function(){
      return $http.get(basePath + "startWatcher");
    };

    /**
     * Stops the watcher.
     * @return HttpPromise The HTTP promise
     */
    var stopWatcher = function(){
      return $http.get(basePath + "stopWatcher");
    };    

    return{
      getVideos : getVideos,
      getWatcherStatus : getWatcherStatus,
      startWatcher : startWatcher,
      stopWatcher : stopWatcher
    };

  }
  
})(angular.module("ov.publish"));