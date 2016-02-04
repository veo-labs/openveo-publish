'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var mediaHelper = process.requirePublish('tests/client/e2eTests/helpers/mediaHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page', function() {
  var page;

  // Prepare page
  before(function() {
    page = new MediaPage(new VideoModel());
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  describe('without access', function() {

    // Log with a user without access permission
    before(function() {
      return page.logAs(datas.users.publishGuest);
    });

    it('Should not access the page', function() {
      return page.load().then(function() {
        assert.ok(false, 'User has access to medias page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('without write permission', function() {

    // Log with a user without write permission
    before(function() {
      page.logAs(datas.users.publishMediasNoWrite);
      page.load();
    });

    // Remove all videos after each tests then reload the page
    afterEach(function() {
      mediaHelper.removeAllMedias();
      page.refresh();
    });

    it('should not be able to create video by requesting the server directly', function() {
      var data = {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Test no write'
      };
      page.sendRequest('be/crud/video', 'put', data).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without update permission', function() {

    // Log with a user without update permission
    before(function() {
      page.logAs(datas.users.publishMediasNoUpdate);
      page.load();
    });

    // Remove all videos after each tests then reload the page
    afterEach(function() {
      mediaHelper.removeAllMedias();
      page.refresh();
    });

    it('should not have edit button to edit a media', function() {
      var name = 'Test no edit permission';
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: name
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      assert.isRejected(page.editMedia(name, {
        name: 'New name'
      }));
    });

    it('should not be able to edit video by requesting the server directly', function() {
      var data = {
        name: 'New name'
      };

      page.sendRequest('be/crud/video/whatever', 'post', data).then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('without delete permission', function() {

    // Log with a user without delete permission
    before(function() {
      page.logAs(datas.users.publishMediasNoDelete);
      page.load();
    });

    // Remove all videos after each tests then reload the page
    afterEach(function() {
      mediaHelper.removeAllMedias();
      page.refresh();
    });

    it('should not have delete action to remove a media', function() {
      var name = 'test delete without permission';
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: name
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Try to remove
      assert.isRejected(page.removeLine(name));
    });

    it('should not be able to remove media by requesting the server directly', function() {
      page.sendRequest('be/crud/video/whatever', 'delete').then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

});
