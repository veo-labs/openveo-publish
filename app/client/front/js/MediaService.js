'use strict';

(function(app) {

  /**
   * Defines a media service to retrieve information about a media.
   */
  function MediaService($http) {

    /**
     * Gets information about a media.
     *
     * @param {String} mediaId The media id
     * @param {Function} callback The function to call when its done
     */
    var getMedia = function(mediaId, callback) {
      return $http.get('/publish/getVideo/' + mediaId).then(function(response) {
        callback(response.data.entity);
      }, function() {
        callback();
      });
    };

    return {
      getMedia: getMedia
    };

  }

  app.factory('mediaService', MediaService);
  MediaService.$inject = ['$http'];

})(angular.module('ov.publish.player'));
