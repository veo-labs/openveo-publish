'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');

var assert = chai.assert;

chai.should();
chai.use(spies);

describe('ArchiveFormatVersion1', function() {
  var ArchiveFormat;
  var archiveFormat;
  var expectedError = new Error('Something went wrong');
  var expectedGetPropertyValues;
  var expectedMediaPackagePath;
  var expectedReadFileResult;
  var expectedParseStringResult;
  var expectedXmlDescriptionFilePath;
  var fs;
  var xml2js;

  // Mocks
  beforeEach(function() {
    expectedMediaPackagePath = '/tmp/42';
    expectedXmlDescriptionFilePath = path.join(expectedMediaPackagePath, 'synchro.xml');
    expectedGetPropertyValues = {
      filename: 'video.mp4',
      indexes: [
        {
          type: 'image',
          timecode: 1000,
          data: {
            filename: 'image1.jpg'
          }
        },
        {
          type: 'tag',
          timecode: 2000,
          data: {
            tagname: 'First tag',
            category: 'Category 1',
            text: 'First tag description'
          }
        },
        {
          type: 'tag',
          timecode: 3000,
          data: {
            category: 'Category 2'
          }
        },
        {
          type: 'tag',
          timecode: 4000,
          data: {
            text: 'Third tag description'
          }
        },
        {
          type: 'tag',
          timecode: 4000
        }
      ]
    };
    expectedParseStringResult = {
      player: {
        synchro: [
          {
            id: ['image1.jpg'],
            timecode: [1000]
          }
        ]
      }
    };
    expectedReadFileResult = {};

    ArchiveFormat = chai.spy(function(mediaPackagePath) {
      this.mediaPackagePath = mediaPackagePath;
    });
    ArchiveFormat.prototype.getProperty = chai.spy(function(propertyName, callback) {
      callback(null, expectedGetPropertyValues[propertyName]);
    });

    fs = {
      access: chai.spy(function(filePath, callback) {
        callback();
      }),
      readFile: chai.spy(function(filePath, callback) {
        callback(null, expectedReadFileResult);
      })
    };

    xml2js = {
      parseString: chai.spy(function(data, options, callback) {
        callback(null, expectedParseStringResult);
      })
    };

    mock(path.join(process.rootPublish, 'app/server/packages/ArchiveFormat.js'), ArchiveFormat);
    mock('fs', fs);
    mock('xml2js', xml2js);
  });

  // Initializes tests
  beforeEach(function() {
    mock.reRequire(path.join(process.rootPublish, 'app/server/packages/ArchiveFormat.js'));
    var ArchiveFormatVersion1 = mock.reRequire(
      path.join(process.rootPublish, 'app/server/packages/ArchiveFormatVersion1.js')
    );
    archiveFormat = new ArchiveFormatVersion1(expectedMediaPackagePath);
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('getMedias', function() {

    it('should get the medias files names in the archive', function(done) {
      archiveFormat.getMedias(function(error, mediasFilesNames) {
        assert.isNull(error, 'Unexpected error');
        assert.sameMembers(mediasFilesNames, [expectedGetPropertyValues.filename], 'Wrong medias files names');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('filename');

        done();
      });
    });

    it('should execute callback with an error if getting property failed', function(done) {
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

    /**
     * Formats indexes as found in archive format version 1 into expected points of interest.
     *
     * @param {Array} indexes The list of points of interest as defined in the archive metadatas
     * @return {Array} The expected list of points of interest
     */
    function formatIndexesIntoPointsOfInterest(indexes) {
      return indexes.map(function(index) {
        var pointOfInterest = {
          type: index.type,
          timecode: index.timecode,
          data: {}
        };

        if (index.data) {
          if (index.type === 'image') {
            pointOfInterest.data = {
              filename: index.data.filename
            };
          } else if (index.type === 'tag') {
            pointOfInterest.data = {
              category: index.data.category,
              description: index.data.text,
              name: index.data.tagname
            };
          }
        }

        return pointOfInterest;
      });
    }

    it('should get the list of points of interest from metadatas and synchro.xml file', function(done) {
      archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
        assert.isNull(error, 'Unexpected error');
        assert.deepEqual(
          pointsOfInterest,
          formatIndexesIntoPointsOfInterest(expectedGetPropertyValues.indexes).concat(
            expectedParseStringResult.player.synchro.map(function(pointOfInterest) {
              return {
                type: 'image',
                timecode: pointOfInterest.timecode[0],
                data: {
                  filename: pointOfInterest.id[0]
                }
              };
            })
          ),
          'Wrong points of interest'
        );

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('indexes');
        fs.access.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.with(expectedXmlDescriptionFilePath);
        fs.readFile.should.have.been.called.exactly(1);
        fs.readFile.should.have.been.called.with(expectedXmlDescriptionFilePath);
        xml2js.parseString.should.have.been.called.exactly(1);
        xml2js.parseString.should.have.been.called.with(expectedReadFileResult);

        done();
      });
    });

    it('should ignore deprecated synchro.xml file if its does not exist', function(done) {
      fs.access = chai.spy(function(filePath, callback) {
        callback(new Error('synchro.xml file not found'));
      });

      archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
        assert.isNull(error, 'Unexpected error');
        assert.deepEqual(
          pointsOfInterest,
          formatIndexesIntoPointsOfInterest(expectedGetPropertyValues.indexes),
          'Wrong points of interest'
        );

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('indexes');
        fs.access.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.with(expectedXmlDescriptionFilePath);
        fs.readFile.should.have.been.called.exactly(0);
        xml2js.parseString.should.have.been.called.exactly(0);

        done();
      });
    });

    it('should execute callback with an error if getting points of interest from metadatas failed', function(done) {
      ArchiveFormat.prototype.getProperty = chai.spy(function(name, callback) {
        callback(expectedError);
      });

      archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
        assert.strictEqual(error, expectedError, 'Wrong error');
        assert.isUndefined(pointsOfInterest, 'Unexpected points of interest');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.exactly(0);
        fs.readFile.should.have.been.called.exactly(0);
        xml2js.parseString.should.have.been.called.exactly(0);

        done();
      });
    });

    it(
      'should execute callback with an error if no metadatas points of interest and reading synchro.xml failed',
      function(done) {
        expectedGetPropertyValues.indexes = null;

        fs.readFile = chai.spy(function(filePath, callback) {
          callback(expectedError);
        });

        archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
          assert.strictEqual(error, expectedError, 'Wrong error');
          assert.isUndefined(pointsOfInterest, 'Unexpected points of interest');

          ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
          fs.access.should.have.been.called.exactly(1);
          fs.readFile.should.have.been.called.exactly(1);
          xml2js.parseString.should.have.been.called.exactly(0);

          done();
        });
      }
    );

    it(
      'should execute callback with an error if no metadatas points of interest and parsing synchro.xml failed',
      function(done) {
        expectedGetPropertyValues.indexes = null;

        xml2js.parseString = chai.spy(function(data, options, callback) {
          callback(expectedError);
        });

        archiveFormat.getPointsOfInterest(function(error, pointsOfInterest) {
          assert.strictEqual(error, expectedError, 'Wrong error');
          assert.isUndefined(pointsOfInterest, 'Unexpected points of interest');

          ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
          fs.access.should.have.been.called.exactly(1);
          fs.readFile.should.have.been.called.exactly(1);
          xml2js.parseString.should.have.been.called.exactly(1);

          done();
        });
      }
    );

  });

  describe('validate', function() {

    it('should validate that a video file is present in the archive', function(done) {
      archiveFormat.validate(function(error, isValid) {
        assert.isNull(error, 'Unexpected error');
        assert.ok(isValid, 'Expected archive to be valid');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        ArchiveFormat.prototype.getProperty.should.have.been.called.with('filename');
        fs.access.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.with(path.join(expectedMediaPackagePath, expectedGetPropertyValues.filename));

        done();
      });
    });

    it('should indicate that package is invalid if property "filename" does not exist in metadatas', function(done) {
      expectedGetPropertyValues.filename = null;

      archiveFormat.validate(function(error, isValid) {
        assert.isNull(error, 'Unexpected error');
        assert.isNotOk(isValid, 'Expected archive to be invalid');

        ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.exactly(0);

        done();
      });
    });

    it(
      'should indicate that package is invalid if file specified in metadatas "filename" does not exist',
      function(done) {
        fs.access = chai.spy(function(filePath, callback) {
          callback(new Error('File not found'));
        });

        archiveFormat.validate(function(error, isValid) {
          assert.isNull(error, 'Unexpected error');
          assert.isNotOk(isValid, 'Expected archive to be invalid');

          ArchiveFormat.prototype.getProperty.should.have.been.called.exactly(1);
          fs.access.should.have.been.called.exactly(1);

          done();
        });
      }
    );

    it('should execute callback with an error if getting "filename" failed', function(done) {
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
