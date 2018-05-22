'use strict';

/**
 * Upload service exposed by ng-file-upload through OpenVeo core.
 *
 * @module ngFileUpload
 * @main ngFileUpload
 */

(function(angular) {

  function UploadService($http) {
    function upload(request) {
      return $http.post(request.url, request.data.info);
    }

    function json(data) {
      return angular.toJson(data);
    }

    return {
      upload: upload,
      json: json
    };
  }

  var app = angular.module('ngFileUpload', []);
  app.factory('Upload', UploadService);
  UploadService.$inject = ['$http'];

})(angular);
