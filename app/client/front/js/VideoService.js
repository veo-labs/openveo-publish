(function(app){

  "use strict"

  app.factory("videoService", VideoService);
  VideoService.$inject = ["$http"];

  /**
   * Defines a video service to retrieve information about a video.
   */
  function VideoService($http){

    /**
     * Gets information about a video.
     * @param String videoId The video id
     * @param Function callback The function to call when its done
     */
    var getVideo = function(videoId, callback){
      return $http.get("/publish/getVideo/" + videoId).then(function(response){
        callback(response.data.video);
      }, function(){
        callback();
      });
    };

    return {
      getVideo : getVideo
    };

  }
  
})(angular.module("ov.publish.player"));