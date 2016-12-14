'use strict';

// Module dependencies
var path = require('path');
var fs = require('fs');
var assert = require('chai').assert;
var openVeoAPI = require('@openveo/api');
var applicationStorage = openVeoAPI.applicationStorage;
var FakeVideoDatabase = require('./database/FakeVideoDatabase.js');

// VideoModel.js
describe('VideoModel', function() {
  var videoModel,
    VideoModel;

  // Initializes tests
  beforeEach(function() {
    VideoModel = process.requirePublish('app/server/models/VideoModel.js');
    applicationStorage.setDatabase(new FakeVideoDatabase());
    videoModel = new VideoModel();

    var videosDirectoryPath = path.normalize(path.join(__dirname, '/assets/player/videos/5'));

    fs.exists(videosDirectoryPath, function(exists) {
      if (!exists)
        fs.mkdir(videosDirectoryPath, function() {
        });
    });
  });

  it('Should be an instance of EntityModel', function() {
    assert.ok(videoModel instanceof openVeoAPI.EntityModel);
  });

  // add method
  describe('add', function() {

    it('Should be able to add a video', function() {

      videoModel.add({
        id: '1',
        status: 1,
        metadata: {},
        url: '',
        type: 'type',
        errorCode: 1,
        published: 1,
        properties: {}
      },
      function(error, client) {
        assert.isNull(error);
        assert.isDefined(client);
      });

    });

  });

  // get method
  describe('get', function() {

    it('Should be able to get videos and their associated properties', function() {

      videoModel.get(null, function(error, videos) {
        assert.isNull(error);
        assert.isDefined(videos);
        assert.isArray(videos);
      });

    });

  });

  // getOne method
  describe('getOne', function() {

    it('Should be able to get a video and the list of timecodes', function(done) {

      process.rootPublish = path.join(__dirname);
      videoModel.getOne('1', null, function(error) {
        process.rootPublish = path.join(__dirname, '../../');
        assert.isNull(error);
        done();
      });

    });

  });

  // remove method
  describe('remove', function() {

    it('Should be able to remove a video from database and its assets directory', function(done) {

      process.rootPublish = __dirname;
      videoModel.remove('5', function(error) {
        assert.isNull(error);
        var videosDirectoryPath = path.normalize(process.rootPublish + '/assets/player/videos/5');

        process.rootPublish = path.join(__dirname, '../../');

        fs.exists(videosDirectoryPath, function(exists) {
          assert.notOk(exists);
          done();
        });
      });

    });

  });

  // update method
  describe('update', function() {

    it('Should be able to update a video', function() {

      videoModel.update('6', {
        title: 'title',
        description: 'description',
        properties: [
          {
            id: 1,
            value: 'Value 1'
          }
        ]
      },
      function(error) {
        assert.isNull(error);
      });

    });

  });

});
