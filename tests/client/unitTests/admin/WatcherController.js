'use strict';

window.assert = chai.assert;

// WatcherController.js
describe('WatcherController', function() {
  var $rootScope,
    $controller,
    $httpBackend,
    scope;

  // Load module publish
  beforeEach(function() {
    module('ngJSONPath');
    module('ov.publish');
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
    $controller('WatcherController', {
      $scope: scope,
      watcherStatus: {
        data: {
          status: 0
        }
      }
    });
  });

  // Checks if no HTTP request stays without response
  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  // startWatcher method
  describe('startWatcher', function() {

    it('Should be able to ask the server to start the watcher', function() {
      $httpBackend.when('GET', '/admin/publish/startWatcher').respond(200, {
        status: 1
      });
      $httpBackend.expectGET('/admin/publish/startWatcher');
      scope.watcherStatus = 0;
      scope.startWatcher();
      $httpBackend.flush();
      assert.equal(scope.watcherStatus, 1);
    });

    it('Should logout user if not authenticated anymore on watcher start', function(done) {

      $rootScope.logout = function() {
        done();
      };

      $httpBackend.when('GET', '/admin/publish/startWatcher').respond(401);
      $httpBackend.expectGET('/admin/publish/startWatcher');
      scope.startWatcher();
      $httpBackend.flush();
    });

    it('Should be able to ask the server to stop the watcher', function() {
      $httpBackend.when('GET', '/admin/publish/stopWatcher').respond(200, {
        status: 3
      });
      $httpBackend.expectGET('/admin/publish/stopWatcher');
      scope.watcherStatus = 1;
      scope.stopWatcher();
      $httpBackend.flush();
      assert.equal(scope.watcherStatus, 3);
    });

    it('Should logout user if not authenticated anymore on watcher stop', function(done) {

      $rootScope.logout = function() {
        done();
      };

      $httpBackend.when('GET', '/admin/publish/stopWatcher').respond(401);
      $httpBackend.expectGET('/admin/publish/stopWatcher');
      scope.stopWatcher();
      $httpBackend.flush();
    });

  });

});
