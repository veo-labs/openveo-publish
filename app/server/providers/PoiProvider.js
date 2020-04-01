'use strict';

/**
 * @module providers
 */

var util = require('util');
var async = require('async');
var shortid = require('shortid');
var openVeoApi = require('@openveo/api');
var fileSystemApi = openVeoApi.fileSystem;
var NotFoundError = openVeoApi.errors.NotFoundError;

/**
 * Defines a PoiProvider to get and save points of interest.
 *
 * @class PoiProvider
 * @extends EntityProvider
 * @constructor
 * @param {Database} database The database to interact with
 */
function PoiProvider(database) {
  PoiProvider.super_.call(this, database, 'publish_poi');
}

module.exports = PoiProvider;
util.inherits(PoiProvider, openVeoApi.providers.EntityProvider);

/**
 * Adds points of interest.
 *
 * @method add
 * @async
 * @param {Array} pois The list of points of interest to store with for each point of interest:
 *   - **String** name The point of interest name
 *   - **Number** value The point of interest time in milliseconds
 *   - **String** [description] The point of interest description
 *   - **Object** [poi.file] The file to associate to the point of interest
 *     - **String** poi.file.originalName The file original name
 *     - **String** poi.file.mimeType The file MIME type
 *     - **String** poi.file.fileName The file name
 *     - **Number** poi.file.size The file size in Bytes
 *     - **String** poi.file.url The file URL
 *     - **String** poi.file.path The file path on the file system
 * @param {Function} [callback] The function to call when it's done with:
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The total amount of points of interest inserted
 *   - **Array** The list of added points of interest
 */
PoiProvider.prototype.add = function(pois, callback) {
  var poisToAdd = [];

  for (var i = 0; i < pois.length; i++) {
    var poi = pois[i];

    if (!poi.name || !Object.prototype.hasOwnProperty.call(poi, 'value'))
      return this.executeCallback(callback, new TypeError('Requires name and value to add a point of interest'));

    var poiToAdd = {
      id: poi.id || shortid.generate(),
      name: poi.name,
      value: poi.value,
      description: poi.description,
      file: null
    };

    if (poi.file) {
      poiToAdd.file = {
        originalName: poi.file.originalName,
        mimeType: poi.file.mimeType,
        fileName: poi.file.fileName,
        size: poi.file.size,
        url: poi.file.url,
        path: poi.file.path
      };
    }

    poisToAdd.push(poiToAdd);
  }

  PoiProvider.super_.prototype.add.call(this, poisToAdd, callback);
};

/**
 * Updates a point of interest.
 *
 * @method updateOne
 * @async
 * @param {ResourceFilter} [filter] Rules to filter the point of interest to update
 * @param {Object} poi The point of interest description object
 * @param {Number} [poi.value] The point of interest time in milliseconds
 * @param {String} [poi.name] The point of interest name
 * @param {String} [poi.description] The point of interest description
 * @param {Object} [poi.file] The new file to associate to the point of interest replacing the previous one, if null
 * the file is removed
 * @param {String} [poi.file.originalName] The file original name
 * @param {String} [poi.file.mimeType] The file MIME type
 * @param {String} [poi.file.fileName] The file name
 * @param {String} [poi.file.size] The file size in Bytes
 * @param {String} [poi.file.url] The file URL
 * @param {String} [poi.file.path] The file path on the file system
 * @param {Function} [callback] The function to call when it's done with:
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** 1 if everything went fine
 */
