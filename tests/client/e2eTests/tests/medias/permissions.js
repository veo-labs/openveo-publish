'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

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

    it('should not access the page', function() {
      return page.load().then(function() {
        assert.ok(false, 'User has access to medias page and should not');
      }, function() {
        assert.ok(true);
      });
    });

  });

  describe('medias', function() {
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
        title: 'Media 1',
        description: 'Media 1 description'
      };

      ownerLineToAdd = {
        id: '1',
        state: VideoModel.PUBLISHED_STATE,
        title: 'Media 2',
        description: 'Media 2 description',
        groups: ['publishGroup1']
      };

      mediaHelper.addEntities([anonymousLineToAdd]);
      return mediaHelperWithUser.addEntities([ownerLineToAdd]);
    });

    // Remove all medias after each tests then reload the page
    afterEach(function() {
      mediaHelper.removeAllEntities();
    });

    describe('access', function() {

      it('should be able by the owner', function() {
        page.logAs(datas.users.publishMedias1);
        page.load();
        assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
        assert.isFulfilled(page.getLine(ownerLineToAdd.title), 'Expected media ' + ownerLineToAdd.title);

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be accessible');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected owner video to be accessible');
        });
      });

      it('should be able by the super administrator', function() {
        page.logAsAdmin();
        page.load();
        assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
        assert.isFulfilled(page.getLine(ownerLineToAdd.title), 'Expected media ' + ownerLineToAdd.title);

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be accessible');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected owner video to be accessible');
        });
      });

      it('should be able by users in the group', function() {
        page.logAs(datas.users.publishMediasGroup);
        page.load();
        assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
        assert.isFulfilled(page.getLine(ownerLineToAdd.title), 'Expected media ' + ownerLineToAdd.title);

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be accessible');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected owner video to be accessible');
        });
      });

      it('should not be able by users in the group without read permission', function() {
        page.logAs(datas.users.publishMediasGroupNoRead);
        page.load();
        assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 403, 'Expected video to be inaccessible');
        });
      });

      it('should not be able by other users', function() {
        page.logAs(datas.users.publishMedias2);
        page.load();
        assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
        assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be accessible');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 403, 'Expected owner video to be inaccessible');
        });
      });

    });

    describe('edition', function() {

      it('should be able by the owner', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        var anonymousLineNewTitle = anonymousLineToAdd.title + ' new';

        page.logAs(datas.users.publishMedias1);
        page.load();

        assert.isFulfilled(page.editMedia(ownerLineToAdd.title, {
          name: ownerLineNewTitle
        }), 'Expected media ' + ownerLineNewTitle + ' to be editable');

        assert.isFulfilled(page.editMedia(anonymousLineToAdd.title, {
          name: anonymousLineNewTitle
        }), 'Expected media ' + anonymousLineNewTitle + ' to be editable');

        assert.isFulfilled(page.getLine(anonymousLineNewTitle), 'Expected media ' + anonymousLineNewTitle);
        assert.isFulfilled(page.getLine(ownerLineNewTitle), 'Expected media ' + ownerLineNewTitle);

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'post', {
          title: ownerLineToAdd.title
        }).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'post', {
          title: anonymousLineToAdd.title
        }).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });
      });

      it('should be able by the super administrator', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        var anonymousLineNewTitle = anonymousLineToAdd.title + ' new';

        page.logAsAdmin();
        page.load();

        assert.isFulfilled(page.editMedia(ownerLineToAdd.title, {
          name: ownerLineNewTitle
        }), 'Expected media ' + ownerLineNewTitle + ' to be editable');

        assert.isFulfilled(page.editMedia(anonymousLineToAdd.title, {
          name: anonymousLineNewTitle
        }), 'Expected media ' + anonymousLineNewTitle + ' to be editable');

        assert.isFulfilled(page.getLine(anonymousLineNewTitle), 'Expected media ' + anonymousLineNewTitle);
        assert.isFulfilled(page.getLine(ownerLineNewTitle), 'Expected media ' + ownerLineNewTitle);

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'post', {
          title: ownerLineToAdd.title
        }).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'post', {
          title: anonymousLineToAdd.title
        }).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

      });

      it('should be able by users in the group', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        page.logAs(datas.users.publishMediasGroup);
        page.load();

        assert.isFulfilled(page.editMedia(ownerLineToAdd.title, {
          name: ownerLineNewTitle
        }), 'Expected media ' + ownerLineNewTitle + ' to be editable');

        assert.isFulfilled(page.getLine(ownerLineNewTitle), 'Expected media ' + ownerLineNewTitle);

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'post', {
          title: ownerLineToAdd.title
        }).then(function(response) {
          assert.equal(response.status, 200, 'Expected video in the group to be editable');
        });
      });

      it('should not be able by other users', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        page.logAs(datas.users.publishMedias2);
        page.load();

        assert.isRejected(page.editMedia(ownerLineToAdd.title, {
          name: ownerLineNewTitle
        }), 'Expected media ' + ownerLineNewTitle + ' not to be editable');

        assert.isRejected(page.getLine(ownerLineNewTitle), 'Unexpected media ' + ownerLineNewTitle);

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'post', {
          title: ownerLineNewTitle
        }).then(function(response) {
          assert.equal(response.status, 403, 'Expected video in the group not to be editable');
        });
      });
    });

    describe('deletion', function() {

      it('should be deletable by the owner', function() {
        page.logAs(datas.users.publishMedias1);
        page.load();

        page.removeLine(ownerLineToAdd.title);
        page.removeLine(anonymousLineToAdd.title);
        assert.isRejected(page.getLine(anonymousLineToAdd.title), 'Unexpected media ' + anonymousLineToAdd.title);
        assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
      });

      it('should be able by the owner by calling the server directly', function() {
        page.logAs(datas.users.publishMedias1);
        page.load();

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be deletable');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 200, 'Expected owner video to be deletable');
        });
      });

      it('should be able by the super administrator', function() {
        page.logAsAdmin();
        page.load();

        page.removeLine(ownerLineToAdd.title);
        page.removeLine(anonymousLineToAdd.title);
        assert.isRejected(page.getLine(anonymousLineToAdd.title), 'Unexpected media ' + anonymousLineToAdd.title);
        assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
      });

      it('should be able by the administrator by calling the server directly', function() {
        page.logAsAdmin();
        page.load();

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be deletable');
        });

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 200, 'Expected owner video to be deletable');
        });
      });

      it('should be able by users in the group', function() {
        page.logAs(datas.users.publishMediasGroup);
        page.load();

        page.removeLine(ownerLineToAdd.title);
        assert.isRejected(page.getLine(ownerLineToAdd.title), 'Unexpected media ' + ownerLineToAdd.title);
      });

      it('should be able by users in the group by calling the server directly', function() {
        page.logAs(datas.users.publishMediasGroup);
        page.load();

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 200, 'Expected video in the group to be deletable');
        });
      });

      it('should not be able by other users', function() {
        page.logAs(datas.users.publishMedias2);
        page.load();

        assert.isRejected(page.removeLine(ownerLineToAdd.title));

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'delete').then(function(response) {
          assert.equal(response.status, 500);
        });
      });
    });

  });

});
