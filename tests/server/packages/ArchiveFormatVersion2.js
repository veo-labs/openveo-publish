'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');

var assert = chai.assert;

chai.should();
chai.use(spies);

describe('ArchiveFormatVersion2', function() {
  var ArchiveFormat;
  var archiveFormat;
  var expectedError = new Error('Something went wrong');
  var expectedGetPropertyValues;
  var expectedMediaPackagePath;
  var fs;

  // Mocks
  beforeEach(function() {
    expectedMediaPackagePath = '/tmp/42';
    expectedGetPropertyValues = {
      categories: [
        {
          label: 'Category 1'
        },
        {
          label: 'Category 2'
        }
      ],
      medias: [
        {
          filename: 'video1.mp4'
        },
        {
          filename: 'video2.mp4'
        }
      ],
      tags: [
        {
          text: 'First tag',
          timecode: 1,
          category: 0
        },
        {
          text: 'Second tag',
          timecode: 1,
          category: 1
        }
      ]
    };

    ArchiveFormat = chai.spy(function(mediaPackagePath) {
      this.mediaPackagePath = mediaPackagePath;
    });
    ArchiveFormat.prototype.getProperty = chai.spy(function(propertyName, callback) {
      callback(null, expectedGetPropertyValues[propertyName]);
    });
    ArchiveFormat.prototype.getMetadatas = chai.spy(function(callback) {
      callback(null, expectedGetPropertyValues);
    });

    fs = {
      access: chai.spy(function(filePath, callback) {
        callback();
      })
    };

    mock(path.join(process.rootPublish, 'app/server/packages/ArchiveFormat.js'), ArchiveFormat);
    mock('fs', fs);
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/ArchiveFormat.js'));
    var ArchiveFormatVersion2 = mock.reRequire(
      path.join(process.rootPublish, 'app/server/packages/ArchiveFormatVersion2.js')
    );
    archiveFormat = new ArchiveFormatVersion2(expectedMediaPackagePath);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('getMedias', function() {

    it('should get the medias files names in the archive', function(done) {
      archiveFormat.getMedias(function(error, mediasFilesNames) {
        assert.isNull(error, 'Unexpected error');
        assert.sameMembers(
          mediasFilesNames,
          expectedGetPropertyValues.medias.map(function(media) {
            return media.filename;
          }), 'Wrong medias files names');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('medias');

        done();
      });
    });

    it('should execute callback with an error if getting medias failed', function(done) {
      ArchiveFormat.prototype.getProperty = chai.spy(function(name, callback) {
        callback(expectedError);
      });

      archiveFormat.getMedias(function(error, mediasFilesNames) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(mediasFilesNames, 'Unexpected medias files names');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('getPointsOfInterest', function() {

    it('should get the list of points of interest in the archive', function(done) {
      archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
        assert.isNull(error, 'Unexpected error');
        assert.deepEqual(
          pointsOfInterest,
          expectedGetPropertyValues.tags.map(function(tag) {
            return {
              type: 'tag',
              timecode: tag.timestamp * 1000,
              data: {
                tagname: tag.text,
                category: expectedGetPropertyValues.categories[tag.category].label
              }
            };
          }),
          'Wrong points of interest'
        );

        ArchiveFormat.prototype.getMetadatas.should.have.been.called.exactly(1);

        done();
      });
    });

    it('should execute callback with an error if getting metadatas failed', function(done) {
      ArchiveFormat.prototype.getMetadatas = chai.spy(function(callback) {
        callback(expectedError);
      });

      archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(pointsOfInterest, 'Unexpected points of interest');

        ArchiveFormat.prototype.getMetadatas.should.have.been.called.exactly(1);

        done();
      });
    });

  });

  describe('validate', function() {

    it('should validate that the archive contains the medias files specified in metadatas', function(done) {
      var accessCount = 0;

      fs.access = chai.spy(function(filePath, callback) {
        assert.equal(
          filePath,
          path.join(expectedMediaPackagePath, expectedGetPropertyValues.medias[accessCount].filename),
          'Wrong media file'
        );

        accessCount++;
        callback();
      });

      archiveFormat.validate(function(error, isValid) {
        assert.isNull(error, 'Unexpected error');
        assert.ok(isValid, 'Expected archive to be valid');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('medias');
        fs.access.should.have.been.called.exactly(expectedGetPropertyValues.medias.length);

        done();
      });
    });

    it('should indicate that archive is invalid if a media file is missing', function(done) {
      fs.access = chai.spy(function(filePath, callback) {
        callback(new Error('File not found'));
      });

      archiveFormat.validate(function(error, isValid) {
        assert.isNull(error, 'Unexpected error');
        assert.isNotOk(isValid, 'Expected archive to be invalid');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.exactly(expectedGetPropertyValues.medias.length);

        done();
      });
    });

    it('should execute callback with an error if getting medias from metadatas failed', function(done) {
      ArchiveFormat.prototype.getProperty = chai.spy(function(name, callback) {
        callback(expectedError);
      });

      archiveFormat.validate(function(error, isValid) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(isValid, 'Unexpected result');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.exactly(0);

        done();
      });
    });

  });

});
