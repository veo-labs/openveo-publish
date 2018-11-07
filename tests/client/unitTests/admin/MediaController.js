'use strict';

window.assert = chai.assert;

describe('MediaController', function() {
  var $rootScope,
    $controller,
    $httpBackend,
    scope;

  // Load modules
  beforeEach(function() {
    module('ngFileUpload');
    module('ov.publish');
    module('ov.entity');
    module('ov.tableForm');
    module('ov.util');
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
    scope.hasPermission = function() {
      return true;
    };
    scope.test = {};
    scope.test.rows = [
      {
        id: 1,
        date: new Date(),
        status: 1,
        customProperties: {}
      },
      {
        id: 2,
        date: new Date(),
        status: 1,
        customProperties: {}
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
      },
      settings: {
        data: {
          entity: {
            id: 'publish-catalog',
            value: {
              refreshInterval: 42
            }
          }
        }
      }

    });
  });

  // Checks if no HTTP request stays without response
  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

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

  describe('saveMedia', function() {

    it('Should be able to save a media if not already saving', function(done) {
      $httpBackend.when('DELETE', /.*/).respond(200, '');
      $httpBackend.when('GET', /.*/).respond(200, '');
      $httpBackend.when('PUT', /.*/).respond(200, '');
      $httpBackend.when('POST', '/be/publish/videos/1').respond(200);
      $httpBackend.expectPOST('/be/publish/videos/1');

      scope.editFormContainer.onSubmit(scope.test.rows[0]).then(done, function() {
        assert.notOk(true);
      });

      $httpBackend.flush();
    });

    it('Should send dates as timestamps', function(done) {
      var expectedProperty = 'customProperty';
      var expectedCustomPropertyDate = new Date();

      $httpBackend.expect('POST', '/be/publish/videos/' + scope.test.rows[0].id, function(data) {
        data = JSON.parse(data);
        assert.equal(data.date, scope.test.rows[0].date.getTime(), 'Wrong date');
        assert.equal(data.properties[expectedProperty], expectedCustomPropertyDate.getTime(), 'Wrong date time');
        return true;
      }).respond(200);

      scope.test.rows[0].customProperties[expectedProperty] = expectedCustomPropertyDate;

      scope.editFormContainer.onSubmit(scope.test.rows[0]).then(done, function() {
        assert.notOk(true);
      });

      $httpBackend.flush();
    });

  });

  describe('addMedia', function() {

    it('Should be able to add a media', function(done) {
      var expectedCustomProperty = 'customProperty';
      var expectedDate = new Date();
      var expectedCustomPropertyDate = new Date();
      var expectedData = {
        date: expectedDate,
        properties: {}
      };

      expectedData.properties[expectedCustomProperty] = expectedCustomPropertyDate;

      $httpBackend.expect('POST', '/be/publish/addMedia', function(data) {
        data = JSON.parse(data);
        assert.equal(data.date, expectedDate.getTime(), 'Wrong date');
        assert.equal(data.properties[expectedCustomProperty], expectedCustomPropertyDate.getTime(), 'Wrong date time');
        return true;
      }).respond(200);

      scope.addFormContainer.onSubmit(expectedData).then(done, function() {
        assert.notOk(true);
      });

      $httpBackend.flush();
    });

  });

});
