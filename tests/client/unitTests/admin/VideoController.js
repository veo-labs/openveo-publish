"use strict"

window.assert = chai.assert;

describe("VideoController", function(){

  beforeEach(module("ov.publish"));

  var $rootScope, $controller, $httpBackend;

  beforeEach(inject(function(_$rootScope_, _$controller_, _$httpBackend_){
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $controller = _$controller_;
  }));

});