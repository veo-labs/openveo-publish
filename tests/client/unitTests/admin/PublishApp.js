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

  it('Should register routes to medias, media, properties and categories', function() {
    assert.isDefined($route.routes['/publish/medias-list']);
    assert.isDefined($route.routes['/publish/media/:mediaId']);
    assert.isDefined($route.routes['/publish/properties-list']);
    assert.isDefined($route.routes['/publish/categories-list']);
  });

  it('Should be able to route to medias page after retrieving the list of medias', function() {
    $httpBackend.expectGET('/be/taxonomies?query=categories');
    $httpBackend.expectGET('/be/publish/properties');
    $httpBackend.expectGET('/be/publish/getPlatforms');
    $httpBackend.expectGET('/publish/be/views/medias.html');

    $location.path('/publish/medias-list');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/medias-list');
  });

  it('Should be able to route to properties page', function() {
    $httpBackend.expectGET('/publish/be/views/properties.html');

    $location.path('/publish/properties-list');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/properties-list');
  });

  it('Should be able to route to categories page after retrieving the list of categories', function() {
    $httpBackend.expectGET('/be/taxonomies?query=categories');
    $httpBackend.expectGET('/publish/be/views/categories.html');

    $location.path('/publish/categories-list');
    $httpBackend.flush();
    assert.equal($location.path(), '/publish/categories-list');
  });

});
