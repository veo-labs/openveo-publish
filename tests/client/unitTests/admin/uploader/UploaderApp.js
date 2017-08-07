'use strict';

/**
 * Upload service exposed by ng-file-upload through OpenVeo core.
 *
 * @module ngFileUpload
 * @main ngFileUpload
 */

(function(angular) {

  function UploadService($q) {
    function upload() {
      return $q.when();
    }

    return {
      upload: upload
    };
  }

  var app = angular.module('ngFileUpload', []);
  app.factory('Upload', UploadService);
  UploadService.$inject = ['$q'];

})(angular);
