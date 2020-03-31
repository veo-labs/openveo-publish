'use strict';

var async = require('async');
var openVeoApi = require('@openveo/api');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var ResourceFilter = openVeoApi.storages.ResourceFilter;

module.exports.update = function(callback) {
  process.logger.info('Publish 2.0.2 migration launched.');
  var coreApi = process.api.getCoreApi();
  var videoProvider = new VideoProvider(coreApi.getDatabase());

  async.series([

    // Update publish properties collection
    function(callback) {
      videoProvider.getAll(null, null, {id: 'desc'}, function(error, medias) {
        if (error) return callback(error);

        // No need to change anything
        if (!medias || !medias.length) return callback();

        else {
          var series = [];
          medias.forEach(function(media) {
            series.push(function(callback) {
              var modifications = {};
              var metadata = media.metadata || {};

              if (!metadata.user) modifications.user = coreApi.getAnonymousUserId();
              if (!metadata.groups) modifications.groups = [];

              if (modifications.user || modifications.groups)
                videoProvider.updateOne(new ResourceFilter().equal('id', media.id), modifications, callback);
              else
                callback();
            });
          });

          async.series(series, callback);
        }
      });
    }
  ], function(error) {
    if (error) return callback(error);
    process.logger.info('Publish 2.0.2 migration done.');
    callback();
  });
};
