'use strict';

/* eslint no-sync: 0 */
var fs = require('fs');
var path = require('path');
var assert = require('chai').assert;
var openVeoApi = require('@openveo/api');
var Watcher = process.requirePublish('app/server/Watcher.js');
var fileSystem = openVeoApi.fileSystem;

// Watcher.js
describe('Watcher', function() {
  var tmpDir = path.join(__dirname, 'tmp');
  var watcher;

  beforeEach(function(done) {
    fileSystem.mkdir(tmpDir, done);
  });

  afterEach(function(done) {
    fileSystem.rmdir(tmpDir, function() {
      if (watcher) watcher.stop();
      done();
    });
  });

  // STATUSES property
  describe('STATUSES', function() {

    it('should not be editable', function() {
      assert.throws(function() {
        Watcher.STATUSES.STARTED = null;
      });
    });

  });

  // start method
  describe('start', function() {

    it('should be able to start a watcher', function(done) {
      watcher = new Watcher();

      watcher.on('status', function(status) {
        if (status === Watcher.STATUSES.STARTED)
          done();
      });

      watcher.start([tmpDir]);
    });

    it('should detect if a file was present in a watched folder at start', function(done) {
      var expectedFile = path.join(tmpDir, 'test.txt');
      watcher = new Watcher();

      watcher.on('newFile', function(filePath) {
        assert.strictEqual(filePath, expectedFile);
        done();
      });

      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'File content', {encoding: 'utf8'});
      watcher.start([tmpDir]);
    });

    it('should throw an error if trying to start a watcher already started', function(done) {
      watcher = new Watcher();
      watcher.start([tmpDir]);

      watcher.on('status', function(status) {
        if (status === Watcher.STATUSES.STARTED) {
          assert.throws(function() {
            watcher.start([tmpDir]);
          });
          done();
        }
      });
    });

    it('should not be able to start the watcher if not stopped', function() {
      watcher = new Watcher();

      watcher.on('status', function(status) {
        assert.ok(false, 'Unexpected change of status');
      });

      for (var statusName in Watcher.STATUSES) {
        if (Watcher.STATUSES[statusName] !== Watcher.STATUSES.STOPPED) {
          watcher.status = Watcher.STATUSES[statusName];
          watcher.start([tmpDir]);
        }
      }
    });

    it('should emit an error if a directory can\'t be read', function(done) {
      watcher = new Watcher();

      watcher.on('error', function(error) {
        done();
      });

      watcher.start(['wrong directory path']);
    });

  });

  // stop method
  describe('stop', function() {

    it('should be able to stop the watcher', function(done) {
      watcher = new Watcher();

      watcher.on('status', function(status) {
        if (status === Watcher.STATUSES.STARTED)
          watcher.stop();
        else if (status === Watcher.STATUSES.STOPPED)
          done();
      });

      watcher.start([tmpDir]);
    });

    it('should not be able to stop the watcher if not started', function(done) {
      watcher = new Watcher();

      watcher.on('status', function(status) {
        if (status === Watcher.STATUSES.STARTED)
          watcher.stop();
        else if (status === Watcher.STATUSES.STOPPED)
          done();
      });

      watcher.start([tmpDir]);
    });

  });

  // getStatus method
  describe('getStatus', function() {

    it('should return the actual watcher\'s status', function() {
      var expectedStatus = Watcher.STATUSES.STARTED;
      watcher = new Watcher();
      watcher.status = expectedStatus;
      assert.strictEqual(watcher.getStatus(), watcher.status);
    });

  });

});
