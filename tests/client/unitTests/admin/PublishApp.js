'use strict';

window.assert = chai.assert;

// PublishApp.js
describe('PublishApp', function() {
  var $httpBackend,
    $route,
    $location;

  // Load module publish
  beforeEach(function() {
    module('ngJSONPath');
    module('ov.publish');
  });

  // Dependencies injections
  beforeEach(inject(function(_$httpBackend_, _$route_, _$location_) {
    $httpBackend = _$httpBackend_;
    $route = _$route_;
    $location = _$location_;
  }));

  // Initializes tests
  beforeEach(function() {
    $httpBackend.when('GET', /.*/).respond(200, '');
    $httpBackend.when('POST', /.*/).respond(200, '');
  });

  it('Should register routes to medias, watcher, media, properties and categories', function() {
    assert.isDefined($route.routes['/publish/medias']);
    assert.isDefined($route.routes['/publish/watcher']);
    assert.isDefined($route.routes['/publish/media/:mediaId']);
    assert.isDefined($route.routes['/publish/properties']);
    assert.isDefined($route.routes['/publish/categories']);
  });

  it('Should be able to route to medias page after retrieving the list of medias', function() {
    $httpBackend.expectGET('/be/gettaxonomy/categories');
    $httpBackend.expectGET('/be/crud/property');
    $httpBackend.expectGET('/be/publish/getPlatforms');
    $httpBackend.expectGET('/publish/be/views/medias.html');

    $location.path('/publish/medias');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/medias');
  });

  it('Should be able to route to watcher page after retrieving the watcher status', function() {
    $httpBackend.expectGET('/be/publish/watcherStatus');
    $httpBackend.expectGET('/publish/be/views/watcher.html');

    $location.path('/publish/watcher');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/watcher');
  });

  it('Should be able to route to properties page', function() {
    $httpBackend.expectGET('/publish/be/views/properties.html');

    $location.path('/publish/properties');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/properties');
  });

  it('Should be able to route to categories page after retrieving the list of categories', function() {
    $httpBackend.expectGET('/be/gettaxonomy/categories');
    $httpBackend.expectGET('/publish/be/views/categories.html');

    $location.path('/publish/categories');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/categories');
  });

});
