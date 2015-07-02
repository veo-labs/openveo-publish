(function(app){
  
  "use strict"

  app.controller("WatcherController", WatcherController);
  WatcherController.$inject = ["$scope", "$interval", "publishService", "watcherStatus"];

  /**
   * Defines the watcher controller for the watcher page.
   */
  function WatcherController($scope, $interval, publishService, watcherStatus){
    var pollPromise;
    updateWatcherStatus(watcherStatus.data.status);
    
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
     * Enables or disables actions on the watcher if status is not
     * stable (starting or stopping).
     */
    function enableDisableWatcher(){
      $scope.disableWatcher = $scope.watcherStatus == 0 || $scope.watcherStatus == 2;
    };

    /**
     * Updates watcher status, if the status is in transition 
     * state (starting or stopping) poll the server until the status
     * is stable.
     * @param Number status The watcher status to set
     */
    function updateWatcherStatus(status){
      $scope.watcherStatus = status;
      enableDisableWatcher();
      
      // Status is either starting or stopping
      if($scope.watcherStatus === 0 || $scope.watcherStatus === 2){
        
        // Poll every seconds to test watcher status
        pollPromise = $interval(function(){
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

    // Listen to destroy event on the view to stop interval if any
    $scope.$on("$destroy", function(event){
      if(pollPromise)
        $interval.cancel(pollPromise);
    });
  }
  
})(angular.module("ov.publish"));