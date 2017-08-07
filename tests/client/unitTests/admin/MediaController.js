'use strict';

window.assert = chai.assert;

// MediaController.js
describe('MediaController', function() {
  var $rootScope,
    $controller,
    $httpBackend,
    scope;

  // Load module publish, entity and ngJSONPath
  beforeEach(function() {
    module('ngJSONPath');
    module('ngFileUpload');
    module('ov.publish');
    module('ov.entity');
    module('ov.tableForm');
    module('ov.utilService');
  });

  // Dependencies injections
  beforeEach(inject(function(_$rootScope_, _$controller_, _$httpBackend_) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
  }));

  // Initializes tests
  beforeEach(function() {
    scope = $rootScope.$new();
    scope.checkAccess = function() {
      return true;
    };
    scope.test = {};
    scope.test.rows = [
      {
        id: 1,
        status: 1,
        properties: []
      },
      {
        id: 2,
        status: 1,
        properties: []
      }
    ];
    $controller('MediaController', {
      $scope: scope,
      categories: {
        data: {
          taxonomy: {}
        }
      },
      properties: {
        data: {
          entities: []
        }
      },
      platforms: {
        data: {
          platforms: ['vimeo', 'youtube']
        }
      },
      groups: {
        data: {
          entities: [{
            id: '1',
            name: 'Name 1'
          }]
        }
      },
      users: {
        data: {
          entities: [{
            id: '10',
            name: 'user 10'
          }]
        }
      }

    });
  });

  // Checks if no HTTP request stays without response
  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  // startMediaUpload method
  describe('startMediaUpload', function() {

    it('Should be able to start uploading a media if not saving', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/startUpload/1/vimeo').respond(200);
      $httpBackend.expectPOST('/be/publish/startUpload/1/vimeo');

      scope.tableContainer.actions[7].callback(scope.test.rows[0], done);

      $httpBackend.flush();
    });

  });

  // publishMedia method
  describe('publishMedia', function() {

    it('Should be able to publish a media if not saving', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/publishVideo/1').respond(200, {
        state: 12
      });
      $httpBackend.expectPOST('/be/publish/publishVideo/1');

      scope.tableContainer.actions[2].callback(scope.test.rows[0], done);

      $httpBackend.flush();
    });
    it('Should be able to remove many applications ', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/publishVideo/1,2').respond(200);
      $httpBackend.expectPOST('/be/publish/publishVideo/1,2');

      scope.tableContainer.actions[2].global([scope.test.rows[0].id, scope.test.rows[1].id], done);

      $httpBackend.flush();
    });

  });

  // unpublishMedia method
  describe('unpublishMedia', function() {

    it('Should be able to unpublish a media if not saving', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/unpublishVideo/1').respond(200, {
        state: 12
      });
      $httpBackend.expectPOST('/be/publish/unpublishVideo/1');

      scope.tableContainer.actions[3].callback(scope.test.rows[0], done);

      $httpBackend.flush();
    });
    it('Should be able to remove many applications ', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/unpublishVideo/1,2').respond(200);
      $httpBackend.expectPOST('/be/publish/unpublishVideo/1,2');

      scope.tableContainer.actions[3].global([scope.test.rows[0].id, scope.test.rows[1].id], done);

      $httpBackend.flush();
    });

  });

  // retryMedia method
  describe('retryMedia', function() {

    it('Should be able to retry a media if not saving', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/retryVideo/1').respond(200);
      $httpBackend.expectPOST('/be/publish/retryVideo/1');

      scope.tableContainer.actions[5].callback(scope.test.rows[0], done);

      $httpBackend.flush();
    });

  });

// removeMedia method
  describe('removeMedia', function() {

    it('Should be able to remove a media if not saving', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('GET', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('DELETE', '/be/publish/videos/1').respond(200);
      $httpBackend.expectDELETE('/be/publish/videos/1');

      scope.tableContainer.actions[6].callback(scope.test.rows[0], done);

      $httpBackend.flush();
    });

    it('Should be able to remove many medias ', function(done) {
      $httpBackend.when('POST', /.*/).respond(200, '');
      $httpBackend.when('GET', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('DELETE', '/be/publish/videos/1,2').respond(200);
      $httpBackend.expectDELETE('/be/publish/videos/1,2');

      scope.tableContainer.actions[6].global([scope.test.rows[0].id, scope.test.rows[1].id], done);

      $httpBackend.flush();
    });

  });

// saveMedia method
  describe('saveMedia', function() {

    it('Should be able to save a media if not already saving', function(done) {
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('GET', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/videos/1').respond(200);
      $httpBackend.expectPOST('/be/publish/videos/1');

      scope.editFormContainer.onSubmit(scope.test.rows[0]).then(done(), function() {
        assert.notOk(true);
      });

      $httpBackend.flush();
    });

  });

});
