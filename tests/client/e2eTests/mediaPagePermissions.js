'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/database/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page', function() {
  var page, mediaHelper;

  // Prepare page
  before(function() {
    var videoModel = new VideoModel();
    mediaHelper = new MediaHelper(videoModel);
    page = new MediaPage(videoModel);
  });

  // Logout after tests
  after(function() {
    page.logout();
  });

  describe('without access permission', function() {

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
      mediaHelper.removeAllEntities();
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
      mediaHelper.removeAllEntities();
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
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

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
      mediaHelper.removeAllEntities();
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
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      // Try to remove
      assert.isRejected(page.removeLine(name));
    });

    it('should not be able to remove media by requesting the server directly', function() {
      page.sendRequest('be/crud/video/whatever', 'delete').then(function(response) {
        assert.equal(response.status, 403);
      });
    });

  });

  describe('owner and anonymous medias', function() {
    var ownerLineToAdd;
    var anonymousLineToAdd;
    var mediaHelperWithUser;

    before(function() {
      var owner = process.protractorConf.getUser(datas.users.publishMedias1.name);
      var videoModelWithUser = new VideoModel(owner);
      mediaHelperWithUser = new MediaHelper(videoModelWithUser);
    });

    // Log with a user without access permission
    beforeEach(function() {
      anonymousLineToAdd = {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Media 1'
      };

      ownerLineToAdd = {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Media 2'
      };

      mediaHelper.addEntities([anonymousLineToAdd]);
      return mediaHelperWithUser.addEntities([ownerLineToAdd]);
    });

    // Remove all medias after each tests then reload the page
    afterEach(function() {
      mediaHelper.removeAllEntities();
    });

    it('Should be accessible by the owner', function() {
      page.logAs(datas.users.publishMedias1);
      page.load();
      assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
      assert.isFulfilled(page.getLine(ownerLineToAdd.title), 'Expected media ' + ownerLineToAdd.title);
    });

    it('Should be accessible by the super administrator', function() {
      page.logAsAdmin();
      page.load();
      assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
      assert.isFulfilled(page.getLine(ownerLineToAdd.title), 'Expected media ' + ownerLineToAdd.title);
      page.logout();
    });

    it('Should not be accessible by other users', function() {
      page.logAs(datas.users.publishMedias2);
      page.load();
      assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
      assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
    });

    it('Should be edited by the owner', function() {
      var ownerLineNewTitle = ownerLineToAdd.title + ' new';
      var anonymousLineNewTitle = anonymousLineToAdd.title + ' new';

      page.logAs(datas.users.publishMedias1);
      page.load();
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'post', {
        title: ownerLineNewTitle
      });
      page.sendRequest('be/crud/video/' + anonymousLineToAdd.id, 'post', {
        title: anonymousLineNewTitle
      });
      page.refresh();
      assert.isFulfilled(page.getLine(anonymousLineNewTitle), 'Expected media ' + anonymousLineNewTitle);
      assert.isFulfilled(page.getLine(ownerLineNewTitle), 'Expected media ' + ownerLineNewTitle);
    });

    it('Should be edited by the super administrator', function() {
      var ownerLineNewTitle = ownerLineToAdd.title + ' new';
      var anonymousLineNewTitle = anonymousLineToAdd.title + ' new';

      page.logAsAdmin();
      page.load();
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'post', {
        title: ownerLineNewTitle
      });
      page.sendRequest('be/crud/video/' + anonymousLineToAdd.id, 'post', {
        title: anonymousLineNewTitle
      });
      page.refresh();
      assert.isFulfilled(page.getLine(anonymousLineNewTitle), 'Expected media ' + anonymousLineNewTitle);
      assert.isFulfilled(page.getLine(ownerLineNewTitle), 'Expected media ' + ownerLineNewTitle);
    });

    it('Should not be edited by other users', function() {
      page.logAs(datas.users.publishMedias2);
      page.load();
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'post', {
        title: ownerLineToAdd.title + ' new'
      }).then(function(response) {
        assert.equal(response.status, 500);
      });
    });

    it('Should be deleted by the owner', function() {
      page.logAs(datas.users.publishMedias1);
      page.load();
      page.sendRequest('be/crud/video/' + anonymousLineToAdd.id, 'delete');
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'delete');
      page.refresh();
      assert.isRejected(page.getLine(anonymousLineToAdd.title), 'Unexpected media ' + anonymousLineToAdd.title);
      assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
    });

    it('Should be deleted by the super administrator', function() {
      page.logAsAdmin();
      page.load();
      page.sendRequest('be/crud/video/' + anonymousLineToAdd.id, 'delete');
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'delete');
      page.refresh();
      assert.isRejected(page.getLine(anonymousLineToAdd.title), 'Unexpected media ' + anonymousLineToAdd.title);
      assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
    });

    it('Should not be deleted by other users', function() {
      page.logAs(datas.users.publishMedias2);
      page.load();
      page.sendRequest('be/crud/video/' + ownerLineToAdd.id, 'delete').then(function(response) {
        assert.equal(response.status, 500);
      });
    });

  });

});
