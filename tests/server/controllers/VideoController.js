'use strict';

var path = require('path');
var async = require('async');
var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');
var STATES = process.requirePublish('app/server/packages/states.js');
var HTTP_ERRORS = process.requirePublish('app/server/controllers/httpErrors.js');
var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var ResourceFilter = api.storages.ResourceFilter;
var POI_TYPE = {
  TAGS: 'tags',
  CHAPTERS: 'chapters'
};

var assert = chai.assert;
chai.should();
chai.use(spies);

describe('VideoController', function() {
  var request;
  var response;
  var videoController;
  var expectedMedias;
  var expectedProperties;
  var expectedPois;
  var expectedGroups;
  var expectedUser;
  var expectedFiles;
  var expectedCategories;
  var expectedPagination;
  var VideoProvider;
  var PoiProvider;
  var PropertyProvider;
  var PublishManager;
  var MultipartParser;
  var mediaPlatformFactory;
  var openVeoApi;
  var videoPlatformConf;
  var publishConf;
  var originalCoreApi;
  var coreApi;
  var plugins;
  var mediaPlatformProvider;
  var fs;
  var superAdminId = '0';
  var anonymousId = '1';
  var unstableStates = [
    STATES.PENDING,
    STATES.COPYING,
    STATES.EXTRACTING,
    STATES.VALIDATING,
    STATES.PREPARING,
    STATES.UPLOADING,
    STATES.SYNCHRONIZING,
    STATES.SAVING_TIMECODES,
    STATES.COPYING_IMAGES,
    STATES.GENERATE_THUMB,
    STATES.GET_METADATA,
    STATES.DEFRAGMENT_MP4
  ];
  var stableStates = [
    STATES.ERROR,
    STATES.WAITING_FOR_UPLOAD,
    STATES.READY,
    STATES.PUBLISHED
  ];

  // Mocks
  beforeEach(function() {
    plugins = [];
    expectedGroups = [];
    expectedUser = null;
    expectedMedias = [];
    expectedProperties = [];
    expectedPois = [];
    expectedPagination = {};
    VideoProvider = function() {};
    VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedMedias);
    });
    VideoProvider.prototype.add = chai.spy(function(resources, callback) {
      callback(null, expectedMedias.length, resources);
    });
    VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
      callback(null, expectedMedias[0]);
    });
    VideoProvider.prototype.get = chai.spy(function(filter, fields, page, limit, sort, callback) {
      callback(null, expectedMedias, expectedPagination);
    });
    VideoProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedMedias.length);
    });
    VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });
    VideoProvider.prototype.getPoiFilePath = function(mediaId, file) {
      return path.join('/publish', mediaId, 'uploads', file.fileName);
    };

    PropertyProvider = function() {};
    PropertyProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedProperties);
    });
    PropertyProvider.prototype.add = chai.spy(function(resources, callback) {
      callback(null, expectedProperties.length, resources);
    });
    PropertyProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
      callback(null, expectedProperties[0]);
    });
    PropertyProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback(null, expectedProperties.length);
    });
    PropertyProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
      callback(null, 1);
    });
    PropertyProvider.TYPES = {
      TEXT: 'text',
      LIST: 'list',
      BOOLEAN: 'boolean',
      DATE_TIME: 'dateTime'
    };

    PoiProvider = function() {};
    PoiProvider.prototype.add = chai.spy(function(pois, callback) {
      callback(null, pois.length, pois);
    });
    PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
      callback(null, 1);
    });
    PoiProvider.prototype.remove = chai.spy(function(filter, callback) {
      callback();
    });
    PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
      callback(null, expectedPois);
    });

    MultipartParser = function(expressRequest, files) {
      expectedFiles = files;
    };
    MultipartParser.prototype.parse = chai.spy(function(callback) {
      callback();
    });

    PublishManager = {
      get: function() {
        return PublishManager;
      },
      removeListener: function() {},
      on: function() {},
      publish: function() {}
    };

    mediaPlatformProvider = {
      getMediaInfo: function(id, expectedDefinition, callback) {
        callback({});
      },
      update: chai.spy(function(media, datas, force, callback) {
        callback();
      })
    };

    mediaPlatformFactory = {
      get: function() {
        return mediaPlatformProvider;
      }
    };

    openVeoApi = {
      fileSystem: {
        getConfDir: function() {
          return '';
        },
        FILE_TYPES: api.fileSystem.FILE_TYPES,
        copy: chai.spy(function(filePath, destinationPath, callback) {
          callback();
        }),
        rm: chai.spy(function(filePath, callback) {
          callback();
        })
      },
      multipart: {
        MultipartParser: MultipartParser
      },
      controllers: {
        ContentController: api.controllers.ContentController
      },
      storages: {
        ResourceFilter: api.storages.ResourceFilter
      },
      util: {
        validateFiles: function(fields, descriptor, callback) {
          callback(null, {});
        },
        shallowValidateObject: api.util.shallowValidateObject,
        getPropertyFromArray: api.util.getPropertyFromArray,
        escapeTextForRegExp: api.util.escapeTextForRegExp
      }
    };

    videoPlatformConf = {
      local: true,
      vimeo: true,
      youtube: true,
      wowza: {
        streamPath: 'https://wowza.local/'
      }
    };

    publishConf = {
      videoTmpDir: 'tmp'
    };

    coreApi = {
      getCoreApi: function() {
        return coreApi;
      },
      getCdnUrl: function() {
        return 'https://openveourl.local/';
      },
      getDatabase: function() {
        return {};
      },
      getPlugins: function() {
        return plugins;
      },
      clearImageCache: chai.spy(function(imagePath, pluginName, callback) {
        callback();
      }),
      taxonomyProvider: {
        getTaxonomyTerms: function(name, callback) {
          callback(null, expectedCategories);
        }
      },
      groupProvider: {
        getAll: function(filter, fields, sort, callback) {
          callback(null, expectedGroups);
        }
      },
      userProvider: {
        getOne: chai.spy(function(filter, fields, callback) {
          callback(null, expectedUser);
        })
      },
      getSuperAdminId: function() {
        return '1';
      }
    };

    fs = {
      unlink: chai.spy(function(file, callback) {
        callback();
      })
    };

    request = {
      body: {},
      params: {},
      query: {},
      user: {
        id: '42'
      },
      isAuthenticated: function() {
        return true;
      }
    };
    response = {
      locals: {}
    };

    originalCoreApi = process.api;
    process.api = coreApi;

    mock('fs', fs);
    mock('publish/videoPlatformConf.json', videoPlatformConf);
    mock('publish/publishConf.json', publishConf);
    mock('@openveo/api', openVeoApi);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), VideoProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/PoiProvider.js'), PoiProvider);
    mock(path.join(process.rootPublish, 'app/server/providers/PropertyProvider.js'), PropertyProvider);
    mock(path.join(process.rootPublish, 'app/server/PublishManager.js'), PublishManager);
    mock(path.join(process.rootPublish, 'app/server/providers/mediaPlatforms/factory.js'), mediaPlatformFactory);
  });

  // Initializes tests
  beforeEach(function() {
    var VideoController = mock.reRequire(path.join(process.rootPublish, 'app/server/controllers/VideoController.js'));
    videoController = new VideoController();
    videoController.getSuperAdminId = function() {
      return superAdminId;
    };
    videoController.getAnonymousId = function() {
      return anonymousId;
    };
    videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
      return true;
    });
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
    process.api = originalCoreApi;
  });

  describe('displayVideoAction', function() {
    var expectedBaseJsFiles = [];
    var expectedJsFiles = [];
    var expectedCssFiles = [];

    beforeEach(function() {
      plugins = [
        {
          name: 'publish',
          custom: {
            scriptFiles: {
              base: expectedBaseJsFiles,
              publishPlayer: {
                dev: expectedJsFiles
              }
            },
            cssFiles: expectedCssFiles
          }
        }
      ];
    });

    it('should display the video page', function(done) {
      response.render = function(templateName, variables) {
        assert.equal(templateName, 'player', 'Unexpected template name');
        assert.deepEqual(variables.scripts, expectedBaseJsFiles.concat(expectedJsFiles), 'Unexpected scripts');
        assert.deepEqual(variables.css, expectedCssFiles, 'Unexpected css files');
        done();
      };

      videoController.displayVideoAction(request, response);
    });

    it('should not display the page if plugin publish is not found', function(done) {
      response.render = function() {
        assert.ok(false, 'Unexpected call to render');
      };
      plugins = [];
      videoController.displayVideoAction(request, response, done);
    });
  });

  describe('getPlatformsAction', function() {

    it('should send response with the list of available platforms', function(done) {
      var expectedPlatforms = [TYPES.LOCAL, TYPES.VIMEO];
      for (var platform in videoPlatformConf) videoPlatformConf[platform] = expectedPlatforms.indexOf(platform) >= 0;

      response.send = function(data) {
        assert.deepEqual(data.platforms, expectedPlatforms, 'Wrong platforms');
        done();
      };
      videoController.getPlatformsAction(request, response);
    });

    it('should send response with an empty array if no available platforms', function(done) {
      for (var platform in videoPlatformConf) videoPlatformConf[platform] = false;

      response.send = function(data) {
        assert.isEmpty(data.platforms, 'Unexpected platforms');
        assert.isArray(data.platforms, 'Expected an array');
        done();
      };
      videoController.getPlatformsAction(request, response);
    });

  });

  describe('getVideoReadyAction', function() {

    it('should send response with the media from OpenVeo and the video from the platform', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED
        }
      ];

      request.params.id = expectedMedias[0].id;

      VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        callback(null, expectedMedias[0]);
      });

      response.send = function(data) {
        assert.strictEqual(data.entity, expectedMedias[0]);
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should send response with the media populated with points of interest if any chapters / tags', function(done) {
      var expectedMediaId = '42';
      var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', expectedMediaId, 'uploads');
      var expectedTagFileName = 'tagFileName.jpg';
      var expectedTag = {
        id: '1',
        name: 'Tag name',
        description: 'Tag description',
        value: 1000,
        file: {
          originalName: 'tagOriginalName.jpg',
          mimeType: 'image/jpeg',
          fileName: expectedTagFileName,
          size: 42,
          url: 'tagFileUri',
          path: path.join(poiFileDestinationPath, expectedTagFileName)
        }
      };
      var expectedChapter = {
        id: '2',
        name: 'Chapter name',
        description: 'Chapter description',
        value: 2000
      };
      expectedMedias = [
        {
          id: expectedMediaId,
          state: STATES.PUBLISHED,
          tags: ['1'],
          chapters: ['2']
        }
      ];

      request.params.id = expectedMedias[0].id;

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          expectedMedias[0].tags.concat(expectedMedias[0].chapters),
          'Wrong points of interest'
        );

        callback(null, [expectedTag, expectedChapter]);
      });

      response.send = function(data) {
        assert.lengthOf(data.entity.tags, 1, 'Wrong number of tags');
        assert.lengthOf(data.entity.chapters, 1, 'Wrong number of chapters');

        var tag = data.entity.tags[0];
        assert.equal(tag.id, expectedTag.id, 'Wrong tag id');
        assert.equal(tag.name, expectedTag.name, 'Wrong tag name');
        assert.equal(tag.description, expectedTag.description, 'Wrong tag description');
        assert.equal(tag.value, expectedTag.value, 'Wrong tag value');
        assert.equal(tag.file.originalName, expectedTag.file.originalName, 'Wrong tag file original name');
        assert.equal(tag.file.mimeType, expectedTag.file.mimeType, 'Wrong tag file mime type');
        assert.equal(tag.file.fileName, expectedTag.file.fileName, 'Wrong tag file name');
        assert.equal(tag.file.size, expectedTag.file.size, 'Wrong tag file size');
        assert.equal(tag.file.url, expectedTag.file.url, 'Wrong tag file URL');
        assert.isUndefined(tag.file.path, 'Unexpected tag file path');
        assert.isUndefined(tag._id, 'Unexpected tag internal id');

        var chapter = data.entity.chapters[0];
        assert.equal(chapter.id, expectedChapter.id, 'Wrong chapter id');
        assert.equal(chapter.name, expectedChapter.name, 'Wrong chapter name');
        assert.equal(chapter.description, expectedChapter.description, 'Wrong chapter description');
        assert.equal(chapter.value, expectedChapter.value, 'Wrong chapter value');
        assert.isUndefined(chapter._id, 'Unexpected chapter internal id');

        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if populating with points of interest failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          tags: ['1']
        }
      ];

      request.params.id = expectedMedias[0].id;

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.fail('Unexpected response');
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_POPULATE_WITH_POIS_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next with an error if media is not ready', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PENDING
        }
      ];

      request.params.id = expectedMedias[0].id;

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_NOT_READY_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if media is ready but user not authorized', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.READY
        }
      ];

      request.params.id = expectedMedias[0].id;
      videoController.isUserAuthorized = function() {
        return false;
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if access to the media is forbidden for the user', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.READY
        }
      ];

      request.params.id = expectedMedias[0].id;

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        return false;
      });

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_FORBIDDEN, 'Wrong error');
        videoController.isUserAuthorized.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next with an error if getting media failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED
        }
      ];

      var expectedError = new Error('Something went wrong');
      request.params.id = expectedMedias[0].id;

      VideoProvider.prototype.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_ERROR, 'Wrong error');
        done();
      });
    });

    it('should send response with media and information from the video platform', function(done) {
      var expectedVideoDefinition = 720;
      var expectedInfo = {
        available: true,
        sources: []
      };
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          type: TYPES.LOCAL,
          mediaId: ['43'],
          metadata: {
            'profile-settings': {
              'video-height': expectedVideoDefinition
            }
          }
        }
      ];

      request.params.id = expectedMedias[0].id;

      mediaPlatformProvider.getMediaInfo = chai.spy(function(ids, videoDefinition, callback) {
        assert.deepEqual(ids, expectedMedias[0].mediaId, 'Wrong ids');
        assert.equal(videoDefinition, expectedVideoDefinition, 'Wrong video definition');
        callback(null, expectedInfo);
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.equal(modifications.available, expectedInfo.available, 'Wrong availability');
        assert.strictEqual(modifications.sources, expectedInfo.sources, 'Wrong sources');
        callback();
      });

      response.send = function(data) {
        assert.equal(data.entity.available, expectedInfo.available, 'Wrong availability');
        assert.strictEqual(data.entity.sources, expectedInfo.sources, 'Wrong sources');
        mediaPlatformProvider.getMediaInfo.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if updating media with info from platform failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          type: TYPES.LOCAL,
          mediaId: ['43'],
          metadata: {
            'profile-settings': {
              'video-height': 720
            }
          }
        }
      ];

      request.params.id = expectedMedias[0].id;

      mediaPlatformFactory.get = function(type, configuration) {
        assert.equal(type, expectedMedias[0].type, 'Wrong type');
        assert.strictEqual(configuration, videoPlatformConf[expectedMedias[0].type], 'Wrong configuration');
        return mediaPlatformProvider;
      };

      mediaPlatformProvider.getMediaInfo = function(ids, videoDefinition, callback) {
        callback(new Error('Something went wrong'));
      };

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if media id is missing', function(done) {
      videoController.getVideoReadyAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEO_READY_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should resolve media resources URLs', function(done) {
      var expectedSmallImageUri = 'smallImageUri';
      var expectedLargeImageUri = 'largeImageUri';
      var expectedTagFileUri = 'tagFileUri';
      var expectedSourceUri = 'sourceUri';
      var expectedThumbnailUri = 'thumbnailUri';
      expectedPois = [
        {
          id: 'tagId',
          file: {
            url: expectedTagFileUri
          }
        }
      ];
      expectedMedias = [
        {
          id: 42,
          type: TYPES.LOCAL,
          state: STATES.PUBLISHED,
          timecodes: [
            {
              value: 42000,
              image: {
                small: {
                  url: expectedSmallImageUri,
                  x: 0,
                  y: 0
                },
                large: expectedLargeImageUri
              }
            }
          ],
          tags: [expectedPois[0].id],
          sources: [
            {
              files: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ],
          thumbnail: expectedThumbnailUri
        }
      ];

      request.params.id = expectedMedias[0].id;

      response.send = function(data) {
        assert.strictEqual(
          data.entity.thumbnail,
          coreApi.getCdnUrl() + expectedThumbnailUri,
          'Wrong thumbnail'
        );
        assert.strictEqual(
          data.entity.timecodes[0].image.small.url,
          coreApi.getCdnUrl() + expectedSmallImageUri,
          'Wrong small timecode'
        );
        assert.strictEqual(
          data.entity.timecodes[0].image.large,
          coreApi.getCdnUrl() + expectedLargeImageUri,
          'Wrong large timecode'
        );
        assert.strictEqual(
          data.entity.tags[0].file.url,
          coreApi.getCdnUrl() + expectedTagFileUri,
          'Wrong tag file'
        );
        assert.strictEqual(
          data.entity.sources[0].files[0].link,
          coreApi.getCdnUrl() + expectedSourceUri,
          'Wrong source link'
        );
        done();
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should resolve Wowza media links', function(done) {
      var expectedSourceUri = 'media/manifest.mpd';
      expectedMedias = [
        {
          id: 42,
          type: TYPES.WOWZA,
          state: STATES.PUBLISHED,
          sources: [
            {
              adaptive: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ]
        }
      ];

      request.params.id = expectedMedias[0].id;

      response.send = function(data) {
        assert.strictEqual(
          data.entity.sources[0].adaptive[0].link,
          videoPlatformConf.wowza.streamPath + expectedSourceUri,
          'Wrong source link'
        );
        done();
      };

      videoController.getVideoReadyAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next');
      });
    });

  });

  describe('getEntityAction', function() {

    it('should send response with the media from OpenVeo and the video from the platform', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      request.params.id = expectedMedias[0].id;

      VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        callback(null, expectedMedias[0]);
      });

      response.send = function(data) {
        assert.strictEqual(data.entity, expectedMedias[0]);
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if user has not enough privileges', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      request.params.id = expectedMedias[0].id;
      videoController.isUserAuthorized = function() {
        return false;
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_MEDIA_FORBIDDEN, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if getting media failed', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      var expectedError = new Error('Something went wrong');
      request.params.id = expectedMedias[0].id;

      VideoProvider.prototype.getOne = function(filter, fields, callback) {
        callback(expectedError);
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_MEDIA_ERROR, 'Wrong error');
        done();
      });
    });

    it('should send response with the media populated with points of interest if any chapters / tags', function(done) {
      var expectedMediaId = '42';
      var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', expectedMediaId, 'uploads');
      var expectedTagFileName = 'tagFileName.jpg';
      var expectedTag = {
        id: '1',
        name: 'Tag name',
        description: 'Tag description',
        value: 1000,
        file: {
          originalName: 'tagOriginalName.jpg',
          mimeType: 'image/jpeg',
          fileName: expectedTagFileName,
          size: 42,
          url: 'tagFileUri',
          path: path.join(poiFileDestinationPath, expectedTagFileName)
        }
      };
      var expectedChapter = {
        id: '2',
        name: 'Chapter name',
        description: 'Chapter description',
        value: 2000
      };
      expectedMedias = [
        {
          id: expectedMediaId,
          tags: ['1'],
          chapters: ['2']
        }
      ];

      request.params.id = expectedMedias[0].id;

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          expectedMedias[0].tags.concat(expectedMedias[0].chapters),
          'Wrong points of interest'
        );

        callback(null, [expectedTag, expectedChapter]);
      });

      response.send = function(data) {
        assert.lengthOf(data.entity.tags, 1, 'Wrong number of tags');
        assert.lengthOf(data.entity.chapters, 1, 'Wrong number of chapters');

        var tag = data.entity.tags[0];
        assert.equal(tag.id, expectedTag.id, 'Wrong tag id');
        assert.equal(tag.name, expectedTag.name, 'Wrong tag name');
        assert.equal(tag.description, expectedTag.description, 'Wrong tag description');
        assert.equal(tag.value, expectedTag.value, 'Wrong tag value');
        assert.equal(tag.file.originalName, expectedTag.file.originalName, 'Wrong tag file original name');
        assert.equal(tag.file.mimeType, expectedTag.file.mimeType, 'Wrong tag file mime type');
        assert.equal(tag.file.fileName, expectedTag.file.fileName, 'Wrong tag file name');
        assert.equal(tag.file.size, expectedTag.file.size, 'Wrong tag file size');
        assert.equal(tag.file.url, expectedTag.file.url, 'Wrong tag file URL');
        assert.isUndefined(tag.file.path, 'Unexpected tag file path');
        assert.isUndefined(tag._id, 'Unexpected tag internal id');

        var chapter = data.entity.chapters[0];
        assert.equal(chapter.id, expectedChapter.id, 'Wrong chapter id');
        assert.equal(chapter.name, expectedChapter.name, 'Wrong chapter name');
        assert.equal(chapter.description, expectedChapter.description, 'Wrong chapter description');
        assert.equal(chapter.value, expectedChapter.value, 'Wrong chapter value');
        assert.isUndefined(data.entity.chapters[0]._id, 'Unexpected chapter internal id');

        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if populating with points of interest failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: ['1']
        }
      ];

      request.params.id = expectedMedias[0].id;

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.fail('Unexpected response');
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_MEDIA_POPULATE_WITH_POIS_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should send response with media and information from the video platform', function(done) {
      var expectedVideoDefinition = 720;
      var expectedInfo = {
        available: true,
        sources: []
      };
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          type: TYPES.LOCAL,
          mediaId: ['43'],
          metadata: {
            'profile-settings': {
              'video-height': expectedVideoDefinition
            }
          }
        }
      ];

      request.params.id = expectedMedias[0].id;

      mediaPlatformProvider.getMediaInfo = chai.spy(function(ids, videoDefinition, callback) {
        assert.deepEqual(ids, expectedMedias[0].mediaId, 'Wrong ids');
        assert.equal(videoDefinition, expectedVideoDefinition, 'Wrong video definition');
        callback(null, expectedInfo);
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.equal(modifications.available, expectedInfo.available, 'Wrong availability');
        assert.strictEqual(modifications.sources, expectedInfo.sources, 'Wrong sources');
        callback();
      });

      response.send = function(data) {
        assert.equal(data.entity.available, expectedInfo.available, 'Wrong availability');
        assert.strictEqual(data.entity.sources, expectedInfo.sources, 'Wrong sources');
        mediaPlatformProvider.getMediaInfo.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if updating media with info from platform failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          type: TYPES.LOCAL,
          mediaId: ['43'],
          metadata: {
            'profile-settings': {
              'video-height': 720
            }
          }
        }
      ];

      request.params.id = expectedMedias[0].id;

      mediaPlatformFactory.get = function(type, configuration) {
        assert.equal(type, expectedMedias[0].type, 'Wrong type');
        assert.strictEqual(configuration, videoPlatformConf[expectedMedias[0].type], 'Wrong configuration');
        return mediaPlatformProvider;
      };

      mediaPlatformProvider.getMediaInfo = function(ids, videoDefinition, callback) {
        callback(new Error('Something went wrong'));
      };

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_MEDIA_UPDATE_MEDIA_WITH_PLATFORM_INFO_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next with an error if media id is missing', function(done) {
      videoController.getEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_MEDIA_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should resolve media resources URLs', function(done) {
      var expectedSmallImageUri = 'smallImageUri';
      var expectedLargeImageUri = 'largeImageUri';
      var expectedTagFileUri = 'tagFileUri';
      var expectedSourceUri = 'sourceUri';
      var expectedThumbnailUri = 'thumbnailUri';
      expectedPois = [
        {
          id: 'tagId',
          file: {
            url: expectedTagFileUri
          }
        }
      ];
      expectedMedias = [
        {
          id: 42,
          type: TYPES.LOCAL,
          state: STATES.PUBLISHED,
          timecodes: [
            {
              value: 42000,
              image: {
                small: {
                  url: expectedSmallImageUri,
                  x: 0,
                  y: 0
                },
                large: expectedLargeImageUri
              }
            }
          ],
          tags: [expectedPois[0].id],
          sources: [
            {
              files: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ],
          thumbnail: expectedThumbnailUri
        }
      ];

      request.params.id = expectedMedias[0].id;

      response.send = function(data) {
        assert.strictEqual(
          data.entity.thumbnail,
          coreApi.getCdnUrl() + expectedThumbnailUri,
          'Wrong thumbnail'
        );
        assert.strictEqual(
          data.entity.timecodes[0].image.small.url,
          coreApi.getCdnUrl() + expectedSmallImageUri,
          'Wrong small timecode'
        );
        assert.strictEqual(
          data.entity.timecodes[0].image.large,
          coreApi.getCdnUrl() + expectedLargeImageUri,
          'Wrong large timecode'
        );
        assert.strictEqual(
          data.entity.tags[0].file.url,
          coreApi.getCdnUrl() + expectedTagFileUri,
          'Wrong tag file'
        );
        assert.strictEqual(
          data.entity.sources[0].files[0].link,
          coreApi.getCdnUrl() + expectedSourceUri,
          'Wrong source link'
        );
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should resolve Wowza media links', function(done) {
      var expectedSourceUri = 'media-id/manifest.mpd';
      expectedMedias = [
        {
          id: 42,
          type: TYPES.WOWZA,
          state: STATES.PUBLISHED,
          sources: [
            {
              adaptive: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ]
        }
      ];

      request.params.id = expectedMedias[0].id;

      response.send = function(data) {
        assert.strictEqual(
          data.entity.sources[0].adaptive[0].link,
          videoPlatformConf.wowza.streamPath + expectedSourceUri,
          'Wrong source link'
        );
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should not exclude "metadata" property', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      request.params.id = expectedMedias[0].id;
      request.query.exclude = ['metadata'];
      request.query.include = ['metadata'];

      VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        assert.notInclude(fields.exclude,
          'metadata',
          'Unexpected excluded field "metadata"'
        );
        assert.include(fields.include,
          'metadata',
          'Expected "metadata" field to be included'
        );
        callback(null, expectedMedias[0]);
      });

      response.send = function(data) {
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

  });

  describe('addEntityAction', function() {
    var expectedMediaId = '42';
    var publishManagerListener;

    beforeEach(function() {
      expectedUser = '42';
      MultipartParser.prototype.parse = function(callback) {
        request.files = {
          file: [
            {
              path: 'pathToVideoFile'
            }
          ]
        };
        callback();
      };

      openVeoApi.util.validateFiles = function(fields, descriptor, callback) {
        callback(null, {
          file: {
            isValid: true
          }
        });
      };

      PublishManager.on = function(event, listener) {
        publishManagerListener = listener;
      };

      PublishManager.publish = function(media) {
        media.id = expectedMediaId;
        publishManagerListener(media);
      };

      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: null,
        platform: TYPES.LOCAL,
        user: expectedUser
      });
    });

    it('should add a media with an attached video', function(done) {
      var expectedInfo;
      var expectedGroupId = '42';
      var expectedCategoryId = '43';

      expectedGroups = [
        {
          id: expectedGroupId
        }
      ];
      expectedCategories = [
        {
          id: expectedCategoryId
        }
      ];
      expectedProperties = [
        {
          id: 'property1',
          name: 'Property 1',
          description: 'Property 1 description',
          type: PropertyProvider.TYPES.TEXT
        }
      ];

      expectedInfo = {
        properties: {
          property1: 'value1'
        },
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [expectedGroupId],
        category: expectedCategoryId,
        platform: TYPES.LOCAL,
        user: expectedUser
      };
      request.body.info = JSON.stringify(expectedInfo);

      MultipartParser.prototype.parse = function(callback) {
        assert.deepInclude(expectedFiles, {
          name: 'file',
          destinationPath: publishConf.videoTmpDir,
          maxCount: 1,
          unique: true
        }, 'Wrong file');
        assert.deepInclude(expectedFiles, {
          name: 'thumbnail',
          destinationPath: publishConf.videoTmpDir,
          maxCount: 1
        }, 'Wrong thumbnail');

        request.files = {
          file: [
            {
              path: 'pathToVideoFile'
            }
          ]
        };
        callback();
      };

      openVeoApi.util.validateFiles = function(fields, descriptor, callback) {
        assert.equal(fields.file, request.files.file[0].path, 'Wrong file path');
        assert.deepEqual(
          descriptor.file.in,
          [api.fileSystem.FILE_TYPES.MP4, api.fileSystem.FILE_TYPES.TAR],
          'Wrong file validator'
        );
        callback(null, {
          file: {
            isValid: true
          }
        });
      };

      response.send = function(data) {
        assert.equal(data.id, expectedMediaId, 'Wrong media id');
        PublishManager.publish.should.have.been.called.exactly(1);
        done();
      };

      PublishManager.publish = chai.spy(function(videoPackage) {
        assert.equal(videoPackage.title, expectedInfo.title, 'Wrong title');
        assert.equal(videoPackage.date, expectedInfo.date, 'Wrong date');
        assert.equal(videoPackage.leadParagraph, expectedInfo.leadParagraph, 'Wrong lead paragraph');
        assert.equal(videoPackage.description, expectedInfo.description, 'Wrong description');
        assert.deepEqual(videoPackage.groups, [expectedGroupId], 'Wrong groups');
        assert.equal(videoPackage.category, expectedCategoryId, 'Wrong category');
        assert.equal(videoPackage.user, expectedUser, 'Wrong owner');
        assert.equal(videoPackage.type, expectedInfo.platform, 'Wrong platform');
        assert.deepEqual(videoPackage.properties, expectedInfo.properties, 'Wrong properties');
        assert.equal(videoPackage.originalPackagePath, request.files.file[0].path, 'Wrong original package path');
        assert.equal(
          videoPackage.originalFileName,
          path.parse(request.files.file[0].path).name,
          'Wrong original file name'
        );
        videoPackage.id = expectedMediaId;
        publishManagerListener(videoPackage);
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should set video owner to the authenticated user if owner is not specified', function(done) {
      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: null,
        platform: TYPES.LOCAL
      });

      response.send = function(data) {
        PublishManager.publish.should.have.been.called.exactly(1);
        done();
      };

      PublishManager.publish = chai.spy(function(videoPackage) {
        assert.equal(videoPackage.user, request.user.id, 'Wrong user');
        videoPackage.id = expectedMediaId;
        publishManagerListener(videoPackage);
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next function with an error if body is missing', function(done) {
      request.body = null;

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if getting groups failed', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      coreApi.groupProvider.getAll = function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_GROUPS_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if getting custom properties failed', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      PropertyProvider.prototype.getAll = function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_CUSTOM_PROPERTIES_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if parsing body failed', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      MultipartParser.prototype.parse = function(callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_PARSE_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if info is not specified', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = null;

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_MISSING_INFO_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if file is not specified', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      MultipartParser.prototype.parse = function(callback) {
        request.files = null;
        callback();
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_MISSING_FILE_PARAMETER, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if validating file failed', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      openVeoApi.util.validateFiles = function(fields, descriptor, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if file is not valid', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      openVeoApi.util.validateFiles = function(fields, descriptor, callback) {
        callback(null, {
          file: {
            isValid: false
          }
        });
      };

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_FILE_PARAMETER, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if title is not specified', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        properties: {},
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: null
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if a group is not part of existing groups', function(done) {
      expectedGroups = [
        {
          id: '42'
        }
      ];
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: ['Wrong group id'],
        category: null
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if a category is not part of existing categories', function(done) {
      expectedCategories = [
        {
          id: '42'
        }
      ];
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: ['Wrong category id']
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if platform is not part of existing platforms', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        title: 'Title',
        platform: 'Wrong platform'
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should remove uploaded file if something went wrong', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: ['Make it goes wrong']
      });

      fs.unlink = chai.spy(function(filePath, callback) {
        assert.equal(filePath, request.files.file[0].path, 'Wrong path');
        callback();
      });

      videoController.addEntityAction(request, response, function(error) {
        fs.unlink.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next function with an error if removing file failed', function(done) {
      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: ['Make it goes wrong']
      });

      fs.unlink = chai.spy(function(filePath, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_REMOVE_FILE_ERROR, 'Wrong error');
        fs.unlink.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should set owner to super administrator if request comes from the web service and no owner is specified',
      function(done) {
        request.user.type = 'oAuthClient';

        request.body.info = JSON.stringify({
          properties: {},
          title: 'Title',
          date: Date.now(),
          leadParagraph: 'Lead paragraph',
          description: 'Description',
          groups: [],
          category: null,
          platform: TYPES.LOCAL
        });

        response.send = function(data) {
          PublishManager.publish.should.have.been.called.exactly(1);
          done();
        };

        PublishManager.publish = chai.spy(function(videoPackage) {
          assert.equal(videoPackage.user, process.api.getCoreApi().getSuperAdminId(), 'Wrong user');
          videoPackage.id = expectedMediaId;
          publishManagerListener(videoPackage);
        });

        videoController.addEntityAction(request, response, function(error) {
          assert.ok(false, 'Unexpected call to next function');
        });
      }
    );

    it('should execute next function with an error if specified user does not exist', function(done) {
      expectedUser = null;

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        title: 'Title',
        user: '42'
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_WRONG_USER_PARAMETER, 'Wrong error');
        coreApi.userProvider.getOne.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next function with an error if verifying owner failed', function(done) {
      expectedUser = '42';

      response.send = function(data) {
        assert.ok(false, 'Unexpected response');
      };

      request.body.info = JSON.stringify({
        title: 'Title',
        user: expectedUser
      });

      coreApi.userProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.addEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.ADD_MEDIA_VERIFY_OWNER_ERROR, 'Wrong error');
        coreApi.userProvider.getOne.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('updateEntityAction', function() {
    var expectedInfo;

    beforeEach(function() {
      expectedMedias = [
        {
          id: '42',
          type: TYPES.LOCAL
        }
      ];
      expectedInfo = {
        properties: {},
        title: 'Title',
        date: Date.now(),
        leadParagraph: 'Lead paragraph',
        description: 'Description',
        groups: [],
        category: null
      };
      MultipartParser.prototype.parse = function(callback) {
        request.files = {
          thumbnail: [
            {
              path: 'pathToVideoThumbnail'
            }
          ]
        };
        callback();
      };

      openVeoApi.util.validateFiles = function(fields, descriptor, callback) {
        callback(null, {
          thumbnail: {
            isValid: true
          }
        });
      };

      request.body.info = JSON.stringify(expectedInfo);

      request.params.id = '42';

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        return true;
      });
    });

    it('should update information about a media', function(done) {
      MultipartParser.prototype.parse = function(callback) {
        request.files = {};
        callback();
      };

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          request.params.id,
          'Wrong id'
        );
        assert.deepEqual(modifications.properties, expectedInfo.properties, 'Wrong properties');
        assert.equal(modifications.title, expectedInfo.title, 'Wrong title');
        assert.equal(modifications.date, expectedInfo.date, 'Wrong date');
        assert.equal(modifications.leadParagraph, expectedInfo.leadParagraph, 'Wrong lead paragraph');
        assert.equal(modifications.description, expectedInfo.description, 'Wrong description');
        assert.deepEqual(modifications.groups, expectedInfo.groups, 'Wrong groups');
        assert.equal(modifications.category, expectedInfo.category, 'Wrong category');
        callback(null, 1);
      });

      response.send = function(data) {
        videoController.isUserAuthorized.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error, total) {
        assert.ok(false, 'Unexpected call to next function');
        assert.equal(total, 1, 'Wrong total');
        done();
      });
    });

    it('should be able to update the media thumbnail', function(done) {
      MultipartParser.prototype.parse = function(callback) {
        assert.deepInclude(expectedFiles, {
          name: 'thumbnail',
          destinationPath: publishConf.videoTmpDir,
          maxCount: 1
        }, 'Wrong thumbnail');
        request.files = {
          thumbnail: [
            {
              path: 'pathToVideoThumbnail'
            }
          ]
        };
        callback();
      };

      openVeoApi.util.validateFiles = chai.spy(function(fields, descriptor, callback) {
        assert.equal(fields.thumbnail, request.files.thumbnail[0].path, 'Wrong thumbnail path');
        assert.deepEqual(
          descriptor.thumbnail.in,
          [api.fileSystem.FILE_TYPES.JPG],
          'Wrong thumbnail validator'
        );
        callback(null, {
          thumbnail: {
            isValid: true
          }
        });
      });

      openVeoApi.fileSystem.copy = chai.spy(function(filePath, destinationPath, callback) {
        assert.equal(
          destinationPath,
          path.join(process.rootPublish, 'assets/player/videos/', request.params.id, 'thumbnail.jpg'),
          'Wrong thumbnail path'
        );
        callback();
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          modifications.thumbnail,
          '/publish/' + request.params.id + '/thumbnail.jpg',
          'Wrong thumbnail path'
        );
        callback(null, 1);
      });

      response.send = function(data) {
        videoController.isUserAuthorized.should.have.been.called.exactly(1);
        openVeoApi.util.validateFiles.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        coreApi.clearImageCache.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.rm.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error, total) {
        assert.ok(false, 'Unexpected call to next function');
        done();
      });
    });

    it('should not be able to update the media owner if not the owner', function(done) {
      request.user.id = 'Not the owner';
      expectedInfo.user = 'newUserId';
      request.body.info = JSON.stringify(expectedInfo);

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.notProperty(modifications, 'user', 'Unexpected user');
        callback(null, 1);
      });

      response.send = function(data) {
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error, total) {
        assert.ok(false, 'Unexpected call to next function');
        done();
      });
    });

    it('should be able to update the media owner as the super administrator', function(done) {
      request.user.id = superAdminId;
      expectedInfo.user = 'newUserId';
      request.body.info = JSON.stringify(expectedInfo);

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(modifications.user, expectedInfo.user, 'Unexpected user');
        callback(null, 1);
      });

      response.send = function(data) {
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error, total) {
        assert.ok(false, 'Unexpected call to next function');
        done();
      });
    });

    it('should be able to update the media owner as a manager', function(done) {
      request.user.permissions = ['publish-manage-videos'];
      expectedInfo.user = 'newUserId';
      request.body.info = JSON.stringify(expectedInfo);

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(modifications.user, expectedInfo.user, 'Wrong user');
        callback(null, 1);
      });

      response.send = function(data) {
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error, total) {
        assert.ok(false, 'Unexpected call to next function');
        done();
      });
    });

    it('should execute next function with an error if parsing body failed', function(done) {
      MultipartParser.prototype.parse = function(callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_PARSE_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if getting media failed', function(done) {
      VideoProvider.prototype.getOne = function(filter, fields, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_GET_ONE_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if media does not exist', function(done) {
      VideoProvider.prototype.getOne = function(filter, fields, callback) {
        callback();
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_NOT_FOUND_ERROR, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if user is not authorized to update media', function(done) {
      videoController.isUserAuthorized = function(user, media, operation) {
        assert.strictEqual(user, request.user, 'Wrong user');
        assert.strictEqual(media, expectedMedias[0], 'Wrong media');
        assert.equal(operation, openVeoApi.controllers.ContentController.OPERATIONS.UPDATE, 'Wrong operation');
        return false;
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_FORBIDDEN, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if id is missing', function(done) {
      request.params.id = null;
      request.body = {};

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if body is missing', function(done) {
      request.params.id = '42';
      request.body = null;

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should execute next function with an error if updating media failed', function(done) {
      VideoProvider.prototype.updateOne = function(filter, modifications, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UPDATE_MEDIA_ERROR, 'Wrong error');
        done();
      });
    });

    it('should synchronize the media with the media platform', function(done) {
      expectedInfo = {
        title: 'Media title'
      };
      expectedMedias = [
        {
          id: '42',
          type: TYPES.LOCAL,
          mediaId: ['42']
        }
      ];
      request.body.info = JSON.stringify(expectedInfo);
      request.params.id = '42';

      MultipartParser.prototype.parse = function(callback) {
        request.files = {};
        callback();
      };

      mediaPlatformProvider.update = chai.spy(function(media, datas, force, callback) {
        assert.equal(media.id, request.params.id, 'Wrong media id');
        assert.deepEqual(datas, expectedInfo, 'Wrong datas');
        callback();
      });

      mediaPlatformFactory.get = function(type, configuration) {
        assert.equal(type, expectedMedias[0].type, 'Wrong type');
        assert.strictEqual(configuration, videoPlatformConf[expectedMedias[0].type], 'Wrong configuration');
        return mediaPlatformProvider;
      };

      response.send = function(datas) {
        mediaPlatformProvider.update.should.have.been.called.exactly(1);
        done();
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.isUndefined(error, 'Unexpected error');
      });
    });

    it('should not synchronize the media with the media platform if no platform', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];
      expectedInfo = {
        title: 'Media title'
      };
      request.body.info = JSON.stringify(expectedInfo);
      request.params.id = '42';

      MultipartParser.prototype.parse = function(callback) {
        request.files = {};
        callback();
      };

      response.send = function(datas) {
        mediaPlatformProvider.update.should.have.been.called.exactly(0);
        done();
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.isUndefined(error, 'Unexpected error');
      });
    });

    it('should not synchronize the media with the media platform if no media id', function(done) {
      expectedMedias = [
        {
          id: '42',
          type: TYPES.LOCAL
        }
      ];
      expectedInfo = {
        title: 'Media title'
      };
      request.body.info = JSON.stringify(expectedInfo);
      request.params.id = '42';

      MultipartParser.prototype.parse = function(callback) {
        request.files = {};
        callback();
      };

      response.send = function(datas) {
        mediaPlatformProvider.update.should.have.been.called.exactly(0);
        done();
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.isUndefined(error, 'Unexpected error');
      });
    });

    it('should execute next function with an error if synchronizing the media failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          type: TYPES.LOCAL,
          mediaId: ['42']
        }
      ];
      request.body.info = JSON.stringify(expectedInfo);
      request.params.id = '42';

      mediaPlatformProvider.update = chai.spy(function(media, datas, force, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(datas) {
        assert.ok(false, 'Unexpected response');
      };

      videoController.updateEntityAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.UPDATE_MEDIA_SYNCHRONIZE_ERROR, 'Wrong error');
        done();
      });
    });

  });

  describe('getEntitiesAction', function() {

    it('should be able to respond with the first page of medias and pagination', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {};

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'metadata.user').value,
          [request.user.id, anonymousId],
          'Wrong filter'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.SEARCH),
          'Unexpected search query'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.SCORE),
          'Unexpected score'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.REGEX),
          'Unexpected regex'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.IN, 'state'),
          'Unexpected state'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.LESSER_THAN, 'date'),
          'Unexpected date'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.GREATER_THAN_EQUAL, 'date'),
          'Unexpected date'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.IN, 'category'),
          'Unexpected category'
        );
        assert.notOk(
          filter.hasOperation(ResourceFilter.OPERATORS.IN, 'metadata.groups'),
          'Unexpected groups'
        );
        assert.isUndefined(fields.include, 'Unexpected include');
        assert.isUndefined(fields.exclude, 'Unexpected exclude');
        assert.isUndefined(limit, 'Unexpected limit');
        assert.equal(page, 0, 'Unexpected page');
        assert.deepEqual(sort, {date: 'desc'}, 'Unexpected sort');
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias, 'Wrong medias');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should be able to search by indexed fields', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {query: 'search text'};
      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.SEARCH).value,
          '"' + request.query.query + '"',
          'Wrong search operation'
        );
        assert.propertyVal(sort, 'score', 'score', 'Wrong score sort');
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias, 'Wrong medias');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should be able to search by both media indexed fields and points of interest indexed fields', function(done) {
      request.query = {query: 'search text', searchInPois: 1};
      expectedMedias = [{id: '42'}];
      expectedPois = [{id: '43'}];

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(null, expectedPois);
      });

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        var orOperation = filter.getLogicalOperation(ResourceFilter.OPERATORS.OR);
        var searchFilter = orOperation.filters[0];
        var searchInChaptersFilter = orOperation.filters[1];
        var searchInTagsFilter = orOperation.filters[2];

        assert.equal(
          searchFilter.getComparisonOperation(ResourceFilter.OPERATORS.SEARCH).value,
          '"' + request.query.query + '"',
          'Wrong search operation'
        );
        assert.sameMembers(
          searchInChaptersFilter.getComparisonOperation(ResourceFilter.OPERATORS.IN).value,
          [expectedPois[0].id],
          'Wrong search in chapters operation'
        );
        assert.sameMembers(
          searchInTagsFilter.getComparisonOperation(ResourceFilter.OPERATORS.IN).value,
          [expectedPois[0].id],
          'Wrong search in tags operation'
        );

        assert.propertyVal(sort, 'score', 'score', 'Wrong score sort');

        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias, 'Wrong medias');
        assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if searching in points of interest failed', function(done) {
      request.query = {query: 'search text', searchInPois: 1};
      expectedMedias = [{id: '42'}];
      expectedPois = [{id: '43'}];

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.ok(false, 'Unexpected call to send');
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_SEARCH_IN_POIS_ERROR, 'Wrong error');
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        VideoProvider.prototype.get.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should be able to deactivate the smart search', function(done) {
      var expectedQuery = '42';
      expectedMedias = [{id: 42}];
      request.query = {query: expectedQuery, useSmartSearch: 0};

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.REGEX, 'title').value,
          '/' + expectedQuery + '/i',
          'Wrong operation on "title"'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.REGEX, 'description').value,
          '/' + expectedQuery + '/i',
          'Wrong operation on "description"'
        );
        assert.notOk(filter.hasOperation(ResourceFilter.OPERATORS.SEARCH, 'Unexpected search operation'));
        assert.notOk(filter.hasOperation(ResourceFilter.OPERATORS.SCORE, 'Unexpected score operation'));
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should be able to sort results by either title, description, date, state, views or category', function(done) {
      var asyncActions = [];
      var orderedProperties = ['title', 'description', 'date', 'state', 'views', 'category'];
      expectedMedias = [{id: 42}];

      function test(property, order, callback) {
        request.query = {sortOrder: order, sortBy: property};
        VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
          assert.equal(sort[property], order, 'Unexpected ' + property + ' ' + order + ' sort');
          callback(null, expectedMedias, expectedPagination);
        };

        response.send = function(data) {
          assert.strictEqual(data.entities, expectedMedias, 'Wrong medias');
          assert.strictEqual(data.pagination, expectedPagination, 'Wrong pagination');
          callback();
        };

        videoController.getEntitiesAction(request, response, function() {
          assert.ok(false, 'Unexpected call to next for property=' + property + ' and order=' + order);
        });
      }

      orderedProperties.forEach(function(property) {
        asyncActions.push(function(callback) {
          test(property, 'asc', callback);
        });
        asyncActions.push(function(callback) {
          test(property, 'desc', callback);
        });
      });

      async.parallel(asyncActions, function() {
        done();
      });
    });

    it('should be able to exclude fields from results', function(done) {
      request.query = {exclude: ['field1']};

      VideoProvider.prototype.get = function(filter, fields, page, limit, sort, callback) {
        assert.deepEqual(fields.exclude, request.query.exclude, 'Wrong excluded fields');
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should be able to include fields in results', function(done) {
      request.query = {include: ['field1']};

      VideoProvider.prototype.get = function(filter, fields, page, limit, sort, callback) {
        assert.deepEqual(fields.include, request.query.include.concat(['metadata']), 'Wrong included fields');
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should not exclude "metadata" property', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {exclude: ['metadata'], include: ['field']};

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        assert.notInclude(
          fields.exclude,
          'metadata',
          'Unexpected excluded field "metadata"'
        );
        assert.include(
          fields.include,
          'metadata',
          'Expected field "metadata" to be included'
        );
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.equal(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if sortBy property is not valid', function(done) {
      request.query = {sortBy: 'wrong property'};
      VideoProvider.prototype.get = function() {
        assert.ok(false, 'Unexpected call to get');
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_WRONG_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if sortOrder value is not valid', function(done) {
      request.query = {sortOrder: 'wrong order'};
      VideoProvider.prototype.get = function() {
        assert.ok(false, 'Unexpected call to get');
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_WRONG_PARAMETERS);
        done();
      });
    });

    it('should be able to filter results by states', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {states: [STATES.PENDING]};

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'state').value,
          request.query.states,
          'Unexpected filters'
        );
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should be able to filter results by category', function(done) {
      var expectedCategoryIds = ['42', '43'];
      request.query = {categories: expectedCategoryIds[0]};
      expectedMedias = [{id: '44'}];
      expectedCategories = [
        {
          id: expectedCategoryIds[0],
          items: [
            {
              id: expectedCategoryIds[1]
            }
          ]
        }
      ];

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'category').value,
          expectedCategoryIds,
          'Unexpected filters'
        );
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should be able to filter results by groups', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {groups: ['42']};

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'metadata.groups').value,
          request.query.groups,
          'Unexpected filters'
        );
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should be able to filter results by owners', function(done) {
      expectedMedias = [{id: 42}];
      request.query = {user: ['40']};

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'metadata.user').value,
          request.query.user,
          'Unexpected filters'
        );
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should be able to filter results by date', function(done) {
      expectedMedias = [{id: 42}];
      var expectedStartDate = '01/19/2017';
      var expectedEndDate = '02/20/2017';
      request.query = {dateStart: expectedStartDate, dateEnd: '02/20/2017'};

      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.GREATER_THAN_EQUAL, 'date').value,
          new Date(expectedStartDate).getTime(),
          'Unexpected start date filter'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.LESSER_THAN_EQUAL, 'date').value,
          new Date(expectedEndDate).getTime(),
          'Unexpected end date filter'
        );
        callback(null, expectedMedias, expectedPagination);
      };

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should be able to filter results by custom properties', function(done) {
      var date = new Date();
      var expectedStartDate = new Date(date);
      expectedStartDate.setHours(0);
      expectedStartDate.setMinutes(0);
      expectedStartDate.setSeconds(0);
      expectedStartDate.setMilliseconds(0);

      var expectedEndDate = new Date(expectedStartDate);
      expectedEndDate.setDate(expectedStartDate.getDate() + 1);

      var expectedQueryProperties = {};
      expectedMedias = [{id: 42}];
      expectedProperties = [
        {
          id: 'property1',
          name: 'Property 1',
          description: 'Property 1 description',
          type: PropertyProvider.TYPES.TEXT
        },
        {
          id: 'property2',
          name: 'Property 2',
          description: 'Property 2 description',
          type: PropertyProvider.TYPES.LIST
        },
        {
          id: 'property3',
          name: 'Property 3',
          description: 'Property 3 description',
          type: PropertyProvider.TYPES.BOOLEAN
        },
        {
          id: 'property4',
          name: 'Property 4',
          description: 'Property 4 description',
          type: PropertyProvider.TYPES.DATE_TIME
        }
      ];
      expectedQueryProperties[expectedProperties[0].id] = 'value1';
      expectedQueryProperties[expectedProperties[1].id] = 'value2';
      expectedQueryProperties[expectedProperties[2].id] = 1;
      expectedQueryProperties[expectedProperties[3].id] = date.getTime();
      request.query = {properties: expectedQueryProperties};

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        assert.equal(
          filter.getComparisonOperation(
            ResourceFilter.OPERATORS.EQUAL,
            'properties.' + expectedProperties[0].id
          ).value,
          expectedQueryProperties[expectedProperties[0].id],
          'Wrong property ' + expectedProperties[0].id
        );
        assert.equal(
          filter.getComparisonOperation(
            ResourceFilter.OPERATORS.EQUAL,
            'properties.' + expectedProperties[1].id
          ).value,
          expectedQueryProperties[expectedProperties[1].id],
          'Wrong property ' + expectedProperties[1].id
        );
        assert.ok(
          filter.getComparisonOperation(
            ResourceFilter.OPERATORS.EQUAL,
            'properties.' + expectedProperties[2].id
          ).value,
          'Wrong property ' + expectedProperties[2].id
        );
        assert.equal(
          filter.getComparisonOperation(
            ResourceFilter.OPERATORS.GREATER_THAN_EQUAL,
            'properties.' + expectedProperties[3].id
          ).value,
          expectedStartDate.getTime(),
          'Wrong property ' + expectedProperties[3].id
        );
        assert.equal(
          filter.getComparisonOperation(
            ResourceFilter.OPERATORS.LESSER_THAN,
            'properties.' + expectedProperties[3].id
          ).value,
          expectedEndDate.getTime(),
          'Wrong property ' + expectedProperties[3].id
        );
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        PropertyProvider.prototype.getAll.should.have.been.called.exactly(1);
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should ignore unknown custom properties', function(done) {
      var expectedQueryProperties = {};
      var propertyId = 'unknownProperty';
      expectedMedias = [{id: 42}];
      expectedQueryProperties[propertyId] = 'value1';
      request.query = {properties: expectedQueryProperties};

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        assert.isNull(filter.getComparisonOperation(
          ResourceFilter.OPERATORS.EQUAL,
          'properties.' + propertyId
        ));
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        assert.strictEqual(data.entities, expectedMedias);
        assert.strictEqual(data.pagination, expectedPagination);
        PropertyProvider.prototype.getAll.should.have.been.called.exactly(1);
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should execute next with an error if a custom property value is not valid', function(done) {
      var expectedQueryProperties = {};
      expectedMedias = [{id: 42}];
      expectedProperties = [
        {
          id: 'property1',
          name: 'Property 1',
          description: 'Property 1 description',
          type: PropertyProvider.TYPES.DATE_TIME
        }
      ];
      expectedQueryProperties[expectedProperties[0].id] = {};
      request.query = {properties: expectedQueryProperties};

      response.send = function(data) {
        assert.ok(false, 'Unexpected call to send');
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_CUSTOM_PROPERTIES_WRONG_PARAMETERS, 'Wrong error');
        VideoProvider.prototype.get.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if getting categories failed', function(done) {
      request.query = {categories: ['42']};
      expectedMedias = [{id: 43}];

      coreApi.taxonomyProvider.getTaxonomyTerms = function(name, callback) {
        callback(new Error('Something went wrong'));
      };

      response.send = function(data) {
        assert.ok(false, 'Unexpected call to send');
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_GET_CATEGORIES_ERROR, 'Wrong error');
        VideoProvider.prototype.get.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should call next with an error if a getting medias failed', function(done) {
      VideoProvider.prototype.get = function(filter, fields, limit, page, sort, callback) {
        callback(new Error('Something went wrong'));
      };
      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_ERROR);
        done();
      });
    });

    it('should populate medias with points of interest if any chapters / tags', function(done) {
      var expectedMediaId = '42';
      var poiFileDestinationPath = path.join(process.rootPublish, 'assets/player/videos', expectedMediaId, 'uploads');
      var expectedTagFileName = 'tagFileName.jpg';
      var expectedTag = {
        id: '1',
        name: 'Tag name',
        description: 'Tag description',
        value: 1000,
        file: {
          originalName: 'tagOriginalName.jpg',
          mimeType: 'image/jpeg',
          fileName: expectedTagFileName,
          size: 42,
          url: 'tagFileUri',
          path: path.join(poiFileDestinationPath, expectedTagFileName)
        }
      };
      var expectedChapter = {
        id: '2',
        name: 'Chapter name',
        description: 'Chapter description',
        value: 2000
      };
      expectedMedias = [
        {
          id: expectedMediaId,
          tags: ['1'],
          chapters: ['2']
        }
      ];

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          expectedMedias[0].tags.concat(expectedMedias[0].chapters),
          'Wrong points of interest'
        );

        callback(null, [expectedTag, expectedChapter]);
      });

      response.send = function(data) {
        var media = data.entities[0];
        assert.lengthOf(media.tags, 1, 'Wrong number of tags');
        assert.lengthOf(media.chapters, 1, 'Wrong number of chapters');

        assert.equal(media.tags[0].id, expectedTag.id, 'Wrong tag id');
        assert.equal(media.tags[0].name, expectedTag.name, 'Wrong tag name');
        assert.equal(media.tags[0].description, expectedTag.description, 'Wrong tag description');
        assert.equal(media.tags[0].value, expectedTag.value, 'Wrong tag value');
        assert.equal(media.tags[0].file.originalName, expectedTag.file.originalName, 'Wrong tag file original name');
        assert.equal(media.tags[0].file.mimeType, expectedTag.file.mimeType, 'Wrong tag file mime type');
        assert.equal(media.tags[0].file.fileName, expectedTag.file.fileName, 'Wrong tag file name');
        assert.equal(media.tags[0].file.size, expectedTag.file.size, 'Wrong tag file size');
        assert.equal(media.tags[0].file.url, expectedTag.file.url, 'Wrong tag file URL');
        assert.isUndefined(media.tags[0].file.path, 'Unexpected tag file path');
        assert.isUndefined(media.tags[0]._id, 'Unexpected tag internal id');

        assert.equal(media.chapters[0].id, expectedChapter.id, 'Wrong chapter id');
        assert.equal(media.chapters[0].name, expectedChapter.name, 'Wrong chapter name');
        assert.equal(media.chapters[0].description, expectedChapter.description, 'Wrong chapter description');
        assert.equal(media.chapters[0].value, expectedChapter.value, 'Wrong chapter value');
        assert.isUndefined(media.chapters[0]._id, 'Unexpected chapter internal id');

        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should not populate medias with points of interest if filtered', function(done) {
      request.query.exclude = ['tags', 'chapters'];
      expectedPois = [
        {
          id: '1',
          name: 'Tag name',
          description: 'Tag description',
          value: 1000
        },
        {
          id: '2',
          name: 'Chapter name',
          description: 'Chapter description',
          value: 2000
        }
      ];
      expectedMedias = [
        {
          id: '42',
          tags: [expectedPois[0].id],
          chapters: [expectedPois[1].id]
        }
      ];

      VideoProvider.prototype.get = chai.spy(function(filter, fields, limit, page, sort, callback) {
        delete expectedMedias[0].tags;
        delete expectedMedias[0].chapters;
        callback(null, expectedMedias, expectedPagination);
      });

      response.send = function(data) {
        var media = data.entities[0];
        assert.isUndefined(media.tags, 'Unexpected tags');
        assert.isUndefined(media.chapters, 'Unexpected chapters');
        done();
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if populating with points of interest failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          tags: ['1']
        }
      ];

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      response.send = function(data) {
        assert.fail('Unexpected response');
      };

      videoController.getEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.GET_VIDEOS_POPULATE_WITH_POIS_ERROR, 'Wrong error');
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should get information about media associated properties', function(done) {
      var expectedPropertiesValues = {
        property1: 'value1'
      };
      expectedMedias = [
        {
          id: 42,
          properties: expectedPropertiesValues
        }
      ];
      expectedProperties = [
        {
          id: 'property1',
          name: 'Name',
          description: 'Description',
          type: 'type'
        }
      ];

      response.send = function(data) {
        var customProperty = data.entities[0].properties[expectedProperties[0].id];
        assert.equal(customProperty.id, expectedProperties[0].id, 'Wrong id');
        assert.equal(customProperty.name, expectedProperties[0].name, 'Wrong name');
        assert.equal(customProperty.description, expectedProperties[0].description, 'Wrong description');
        assert.equal(customProperty.type, expectedProperties[0].type, 'Wrong type');
        assert.equal(customProperty.value, expectedPropertiesValues[expectedProperties[0].id], 'Wrong value');
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });

    it('should resolve medias resources URLs', function(done) {
      var expectedSmallImageUri = 'smallImageUri';
      var expectedLargeImageUri = 'largeImageUri';
      var expectedTagFileUri = 'tagFileUri';
      var expectedSourceUri = 'sourceUri';
      var expectedAdaptiveSourceUri = 'media-id/manifest.mpd';
      var expectedThumbnailUri = 'thumbnailUri';
      expectedPois = [
        {
          id: 'tagId',
          file: {
            url: expectedTagFileUri
          }
        }
      ];
      expectedMedias = [
        {
          id: 42,
          type: TYPES.LOCAL,
          timecodes: [
            {
              value: 42000,
              image: {
                small: {
                  url: expectedSmallImageUri,
                  x: 0,
                  y: 0
                },
                large: expectedLargeImageUri
              }
            }
          ],
          tags: [expectedPois[0].id],
          sources: [
            {
              files: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ],
          thumbnail: expectedThumbnailUri
        },
        {
          id: 43,
          type: TYPES.WOWZA,
          sources: [
            {
              adaptive: [
                {
                  link: expectedAdaptiveSourceUri
                }
              ]
            }
          ]
        }
      ];

      response.send = function(data) {
        assert.strictEqual(
          data.entities[0].thumbnail,
          coreApi.getCdnUrl() + expectedThumbnailUri,
          'Wrong thumbnail'
        );
        assert.strictEqual(
          data.entities[0].timecodes[0].image.small.url,
          coreApi.getCdnUrl() + expectedSmallImageUri,
          'Wrong small timecode'
        );
        assert.strictEqual(
          data.entities[0].timecodes[0].image.large,
          coreApi.getCdnUrl() + expectedLargeImageUri,
          'Wrong large timecode'
        );
        assert.strictEqual(
          data.entities[0].tags[0].file.url,
          coreApi.getCdnUrl() + expectedTagFileUri,
          'Wrong tag file'
        );
        assert.strictEqual(
          data.entities[0].sources[0].files[0].link,
          coreApi.getCdnUrl() + expectedSourceUri,
          'Wrong source link'
        );
        assert.strictEqual(
          data.entities[1].sources[0].adaptive[0].link,
          videoPlatformConf.wowza.streamPath + expectedAdaptiveSourceUri,
          'Wrong adaptive source link'
        );
        done();
      };

      videoController.getEntitiesAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next');
      });
    });
  });

  describe('publishVideosAction', function() {

    it('should be able to publish a media (changing its state to published)', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.READY
        }
      ];

      request.params.ids = expectedMedias[0].id;

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        assert.equal(operation, api.controllers.ContentController.OPERATIONS.UPDATE, 'Wrong operation');
        assert.deepEqual(media, expectedMedias[0], 'Wrong media');
        assert.deepEqual(user, request.user, 'Wrong user');
        return true;
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.equal(modifications.state, STATES.PUBLISHED, 'Wrong state');
        callback(null, 1);
      });

      response.send = function(data) {
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        videoController.isUserAuthorized.should.have.been.called.exactly(1);
        assert.equal(data.total, expectedMedias.length, 'Wrong total');
        done();
      };

      videoController.publishVideosAction(request, response, function(error) {
        assert.ok(false, 'Unexpected call to next function');
      });

    });

    it('should execute next with an error if medias ids are not provided', function(done) {
      videoController.publishVideosAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.PUBLISH_VIDEOS_MISSING_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if getting medias failed', function(done) {
      request.params.ids = '41,42';

      VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.publishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.PUBLISH_VIDEOS_GET_VIDEOS_ERROR);
        done();
      });
    });

    it('should execute next with an error if user is not authorized to perform this action', function(done) {
      request.params.ids = '41,42';

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        return false;
      });

      videoController.publishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.PUBLISH_VIDEOS_FORBIDDEN);
        done();
      });
    });

    it('should execute next with an error if updating media failed', function(done) {
      expectedMedias = [{id: '42'}];
      request.params.ids = expectedMedias[0].id;

      VideoProvider.prototype.updateOne = function(filter, fields, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.publishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.PUBLISH_VIDEOS_ERROR);
        done();
      });
    });

  });

  describe('unpublishVideosAction', function() {

    it('should be able to unpublish a video', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED
        }
      ];
      request.params.ids = expectedMedias[0].id;

      VideoProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.deepEqual(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          request.params.ids.split(','),
          'Wrong ids'
        );
        callback(null, expectedMedias);
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong id'
        );
        assert.equal(modifications.state, STATES.READY, 'Wrong state');
        callback(null, 1);
      });

      response.send = function(data) {
        VideoProvider.prototype.getAll.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        assert.equal(data.total, expectedMedias.length);
        done();
      };

      videoController.unpublishVideosAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });
    });

    it('should execute next with an error if medias ids are not provided', function(done) {
      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEOS_MISSING_PARAMETERS);
        done();
      });
    });

    it('should execute next with an error if getting medias failed', function(done) {
      request.params.ids = '41,42';

      VideoProvider.prototype.getAll = function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEOS_GET_VIDEOS_ERROR);
        done();
      });
    });

    it('should execute next with an error if user is not authorized to perform this action', function(done) {
      request.params.ids = '41,42';

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        return false;
      });

      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEOS_FORBIDDEN);
        done();
      });
    });

    it('should execute next with an error if updating media failed', function(done) {
      expectedMedias = [{id: '42'}];
      request.params.ids = expectedMedias[0].id;

      VideoProvider.prototype.updateOne = function(filter, fields, callback) {
        callback(new Error('Something went wrong'));
      };

      videoController.unpublishVideosAction(request, response, function(error) {
        assert.equal(error, HTTP_ERRORS.UNPUBLISH_VIDEOS_ERROR);
        done();
      });
    });
  });

  describe('retryVideosAction', function() {

    it('should be able to retry medias processing', function(done) {
      var ids = [];
      var callbacks = [];
      request.params.ids = '41,42';

      PublishManager.once = function(name, callback) {
        callbacks.push(callback);
      };
      PublishManager.retry = function(id) {
        ids.push(id);
      };

      response.send = function() {
        assert.deepEqual(ids, request.params.ids.split(','), 'Wrong ids');
        done();
      };

      videoController.retryVideosAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });

      callbacks.forEach(function(callback) {
        callback();
      });
    });

    it('should call next with an error if medias ids are not provided', function(done) {
      videoController.retryVideosAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.RETRY_VIDEOS_MISSING_PARAMETERS);
        done();
      });
    });
  });

  describe('startUploadAction', function() {

    it('should be able to start uploading medias', function(done) {
      var ids = [];
      var callbacks = [];
      request.params.ids = '41,42';
      request.params.platform = TYPES.WOWZA;

      PublishManager.once = function(name, callback) {
        callbacks.push(callback);
      };
      PublishManager.upload = function(id, platform) {
        ids.push(id);
        assert.equal(platform, request.params.platform, 'Unexpected platform');
      };

      response.send = function() {
        assert.deepEqual(ids, request.params.ids.split(','));
        done();
      };

      videoController.startUploadAction(request, response, function() {
        assert.ok(false, 'Unexpected call to next function');
      });

      callbacks.forEach(function(callback) {
        callback();
      });
    });

    it('should call next with an error if medias ids are not provided', function(done) {
      request.params.platform = TYPES.WOWZA;
      videoController.startUploadAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.START_UPLOAD_VIDEOS_MISSING_PARAMETERS);
        done();
      });
    });

    it('should call next with an error if platform is not provided', function(done) {
      request.params.ids = '41,42';
      videoController.startUploadAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.START_UPLOAD_VIDEOS_MISSING_PARAMETERS);
        done();
      });
    });
  });

  Object.values(POI_TYPE).forEach(function(type) {
    describe(type, function() {

      describe('updatePoiAction', function() {
        var method = type === POI_TYPE.TAGS ? 'updateTagAction' : 'updateChapterAction';

        beforeEach(function() {
          MultipartParser.prototype.parse = chai.spy(function(callback) {
            request.files = {
              file: [
                {
                  originalname: 'poiFileOriginalName',
                  mimetype: 'poiFileMimeType',
                  filename: 'poiFileName',
                  size: 42,
                  path: 'pathToPoiFile'
                }
              ]
            };
            callback();
          });
        });

        it('should update media point of interest if id is specified', function(done) {
          var expectedPoiId = '1';
          var expectedPoi = {
            name: 'Name',
            description: 'Description',
            value: 2000
          };
          var expectedPoiFile = {
            originalname: 'poiFileOriginalName',
            mimetype: 'poiFileMimeType',
            filename: 'poiFileName',
            size: 42,
            path: 'pathToPoiFile'
          };
          expectedMedias = [{
            id: '42'
          }];
          expectedMedias[0][type] = [expectedPoiId];

          request.params.id = expectedMedias[0].id;
          request.params.poiid = expectedPoiId;
          request.body.info = JSON.stringify(expectedPoi);

          MultipartParser.prototype.parse = chai.spy(function(callback) {
            assert.deepInclude(expectedFiles[0], {
              name: 'file',
              destinationPath: path.join(process.rootPublish, 'assets/player/videos', expectedMedias[0].id, 'uploads'),
              maxCount: 1
            }, 'Wrong file');

            request.files = {
              file: [expectedPoiFile]
            };
            callback();
          });

          VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              expectedMedias[0].id,
              'Wrong media id'
            );
            callback(null, expectedMedias[0]);
          });

          PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              request.params.poiid,
              'Wrong point of interest id'
            );

            callback(null, 1);
          });

          response.send = function(result) {
            assert.equal(result.total, 1, 'Wrong total');

            assert.equal(result.poi.name, expectedPoi.name, 'Wrong name');
            assert.equal(result.poi.description, expectedPoi.description, 'Wrong description');
            assert.equal(result.poi.value, expectedPoi.value, 'Wrong value');

            assert.equal(result.poi.file.originalName, expectedPoiFile.originalname, 'Wrong file original name');
            assert.equal(result.poi.file.fileName, expectedPoiFile.filename, 'Wrong file name');
            assert.equal(result.poi.file.mimeType, expectedPoiFile.mimetype, 'Wrong file MIME type');
            assert.equal(result.poi.file.size, expectedPoiFile.size, 'Wrong file size');
            assert.equal(result.poi.file.path, expectedPoiFile.path, 'Wrong file path');

            PoiProvider.prototype.updateOne.should.have.been.called.exactly(1);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            MultipartParser.prototype.parse.should.have.been.called.exactly(1);
            done();
          };

          videoController[method](request, response, function(error) {
            assert.ok(false, 'Unexpected error');
          });
        });

        it('should add media point of interest and update media if id is not specified', function(done) {
          var expectedPoi = {
            name: 'Name',
            description: 'Description',
            value: 2000
          };
          var expectedPoiFile = {
            originalname: 'poiFileOriginalName',
            mimetype: 'poiFileMimeType',
            filename: 'poiFileName',
            size: 42,
            path: 'pathToPoiFile'
          };
          expectedMedias = [{
            id: '42'
          }];

          request.params.id = expectedMedias[0].id;
          request.body.info = JSON.stringify(expectedPoi);

          MultipartParser.prototype.parse = chai.spy(function(callback) {
            assert.deepInclude(expectedFiles[0], {
              name: 'file',
              destinationPath: path.join(process.rootPublish, 'assets/player/videos', expectedMedias[0].id, 'uploads'),
              maxCount: 1
            }, 'Wrong file');

            request.files = {
              file: [expectedPoiFile]
            };
            callback();
          });

          VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              expectedMedias[0].id,
              'Wrong media id'
            );
            callback(null, expectedMedias[0]);
          });

          PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              request.params.poiid,
              'Wrong point of interest id'
            );

            callback(null, 1);
          });

          VideoProvider.prototype.updateOne = chai.spy(function(filter, media, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              expectedMedias[0].id,
              'Wrong media id'
            );

            callback(null, 1);
          });

          response.send = function(result) {
            assert.equal(result.total, 1, 'Wrong total');

            assert.equal(result.poi.name, expectedPoi.name, 'Wrong name');
            assert.equal(result.poi.description, expectedPoi.description, 'Wrong description');
            assert.equal(result.poi.value, expectedPoi.value, 'Wrong value');

            assert.equal(result.poi.file.originalName, expectedPoiFile.originalname, 'Wrong file original name');
            assert.equal(result.poi.file.fileName, expectedPoiFile.filename, 'Wrong file name');
            assert.equal(result.poi.file.mimeType, expectedPoiFile.mimetype, 'Wrong file MIME type');
            assert.equal(result.poi.file.size, expectedPoiFile.size, 'Wrong file size');
            assert.equal(result.poi.file.path, expectedPoiFile.path, 'Wrong file path');

            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(1);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
            MultipartParser.prototype.parse.should.have.been.called.exactly(1);
            done();
          };

          videoController[method](request, response, function(error) {
            assert.ok(false, 'Unexpected error');
          });
        });

        it('should execute next with an error if media id is not specified', function(done) {
          request.body.info = JSON.stringify({});

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_MISSING_PARAMETERS);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            MultipartParser.prototype.parse.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if body is not specified', function(done) {
          request.params.id = '42';

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_MISSING_PARAMETERS);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if parsing body failed', function(done) {
          request.params.id = '42';
          request.body.info = JSON.stringify({});

          MultipartParser.prototype.parse = chai.spy(function(callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_UPLOAD_ERROR);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            MultipartParser.prototype.parse.should.have.been.called.exactly(1);
            done();
          });
        });

        it('should execute next with an error if getting media failed', function(done) {
          request.params.id = '42';
          request.body.info = JSON.stringify({});

          VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_GET_ONE_ERROR);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if user is not authorized to update the media', function(done) {
          request.params.id = '42';
          request.body.info = JSON.stringify({});

          videoController.isUserAuthorized = function() {
            return false;
          };

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_FORBIDDEN);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if updating point of interest failed', function(done) {
          expectedMedias = [{id: '42'}];
          request.params.id = '42';
          request.params.poiid = '1';
          request.body.info = JSON.stringify({});

          PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_UPDATE_ERROR);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(1);
            PoiProvider.prototype.add.should.have.been.called.exactly(0);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if adding point of interest failed', function(done) {
          expectedMedias = [{id: '42'}];
          request.params.id = '42';
          request.body.info = JSON.stringify({});

          PoiProvider.prototype.add = chai.spy(function(pois, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_CREATE_ERROR);
            PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.add.should.have.been.called.exactly(1);
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if updating media failed', function(done) {
          expectedMedias = [{id: '42'}];
          request.params.id = '42';
          request.body.info = JSON.stringify({});

          VideoProvider.prototype.updateOne = function(filter, media, callback) {
            callback(new Error('Something went wrong'));
          };

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.UPDATE_POI_UPDATE_MEDIA_ERROR);
            done();
          });
        });
      });

      describe('removePoisAction', function() {
        var method = type === POI_TYPE.TAGS ? 'removeTagsAction' : 'removeChaptersAction';

        it('should remove points of interest from media', function(done) {
          var expectedPoiIds = ['42', '43'];
          expectedMedias = [{id: '42'}];
          expectedMedias[0][type] = expectedPoiIds;
          request.params.id = '42';
          request.params.poiids = expectedPoiIds.join(',');

          VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              expectedMedias[0].id,
              'Wrong media id'
            );
            callback(null, expectedMedias[0]);
          });

          PoiProvider.prototype.remove = chai.spy(function(filter, callback) {
            assert.sameMembers(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
              expectedPoiIds,
              'Wrong points of interest ids'
            );
            callback(null, 1);
          });

          VideoProvider.prototype.updateOne = chai.spy(function(filter, media, callback) {
            assert.equal(
              filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
              expectedMedias[0].id,
              'Wrong media id'
            );
            assert.lengthOf(media[type], 0, 'Unexpected points of interest');

            callback(null, 1);
          });

          response.send = function(data) {
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
            PoiProvider.prototype.remove.should.have.been.called.exactly(1);
            assert.equal(data.total, 1, 'Wrong total');
            done();
          };

          videoController[method](request, response, function(error) {
            assert.ok(false, 'Unexpected error');
          });

        });

        it('should execute next with an error if media id is not specified', function(done) {
          request.params.poiids = '42,43';

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_MISSING_PARAMETERS, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.remove.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if points of interest ids are not specified', function(done) {
          request.params.id = '42';

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_MISSING_PARAMETERS, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.remove.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if getting media failed', function(done) {
          request.params.id = '42';
          request.params.poiids = '42,43';

          VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_GET_ONE_ERROR, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.remove.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if user is not authorized to update the media', function(done) {
          request.params.id = '42';
          request.params.poiids = '42,43';

          videoController.isUserAuthorized = function() {
            return false;
          };

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_FORBIDDEN, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.remove.should.have.been.called.exactly(0);
            done();
          });
        });

        it('should execute next with an error if removing points of interest failed', function(done) {
          var expectedPoiIds = ['42', '43'];
          expectedMedias = [{id: '42'}];
          expectedMedias[0][type] = expectedPoiIds;
          request.params.id = '42';
          request.params.poiids = expectedPoiIds.join(',');

          PoiProvider.prototype.remove = chai.spy(function(filter, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_REMOVE_ERROR, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
            PoiProvider.prototype.remove.should.have.been.called.exactly(1);
            done();
          });
        });

        it('should execute next with an error if updating media failed', function(done) {
          var expectedPoiIds = ['42', '43'];
          expectedMedias = [{id: '42'}];
          expectedMedias[0][type] = expectedPoiIds;
          request.params.id = '42';
          request.params.poiids = expectedPoiIds.join(',');

          VideoProvider.prototype.updateOne = chai.spy(function(filter, media, callback) {
            callback(new Error('Something went wrong'));
          });

          videoController[method](request, response, function(error) {
            assert.strictEqual(error, HTTP_ERRORS.REMOVE_POIS_UPDATE_MEDIA_ERROR, 'Wrong error');
            VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
            VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
            PoiProvider.prototype.remove.should.have.been.called.exactly(1);
            done();
          });
        });

      });

    });

  });

  describe('convertPoiAction', function() {

    it('should convert points of interest values from percent to milliseconds', function(done) {
      var expectedTagValue = 0.25;
      var expectedChapterValue = 0.6;
      var expectedStartCut = 0;
      var expectedEndCut = 1;
      expectedPois = [
        {
          id: '1',
          value: expectedTagValue,
          name: 'Tag name',
          description: 'Tag description',
          file: {
            originalName: 'tagOriginalName.jpg',
            mimeType: 'image/jpeg',
            fileName: 'tagFileName.jpg',
            size: 42,
            url: 'tagFileUri',
            path: 'tagFilePath'
          }
        },
        {
          id: '2',
          value: expectedChapterValue,
          name: 'Chapter name',
          description: 'Chapter description'
        }
      ];
      expectedMedias = [
        {
          id: '42',
          tags: [expectedPois[0].id],
          chapters: [expectedPois[1].id],
          cut: [{value: expectedStartCut}, {value: expectedEndCut}],
          needPointsOfInterestUnitConversion: true,
          state: STATES.PUBLISHED
        }
      ];
      request.params.id = '42';
      request.body = {duration: 600000};

      var convertToMilliseconds = function(percent) {
        return Math.floor(percent * request.body.duration);
      };

      VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedMedias[0].id,
          'Wrong media id'
        );
        callback(null, expectedMedias[0]);
      });

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        assert.sameMembers(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.IN, 'id').value,
          expectedMedias[0].tags.concat(expectedMedias[0].chapters),
          'Wrong points of interest'
        );
        callback(null, expectedPois);
      });

      PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
        var poiId = filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value;

        if (poiId === expectedPois[0].id) {
          assert.equal(poi.value, convertToMilliseconds(expectedTagValue), 'Wrong tag value');
        } else {
          assert.equal(poi.value, convertToMilliseconds(expectedChapterValue), 'Wrong chapter value');
        }

        callback(null, 1);
      });

      VideoProvider.prototype.updateOne = chai.spy(function(filter, data, callback) {
        var expectedData = {
          cut: [
            {value: convertToMilliseconds(expectedStartCut)},
            {value: convertToMilliseconds(expectedEndCut)}
          ],
          needPointsOfInterestUnitConversion: false
        };

        assert.deepEqual(data, expectedData);

        callback(null, 1);
      });

      response.send = function(data) {
        var media = data.entity;
        var tag = media.tags[0];
        var chapter = media.chapters[0];
        var expectedMedia = expectedMedias[0];
        var expectedTag = expectedMedia.tags[0];
        var expectedChapter = expectedMedia.chapters[0];

        assert.equal(media.id, expectedMedia.id, 'Wrong media id');
        assert.equal(media.cut[0].value, 0, 'Wrong start cut value');
        assert.equal(media.cut[1].value, 600000, 'Wrong start cut value');
        assert.isNotOk(
          media.needPointsOfInterestUnitConversion,
          'Expected needPointsOfInterestUnitConversion to be false'
        );

        assert.equal(tag.id, expectedTag.id, 'Wrong tag id');
        assert.equal(tag.name, expectedTag.name, 'Wrong tag name');
        assert.equal(tag.description, expectedTag.description, 'Wrong tag description');
        assert.equal(tag.value, convertToMilliseconds(expectedTagValue), 'Wrong tag value');
        assert.equal(tag.file.originalName, expectedTag.file.originalName, 'Wrong tag file original name');
        assert.equal(tag.file.fileName, expectedTag.file.fileName, 'Wrong tag file name');
        assert.equal(tag.file.mimeType, expectedTag.file.mimeType, 'Wrong tag MIME type');
        assert.equal(tag.file.size, expectedTag.file.size, 'Wrong tag size');
        assert.equal(tag.file.url, expectedTag.file.url, 'Wrong tag URL');
        assert.isUndefined(tag.path, 'Unexpected tag file path');

        assert.equal(chapter.id, expectedChapter.id, 'Wrong chapter id');
        assert.equal(chapter.name, expectedChapter.name, 'Wrong chapter name');
        assert.equal(chapter.description, expectedChapter.description, 'Wrong chapter description');
        assert.equal(chapter.value, convertToMilliseconds(expectedChapterValue), 'Wrong chapter value');

        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(2);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      };

      videoController.convertPoiAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should resolve media resources URLs', function(done) {
      var expectedSmallImageUri = 'smallImageUri';
      var expectedLargeImageUri = 'largeImageUri';
      var expectedTagFileUri = 'tagFileUri';
      var expectedSourceUri = 'sourceUri';
      var expectedThumbnailUri = 'thumbnailUri';
      expectedPois = [
        {
          id: 'tagId',
          file: {
            url: expectedTagFileUri
          }
        }
      ];
      expectedMedias = [
        {
          id: 42,
          type: TYPES.LOCAL,
          state: STATES.PUBLISHED,
          timecodes: [
            {
              image: {
                small: {
                  url: expectedSmallImageUri
                },
                large: expectedLargeImageUri
              }
            }
          ],
          tags: [expectedPois[0].id],
          sources: [
            {
              files: [
                {
                  link: expectedSourceUri
                }
              ]
            }
          ],
          thumbnail: expectedThumbnailUri
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      response.send = function(data) {
        var media = data.entity;

        assert.strictEqual(
          media.thumbnail,
          coreApi.getCdnUrl() + expectedThumbnailUri,
          'Wrong thumbnail'
        );
        assert.strictEqual(
          media.timecodes[0].image.small.url,
          coreApi.getCdnUrl() + expectedSmallImageUri,
          'Wrong small timecode'
        );
        assert.strictEqual(
          media.timecodes[0].image.large,
          coreApi.getCdnUrl() + expectedLargeImageUri,
          'Wrong large timecode'
        );
        assert.strictEqual(
          media.tags[0].file.url,
          coreApi.getCdnUrl() + expectedTagFileUri,
          'Wrong tag file'
        );
        assert.strictEqual(
          media.sources[0].files[0].link,
          coreApi.getCdnUrl() + expectedSourceUri,
          'Wrong source link'
        );
        done();
      };

      videoController.convertPoiAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should execute next with an error if id is not specified', function(done) {
      request.body = {duration: 600000};

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_MISSING_PARAMETERS, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if duration is not specified', function(done) {
      request.params.id = '42';

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_MISSING_PARAMETERS, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(0);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if getting media failed', function(done) {
      expectedMedias = [
        {
          id: '42'
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      VideoProvider.prototype.getOne = chai.spy(function(filter, fields, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_GET_MEDIA_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if media is not ready', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PENDING
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_MEDIA_NOT_READY_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if user is not authorized to update the media', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.READY
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      videoController.isUserAuthorized = function(user, media, operation) {
        assert.equal(user.id, request.user.id, 'Wrong user id');
        assert.deepEqual(media, expectedMedias[0], 'Wrong media');
        assert.equal(operation, openVeoApi.controllers.ContentController.OPERATIONS.READ, 'Wrong media');
        return false;
      };

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_FORBIDDEN, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute next with an error if getting points of interest failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          tags: ['1'],
          cut: [{value: 0}, {value: 1}],
          needPointsOfInterestUnitConversion: true
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      PoiProvider.prototype.getAll = chai.spy(function(filter, fields, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_GET_POIS_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next with an error if updating points of interest failed', function(done) {
      expectedPois = [
        {
          id: '1',
          value: 1000,
          name: 'Tag name',
          description: 'Tag description'
        }
      ];
      expectedMedias = [
        {
          id: '42',
          tags: [expectedPois[0].id],
          cut: [{value: 0}, {value: 1}],
          needPointsOfInterestUnitConversion: true,
          state: STATES.PUBLISHED
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      PoiProvider.prototype.updateOne = chai.spy(function(filter, poi, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_UPDATE_POI_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(1);
        done();
      });
    });

    it('should execute next with an error if updating media failed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          cut: [{value: 0}, {value: 1}],
          needPointsOfInterestUnitConversion: true
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      VideoProvider.prototype.updateOne = chai.spy(function(filter, modifications, callback) {
        callback(new Error('Something went wrong'));
      });

      videoController.convertPoiAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.CONVERT_POIS_UPDATE_MEDIA_ERROR, 'Wrong error');
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(1);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should not update media if no conversion needed', function(done) {
      expectedMedias = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          needPointsOfInterestUnitConversion: false
        }
      ];

      request.params.id = '42';
      request.body = {duration: 600000};

      response.send = function() {
        VideoProvider.prototype.getOne.should.have.been.called.exactly(1);
        VideoProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.updateOne.should.have.been.called.exactly(0);
        PoiProvider.prototype.getAll.should.have.been.called.exactly(0);
        done();
      };

      videoController.convertPoiAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

  });

  describe('removeEntitiesAction', function() {

    it('should remove medias and send operation result', function(done) {
      var expectedIds = ['41', '42'];
      expectedIds.forEach(function(expectedId) {
        expectedMedias.push({
          id: expectedId,
          metadata: {
            user: request.user.id
          },
          state: STATES.PUBLISHED
        });
      });

      response.send = function(result) {
        VideoProvider.prototype.remove.should.have.been.called.exactly(1);
        assert.equal(result.total, expectedIds.length, 'Wrong total');
        done();
      };

      VideoProvider.prototype.remove = chai.spy(function(filter, callback) {
        assert.equal(filter.operations[0].type, ResourceFilter.OPERATORS.IN, 'Wrong operation type');
        assert.equal(filter.operations[0].field, 'id', 'Wrong operation field');
        assert.deepEqual(filter.operations[0].value, expectedIds, 'Wrong operation value');
        callback(null, expectedIds.length);
      });

      request.params.id = expectedIds.join(',');

      videoController.removeEntitiesAction(request, response, function(error) {
        assert.ok(false, 'Unexpected error');
      });
    });

    it('should send an HTTP missing parameters error if id is not specified', function(done) {
      response.send = function(result) {
        assert.ok(false, 'Unexpected error');
      };

      videoController.removeEntitiesAction(request, response, function(error) {
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_MISSING_PARAMETERS, 'Wrong error');
        done();
      });
    });

    it('should send an HTTP server error if getting medias failed', function(done) {
      var expectedId = '42';
      expectedMedias.push({
        id: expectedId,
        metadata: {
          user: request.user.id
        },
        state: STATES.PUBLISHED
      });

      response.send = function(result) {
        assert.ok(false, 'Unexpected error');
      };

      VideoProvider.prototype.get = chai.spy(function(filter, fields, page, limit, sort, callback) {
        callback(new Error('Something went wrong'));
      });

      request.params.id = expectedId;

      videoController.removeEntitiesAction(request, response, function(error) {
        VideoProvider.prototype.get.should.have.been.called.exactly(1);
        VideoProvider.prototype.remove.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_GET_MEDIAS_ERROR, 'Wrong error');
        done();
      });
    });

    it('should send an HTTP server error if removing medias failed', function(done) {
      var expectedId = '42';
      expectedMedias.push({
        id: expectedId,
        metadata: {
          user: request.user.id
        },
        state: STATES.PUBLISHED
      });

      response.send = function(result) {
        assert.ok(false, 'Unexpected error');
      };

      VideoProvider.prototype.remove = chai.spy(function(filter, callback) {
        callback(new Error('Error'));
      });

      request.params.id = expectedId;

      videoController.removeEntitiesAction(request, response, function(error) {
        VideoProvider.prototype.remove.should.have.been.called.exactly(1);
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_ERROR, 'Wrong error');
        done();
      });
    });

    it('should send an HTTP server error if removing medias partially failed', function(done) {
      var expectedIds = ['41', '42'];
      expectedIds.forEach(function(expectedId) {
        expectedMedias.push({
          id: expectedId,
          metadata: {
            user: request.user.id
          },
          state: STATES.PUBLISHED
        });
      });

      response.send = function(result) {
        assert.ok(false, 'Unexpected error');
      };

      VideoProvider.prototype.remove = chai.spy(function(filter, callback) {
        callback(null, expectedIds.length - 1);
      });

      request.params.id = expectedIds.join(',');

      videoController.removeEntitiesAction(request, response, function(error) {
        VideoProvider.prototype.remove.should.have.been.called.exactly(1);
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_ERROR, 'Wrong error');
        done();
      });
    });

    it('should send an HTTP forbidden if user has not enough privilege to delete medias', function(done) {
      var expectedId = '42';
      expectedMedias.push({
        id: expectedId,
        metadata: {
          user: 'Something else'
        },
        state: STATES.PUBLISHED
      });

      videoController.isUserAuthorized = chai.spy(function(user, media, operation) {
        return false;
      });

      response.send = function(result) {
        assert.ok(false, 'Unexpected response');
      };

      request.params.id = expectedId;

      videoController.removeEntitiesAction(request, response, function(error) {
        videoController.isUserAuthorized.should.have.been.called.exactly(1);
        VideoProvider.prototype.remove.should.have.been.called.exactly(0);
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_FORBIDDEN, 'Wrong error');
        done();
      });
    });

    it('should send an HTTP server error if some medias could not be removed', function(done) {
      var expectedId = '42';
      expectedMedias.push({
        id: expectedId,
        metadata: {
          user: request.user.id
        },
        state: STATES.PUBLISHED
      });

      response.send = function(result) {
        assert.ok(false, 'Unexpected response');
      };

      VideoProvider.prototype.remove = chai.spy(function(filter, callback) {
        callback(null, 0);
      });

      request.params.id = expectedId;

      videoController.removeEntitiesAction(request, response, function(error) {
        VideoProvider.prototype.remove.should.have.been.called.exactly(1);
        assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_ERROR, 'Wrong error');
        done();
      });
    });

    stableStates.forEach(function(stableState) {

      it('should remove media and send operation result if media state is "' + stableState + '"', function(done) {
        var expectedId = '42';
        expectedMedias.push({
          id: expectedId,
          metadata: {
            user: request.user.id
          },
          state: stableState
        });

        response.send = function(result) {
          VideoProvider.prototype.remove.should.have.been.called.exactly(1);
          done();
        };

        request.params.id = expectedId;

        videoController.removeEntitiesAction(request, response, function(error) {
          assert.ok(false, 'Unexpected error');
        });
      });

    });

    unstableStates.forEach(function(unstableState) {

      it('should send an HTTP server error if at least one media is in state "' + unstableState + '"', function(done) {
        var expectedId = '42';
        expectedMedias.push({
          id: expectedId,
          metadata: {
            user: request.user.id
          },
          state: unstableState
        });

        response.send = function(result) {
          assert.ok(false, 'Unexpected response');
        };

        request.params.id = expectedId;

        videoController.removeEntitiesAction(request, response, function(error) {
          VideoProvider.prototype.remove.should.have.been.called.exactly(0);
          assert.strictEqual(error, HTTP_ERRORS.REMOVE_MEDIAS_STATE_ERROR, 'Wrong error');
          done();
        });
      });

    });

  });

});
