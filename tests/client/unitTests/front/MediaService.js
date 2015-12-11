'use strict';

window.assert = chai.assert;

describe('MediaService', function() {

  beforeEach(module('ov.publish.player'));

  var $httpBackend,
    mediaService;

  beforeEach(inject(function(_$httpBackend_, _mediaService_) {
    $httpBackend = _$httpBackend_;
    mediaService = _mediaService_;
  }));

  it('Should be able to ask server for a video by its id', function(done) {
    $httpBackend.when('GET', '/publish/getVideo/5').respond(200, {
      video: {}
    });
    $httpBackend.expectGET('/publish/getVideo/5');
    mediaService.getMedia('5', function(video) {
      assert.isDefined(video);
      done();
    });
    $httpBackend.flush();
  });

  it('Should be able to ask server for a video and return null if no video is found', function(done) {
    $httpBackend.when('GET', '/publish/getVideo/6').respond(404);
    $httpBackend.expectGET('/publish/getVideo/6');
    mediaService.getMedia('6', function(video) {
      assert.isUndefined(video);
      done();
    });
    $httpBackend.flush();
  });

});
