'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var MEDIA_PLATFORM_TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var datas = process.requirePublish('tests/client/e2eTests/resources/data.json');

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page', function() {
  var coreApi = process.api.getCoreApi();
  var page, mediaHelper;

  // Prepare page
  before(function() {
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    mediaHelper = new MediaHelper(videoProvider);
    page = new MediaPage(videoProvider);
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

    before(function() {
      page.logAs(datas.users.publishGuest);
    });

    // Log with a user without access permission
    beforeEach(function() {
      var owner = process.protractorConf.getUser(
        datas.users.publishMedias1.name
      );

      anonymousLineToAdd = {
        id: '0',
        state: STATES.PUBLISHED,
        title: 'Media 1',
        date: new Date('2017/10/01').getTime(),
        description: 'Media 1 description',
        type: MEDIA_PLATFORM_TYPES.LOCAL
      };

      ownerLineToAdd = {
        id: '1',
        state: STATES.PUBLISHED,
        title: 'Media 2',
        user: owner.id,
        date: new Date('2017/11/20').getTime(),
        description: 'Media 2 description',
        groups: ['publishGroup1'],
        type: MEDIA_PLATFORM_TYPES.LOCAL
      };

      return mediaHelper.addEntities([anonymousLineToAdd, ownerLineToAdd]);
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

      it('should be able by a manager', function() {
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
        assert.isRejected(page.getLine(ownerLineToAdd.title));

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'get').then(function(response) {
          assert.equal(response.status, 403, 'Expected video to be inaccessible');
        });
      });

      it('should not be able by other users', function() {
        page.logAs(datas.users.publishMedias2);
        page.load();
        assert.isFulfilled(page.getLine(anonymousLineToAdd.title), 'Expected media ' + anonymousLineToAdd.title);
        assert.isRejected(page.getLine(ownerLineToAdd.title));

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
          info: {title: ownerLineToAdd.title}
        }, true).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'post', {
          info: {title: anonymousLineToAdd.title}
        }, true).then(function(response) {
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
          info: {title: ownerLineToAdd.title}
        }, true).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'post', {
          info: {title: anonymousLineToAdd.title}
        }, true).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

      });

      it('should be able by a manager', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        var anonymousLineNewTitle = anonymousLineToAdd.title + ' new';

        page.logAs(datas.users.publishMediasManager);
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
          info: {title: ownerLineToAdd.title}
        }, true).then(function(response) {
          assert.equal(response.status, 200, 'Expected anonymous video to be editable');
        });

        page.sendRequest('be/publish/videos/' + anonymousLineToAdd.id, 'post', {
          info: {title: anonymousLineToAdd.title}
        }, true).then(function(response) {
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
          info: {title: ownerLineToAdd.title}
        }, true).then(function(response) {
          assert.equal(response.status, 200, 'Expected video in the group to be editable');
        });
      });

      it('should not be able by other users', function() {
        var ownerLineNewTitle = ownerLineToAdd.title + ' new';
        page.logAs(datas.users.publishMedias2);
        page.load();

        assert.isRejected(page.editMedia(ownerLineToAdd.title, {
          name: ownerLineNewTitle
        }));

        assert.isRejected(page.getLine(ownerLineNewTitle));

        page.sendRequest('be/publish/videos/' + ownerLineToAdd.id, 'post', {
          info: {title: ownerLineNewTitle}
        }, true).then(function(response) {
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
        assert.isRejected(page.getLine(anonymousLineToAdd.title));
        assert.isRejected(page.getLine(ownerLineToAdd.title));
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
        assert.isRejected(page.getLine(anonymousLineToAdd.title));
        assert.isRejected(page.getLine(ownerLineToAdd.title));
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

      it('should be able by a manager', function() {
        page.logAs(datas.users.publishMediasManager);
        page.load();

        page.removeLine(ownerLineToAdd.title);
        page.removeLine(anonymousLineToAdd.title);
        assert.isRejected(page.getLine(anonymousLineToAdd.title));
        assert.isRejected(page.getLine(ownerLineToAdd.title));
      });

      it('should be able by a manager by calling the server directly', function() {
        page.logAs(datas.users.publishMediasManager);
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
        assert.isRejected(page.getLine(ownerLineToAdd.title));
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
          assert.equal(response.status, 403);
        });
      });
    });

  });

});
