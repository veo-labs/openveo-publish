'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');
var api = require('@openveo/api');
var PUBLISH_HOOKS = process.requirePublish('app/server/hooks.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var ResourceFilter = api.storages.ResourceFilter;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VideoProvider', function() {
  var provider;
  var mediaPlatformFactory;
  var openVeoApi;
  var videoPlatformConf;
  var publishConf;
  var EntityProvider;
  var storage;
  var coreApi;
  var publishApi;
  var expectedMedias;
  var originalCoreApi;
  var anonymousId = 'anonymousId';
  var expectedLocation = 'location';

  // Mocks
  beforeEach(function() {
    storage = {};
    expectedMedias = [];

    EntityProvider = function() {
      this.storage = storage;
      this.location = expectedLocation;
    };
    EntityProvider.prototype.executeCallback = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.shift();
      if (callback) return callback.apply(null, args);
    };
    EntityProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    });
    EntityProvider.prototype.add = chai.spy(function(resources, callback) {
      callback(null, expectedMedias.length, resources);
    });
    EntityProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
      callback(null, expectedMedias[0]);
    });
    EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedMedias.length);
    });
    EntityProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });

    openVeoApi = {
      providers: {
        EntityProvider: EntityProvider
      },
      storages: {
        ResourceFilter: api.storages.ResourceFilter
      },
      fileSystem: {
        getConfDir: function() {
          return '';
        },
        rmdir: function(directoryPath, callback) {
          callback();
        },
        rm: chai.spy(function(filePath, callback) {
          callback();
        })
      },
      passport: api.passport,
      util: api.util,
      errors: api.errors
    };

    videoPlatformConf = {};

    publishConf = {
      videoTmpDir: 'tmp'
    };

    publishApi = {
      getHooks: function() {
        return PUBLISH_HOOKS;
      }
    };

    mediaPlatformFactory = {
      get: function() {
        return {
          remove: function(id, callback) {
            callback();
          }
        };
      }
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      getAnonymousUserId: function() {
        return anonymousId;
      },
      getApi: function(pluginName) {
        if (pluginName === 'publish') return publishApi;
        return null;
      },
      executeHook: chai.spy(function(hook, data, callback) {
        callback();
      })
    };

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('publish/videoPlatformConf.json', videoPlatformConf);
    mock('publish/publishConf.json', publishConf);
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/factory.js'), mediaPlatformFactory);
  });

  // Initializes tests
  beforeEach(function() {
    var VideoProvider = mock.reRequire(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'));
    provider = new VideoProvider(storage, expectedLocation);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = originalCoreApi;
  });

  describe('add', function() {

    it('should add medias', function(done) {
      expectedMedias = [
        {
          id: '42',
          available: true,
          title: 'Title',
          leadParagraph: 'Lead paragraph',
          description: 'Description with <strong>HTML</strong>',
          state: STATES.PUBLISHED,
          date: new Date(),
          type: TYPES.VIMEO,
          metadata: {},
          errorCode: ERRORS.NO_ERROR,
          category: 'categoryId',
          properties: {propertyId: 'Property value'},
          packageType: 'tar',
          lastState: Package.STATES.PACKAGE_INITIALIZED,
          lastTransition: Package.TRANSITIONS.COPY_PACKAGE,
          lockedByPackage: '42',
          originalPackagePath: 'originalPackagePath',
          originalFileName: 'originalFileName',
          mediaId: ['42'],
          mergeRequired: false,
          timecodes: [],
          chapters: [],
          tags: [],
          cut: [],
          sources: [],
          views: 42,
          thumbnail: 'thumbnailPath',
          link: 'link'
        }
      ];

      provider.add(expectedMedias, function(error, total, medias) {
        expectedMedias[0].descriptionText = openVeoApi.util.removeHtmlFromText(expectedMedias[0].description);

        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedMedias.length, 'Wrong total');
        assert.deepInclude(medias[0], expectedMedias[0], 'Wrong medias');
        assert.equal(medias[0].metadata.user, anonymousId, 'Wrong user');
        assert.isArray(medias[0].metadata.groups, 'Wrong groups');
        done();
      });

    });

    it('should generate an id if not specified', function(done) {
      expectedMedias = [{}];

      provider.add(expectedMedias, function(error, total, medias) {
        assert.isNull(error, 'Unexpected error');
        assert.isNotEmpty(medias[0].id, 'Wrong id');
        done();
      });
    });

    it('should set default values for unspecified properties', function(done) {
      expectedMedias = [{}];

      provider.add(expectedMedias, function(error, total, medias) {
        assert.isNull(error, 'Unexpected error');
        assert.isObject(medias[0].properties, 'Wrong properties');
        assert.isArray(medias[0].cut, 'Wrong cuts');
        assert.isArray(medias[0].sources, 'Wrong sources');
        assert.equal(medias[0].views, 0, 'Wrong views');
        done();
      });
    });

    it('should set user and groups to the specified ones', function(done) {
      expectedMedias = [{
        user: '42',
        groups: []
      }];

      provider.add(expectedMedias, function(error, total, medias) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(medias[0].metadata.user, expectedMedias[0].user, 'Wrong user');
        assert.strictEqual(medias[0].metadata.groups, expectedMedias[0].groups, 'Wrong groups');
        done();
      });
    });

  });

  describe('updateState', function() {

    it('should update the media state', function(done) {
      var expectedId = '42';
      var expectedState = STATES.PUBLISHED;

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.state, expectedState, 'Wrong state');
        callback(null, 1);
      };

      provider.updateState(expectedId, expectedState, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateState('42', STATES.PUBLISHED, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateLastState', function() {

    it('should update the media last state', function(done) {
      var expectedId = '42';
      var expectedState = Package.STATES.PACKAGE_INITIALIZED;

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.lastState, expectedState, 'Wrong last state');
        callback(null, 1);
      };

      provider.updateLastState(expectedId, expectedState, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateLastState('42', Package.STATES.PACKAGE_INITIALIZED, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateLastTransition', function() {

    it('should update the media last transition', function(done) {
      var expectedId = '42';
      var expectedTransition = Package.TRANSITIONS.COPY_PACKAGE;

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.lastTransition, expectedTransition, 'Wrong last transition');
        callback(null, 1);
      };

      provider.updateLastTransition(expectedId, expectedTransition, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateLastTransition('42', Package.TRANSITIONS.COPY_PACKAGE, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateErrorCode', function() {

    it('should update the media error code', function(done) {
      var expectedId = '42';
      var expectedErrorCode = ERRORS.NO_ERROR;

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.errorCode, expectedErrorCode, 'Wrong error code');
        callback(null, 1);
      };

      provider.updateErrorCode(expectedId, expectedErrorCode, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateErrorCode('42', ERRORS.NO_ERROR, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateLink', function() {

    it('should update the media link', function(done) {
      var expectedId = '42';
      var expectedLink = 'link';

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.link, expectedLink, 'Wrong link');
        callback(null, 1);
      };

      provider.updateLink(expectedId, expectedLink, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateLink('42', 'link', function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateMediaId', function() {

    it('should update the media video id', function(done) {
      var expectedId = '42';
      var expectedMediaId = ['42', '43'];

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.deepEqual(data.mediaId, expectedMediaId, 'Wrong media ids');
        callback(null, 1);
      };

      provider.updateMediaId(expectedId, expectedMediaId, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateMediaId('42', ['42', '43'], function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateMetadata', function() {

    it('should update the media metadata', function(done) {
      var expectedId = '42';
      var expectedMetadata = {};

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.metadata, expectedMetadata, 'Wrong metadata');
        callback(null, 1);
      };

      provider.updateMetadata(expectedId, expectedMetadata, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateMetadata('42', {}, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateDate', function() {

    it('should update the media date', function(done) {
      var expectedId = '42';
      var expectedDate = new Date();

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.date, expectedDate, 'Wrong date');
        callback(null, 1);
      };

      provider.updateDate(expectedId, expectedDate, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateDate('42', new Date(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateCategory', function() {

    it('should update the media category', function(done) {
      var expectedId = '42';
      var expectedCategory = 'categoryId';

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.category, expectedCategory, 'Wrong category');
        callback(null, 1);
      };

      provider.updateCategory(expectedId, expectedCategory, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateCategory('42', 'categoryId', function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateType', function() {

    it('should update the media type', function(done) {
      var expectedId = '42';
      var expectedType = TYPES.LOCAL;

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.type, expectedType, 'Wrong type');
        callback(null, 1);
      };

      provider.updateType(expectedId, expectedType, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateType('42', TYPES.LOCAL, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateThumbnail', function() {

    it('should update the media type', function(done) {
      var expectedId = '42';
      var expectedThumbnail = 'Thumbnail';

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.thumbnail, expectedThumbnail, 'Wrong thumbnail');
        callback(null, 1);
      };

      provider.updateThumbnail(expectedId, expectedThumbnail, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateThumbnail('42', 'Thumbnail', function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('updateTitle', function() {

    it('should update the media title', function(done) {
      var expectedId = '42';
      var expectedTitle = 'Title';

      provider.updateOne = function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedId,
          'Wrong id'
        );
        assert.strictEqual(data.title, expectedTitle, 'Wrong title');
        callback(null, 1);
      };

      provider.updateTitle(expectedId, expectedTitle, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.updateOne = function(filter, data, callback) {
        callback(expectedError);
      };

      provider.updateTitle('42', 'Title', function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

  describe('remove', function() {

    it('should remove medias', function(done) {
      var expectedFilter = new ResourceFilter();
      expectedMedias = [
        {
          id: '42'
        }
      ];

      EntityProvider.prototype.remove = function(filter, callback) {
        assert.strictEqual(filter, expectedFilter, 'Wrong filter');
        callback(null, expectedMedias.length);
      };

      provider.remove(expectedFilter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, expectedMedias.length, 'Wrong total');
        done();
      });
    });

    it('should remove all files associated to the deleted medias', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      var expectedRemovedDirectories = [
        path.join(process.rootPublish, '/assets/player/videos/', expectedMedias[0].id),
        path.join(publishConf.videoTmpDir, expectedMedias[0].id)
      ];

      var platformRemoveMock = chai.spy(function(ids, callback) {
        assert.deepEqual(ids, [expectedMedias[0].mediaId], 'Wrong id');
        callback();
      });

      mediaPlatformFactory.get = function(type, configuration) {
        return {
          remove: platformRemoveMock
        };
      };

      openVeoApi.fileSystem.rmdir = chai.spy(function(directoryPath, callback) {
        assert.include(
          expectedRemovedDirectories,
          directoryPath,
          'Unexpected removed directory'
        );
        callback(null, expectedMedias.length);
      });

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        openVeoApi.fileSystem.rmdir.should.have.been.called.exactly(expectedRemovedDirectories.length);
        platformRemoveMock.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should remove all videos associated to the deleted medias from the platform', function(done) {
      expectedMedias = [
        {
          id: '42',
          mediaId: ['43', '44'],
          type: TYPES.LOCAL
        }
      ];

      var expectedVideoPlatformConfiguration = {};
      var platformRemoveMock = chai.spy(function(ids, callback) {
        assert.deepEqual(ids, expectedMedias[0].mediaId, 'Wrong ids');
        callback();
      });

      videoPlatformConf[expectedMedias[0].type] = expectedVideoPlatformConfiguration;

      mediaPlatformFactory.get = function(type, configuration) {
        assert.equal(type, expectedMedias[0].type, 'Wrong type');
        assert.equal(configuration, expectedVideoPlatformConfiguration, 'Wrong configuration');
        return {
          remove: platformRemoveMock
        };
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        platformRemoveMock.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should remove the video associated to the deleted media in legacy format from the platform', function(done) {
      expectedMedias = [
        {
          id: '42',
          mediaId: '43',
          type: TYPES.LOCAL
        }
      ];

      var platformRemoveMock = chai.spy(function(ids, callback) {
        assert.deepEqual(ids, [expectedMedias[0].mediaId], 'Wrong id');
        callback();
      });

      mediaPlatformFactory.get = function(type, configuration) {
        return {
          remove: platformRemoveMock
        };
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        platformRemoveMock.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute hook MEDIAS_DELETED with the removed medias', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      coreApi.executeHook = chai.spy(function(hook, data, callback) {
        assert.equal(hook, PUBLISH_HOOKS.MEDIAS_DELETED, 'Wrong hook');
        assert.deepEqual(data, expectedMedias, 'Wrong medias');
        callback();
      });

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        coreApi.executeHook.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if removing associated files failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMedias = [
        {
          id: '42'
        }
      ];

      openVeoApi.fileSystem.rmdir = function(directoryPath, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

    it('should execute callback with an error if removing video from platform failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMedias = [
        {
          id: '42',
          mediaId: ['43'],
          type: TYPES.LOCAL
        }
      ];

      var platformRemoveMock = chai.spy(function(ids, callback) {
        callback(expectedError);
      });

      mediaPlatformFactory.get = function(type, configuration) {
        return {
          remove: platformRemoveMock
        };
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        platformRemoveMock.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if removing medias failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMedias = [
        {
          id: '42'
        }
      ];

      EntityProvider.prototype.remove = function(filter, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

    it('should execute callback with an error if getting medias failed', function(done) {
      var expectedError = new Error('Something went wrong');

      EntityProvider.prototype.getAll = function(filter, fields, sort, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

    it('should not do anthing if no media found', function(done) {
      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        EntityProvider.prototype.remove.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if hook MEDIAS_DELETED failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMedias = [
        {
          id: '42'
        }
      ];

      coreApi.executeHook = chai.spy(function(hook, data, callback) {
        callback(expectedError);
      });

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        EntityProvider.prototype.getAll.should.have.been.called.exactly(1);
        EntityProvider.prototype.remove.should.have.been.called.exactly(1);
        coreApi.executeHook.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('removeLocal', function() {

    it('should not remove videos associated to the deleted medias from the platform', function(done) {
      expectedMedias = [
        {
          id: '42',
          mediaId: ['43', '44'],
          type: TYPES.LOCAL
        }
      ];

      var expectedVideoPlatformConfiguration = {};
      var platformRemoveMock = chai.spy(function(ids, callback) {
        callback();
      });

      videoPlatformConf[expectedMedias[0].type] = expectedVideoPlatformConfiguration;

      mediaPlatformFactory.get = function(type, configuration) {
        assert.equal(type, expectedMedias[0].type, 'Wrong type');
        assert.equal(configuration, expectedVideoPlatformConfiguration, 'Wrong configuration');
        return {
          remove: platformRemoveMock
        };
      };

      provider.removeLocal(new ResourceFilter(), function(error, total) {
        assert.isNull(error, 'Unexpected error');
        platformRemoveMock.should.have.been.called.exactly(0);
        done();
      });
    });

  });

  describe('updateOne', function() {

    it('should update a media', function(done) {
      var expectedFilter = new ResourceFilter();
      var expectedModifications = {
        title: 'Title',
        date: new Date(),
        leadParagraph: 'Lead paragraph',
        description: 'Description containing <strong>HTML</strong>',
        properties: {},
        category: 'categoryId',
        cut: [],
        timecodes: [],
        chapters: [],
        tags: [],
        views: 42,
        thumbnail: 'Thumbnail'
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        assert.strictEqual(filter, expectedFilter, 'Wrong filter');

        expectedModifications.descriptionText = openVeoApi.util.removeHtmlFromText(expectedModifications.description);
        assert.deepEqual(modifications, expectedModifications, 'Wrong modifications');
        callback(null, 1);
      };

      provider.updateOne(expectedFilter, expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        done();
      });
    });

    it('should be able to update groups', function(done) {
      var expectedModifications = {
        groups: ['42']
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        assert.deepEqual(modifications['metadata.groups'], expectedModifications.groups, 'Wrong groups');
        callback(null, 1);
      };

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        done();
      });
    });

    it('should exclude empty groups when updating groups', function(done) {
      var expectedModifications = {
        groups: [0, false, undefined, null]
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        assert.isEmpty(modifications['metadata.groups'], expectedModifications.groups, 'Wrong groups');
        callback(null, 1);
      };

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        done();
      });
    });

    it('should be able to update the media owner', function(done) {
      var expectedModifications = {
        user: '42'
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        assert.equal(modifications['metadata.user'], expectedModifications.user, 'Wrong owner');
        callback(null, 1);
      };

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        done();
      });
    });

    it('should set media user to the anonymous id if user is specified but not valid', function(done) {
      var expectedModifications = {
        user: null
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        assert.equal(modifications['metadata.user'], anonymousId, 'Wrong owner');
        callback(null, 1);
      };

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        done();
      });
    });

    it('should execute callback with an error if updating media failed', function(done) {
      var expectedError = new Error('Something went wrong');
      var expectedModifications = {
        user: '42'
      };

      EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
        callback(expectedError);
      };

      provider.updateOne(new ResourceFilter(), expectedModifications, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

  });

});