PoiProvider.prototype.updateOne = function(filter, poi, callback) {
  var self = this;
  var oldFilePath;
  var total;
  var asyncFunctions = [];

  // Get point of interest
  this.getOne(
    filter,
    {
      include: ['id', 'file']
    },
    function(getOneError, storedPoi) {
      if (getOneError) return self.executeCallback(callback, getOneError);
      if (!storedPoi) return self.executeCallback(callback, new NotFoundError(JSON.stringify(filter)));

      if (poi.file) {

        // New file

        // Old file should be deleted
        // Mark old file as "to be deleted"
        if (storedPoi.file)
          oldFilePath = storedPoi.file.path;

        storedPoi.file = {
          originalName: poi.file.originalName,
          mimeType: poi.file.mimeType,
          fileName: poi.file.fileName,
          size: poi.file.size,
          url: poi.file.url,
          path: poi.file.path
        };

      } else if (poi.file === null) {

        // No file is associated to the point of interest anymore

        if (storedPoi.file) {

          // No more file associated to the point of interest
          // Mark old file as "to be deleted"
          oldFilePath = storedPoi.file.path;

        }

        storedPoi.file = null;
      }

      if (poi.name) storedPoi.name = poi.name;
      if (Object.prototype.hasOwnProperty.call(poi, 'description')) storedPoi.description = poi.description;
      if (Object.prototype.hasOwnProperty.call(poi, 'value')) storedPoi.value = poi.value;

      // Remove file
      if (oldFilePath) {
        asyncFunctions.push(function(removeCallback) {
          fileSystemApi.rm(oldFilePath, function(removeError) {
            removeCallback(removeError);
          });
        });
      }

      // Update point of interest
      asyncFunctions.push(function(updateCallback) {
        PoiProvider.super_.prototype.updateOne.call(self, filter, storedPoi, function(error, updateTotal) {
          total = updateTotal;
          self.executeCallback(updateCallback, error);
        });
      });

      async.parallel(asyncFunctions, function(error) {
        return self.executeCallback(callback, error, total);
      });

    }
  );
};

/**
 * Removes points of interest.
 *
 * File associated to the points of interest will be removed as well.
 *
 * @method remove
 * @async
 * @param {ResourceFilter} [filter] Rules to filter points of interest to remove
 * @param {Function} [callback] The function to call when it's done with:
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Number** The number of removed points of interest
 */
PoiProvider.prototype.remove = function(filter, callback) {
  var self = this;
  var pois;
  var totalRemovedPois = 0;

  async.series([

    // Get points of interest
    function(callback) {
      self.getAll(filter,
        {
          include: ['id', 'file']
        },
        {
          id: 'desc'
        },
        function(getAllError, fetchedPois) {
          pois = fetchedPois;
          return self.executeCallback(callback, getAllError);
        }
      );
    },

    // Remove related files
    function(callback) {
      if (!pois || !pois.length) return callback();

      var asyncFunctions = [];
      var filesPaths = pois.map(function(poi) {
        return poi.file ? poi.file.path : null;
      });

      if (!filesPaths.length) return callback();
      filesPaths.forEach(function(filePath) {
        if (!filePath) return;

        asyncFunctions.push(function(removeCallback) {
          fileSystemApi.rm(filePath, function(removeError) {
            if (removeError && removeError.code !== 'ENOENT') return removeCallback(removeError);
            removeCallback();
          });
        });
      });

      async.parallel(asyncFunctions, function(error) {
        self.executeCallback(callback, error);
      });
    },

    // Remove points of interest
    function(callback) {
      if (!pois || !pois.length) return callback();

      PoiProvider.super_.prototype.remove.call(self, filter, function(error, total) {
        totalRemovedPois = total;
        self.executeCallback(callback, error);
      });
    }

  ], function(error) {
    self.executeCallback(callback, error, totalRemovedPois);
  });

};

/**
 * Creates points of interest indexes.
 *
 * @method createIndexes
 * @async
 * @param {Function} callback Function to call when it's done with:
 *  - **Error** An error if something went wrong, null otherwise
 */
PoiProvider.prototype.createIndexes = function(callback) {
  this.storage.createIndexes(this.location, [
    {key: {name: 'text', description: 'text'}, weights: {name: 2}, name: 'querySearch'}
  ], function(error, result) {
    if (result && result.note)
      process.logger.debug('Create points of interest indexes : ' + result.note);

    callback(error);
  });
};
