'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');

var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VimeoProvider', function() {
  var expectedVimeoResponse;
  var Vimeo;
  var provider;
  var VimeoProvider;

  // Mocks
  beforeEach(function() {
    Vimeo = chai.spy(function(clientId, clientSecret, accessToken) {});
    Vimeo.prototype.request = chai.spy(function(datas, callback) {
      callback(null, expectedVimeoResponse);
    });

    mock('vimeo', {
      Vimeo: Vimeo
    });
  });

  // Initializes tests
  beforeEach(function() {
    VimeoProvider = mock.reRequire(
      path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/VimeoProvider.js')
    );
    provider = new VimeoProvider({
      clientId: 'clientId',
      clientSecret: 'clientSecret',
      accessToken: 'accessToken'
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  /**
   * Gets MediaPlatformProvider.QUALITIES from given quality string.
   *
   * @param {String} quality The quality as returned by Vimeo
   * @return The quality expressed with MediaPlatformProvider.QUALITIES
   */
  function getQuality(quality) {
    switch (quality) {
      case 'mobile':
        return MediaPlatformProvider.QUALITIES.MOBILE;
      case 'sd':
        return MediaPlatformProvider.QUALITIES.SD;
      case 'hd':
        return MediaPlatformProvider.QUALITIES.HD;
      default:
        return undefined;
    }
  }

  describe('getMediasInfo', function() {
    var count;
    var expectedMediasIds;
    var expectedMediasHeights;
    var expectedVimeoResponses;

    beforeEach(function() {
      count = 0;
      expectedMediasIds = ['90', '91'];
      expectedMediasHeights = [720, 1080];
      expectedVimeoResponses = [
        {
          expectedStatus: true,
          files: [
            {
              height: 720,
              link: 'https://vimeo.local/1',
              quality: 'hd',
              width: 1280
            },
            {
              height: 480,
              link: 'https://vimeo.local/2',
              quality: 'sd',
              width: 640
            }
          ],
          status: 'available'
        },
        {
          expectedStatus: true,
          files: [
            {
              height: 1080,
              link: 'https://vimeo.local/3',
              quality: 'hd',
              width: 1920
            }
          ],
          status: 'available'
        }
      ];

      Vimeo.prototype.request = chai.spy(function(datas, callback) {
        callback(null, expectedVimeoResponses[count++]);
      });
    });

    it('should get Vimeo information about medias videos', function(done) {
      Vimeo.prototype.request = chai.spy(function(datas, callback) {
        assert.equal(datas.method, 'GET', 'Wrong HTTP method');
        assert.equal(datas.path, '/videos/' + expectedMediasIds[count], 'Wrong web service end point');

        callback(null, expectedVimeoResponses[count++]);
      });

      provider.getMediasInfo(expectedMediasIds, expectedMediasHeights, function(error, response) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMediasIds.length);

        assert.ok(response.available, 'Expected media to be available');
        assert.lengthOf(response.sources, expectedMediasIds.length, 'Wrong number of results');

        response.sources.forEach(function(source, index) {
          var expectedVimeoResponse = expectedVimeoResponses[index];

          assert.equal(source.available, expectedVimeoResponse.expectedStatus, 'Wrong source availability');
          assert.lengthOf(source.files, expectedVimeoResponse.files.length, 'Wrong number of files');

          source.files.forEach(function(file, index) {
            assert.equal(file.height, expectedVimeoResponse.files[index].height);
            assert.equal(file.link, expectedVimeoResponse.files[index].link);
            assert.equal(file.quality, getQuality(expectedVimeoResponse.files[index].quality));
            assert.equal(file.width, expectedVimeoResponse.files[index].width);
          });
        });

        done();
      });
    });

    it('should set response available property to false if one of the media is not available', function(done) {
      expectedVimeoResponses[1].expectedStatus = false;
      expectedVimeoResponses[1].status = 'unavailable';

      provider.getMediasInfo(expectedMediasIds, expectedMediasHeights, function(error, response) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMediasIds.length);

        assert.notOk(response.available, 'Expected media to be unavailable');

        response.sources.forEach(function(source, index) {
          var expectedVimeoResponse = expectedVimeoResponses[index];

          assert.equal(source.available, expectedVimeoResponse.expectedStatus, 'Wrong source availability');
        });

        done();
      });
    });

    it('should consider a source as unavailable if expected transcoded version is not available', function(done) {
      expectedVimeoResponses[1].expectedStatus = false;
      expectedVimeoResponses[1].files[0].height = 480;

      provider.getMediasInfo(expectedMediasIds, expectedMediasHeights, function(error, response) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMediasIds.length);

        assert.notOk(response.available, 'Expected media to be unavailable');

        response.sources.forEach(function(source, index) {
          var expectedVimeoResponse = expectedVimeoResponses[index];

          assert.equal(source.available, expectedVimeoResponse.expectedStatus, 'Wrong source availability');
        });

        done();
      });
    });

    it('should consider a source as available if its height is near the expected height', function(done) {
      expectedVimeoResponses[1].files[0].height = expectedMediasHeights[1] + (expectedMediasHeights[1] * 0.22) - 1;

      provider.getMediasInfo(expectedMediasIds, expectedMediasHeights, function(error, response) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMediasIds.length);

        assert.ok(response.available, 'Expected media to be available');

        response.sources.forEach(function(source, index) {
          var expectedVimeoResponse = expectedVimeoResponses[index];

          assert.equal(source.available, expectedVimeoResponse.expectedStatus, 'Wrong source availability');
        });

        done();
      });
    });

    it('should execute callback with an error if request to Vimeo failed', function(done) {
      var expectedError = new Error('Something went wrong');
      Vimeo.prototype.request = chai.spy(function(datas, callback) {
        callback(expectedError);
      });

      provider.getMediasInfo(expectedMediasIds, expectedMediasHeights, function(error, response) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(response, 'Unexpected response');
        Vimeo.prototype.request.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('update', function() {

    it('should update media resources on Vimeo with the new media title', function(done) {
      var count = 0;
      var expectedMedia = {
        mediaId: ['42', '43']
      };
      var expectedData = {
        title: 'New media title'
      };

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.method, 'PATCH', 'Wrong HTTP method');
        assert.equal(data.path, '/videos/' + expectedMedia.mediaId[count], 'Wrong end point');
        assert.equal(data.query.name, expectedData.title, 'Wrong title');
        count++;
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(expectedMedia.mediaId.length);
        done();
      });
    });

    it('should keep only the first 128 characters of the title', function(done) {
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: ''
      };

      // Create a title of more than 128 characters
      for (var i = 0; i < 200; i++)
        expectedData.title += 'a';

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.query.name, expectedData.title.substring(0, 128), 'Wrong title');
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should not update platform if title hasn\'t changed', function(done) {
      var expectedMedia = {
        mediaId: ['42'],
        title: 'New media title'
      };
      var expectedData = {};
      expectedData.title = expectedMedia.title;

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isUndefined(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should update platform if title hasn\'t changed and force is set to true', function(done) {
      var expectedMedia = {
        mediaId: ['42'],
        title: 'New media title'
      };
      var expectedData = {};
      expectedData.title = expectedMedia.title;

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        assert.equal(data.method, 'PATCH', 'Wrong HTTP method');
        assert.equal(data.path, '/videos/' + expectedMedia.mediaId[0], 'Wrong end point');
        assert.equal(data.query.name, expectedData.title, 'Wrong title');
        callback();
      });

      provider.update(expectedMedia, expectedData, true, function(error) {
        assert.isNull(error, 'Unexpected error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if updating platform failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: 'New media title'
      };

      Vimeo.prototype.request = chai.spy(function(data, callback) {
        callback(expectedError);
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        Vimeo.prototype.request.should.have.been.called.exactly(1);
        done();
      });
    });

  });

});
