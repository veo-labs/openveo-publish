'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');
var api = require('@openveo/api');

var ERRORS = process.requirePublish('app/server/packages/errors.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var VideoPackageError = process.requirePublish('app/server/packages/VideoPackageError.js');

var ResourceFilter = api.storages.ResourceFilter;
var assert = chai.assert;

chai.should();
chai.use(spies);

describe('VideoPackage', function() {
  var expectedError = new Error('Something went wrong');
  var expectedFfprobeResult;
  var expectedPackages;
  var ffmpeg;
  var ffmpegFunctions;
  var fs;
  var openVeoApi;
  var poiProvider;
  var publishConf;
  var videoPackage;
  var VideoPackage;
  var videoPlatformConf;
  var videoProvider;

  // Mocks
  beforeEach(function() {
    expectedFfprobeResult = {
      streams: [
        {
          codec_type: 'video', // eslint-disable-line camelcase
          nb_frames: 'N/A', // eslint-disable-line camelcase
          height: 720
        }
      ]
    };
    expectedPackages = [];

    poiProvider = {};
    videoProvider = {
      getOne: chai.spy(function(filter, fields, callback) {
        callback(null, expectedPackages[0]);
      }),
      updateOne: chai.spy(function(filter, modifications, callback) {
        callback(null, 1);
      }),
      updateThumbnail: chai.spy(function(id, thumbnail, callback) {
        callback(null, 1);
      }),
      removeLocal: chai.spy(function(filter, callback) {
        callback(null, 1);
      }),
      updateMetadata: chai.spy(function(id, metadata, callback) {
        callback(null, 1);
      }),
      updateMediaId: chai.spy(function(id, mediaId, callback) {
        callback(null, 1);
      }),
      updateMediasHeights: chai.spy(function(id, mediasHeights, callback) {
        callback(null, 1);
      }),
      updateState: chai.spy(function(id, state, callback) {
        callback(null, 1);
      })
    };

    openVeoApi = {
      fileSystem: {
        copy: chai.spy(function(sourcePath, destinationSourcePath, callback) {
          callback();
        }),
        getConfDir: function() {
          return '/conf/dir';
        },
        FILE_TYPES: {
          JPG: 'jpg',
          GIF: 'gif'
        }
      },
      util: api.util,
      storages: api.storages
    };

    ffmpeg = chai.spy(function(filePath) {
      ffmpegFunctions.events = {};
      return ffmpegFunctions;
    });

    ffmpegFunctions = {
      events: {},
      audioCodec: chai.spy(function(audioCodec) {
        return ffmpegFunctions;
      }),
      videoCodec: chai.spy(function(videoCodec) {
        return ffmpegFunctions;
      }),
      screenshots: chai.spy(function(configuration) {
        setTimeout(function() {
          ffmpegFunctions.events.end();
        });
        return ffmpegFunctions;
      }),
      outputOptions: chai.spy(function(outputOptions) {
        return ffmpegFunctions;
      }),
      on: chai.spy(function(eventName, callback) {
        ffmpegFunctions.events[eventName] = callback;
        return ffmpegFunctions;
      }),
      save: chai.spy(function(destinationFilePath) {
        ffmpegFunctions.events.end();
      })
    };

    ffmpeg.ffprobe = chai.spy(function(filePath, callback) {
      callback(null, expectedFfprobeResult);
    });

    fs = {
      unlink: chai.spy(function(filePath, callback) {
        callback();
      }),
      rename: chai.spy(function(originalFilePath, newFilePath, callback) {
        callback();
      }),
      readdir: chai.spy(function(directoryPath, callback) {
        callback(null, []);
      })
    };

    publishConf = {
      videoTmpDir: '/tmp'
    };

    videoPlatformConf = {};

    mock('@openveo/api', openVeoApi);
    mock('fs', fs);
    mock('fluent-ffmpeg', ffmpeg);
    mock(path.join(process.rootPublish, 'app/server/providers/VideoProvider.js'), videoProvider);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/publishConf.json'), publishConf);
    mock(path.join(openVeoApi.fileSystem.getConfDir(), 'publish/videoPlatformConf.json'), videoPlatformConf);
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/Package.js'));
    VideoPackage = mock.reRequire(path.join(process.rootPublish, 'app/server/packages/VideoPackage.js'));
    videoPackage = new VideoPackage({
      id: '42',
      originalFileName: 'file',
      packageType: 'mp4',
      metadata: {
        indexes: []
      }
    }, videoProvider, poiProvider);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('defragment', function() {
    var expectedFilePath = '/tmp/file-to-defragment.mp4';
    var expectedDefragmentedFilePath = '/tmp/file-to-defragment-defrag.mp4';

    it('should defragment given video file if fragmented', function(done) {
      videoPackage.defragment(expectedFilePath, function(error) {
        assert.isNull(error, 'Unexpected error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.with(expectedFilePath);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.with(expectedFilePath);
        ffmpegFunctions.save.should.have.been.called.exactly(1);
        ffmpegFunctions.save.should.have.been.called.with(expectedDefragmentedFilePath);
        fs.unlink.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.with(expectedFilePath);
        fs.rename.should.have.been.called.exactly(1);
        fs.rename.should.have.been.called.with(expectedDefragmentedFilePath, expectedFilePath);
        done();
      });
    });

    it('should not defragment given video file if not fragmented', function(done) {
      expectedFfprobeResult = {};

      videoPackage.defragment(expectedFilePath, function(error) {
        assert.isNull(error, 'Unexpected error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.with(expectedFilePath);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.save.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        fs.rename.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if analyzing file failed', function(done) {
      ffmpeg.ffprobe = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });
      videoPackage.defragment(expectedFilePath, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.save.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        fs.rename.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if defragmenting file failed', function(done) {
      ffmpegFunctions.save = chai.spy(function(destinationFilePath) {
        ffmpegFunctions.events.error(expectedError);
      });

      videoPackage.defragment(expectedFilePath, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpegFunctions.save.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.exactly(0);
        fs.rename.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if removing original file failed', function(done) {
      fs.unlink = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      videoPackage.defragment(expectedFilePath, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpegFunctions.save.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.exactly(1);
        fs.rename.should.have.been.called.exactly(0);
        done();
      });
    });

    it('should execute callback with an error if renaming defragmented file failed', function(done) {
      fs.rename = chai.spy(function(filePath, destinationFilePath, callback) {
        callback(expectedError);
      });

      videoPackage.defragment(expectedFilePath, function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpegFunctions.save.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.exactly(1);
        fs.rename.should.have.been.called.exactly(1);
        done();
      });
    });

  });

  describe('defragmentMp4', function() {

    beforeEach(function() {
      VideoPackage.prototype.defragment = chai.spy(function(filePath, callback) {
        callback();
      });
    });

    it('should change package state to DEFRAGMENTING_MP4 and defragment package media file', function() {
      return videoPackage.defragmentMp4().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(videoPackage.mediaPackage.id, STATES.DEFRAGMENTING_MP4);
        VideoPackage.prototype.defragment.should.have.been.called.exactly(1);
        VideoPackage.prototype.defragment.should.have.been.called.with(
          path.join(
            publishConf.videoTmpDir,
            videoPackage.mediaPackage.id,
            videoPackage.mediaPackage.id + '.' + videoPackage.mediaPackage.packageType
          )
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        VideoPackage.prototype.defragment.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting media file path failed', function() {
      VideoPackage.super_.prototype.getMediaFilePath = chai.spy(function(callback) {
        callback(expectedError);
      });

      return videoPackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.DEFRAGMENT_MP4_GET_MEDIA_FILE_PATH, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        VideoPackage.super_.prototype.getMediaFilePath.should.have.been.called.exactly(1);
        VideoPackage.prototype.defragment.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if defragmenting media file failed', function() {
      VideoPackage.prototype.defragment = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      return videoPackage.defragmentMp4().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.DEFRAGMENTATION, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        VideoPackage.prototype.defragment.should.have.been.called.exactly(1);
      });
    });

  });

  describe('generateThumb', function() {

    it('should change package state to GENERATING_THUMB and generates a thumbnail based on the video file', function() {
      ffmpegFunctions.screenshots = chai.spy(function(configuration) {
        assert.equal(configuration.filename, 'thumbnail.jpg', 'Wrong thumbnail file name');
        assert.equal(
          configuration.folder,
          path.join(publishConf.videoTmpDir, videoPackage.mediaPackage.id),
          'Wrong thumbnail destination folder'
        );

        setTimeout(function() {
          ffmpegFunctions.events.end();
        });
        return ffmpegFunctions;
      });
      return videoPackage.generateThumb().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(videoPackage.mediaPackage.id, STATES.GENERATING_THUMB);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.with(
          path.join(
            publishConf.videoTmpDir,
            videoPackage.mediaPackage.id,
            videoPackage.mediaPackage.id + '.' + videoPackage.mediaPackage.packageType
          )
        );
        ffmpegFunctions.screenshots.should.have.been.called.exactly(1);
        videoProvider.updateThumbnail.should.have.been.called.exactly(1);
        videoProvider.updateThumbnail.should.have.been.called.with(
          videoPackage.mediaPackage.id,
          '/publish/' + videoPackage.mediaPackage.id + '/thumbnail.jpg'
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should not generate a thumbnail if one already exists but just copy it', function() {
      videoPackage.mediaPackage.originalThumbnailPath = '/tmp/thumb.jpg';

      return videoPackage.generateThumb().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.with(
          videoPackage.mediaPackage.originalThumbnailPath,
          path.join(
            publishConf.videoTmpDir,
            videoPackage.mediaPackage.id,
            'thumbnail.jpg'
          )
        );
        fs.unlink.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.with(videoPackage.mediaPackage.originalThumbnailPath);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(0);
        videoProvider.updateThumbnail.should.have.been.called.exactly(1);
        videoProvider.updateThumbnail.should.have.been.called.with(
          videoPackage.mediaPackage.id,
          '/publish/' + videoPackage.mediaPackage.id + '/thumbnail.jpg'
        );
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(0);
        videoProvider.updateThumbnail.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting media file path failed', function() {
      VideoPackage.super_.prototype.getMediaFilePath = chai.spy(function(callback) {
        callback(expectedError);
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GENERATE_THUMB_GET_MEDIA_FILE_PATH, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        VideoPackage.super_.prototype.getMediaFilePath.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(0);
        videoProvider.updateThumbnail.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if copying already existing thumnail failed', function() {
      videoPackage.mediaPackage.originalThumbnailPath = '/tmp/thumb.jpg';

      openVeoApi.fileSystem.copy = chai.spy(function(filePath, destinationFilePath, callback) {
        callback(expectedError);
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GENERATE_THUMB_COPY_ORIGINAL, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(0);
        videoProvider.updateThumbnail.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if removing original thumbnail failed', function() {
      videoPackage.mediaPackage.originalThumbnailPath = '/tmp/thumb.jpg';

      fs.unlink = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GENERATE_THUMB_REMOVE_ORIGINAL, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(1);
        fs.unlink.should.have.been.called.exactly(1);
        ffmpeg.should.have.been.called.exactly(0);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(0);
        videoProvider.updateThumbnail.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if generating thumbnail failed', function() {
      ffmpegFunctions.screenshots = chai.spy(function(filePath) {
        setTimeout(function() {
          ffmpegFunctions.events.error(expectedError);
        });
        return ffmpegFunctions;
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GENERATE_THUMB, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(1);
        videoProvider.updateThumbnail.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if updating package failed', function() {
      videoProvider.updateThumbnail = chai.spy(function(id, thumbnail, callback) {
        callback(expectedError);
      });

      return videoPackage.generateThumb().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GENERATE_THUMB_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        openVeoApi.fileSystem.copy.should.have.been.called.exactly(0);
        fs.unlink.should.have.been.called.exactly(0);
        ffmpeg.should.have.been.called.exactly(1);
        ffmpegFunctions.screenshots.should.have.been.called.exactly(1);
        videoProvider.updateThumbnail.should.have.been.called.exactly(1);
      });
    });

  });

  describe('getMetadata', function() {

    it('should change package state to GETTING_METADATA and get the height of the video', function() {
      videoProvider.updateMediasHeights = chai.spy(function(id, mediasHeights, callback) {
        assert.equal(id, videoPackage.mediaPackage.id, 'Wrong package updated');
        assert.deepEqual(
          mediasHeights,
          [expectedFfprobeResult.streams[0].height],
          'Wrong video height'
        );
        callback();
      });

      return videoPackage.getMetadata().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.updateState.should.have.been.called.with(videoPackage.mediaPackage.id, STATES.GETTING_METADATA);
        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.with(
          path.join(
            publishConf.videoTmpDir,
            videoPackage.mediaPackage.id,
            videoPackage.mediaPackage.id + '.' + videoPackage.mediaPackage.packageType
          )
        );
        videoProvider.updateMediasHeights.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should just update package if video height is already known', function() {
      videoPackage.mediaPackage.mediasHeights = [1080];

      return videoPackage.getMetadata().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(0);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing package state failed', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.strictEqual(error, expectedError, 'Wrong error');

        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(0);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting media file path failed', function() {
      VideoPackage.super_.prototype.getMediaFilePath = chai.spy(function(callback) {
        callback(expectedError);
      });

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GET_METADATA_GET_MEDIA_FILE_PATH, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        VideoPackage.super_.prototype.getMediaFilePath.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(0);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting video height failed', function() {
      ffmpeg.ffprobe = chai.spy(function(filePath, callback) {
        callback(expectedError);
      });

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GET_METADATA_GET_MEDIAS_HEIGHTS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if no stream in the video file', function() {
      expectedFfprobeResult = {};

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.code, ERRORS.GET_METADATA_GET_MEDIAS_HEIGHTS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if no video stream in the video file', function() {
      expectedFfprobeResult = {
        streams: []
      };

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.code, ERRORS.GET_METADATA_GET_MEDIAS_HEIGHTS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting video height failed', function() {
      videoProvider.updateMediasHeights = chai.spy(function(id, mediasHeights, callback) {
        callback(expectedError);
      });

      return videoPackage.getMetadata().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.GET_METADATA_UPDATE_PACKAGE, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        ffmpeg.ffprobe.should.have.been.called.exactly(1);
        videoProvider.updateMediasHeights.should.have.been.called.exactly(1);
      });
    });

  });

  describe('merge', function() {

    beforeEach(function() {
      expectedPackages = [{
        id: '43',
        lockedByPackage: videoPackage.mediaPackage.id,
        mediaId: ['1'],
        mediasHeights: [720],
        originalFileName: videoPackage.mediaPackage.originalFileName,
        state: STATES.WAITING_FOR_MERGE
      }];
      videoPackage.mediaPackage.mediaId = ['2'];
      videoPackage.mediaPackage.mediasHeights = [720];
    });

    it('should change package state to MERGING and merge package with the same file name locked package', function() {
      videoProvider.updateState = chai.spy(function(id, state, callback) {
        assert.equal(id, videoPackage.mediaPackage.id, 'Wrong package updated');
        assert.equal(state, STATES.MERGING, 'Wrong updated package state');
        callback();
      });

      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'state').value,
          STATES.WAITING_FOR_MERGE,
          'Searching for wrong locked package state'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'originalFileName').value,
          videoPackage.mediaPackage.originalFileName,
          'Searching for wrong locked package original file name'
        );
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'lockedByPackage').value,
          videoPackage.mediaPackage.id,
          'Searching for wrong locked package locker'
        );

        callback(null, expectedPackages[0]);
      });

      videoProvider.updateOne = chai.spy(function(filter, data, callback) {
        assert.equal(
          filter.getComparisonOperation(ResourceFilter.OPERATORS.EQUAL, 'id').value,
          expectedPackages[0].id,
          'Wrong package updated'
        );
        assert.sameOrderedMembers(
          data.mediaId,
          [expectedPackages[0].mediaId[0], videoPackage.mediaPackage.mediaId[0]],
          'Wrong merged medias'
        );
        assert.sameOrderedMembers(
          data.mediasHeights,
          [expectedPackages[0].mediasHeights[0], videoPackage.mediaPackage.mediasHeights[0]],
          'Wrong merged medias heights'
        );
        callback();
      });

      return videoPackage.merge().then(function() {
        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
      }).catch(function(error) {
        assert.fail(error);
      });
    });

    it('should reject promise if changing the package state failed', function() {

      videoProvider.updateState = chai.spy(function(id, state, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(0);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if getting locked package failed', function() {
      videoProvider.getOne = chai.spy(function(filter, fields, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_GET_PACKAGE_WITH_SAME_NAME, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(0);
      });
    });

    it('should reject promise if merging medias failed', function() {
      videoProvider.updateOne = chai.spy(function(id, mediaId, callback) {
        callback(expectedError);
      });

      return videoPackage.merge().then(function() {
        assert.fail('Unexpected promise resolution');
      }).catch(function(error) {
        assert.instanceOf(error, VideoPackageError, 'Wrong error type');
        assert.equal(error.message, expectedError.message, 'Wrong error message');
        assert.equal(error.code, ERRORS.MERGE_UPDATE_MEDIAS, 'Wrong error code');

        videoProvider.updateState.should.have.been.called.exactly(1);
        videoProvider.getOne.should.have.been.called.exactly(1);
        videoProvider.updateOne.should.have.been.called.exactly(1);
        videoProvider.removeLocal.should.have.been.called.exactly(0);
      });
    });

  });

});

