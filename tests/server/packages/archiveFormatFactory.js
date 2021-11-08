'use strict';

var path = require('path');

var chai = require('chai');
var spies = require('chai-spies');
var mock = require('mock-require');

var ArchiveFormatVersion1 = process.requirePublish('app/server/packages/ArchiveFormatVersion1.js');
var ArchiveFormatVersion2 = process.requirePublish('app/server/packages/ArchiveFormatVersion2.js');

var assert = chai.assert;

chai.should();
chai.use(spies);

describe('archiveFormatFactory', function() {
  var archiveFormatFactory;
  var fs;

  // Mocks
  beforeEach(function() {
    fs = {
      access: chai.spy(function(filePath, callback) {
        callback();
      })
    };

    mock('fs', fs);
  });

  // Initializes tests
  beforeEach(function() {
    archiveFormatFactory = mock.reRequire(
      path.join(process.rootPublish, 'app/server/packages/archiveFormatFactory.js')
    );
  });

  // Stop mocks
  afterEach(function() {
    mock.stopAll();
  });

  describe('get', function() {
    var expectedMediaPackagePath;

    beforeEach(function() {
      expectedMediaPackagePath = '/tmp/42';
    });

    it('should return an ArchiveFormatVersion2 if info.json file exists in the archive', function(done) {
      archiveFormatFactory.get(expectedMediaPackagePath, function(error, archiveFormat) {
        assert.isNull(error, 'Unexpected error');
        assert.instanceOf(archiveFormat, ArchiveFormatVersion2, 'Wrong archive format');

        fs.access.should.have.been.called.exactly(1);
        fs.access.should.have.been.called.with(path.join(expectedMediaPackagePath, 'info.json'));

        done();
      });
    });

    it('should return an ArchiveFormatVersion1 if info.json file does not exist but .session file does',
      function(done) {
        fs.access = chai.spy(function(filePath, callback) {
          if (filePath === path.join(expectedMediaPackagePath, 'info.json')) {
            return callback(new Error('File not found'));
          }
          callback();
        });

        archiveFormatFactory.get(expectedMediaPackagePath, function(error, archiveFormat) {
          assert.isNull(error, 'Unexpected error');
          assert.instanceOf(archiveFormat, ArchiveFormatVersion1, 'Wrong archive format');

          fs.access.should.have.been.called.exactly(2);
          fs.access.should.have.been.called.nth(1).called.with(path.join(expectedMediaPackagePath, 'info.json'));
          fs.access.should.have.been.called.nth(2).called.with(path.join(expectedMediaPackagePath, '.session'));

          done();
        });
      }
    );

    it('should execute callback with an error if info.json file does not exist nor .session', function(done) {
      fs.access = chai.spy(function(filePath, callback) {
        callback(new Error('File not found'));
      });

      archiveFormatFactory.get(expectedMediaPackagePath, function(error, archiveFormat) {
        assert.instanceOf(error, Error, 'Wrong error type');
        assert.isUndefined(archiveFormat, 'Unexpected archive format');

        fs.access.should.have.been.called.exactly(2);

        done();
      });
    });

  });

});
