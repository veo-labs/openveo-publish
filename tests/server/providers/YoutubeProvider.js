'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('YoutubeProvider', function() {
  var youtubeApi;
  var provider;
  var googleOAuthHelper;
  var expectedToken;
  var YoutubeProvider;

  // Mocks
  beforeEach(function() {
    expectedToken = '42';
    youtubeApi = {
      videos: {
        update: chai.spy(function(data, callback) {
          callback();
        })
      }
    };
    googleOAuthHelper = {
      getFreshToken: chai.spy(function(callback) {
        callback(null, expectedToken);
      }),
      oauth2Client: {
        setCredentials: chai.spy(function(token) {})
      }
    };

    mock('googleapis', {
      youtube: function() {
        return youtubeApi;
      }
    });
  });

  // Initializes tests
  beforeEach(function() {
    YoutubeProvider = mock.reRequire(
      path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/youtube/YoutubeProvider.js')
    );
    provider = new YoutubeProvider({}, googleOAuthHelper);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('update', function() {

    it('should update media resources on Youtube with the new media title', function(done) {
      var count = 0;
      var expectedMedia = {
        mediaId: ['42', '43']
      };
      var expectedData = {
        title: 'New media title'
      };

      googleOAuthHelper.oauth2Client.setCredentials = chai.spy(function(token) {
        assert.equal(token, expectedToken, 'Wrong token');
      });

      youtubeApi.videos.update = chai.spy(function(data, callback) {
        assert.equal(data.part, 'snippet', 'Wrong snippet');
        assert.strictEqual(data.auth, googleOAuthHelper.oauth2Client, 'Wrong auth');
        assert.equal(data.resource.id, expectedMedia.mediaId[count], 'Wrong resource id');
        assert.equal(data.resource.snippet.title, expectedData.title, 'Wrong title');
        assert.equal(data.resource.snippet.categoryId, YoutubeProvider.CATEGORIES.EDUCATION, 'Wrong category');
        count++;
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(1);
        youtubeApi.videos.update.should.have.been.called.exactly(expectedMedia.mediaId.length);
        done();
      });
    });

    it('should keep only the first 100 characters of the title and remove "<" and ">" characters', function(done) {
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: ''
      };

      // Create a title of more than 100 characters with unexpected ones
      for (var i = 0; i < 200; i++)
        expectedData.title += 'a>';

      youtubeApi.videos.update = chai.spy(function(data, callback) {
        assert.equal(
          data.resource.snippet.title,
          expectedData.title.substring(0, 100).replace(/<|>/g, ''),
          'Wrong title'
        );
        callback();
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.isNull(error, 'Unexpected error');
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(1);
        youtubeApi.videos.update.should.have.been.called.exactly(1);
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
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(0);
        youtubeApi.videos.update.should.have.been.called.exactly(0);
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

      youtubeApi.videos.update = chai.spy(function(data, callback) {
        assert.equal(data.part, 'snippet', 'Wrong snippet');
        assert.strictEqual(data.auth, googleOAuthHelper.oauth2Client, 'Wrong auth');
        assert.equal(data.resource.id, expectedMedia.mediaId[0], 'Wrong resource id');
        assert.equal(data.resource.snippet.title, expectedData.title, 'Wrong title');
        assert.equal(data.resource.snippet.categoryId, YoutubeProvider.CATEGORIES.EDUCATION, 'Wrong category');
        callback();
      });

      provider.update(expectedMedia, expectedData, true, function(error) {
        assert.isNull(error, 'Unexpected error');
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(1);
        youtubeApi.videos.update.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if getting a token failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedMedia = {
        mediaId: ['42']
      };
      var expectedData = {
        title: 'New media title'
      };

      googleOAuthHelper.getFreshToken = chai.spy(function(callback) {
        callback(expectedError);
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(0);
        youtubeApi.videos.update.should.have.been.called.exactly(0);
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

      youtubeApi.videos.update = chai.spy(function(data, callback) {
        callback(expectedError);
      });

      provider.update(expectedMedia, expectedData, false, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        googleOAuthHelper.oauth2Client.setCredentials.should.have.been.called.exactly(1);
        youtubeApi.videos.update.should.have.been.called.exactly(1);
        done();
      });
    });

  });

});
