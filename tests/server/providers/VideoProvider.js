'use strict';

var path = require('path');
var chai = require('chai');
var mock = require('mock-require');
var spies = require('chai-spies');
var api = require('@openveo/api');
var STATES = process.requirePublish('app/server/packages/states.js');
var ERRORS = process.requirePublish('app/server/packages/errors.js');
var TYPES = process.requirePublish('app/server/providers/videoPlatforms/types.js');
var Package = process.requirePublish('app/server/packages/Package.js');
var ResourceFilter = api.storages.ResourceFilter;
var NotFoundError = api.errors.NotFoundError;

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VideoProvider', function() {
  var provider;
  var videoPlatformFactory;
  var openVeoApi;
  var videoPlatformConf;
  var publishConf;
  var EntityProvider;
  var storage;
  var coreApi;
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
    EntityProvider.prototype.getAll = function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    };
    EntityProvider.prototype.add = function(resources, callback) {
      callback(null, expectedMedias.length, resources);
    };
    EntityProvider.prototype.getOne = function(filter, fields, callback) {
      callback(null, expectedMedias[0]);
    };
    EntityProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedMedias.length);
    });
    EntityProvider.prototype.updateOne = function(filter, modifications, callback) {
      callback(null, 1);
    };

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

    videoPlatformFactory = {
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
      }
    };

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('publish/videoPlatformConf.json', videoPlatformConf);
    mock('publish/publishConf.json', publishConf);
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/videoPlatforms/factory.js'), videoPlatformFactory);
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

  describe('getOne', function() {

    it('should retrieve a media', function(done) {
      var expectedFilter = new ResourceFilter();
      var expectedFields = {
        include: ['field1']
      };
      expectedMedias = [{
        tags: [
          {
            value: 15000
          }
        ]
      }];

      EntityProvider.prototype.getOne = function(filter, fields, callback) {
        assert.strictEqual(filter, expectedFilter, 'Wrong filter');
        assert.strictEqual(fields, expectedFields, 'Wrong fields');
        callback(null, expectedMedias[0]);
      };

      provider.getOne(expectedFilter, expectedFields, function(error, media) {
        assert.isNull(error, 'Unexpected error');
        assert.strictEqual(media, expectedMedias[0], 'Wrong media');
        assert.notOk(media.needPointsOfInterestUnitConversion, 'Expected media not to be marked for conversion');
        done();
      });
    });

    it('should execute callback without parameters if media has not been found', function(done) {
      var expectedFilter = new ResourceFilter();
      expectedMedias = [];

      provider.getOne(new ResourceFilter(), null, function(error, media) {
        assert.isUndefined(error, 'Unexpected error');
        assert.isUndefined(media, 'Unexpected media');
        done();
      });
    });

    it('should set property needPointsOfInterestUnitConversion of the media if tags need conversion', function(done) {
      expectedMedias = [
        {
          tags: [
            {
              value: 0.42
            },
            {
              value: 0.99
            }
          ]
        }
      ];

      EntityProvider.prototype.getOne = function(filter, fields, callback) {
        callback(null, expectedMedias[0]);
      };

      provider.getOne(new ResourceFilter(), {}, function(error, media) {
        assert.isNull(error, 'Unexpected error');
        assert.ok(media.needPointsOfInterestUnitConversion, 'Expected media to be marked for conversion');
        done();
      });
    });

    it(
      'should set property needPointsOfInterestUnitConversion of the media if chapters need conversion',
      function(done) {
        expectedMedias = [
          {
            chapters: [
              {
                value: 0.42
              },
              {
                value: 0.99
              }
            ]
          }
        ];

        EntityProvider.prototype.getOne = function(filter, fields, callback) {
          callback(null, expectedMedias[0]);
        };

        provider.getOne(new ResourceFilter(), {}, function(error, media) {
          assert.isNull(error, 'Unexpected error');
          assert.ok(media.needPointsOfInterestUnitConversion, 'Expected media to be marked for conversion');
          done();
        });
      }
    );

    it('should set property needPointsOfInterestUnitConversion of the media if cuts need conversion', function(done) {
      expectedMedias = [
        {
          cut: [
            {
              value: 0.42
            },
            {
              value: 0.99
            }
          ]
        }
      ];

      EntityProvider.prototype.getOne = function(filter, fields, callback) {
        callback(null, expectedMedias[0]);
      };

      provider.getOne(new ResourceFilter(), {}, function(error, media) {
        assert.isNull(error, 'Unexpected error');
        assert.ok(media.needPointsOfInterestUnitConversion, 'Expected media to be marked for conversion');
        done();
      });
    });

    it('should execute callback with an error if getting media failed', function(done) {
      var expectedError = new Error('Something went wrong');

      EntityProvider.prototype.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      provider.getOne(new ResourceFilter(), {}, function(error, media) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(media, 'Unexpected media');
        done();
      });
    });

  });

  describe('add', function() {

    it('should add medias', function(done) {
      expectedMedias = [
        {
          id: '42',
          available: true,
          title: 'Title',
          leadParagraph: 'Lead paragraph',
          description: 'Description',
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
          originalPackagePath: 'originalPackagePath',
          originalFileName: 'originalFileName',
          mediaId: ['42'],
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

      videoPlatformFactory.get = function(type, configuration) {
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

      videoPlatformFactory.get = function(type, configuration) {
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

      videoPlatformFactory.get = function(type, configuration) {
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

      videoPlatformFactory.get = function(type, configuration) {
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

      provider.getAll = function(filter, fields, sort, callback) {
        callback(expectedError);
      };

      provider.remove(new ResourceFilter(), function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

    it('should not do anthing if no media found', function(done) {
      provider.remove(new ResourceFilter(), function(error, total) {
        assert.isUndefined(error, 'Unexpected error');
        EntityProvider.prototype.remove.should.have.been.called.exactly(0);
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
        description: 'Description',
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

  describe('updateOneTag', function() {

    it('should update a media tag', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 42000
            }
          ]
        }
      ];

      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedTag = {
        id: expectedMedias[0].tags[0].id,
        value: 43000,
        name: 'New name',
        description: 'New description',
        unexpectedProperty: 'Unexpected property value'
      };
      var expectedFile = {
        originalname: 'originalName',
        mimetype: 'mimetype',
        filename: 'fileName',
        size: 42
      };

      provider.updateOne = function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong filter'
        );
        assert.equal(modifications.tags.length, 1, 'Wrong number of tags');
        assert.equal(modifications.tags[0].name, expectedTag.name, 'Wrong name');
        assert.equal(modifications.tags[0].value, expectedTag.value, 'Wrong value');
        assert.equal(modifications.tags[0].description, expectedTag.description, 'Wrong description');
        assert.equal(modifications.tags[0].file.originalname, expectedFile.originalname, 'Wrong original name');
        assert.equal(modifications.tags[0].file.mimetype, expectedFile.mimetype, 'Wrong type MIME');
        assert.equal(modifications.tags[0].file.filename, expectedFile.filename, 'Wrong file name');
        assert.equal(modifications.tags[0].file.size, expectedFile.size, 'Wrong file size');
        assert.notProperty(modifications.tags[0], 'unexpectedProperty', 'Unexpected property');
        assert.equal(
          modifications.tags[0].file.basePath,
          '/publish/player/videos/' + expectedMedias[0].id + '/uploads/' + expectedFile.filename,
          'Wrong file size'
        );
        callback(null, 1);
      };

      provider.updateOneTag(expectedFilter, expectedTag, expectedFile, function(error, total, tag) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        assert.isNotEmpty(tag, 'Wrong tag');
        done();
      });
    });

    it('should add a media tag if the tag id is not specified', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedTag = {
        value: 42000,
        name: 'Name',
        description: 'Description',
        unexpectedProperty: 'Unexpected property value'
      };
      var expectedFile = {
        originalname: 'originalName',
        mimetype: 'mimetype',
        filename: 'fileName',
        size: 43
      };

      provider.updateOne = function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong filter'
        );
        assert.equal(modifications.tags.length, 1, 'Wrong number of tags');
        assert.equal(modifications.tags[0].name, expectedTag.name, 'Wrong name');
        assert.equal(modifications.tags[0].value, expectedTag.value, 'Wrong value');
        assert.equal(modifications.tags[0].description, expectedTag.description, 'Wrong description');
        assert.equal(modifications.tags[0].file.originalname, expectedFile.originalname, 'Wrong original name');
        assert.equal(modifications.tags[0].file.mimetype, expectedFile.mimetype, 'Wrong type MIME');
        assert.equal(modifications.tags[0].file.filename, expectedFile.filename, 'Wrong file name');
        assert.equal(modifications.tags[0].file.size, expectedFile.size, 'Wrong file size');
        assert.notProperty(modifications.tags[0], 'unexpectedProperty', 'Unexpected property');
        assert.equal(
          modifications.tags[0].file.basePath,
          '/publish/player/videos/' + expectedMedias[0].id + '/uploads/' + expectedFile.filename,
          'Wrong file size'
        );
        callback(null, 1);
      };

      provider.updateOneTag(expectedFilter, expectedTag, expectedFile, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        done();
      });
    });

    it('should remove old file associated to tag', function(done) {
      var expectedFilenameToRemove = 'fileName';
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              value: 42000,
              name: 'Name',
              description: 'Description',
              file: {
                originalname: 'originalName',
                mimetype: 'mimetype',
                filename: expectedFilenameToRemove,
                size: 43
              }
            }
          ]
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedTag = {
        id: expectedMedias[0].tags[0].id,
        value: 42000,
        name: 'Name',
        description: 'Description'
      };

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        assert.equal(
          filePath,
          process.rootPublish + '/assets/player/videos/' + expectedMedias[0].id + '/uploads/' + expectedFilenameToRemove
        );
        callback();
      });

      provider.updateOneTag(expectedFilter, expectedTag, null, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if tag has an id not found in media tags', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 42000
            }
          ]
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedTag = {
        id: 'wrongId',
        value: 42000,
        name: 'Name',
        description: 'Description'
      };

      provider.updateOneTag(expectedFilter, expectedTag, null, function(error, total) {
        assert.isNotNull(error, 'Expected an error');
        done();
      });
    });

    it('should execute callback with an error if getting media failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      provider.updateOneTag(new ResourceFilter(), {}, {}, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        done();
      });
    });

    it('should execute callback with an error if updating media failed', function(done) {
      var expectedError = new Error('Something went wrong');
      expectedMedias = [
        {
          id: '42'
        }
      ];

      provider.updateOne = function(filter, modifications, callback) {
        callback(expectedError);
      };

      provider.updateOneTag(
        new ResourceFilter(),
        {
          value: 42000,
          name: 'Name',
          description: 'Description'
        },
        null,
        function(error, total) {
          assert.strictEqual(error, expectedError, 'Wrong error');
          done();
        }
      );
    });

     it('should execute callback with an error if media is not found', function(done) {
        var expectedError = new Error('Something went wrong');

        provider.getOne = function(filter, fields, callback) {
          callback();
        };

        provider.updateOne = chai.spy(function(filter, modifications, callback) {
          callback(null, 1);
        });

        provider.updateOneTag(new ResourceFilter(), {}, {}, function(error, total) {
          assert.instanceOf(error, NotFoundError, 'Wrong error');
          provider.updateOne.should.have.been.called.exactly(0);
          openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
          done();
        });
      });

  });

  describe('updateOneChapter', function() {

    it('should update a media chapter', function(done) {
      expectedMedias = [
        {
          id: '42',
          chapters: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 42000
            }
          ]
        }
      ];
      var expectedFilter = new ResourceFilter();
      var expectedChapter = {
        id: expectedMedias[0].chapters[0].id,
        name: 'New name',
        description: 'New description',
        value: 43000,
        unexpectedProperty: 'Unexpected property value'
      };

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.equal(modifications.chapters[0].name, expectedChapter.name, 'Wrong name');
        assert.equal(modifications.chapters[0].description, expectedChapter.description, 'Wrong description');
        assert.equal(modifications.chapters[0].value, expectedChapter.value, 'Wrong value');
        assert.notProperty(modifications.chapters[0], 'unexpectedProperty', 'Unexpected property');
        callback(null, 1);
      });

      provider.updateOneChapter(expectedFilter, expectedChapter, function(error, total, chapter) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        assert.isNotEmpty(chapter, 'Wrong chapter');
        provider.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if media is not found', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = function(filter, fields, callback) {
        callback();
      };

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      });

      provider.updateOneChapter(new ResourceFilter(), {}, function(error, total) {
        assert.instanceOf(error, NotFoundError, 'Wrong error');
        provider.updateOne.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if getting media failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      provider.updateOneChapter(new ResourceFilter(), {}, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if chapter id is not found in media chapters', function(done) {
      expectedMedias = [
        {
          id: '42',
          chapters: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 42000
            }
          ]
        }
      ];
      var expectedChapter = {
        id: 'wrongId',
        name: 'New name',
        description: 'New description',
        value: 43000
      };
      provider.updateOneChapter(new ResourceFilter(), expectedChapter, function(error, total) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should add a media chapter if the chapter id is not specified', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];
      var expectedFilter = new ResourceFilter();
      var expectedChapter = {
        name: 'New name',
        description: 'New description',
        value: 43000,
        unexpectedProperty: 'Unexpected property value'
      };

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.isNotEmpty(modifications.chapters[0].id, 'Expected id to be generated');
        assert.equal(modifications.chapters[0].name, expectedChapter.name, 'Wrong name');
        assert.equal(modifications.chapters[0].description, expectedChapter.description, 'Wrong description');
        assert.equal(modifications.chapters[0].value, expectedChapter.value, 'Wrong value');
        assert.notProperty(modifications.chapters[0], 'unexpectedProperty', 'Unexpected property');
        callback(null, 1);
      });

      provider.updateOneChapter(expectedFilter, expectedChapter, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        provider.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if update failed', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];
      var expectedError = new Error('Something went wrong');
      var expectedChapter = {
        name: 'New name',
        description: 'New description',
        value: 43000
      };

      provider.updateOne = function(filter, modifications, callback) {
        callback(expectedError);
      };

      provider.updateOneChapter(new ResourceFilter(), expectedChapter, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

  });

  describe('removeTags', function() {

    it('should remove tags from a media', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000
            }
          ]
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedIds = [expectedMedias[0].tags[0].id];

      provider.updateOne = function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.isEmpty(modifications.tags, 'Unexpected tags');
        callback(null, 1);
      };

      provider.removeTags(expectedFilter, expectedIds, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        done();
      });
    });

    it('should remove file associated to deleted tags', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000,
              file: {
                originalname: 'originalName',
                mimetype: 'mimetype',
                filename: 'fileName',
                size: 43
              }
            }
          ]
        }
      ];
      var expectedIds = [expectedMedias[0].tags[0].id];

      openVeoApi.fileSystem.rm = chai.spy(function(filePath, callback) {
        var mediasDirectoryPath = process.rootPublish + '/assets/player/videos/';
        var tag = expectedMedias[0].tags[0];
        var expectedPath = mediasDirectoryPath + expectedMedias[0].id + '/uploads/' + tag.file.filename;
        assert.equal(filePath, expectedPath, 'Wrong path');
        callback();
      });

      provider.removeTags(new ResourceFilter(), expectedIds, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if media is not found', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = function(filter, fields, callback) {
        callback();
      };

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      });

      provider.removeTags(new ResourceFilter(), [], function(error, total) {
        assert.instanceOf(error, NotFoundError, 'Wrong error');
        provider.updateOne.should.have.been.called.exactly(0);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if getting media failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      provider.removeTags(new ResourceFilter(), [], function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if one of the tags is not found', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      provider.removeTags(new ResourceFilter(), ['wrongId'], function(error, total) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if updating media failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000
            }
          ]
        }
      ];
      var expectedError = new Error('Something went wrong');
      var expectedIds = [expectedMedias[0].tags[0].id];

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(expectedError);
      });

      provider.removeTags(new ResourceFilter(), expectedIds, function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        provider.updateOne.should.have.been.called.exactly(1);
        done();
      });

    });

  });

  describe('removeChapters', function() {

    it('should remove chapters from a media', function(done) {
      expectedMedias = [
        {
          id: '42',
          chapters: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000
            }
          ]
        }
      ];
      var expectedFilter = new ResourceFilter().equal('id', expectedMedias[0].id);
      var expectedIds = [expectedMedias[0].chapters[0].id];

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.isEmpty(modifications.chapters, 'Unexpected chapters<');
        callback(null, 1);
      });

      provider.removeChapters(expectedFilter, expectedIds, function(error, total) {
        assert.isNull(error, 'Unexpected error');
        assert.equal(total, 1, 'Wrong total');
        provider.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if media is not found', function(done) {
      provider.getOne = chai.spy(function(filter, fields, callback) {
        callback();
      });

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      });

      provider.removeChapters(new ResourceFilter(), [], function(error, total) {
        assert.instanceOf(error, NotFoundError, 'Wrong error');
        provider.getOne.should.have.been.called.exactly(1);
        provider.updateOne.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if getting media failed', function(done) {
      var expectedError = new Error('Something went wrong');

      provider.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      provider.removeChapters(new ResourceFilter(), [], function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        provider.getOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute callback with an error if one of the chapters is not found', function(done) {
      expectedMedias = [
        {
          id: '42',
          chapters: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000
            }
          ]
        }
      ];

      provider.removeChapters(new ResourceFilter(), ['wrongId'], function(error, total) {
        assert.isNotNull(error, 'Expected an error');
        assert.isUndefined(total, 'Unexpected total');
        done();
      });
    });

    it('should execute callback with an error if updating media failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          chapters: [
            {
              id: '43',
              name: 'Name',
              description: 'Description',
              value: 43000
            }
          ]
        }
      ];
      var expectedError = new Error('Something went wrong');

      provider.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(expectedError);
      });

      provider.removeChapters(new ResourceFilter(), [expectedMedias[0].chapters[0].id], function(error, total) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(total, 'Unexpected total');
        provider.updateOne.should.have.been.called.exactly(1);
        done();
      });
    });

  });

});
