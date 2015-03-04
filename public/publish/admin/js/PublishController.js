(function(app){
  
  "use strict"

  app.controller("PublishController", PublishController);
  PublishController.$inject = ["$scope", "$interval", "publishService", "watcherStatus", "videos"];

  /**
   * Defines the publish controller for the publish page.
   */
  function PublishController($scope, $interval, publishService, watcherStatus, videos){

    $scope.videos = videos.data.videos;
    updateWatcherStatus(watcherStatus.data.status);

    // Iterate through the list of videos, if at least one video
    // is pending, poll each 10 seconds to be informed of 
    // its status
    var pollVideosPromise = $interval(function(){
      publishService.getVideos().success(function(data, status, headers, config){
        $scope.videos = data.videos;
      }).error(function(data, status, headers, config){
        if(status === 401)
          $scope.$parent.logout();
      });
    }, 20000);

    // Listen to destroy event on the view to update
    $scope.$on("$destroy", function(event){
      $interval.cancel(pollVideosPromise);
    });
    
    /**
     * Starts the watcher.
     */
    $scope.startWatcher = function(){
      $scope.disableWatcher = true;
      publishService.startWatcher().success(function(data, status, headers, config){
        updateWatcherStatus(data.status);
      }).error(function(data, status, headers, config){
        if(status === 401)
          $scope.$parent.logout();
      });
    };

    /**
     * Stops the watcher.
     */    
    $scope.stopWatcher = function(){
      $scope.disableWatcher = true;
      publishService.stopWatcher().success(function(data, status, headers, config){
        updateWatcherStatus(data.status);
      }).error(function(data, status, headers, config){
        if(status === 401)
          $scope.$parent.logout();
      });
    };
    
    /**
     * Enables or disables actions on the watcher is status is not
     * stable (starting or stopping).
     */
    function enableDisableWatcher(){
      $scope.disableWatcher = $scope.watcherStatus == 0 || $scope.watcherStatus == 2;
    };

    /**
     * Updates watcher status, if the status is in transition 
     * state (starting or stopping) poll the server until the status
     * is stable or 10 polls have been reached.
     * @param Number status The watcher status to set
     */
    function updateWatcherStatus(status){
      $scope.watcherStatus = status;
      enableDisableWatcher();
      
      // Status is either starting or stopping
      if($scope.watcherStatus === 0 || $scope.watcherStatus === 2){
        
        // Poll every seconds to test watcher status
        var pollPromise = $interval(function(){
          publishService.getWatcherStatus().success(function(data, status, headers, config){
            
            // Update status
            $scope.watcherStatus = data.status;
            enableDisableWatcher();
            
            // Watcher is in stable state
            if(data.status === 1 || data.status === 3)
              $interval.cancel(pollPromise);
          })
        }, 1000, 20);
        
      }
      
    }
  }
  
})(angular.module("ov.publish"));