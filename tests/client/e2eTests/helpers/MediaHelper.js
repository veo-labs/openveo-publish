'use strict';

var util = require('util');
var path = require('path');
var async = require('async');
var openVeoAPI = require('@openveo/api');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');

var publicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/');

/**
 * Creates a new MediaHelper to help manipulate medias without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {VideoModel} model The entity model that will be used by the Helper
 */
function MediaHelper(model, properties, categories) {
  MediaHelper.super_.call(this, model);

  // The list of available media properties
  this.properties = properties || [];

  // The list of available media categories
  this.categories = categories || [];
}

module.exports = MediaHelper;
util.inherits(MediaHelper, Helper);

/**
 * Adds multiple entities at the same time with automatic index.
 *
 * This method bypass the web browser to directly add entities into database.
 *
 * All created entities will have the same name suffixed by the index.
 *
 * @method addEntitiesAuto
 * @param {String} name Base name of the entities to add
 * @param {Number} total Number of entities to add
 * @param {Number} [offset=0] Index to start from for the name suffix
 * @return {Promise} Promise resolving with the added entities
 */
MediaHelper.prototype.addEntitiesAuto = function(name, total, offset) {
  var entities = [];
  var date = new Date();
  var states = [VideoModel.READY_STATE, VideoModel.PUBLISHED_STATE];
  var categories = this.getCategories();
  offset = offset || 0;

  for (var i = offset; i < total; i++) {
    var category = null;

    if (categories.length)
      category = (i < categories.length) ? categories[i].id : categories[0].id;

    date.setDate(date.getDate() + 1);
    entities.push({
      id: name + i,
      state: (i < states.length) ? states[i] : states[0],
      date: date.getTime(),
      title: name + ' ' + i,
      category: category,
      properties: this.getProperties(),
      packageType: 'tar',
      description: name + ' description ' + i
    });
  }

  return this.addEntities(entities);
};

/**
 * Creates a media for tests.
 *
 * It copies the media file into publish public directory and then creates the database entry for this media.
 *
 * @param {String} mediasId The media id
 * @param {String} mediaFilePath Path to the directory containing the media package
 * @param {String} mediaFileName Name of the media package file
 * @param {Number} mediaState State of the media
 * @param {Array} groups A list of group ids
 * @return {Promise} Promise resolving with create media information
 */
MediaHelper.prototype.createMedia = function(mediaId, mediaFilePath, mediaFileName, mediaState, groups) {
  var self = this;

  return this.flow.execute(function() {
    var deferred = protractor.promise.defer();

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

    return deferred.promise;
  }).then(function() {

    // Create media information into database
    var mediasToAdd = [
      {
        id: mediaId,
        mediaId: mediaId,
        available: true,
        state: mediaState,
        title: 'Test',
        groups: groups,
        sources: {
          files: [{
            width: 1920,
            height: 1080,
            link: '/publish/player/videos/' + mediaId + '/' + mediaFileName
          }]
        }
      }
    ];

    return self.addEntities(mediasToAdd);
  }).then(function(mediasAdded) {
    return protractor.promise.fulfilled(mediasAdded);
  });
};

/**
 * Removes multiple entities at the same time.
 *
 * It also removes the media public directory.
 * This method bypass the web browser to directly remove entities from database.
 *
 * @method removeEntities
 * @param {Array} entities A list of entities
 * @return {Promise} Promise resolving when entities are removed
 */
MediaHelper.prototype.removeEntities = function(medias) {
  var self = this;

  return this.flow.execute(function() {
    var deferred = protractor.promise.defer();
    var parallel = [];

    // Create function for async to remove a video directory
    function createRemoveFunction(mediaId) {

      // Add function to the list of functions to execute in parallel
      parallel.push(function(callback) {

        // Remove video directory
        openVeoAPI.fileSystem.rmdir(path.join(publicDirectory, mediaId), function(error) {
          callback(error);
        });

      });
    }

    // Create functions to remove video directories with async
    for (var i = 0; i < medias.length; i++)
      createRemoveFunction(medias[i].id);

    // Nothing to remove
    if (!parallel.length)
      return protractor.promise.fulfilled();

    // Asynchonously remove video directories
    async.parallel(parallel, function(error) {
      if (error)
        deferred.reject(error);
      else
        deferred.fulfill();
    });

    return deferred.promise;
  }).then(function() {
    return MediaHelper.super_.prototype.removeEntities.call(self, medias);
  });
};

/**
 * Gets properties with null as default value.
 *
 * @return {Object} The list of properties with null as default value
 */
MediaHelper.prototype.getProperties = function() {
  var properties = {};
  for (var i = 0; i < this.properties.length; i++)
    properties[this.properties[i].id] = null;

  return properties;
};

/**
 * Gets the list of available categories.
 *
 * @return {Array} The list of available categories for medias
 */
MediaHelper.prototype.getCategories = function(categories) {
  return this.categories.tree;
};

/**
 * Removes all chapters and cuts of a media.
 *
 * @param {String} mediaId Id of the media
 * @return {Promise} Promise resolving when all chapters and cuts have been removed
 */
MediaHelper.prototype.clearChapters = function(mediaId) {
  var self = this;

  return this.flow.execute(function() {
    var deferred = protractor.promise.defer();

    self.model.update(mediaId, {
      cut: [],
      chapters: []
    }, function(error) {
      if (error)
        throw error;
      else
        deferred.fulfill();
    });
    return deferred.promise;
  });
};

/**
 * Sets media available properties.
 *
 * @param {Array} properties The list of properties available for medias
 */
MediaHelper.prototype.setProperties = function(properties) {
  this.properties = properties;
};

/**
 * Sets media available categories.
 *
 * @param {Object} categories The categories tree available for medias
 */
MediaHelper.prototype.setCategories = function(categories) {
  this.categories = categories;
};
