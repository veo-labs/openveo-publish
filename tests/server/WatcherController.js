'use strict';

// Module dependencies
var path = require('path');
var assert = require('chai').assert;

// WatcherController.js
describe('WatcherController', function() {
  var watcherController,
    request,
    response;

  // Initializes tests
  before(function() {
    request = {
      params: {}
    };
    response = {
      locals: {}
    };

    process.rootPublish = path.join(__dirname);
    var WatcherController = process.requirePublish('../../app/server/controllers/WatcherController.js');
    watcherController = new WatcherController();
  });

  // Restore rootPublish path after tests
  after(function() {
    process.rootPublish = path.join(__dirname, '../../');
  });

  // getStatusAction method
  describe('getStatusAction', function() {

    it('should be able to send back the status of the watcher as a JSON object', function(done) {

      response = {
        send: function(data) {
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.getStatusAction(request, response);
    });

  });

  // stopAction method
  describe('stopAction', function() {

    it('should be able to stop the watcher and send back its status as a JSON object', function(done) {

      response = {
        send: function(data) {
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.stopAction(request, response);
    });

  });

  // startAction method
  describe('startAction', function() {

    it('should be able to start the watcher and send back its status as a JSON object', function(done) {

      response = {
        send: function(data) {
          assert.isDefined(data);
          assert.equal(data.status, 0);
          done();
        }
      };

      watcherController.startAction(request, response);
    });

  });

});
