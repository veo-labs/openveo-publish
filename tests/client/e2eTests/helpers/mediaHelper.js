'use strict';

var path = require('path');
var openVeoAPI = require('@openveo/api');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');

var videoModel = new VideoModel();
var publicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/');

/**
 * Creates a media for tests.
 *
 * It copies the media file into publish public directory and then creates the database entry for this media.
 *
 * @param {String} mediasId The media id
 * @param {String} mediaFilePath Path to the directory containing the media package
 * @param {String} mediaFileName Name of the media package file
 * @return {Promise} Promise resolving with create media information
 */
module.exports.createMedia = function(mediaId, mediaFilePath, mediaFileName) {
  var deferred = protractor.promise.defer();
  var mediasPage = new MediaPage(videoModel);

  return mediasPage.logAsAdmin().then(function() {
    return mediasPage.load();
  }).then(function() {
    var videoPublicDirectory = path.join(publicDirectory, mediaId);

    // Create video public directory
    openVeoAPI.fileSystem.mkdir(videoPublicDirectory,
      function(error) {
        if (error)
          throw error;
        else {

          // Copy video file to public directory
          var mediaFile = path.join(mediaFilePath, mediaFileName);
          var finalFile = path.join(videoPublicDirectory, mediaFileName);
          openVeoAPI.fileSystem.copy(mediaFile, finalFile, function(error) {
            if (error)
              throw error;

            deferred.fulfill();
          });
        }
      });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });

  }).then(function() {

    // Create media information into database
    var mediasToAdd = [
      {
        id: mediaId,
        mediaId: mediaId,
        available: true,
        state: VideoModel.PUBLISHED_STATE,
        title: 'Test chapters',
        files: [{
          width: 1920,
          height: 1080,
          link: '/publish/player/videos/' + mediaId + '/' + mediaFileName
        }]
      }
    ];

    return mediasPage.addLinesByPass(mediasToAdd, false);
  }).then(function(mediasAdded) {
    return protractor.promise.fulfilled(mediasAdded);
  });
};

/**
 * Removes all medias.
 *
 * Also the whole public directory is removed.
 *
 * @param {Array} medias The list of medias entries to remove from database, as returned addLinesByPass method
 * @return {Promise} Promise resolving when all medias have been removed
 */
module.exports.removeMedias = function(medias) {
  var mediasPage = new MediaPage(videoModel);

  return mediasPage.logAsAdmin().then(function() {
    var deferred = protractor.promise.defer();

    // Remove video public directory
    openVeoAPI.fileSystem.rmdir(publicDirectory, function(error) {
      if (error)
        throw error;

      deferred.fulfill();
    });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });

  }).then(function() {
    mediasPage.load();

    // Remove media information
    return browser.waitForAngular().then(function() {
      mediasPage.removeLinesByPass(medias);
    });
  });
};

/**
 * Removes all medias from database.
 *
 * @return {Promise} Promise resolving when all medias have been removed
 */
module.exports.removeAllMedias = function() {
  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();
    var videoModel = new VideoModel();
    videoModel.get(function(error, videos) {
      var ids = [];

      if (error)
        throw error;

      for (var i = 0; i < videos.length; i++)
        ids.push(videos[i].id);

      if (ids.length) {
        videoModel.remove(ids, function(error) {
          if (error)
            throw error;
          else
            deferred.fulfill();
        });
      } else
        deferred.fulfill();
    });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });
  });
};
