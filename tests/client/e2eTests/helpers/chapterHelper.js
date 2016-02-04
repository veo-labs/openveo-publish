'use strict';

var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var videoModel = new VideoModel();

/**
 * Removes all chapters and cuts of a media.
 *
 * @param {String} mediaId Id of the media
 * @return {Promise} Promise resolving when all chapters and cuts have been removed
 */
module.exports.clearChapters = function(mediaId) {
  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    videoModel.update(mediaId, {
      cut: [],
      chapters: []
    }, function(error) {
      if (error)
        throw error;
      else
        deferred.fulfill();
    });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });
  });

};
