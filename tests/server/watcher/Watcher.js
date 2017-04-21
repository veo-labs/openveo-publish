'use strict';

/* eslint no-sync: 0 */
var util = require('util');
var fs = require('fs');
var path = require('path');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var Watcher = process.requirePublish('app/server/watcher/Watcher.js');
var fileSystem = openVeoApi.fileSystem;

// Watcher.js
describe('Watcher', function() {
  var tmpDir = path.join(__dirname, 'tmp');
  var resourcesDir = path.join(__dirname, 'resources');
  var hotFolder = path.join(tmpDir, 'hotFolder');
  var hotFolder2 = path.join(tmpDir, 'hotFolder2');
  var noop = function() {};
  var watcher;

  // Prepare tests
  beforeEach(function(done) {
    watcher = new Watcher({
      stabilityThreshold: 10
    });
    watcher.on('error', function(error) {
      util.inspect(error && error.message + ' (' + error.directoryPath + ')');
    });
    fileSystem.mkdir(hotFolder, done);
  });

  // Clean up tests
  afterEach(function(done) {
    watcher.remove();
    fileSystem.rmdir(tmpDir, function() {
      done();
    });
  });

  describe('add', function() {

    it('should emit a "create" event if a file is added inside a watched directory', function(done) {
      var expectedFilePath = path.join(hotFolder, 'file.txt');
      watcher.on('create', function(resourcePath) {
        assert.equal(resourcePath, expectedFilePath, 'Unexpected file path');
        done();
      });

      watcher.add([hotFolder], function(results) {
        fs.writeFile(expectedFilePath, 'File content', {encoding: 'utf8'}, noop);
      });
    });

    it('should emit a "create" event if a directory is added inside a watched directory', function(done) {
      var expectedDirectoryPath = path.join(hotFolder, 'directory');
      var directoryPath;

      watcher.on('create', function(resourcePath) {
        directoryPath = resourcePath;
      });

      watcher.on('watch', function(resourcePath) {
        if (resourcePath === expectedDirectoryPath) {
          assert.equal(directoryPath, expectedDirectoryPath, 'Unexpected directory path');
          done();
        }
      });

      watcher.add([hotFolder], function(results) {
        fs.mkdir(expectedDirectoryPath, noop);
      });
    });

    it('should emit a "delete" event if a directory is deleted from a watched directory', function(done) {
      var expectedDirectoryPath = path.join(hotFolder, 'directory');

      watcher.on('delete', function(resourcePath) {
        assert.equal(resourcePath, expectedDirectoryPath, 'Unexpected directory path');
        done();
      });

      watcher.on('watch', function(resourcePath) {
        if (resourcePath === expectedDirectoryPath) {
          watcher.remove([expectedDirectoryPath]);
          fileSystem.rmdir(expectedDirectoryPath, noop);
        }
      });

      watcher.add([hotFolder], function(results) {
        fileSystem.mkdir(expectedDirectoryPath, noop);
      });
    });

    it('should emit a "delete" event if a file is deleted from a watched directory', function(done) {
      var expectedFilePath = path.join(hotFolder, 'file.txt');

      watcher.on('create', function(resourcePath) {
        fs.unlink(expectedFilePath, noop);
      });

      watcher.on('delete', function(resourcePath) {
        assert.equal(resourcePath, expectedFilePath, 'Unexpected file path');
        done();
      });

      watcher.add([hotFolder], function(results) {
        fs.writeFile(expectedFilePath, 'File content', {encoding: 'utf8'}, noop);
      });
    });

    it('should emit a "watch" event if a directory is added to a watched directory', function(done) {
      var expectedDirectoryPath = path.join(hotFolder, 'directory');

      watcher.on('watch', function(resourcePath) {
        if (resourcePath === expectedDirectoryPath)
          done();
      });

      watcher.add([hotFolder], function(results) {
        fileSystem.mkdir(expectedDirectoryPath, noop);
      });
    });

    it('should emit a "create" event if a file is added to a newly watched directory', function(done) {
      var expectedDirectoryPath = path.join(hotFolder, 'directory');
      var expectedFilePath = path.join(hotFolder, 'directory', 'file.txt');

      watcher.on('create', function(resourcePath) {
        if (resourcePath === expectedFilePath)
          done();
      });

      watcher.on('watch', function(directoryPath) {
        if (directoryPath === expectedDirectoryPath)
          fs.writeFile(expectedFilePath, 'File content', {encoding: 'utf8'}, noop);
      });

      watcher.add([hotFolder], function(results) {
        fileSystem.mkdir(expectedDirectoryPath, noop);
      });
    });

    it('should emit a "create" event if a directory is added to a newly watched directory', function(done) {
      var expectedDirectoryPath = path.join(hotFolder, 'directory');
      var expectedSubDirectoryPath = path.join(hotFolder, 'directory', 'subDirectory');

      watcher.on('create', function(resourcePath) {
        if (resourcePath === expectedSubDirectoryPath)
          done();
      });

      watcher.on('watch', function(directoryPath) {
        if (directoryPath === expectedDirectoryPath)
          fileSystem.mkdir(expectedSubDirectoryPath, noop);
      });

      watcher.add([hotFolder], function(results) {
        fileSystem.mkdir(expectedDirectoryPath, noop);
      });
    });

    it('should emit a "create" event and a "delete" event if a file is renamed inside a watched directory',
      function(done) {
        var expectedNewPath = path.join(hotFolder, 'newName.txt');
        var expectedOldPath = path.join(hotFolder, 'oldName.txt');
        var gotCreateEvent = false;
        var gotDeleteEvent = false;

        watcher.on('create', function(resourcePath) {
          if (resourcePath === expectedNewPath) {
            gotCreateEvent = true;

            if (gotCreateEvent && gotDeleteEvent)
              done();
          } else if (resourcePath === expectedOldPath) {
            fs.rename(expectedOldPath, expectedNewPath, noop);
          }
        });

        watcher.on('delete', function(resourcePath) {
          if (resourcePath === expectedOldPath) {
            gotDeleteEvent = true;

            if (gotCreateEvent && gotDeleteEvent)
              done();
          }
        });

        watcher.add([hotFolder], function(results) {
          fs.writeFile(expectedOldPath, 'File content', {encoding: 'utf8'}, noop);
        });
      }
    );

    it('should emit a "create" event and a "delete" event if a directory is renamed inside a watched directory',
      function(done) {
        var expectedNewPath = path.join(hotFolder, 'newName');
        var expectedOldPath = path.join(hotFolder, 'oldName');
        var gotCreateEvent = false;
        var gotDeleteEvent = false;

        watcher.on('create', function(resourcePath) {
          if (resourcePath === expectedNewPath) {
            gotCreateEvent = true;

            if (gotCreateEvent && gotDeleteEvent)
              done();
          } else if (resourcePath === expectedOldPath) {
            fs.rename(expectedOldPath, expectedNewPath, noop);
          }
        });

        watcher.on('delete', function(resourcePath) {
          if (resourcePath === expectedOldPath) {
            gotDeleteEvent = true;

            if (gotCreateEvent && gotDeleteEvent)
              done();
          }
        });

        watcher.add([hotFolder], function(results) {
          fileSystem.mkdir(expectedOldPath, noop);
        });
      }
    );

    it('should be able to detect changes on multiple directories', function(done) {
      var expectedResource1Path = path.join(hotFolder, 'file.txt');
      var expectedResource2Path = path.join(hotFolder2, 'file.txt');
      var expectedResource3Path = path.join(hotFolder, 'directory');
      var expectedResource4Path = path.join(hotFolder2, 'directory');
      var count = 0;

      watcher.on('create', function(resourcePath) {
        count++;
        if (count === 4)
          done();
      });

      fileSystem.mkdir(hotFolder2, function() {
        watcher.add([hotFolder, hotFolder2], function(results) {
          fs.writeFile(expectedResource1Path, 'File content', {encoding: 'utf8'}, noop);
          fs.writeFile(expectedResource2Path, 'File content', {encoding: 'utf8'}, noop);
          fileSystem.mkdir(expectedResource3Path, noop);
          fileSystem.mkdir(expectedResource4Path, noop);
        });
      });
    });

    it('should emit a "create" event for all resources already in watched directory at start', function(done) {
      var expectedResourcesPaths = [
        path.join(resourcesDir, 'hotFolder'),
        path.join(resourcesDir, 'hotFolder', 'test.txt'),
        path.join(resourcesDir, 'test.txt')
      ];
      var count = 0;
      watcher.on('create', function(resourcePath) {
        count++;
        assert.include(expectedResourcesPaths, resourcePath);

        if (count === expectedResourcesPaths.length)
          done();
      });

      watcher.add([resourcesDir], function(results) {
        assert.isUndefined(results[0].error);
      });
    });

    it('should execute callback with an error if directory does not exist', function() {
      watcher.add(['wrong directory path'], function(results) {
        assert.isDefined(results[0].error, 'Expected an error');
      });
    });

    it('should throw an Error if directoriesPaths is not an array', function() {
      var wrongValues = [42, 'String', {}, true];

      wrongValues.forEach(function(wrongValue) {
        assert.throw(function() {
          watcher.add(wrongValue, noop);
        }, null, null, 'Expected an error for value "' + wrongValue + '"');
      });
    });

  });

  describe('remove', function() {

    it('should not detect new resources if directory is not longer watched', function(done) {
      var expectedFilePath = path.join(hotFolder, 'file.txt');

      watcher.on('create', function(resourcePath) {
        assert.ok(false, 'Unexpected "create" event');
      });

      watcher.add([hotFolder], function(results) {
        watcher.remove([hotFolder]);
        fileSystem.mkdir(expectedFilePath, function() {
          setTimeout(function() {
            done();
          }, 50);
        });
      });
    });

  });

});
