'use strict';

var util = require('util');
var path = require('path');
var async = require('async');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var e2e = require('@openveo/test').e2e;
var Helper = e2e.helpers.Helper;
var STATES = process.requirePublish('app/server/packages/states.js');
var fileSystem = openVeoApi.fileSystem;

var publicDirectory = path.normalize(process.rootPublish + '/assets/player/videos/');

/**
 * Creates a new MediaHelper to help manipulate medias without interacting with the web browser.
 *
 * Each function is inserting in protractor's control flow.
 *
 * @param {VideoModel} model The entity model that will be used by the Helper
 * @param {Array} properties A list of properties to associate to videos to create
 * @param {Array} categories A list of categories to associate to videos to create
 */
function MediaHelper(model, properties, categories) {
  MediaHelper.super_.call(this, model);

  // The list of available media properties
  this.properties = properties || [];

  // The list of available media categories
  this.categories = categories || [];

  this.textSearchProperties = ['title', 'description'];
  this.sortProperties = [
    {
      name: 'title',
      type: 'string'
    },
    {
      name: 'description',
      type: 'string'
    },
    {
      name: 'date',
      type: 'number'
    },
    {
      name: 'state',
      type: 'number'
    },
    {
      name: 'views',
      type: 'number'
    }
  ];
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
  var states = [STATES.READY, STATES.PUBLISHED];
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
      packageType: fileSystem.FILE_TYPES.TAR,
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
    openVeoApi.fileSystem.mkdir(videoPublicDirectory,
      function(error) {
        if (error)
          throw error;
        else {

          // Copy video file to public directory
          var mediaFile = path.join(mediaFilePath, mediaFileName);
          var finalFile = path.join(videoPublicDirectory, mediaFileName);
          openVeoApi.fileSystem.copy(mediaFile, finalFile, function(error) {
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
        openVeoApi.fileSystem.rmdir(path.join(publicDirectory, mediaId), function(error) {
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

/**
 * Gets entity object example to use with web service put /entityName.
 *
 * If the entity managed by the Helper is registered to be tested automatically by the core, it needs to implement
 * this method which will be used to perform a put /entityName.
 *
 * @method getAddExample
 * @return {Object} The data to add
 */
MediaHelper.prototype.getAddExample = function() {
  return {
    id: shortid.generate(),
    title: 'Video example',
    description: 'Video example description',
    category: '1445433239636',
    properties: [{property1: 'property1 value'}],
    cut: [
      {
        value: 0.1,
        name: 'UI.BEGIN',
        description: '',
        type: 'begin'
      },
      {
        value: 0.2,
        name: 'UI.END',
        description: '',
        type: 'end'
      }
    ],
    chapters: [
      {
        name: 'Chapter example',
        description: 'Chapter example description',
        value: 0.1
      }
    ],
    views: 0
  };
};

/**
 * Gets entity object example to use with web service post /entityName.
 *
 * If the entity managed by the Helper is registered to be tested automatically by the core, it needs to implement
 * this method which will be used to perform a post /entityName.
 *
 * @method getUpdateExample
 * @return {Object} The data to perform the update
 */
MediaHelper.prototype.getUpdateExample = function() {
  return {
    title: 'Video example new title',
    description: 'Video example new description',
    category: '1445433239640',
    properties: [{property2: 'property2 value'}],
    cut: [
      {
        value: 0.3,
        name: 'UI.BEGIN',
        description: '',
        type: 'begin'
      },
      {
        value: 0.4,
        name: 'UI.END',
        description: '',
        type: 'end'
      }
    ],
    chapters: [
      {
        name: 'Chapter example new name',
        description: 'Chapter example new description',
        value: 0.2
      }
    ],
    views: 100
  };
};
