'use strict';

/**
 * @module providers
 */

var fs = require('fs');
var util = require('util');
var mime = require('mime');
var async = require('async');
var google = require('googleapis');
var youtube = google.youtube('v3');
var YoutubeResumableUpload = process.requirePublish(
  'app/server/providers/videoPlatforms/youtube/YoutubeResumableUpload.js'
);
var VideoPlatformProvider = process.requirePublish('app/server/providers/videoPlatforms/VideoPlatformProvider.js');

/**
 * Available upload methods.
 *
 * @property UPLOAD_METHODS
 * @type Array
 * @private
 * @final
 */
var UPLOAD_METHODS = ['uploadClassic', 'uploadResumable'];
Object.freeze(UPLOAD_METHODS);

/**
 * Available privacy statuses.
 *
 * @property PRIVACY_STATUSES
 * @type Array
 * @private
 * @final
 */
var PRIVACY_STATUSES = ['public', 'private', 'unlisted'];
Object.freeze(PRIVACY_STATUSES);

/**
 * Defines a YoutubeProvider class to interact with [youtube platform](https://youtube.com/).
 *
 * @class YoutubeProvider
 * @extends VideoPlatformProvider
 * @constructor
 * @param {Object} providerConf A youtube configuration object
 * @param {String} providerConf.uploadMethod The upload method to use (see UPLOAD_METHODS)
 * @param {String} providerConf.privacy The media privacy on Youtube (see PRIVACY_STATUSES)
 * @param {GoogleOAuthHelper} googleOAuthHelper The Google OAuth helper
 */
function YoutubeProvider(providerConf, googleOAuthHelper) {
  YoutubeProvider.super_.call(this, providerConf);

  Object.defineProperties(this, {

    /**
     * Youtube upload method, uploadClassic or uploadResumable.
     *
     * @property uploadMethod
     * @type String
     */
    uploadMethod: {
      value: UPLOAD_METHODS.indexOf(this.conf.uploadMethod) > -1 ? this.conf.uploadMethod : 'uploadClassic'
    },

    /**
     * Privacy to apply to uploaded videos either public, private or unlisted.
     *
     * @property privacy
     * @type String
     */
    privacy: {
      value: PRIVACY_STATUSES.indexOf(this.conf['privacy']) > -1 ? this.conf['privacy'] : 'public'
    },

    /**
     * The Google OAuth Helper to use to connect to Google APIs.
     *
     * @property googleOAuthHelper
     * @type GoogleOAuthHelper
     */
    googleOAuthHelper: {value: googleOAuthHelper}

  });
}

module.exports = YoutubeProvider;
util.inherits(YoutubeProvider, VideoPlatformProvider);

/**
 * Uploads a video to the Youtube platform.
 *
 * @method upload
 * @async
 * @param {String} videoFilePath System path of the video to upload
 * @param {Function} callback The function to call when the upload
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
YoutubeProvider.prototype.upload = function(videoFilePath, callback) {

  /* list of possible upload params :
   * {
   *  autoLevels: true,
   *  stabilize: true,
   *  resource: {
   *    snippet: {
   *      title: 'Video name',
   *      description: 'Video description'
   *      tags: [],
   *      categoryId: undefined
   *    },
   *    status: {
   *      publishAt: undefined,
   *      privacyStatus: 'private'
   *      embeddable: undefined,
   *      publicStatsViewable: undefined,
   *      license: undefined
   *    }
   *    recordingDetails: {
   *      locationDescription: undefined,
   *      location: {latitude: undefined, longitude: undefined},
   *      recordingDate: undefined
   *    }
   *  }
   * }
   */

  var uploadParams = {
    resource: {
      snippet: {
        title: 'Video name',
        description: 'Video description'
      },
      status: {
        privacyStatus: this.privacy
      }
    }
  };
  uploadParams.part = (['id'].concat(Object.keys(uploadParams.resource))).join(',');
  this[this.uploadMethod](videoFilePath, uploadParams, callback);
};

/**
 * Uploads to youtube in the classic way, using their api.
 *
 * @method uploadClassic
 * @async
 * @param {String} videoFilePath the path to the video to upload
 * @param {Object} uploadParams params to send to youtube when calling their api
 * @param {Function} callback callback function with :
 *  - **Error** The error if an error occurred, null otherwise
 *  - **String** The uploaded media id
 */
YoutubeProvider.prototype.uploadClassic = function(videoFilePath, uploadParams, callback) {
  var self = this;
  var mediaId;
  var video = fs.createReadStream(videoFilePath);

  uploadParams.media = {
    mediaType: mime.lookup(videoFilePath),
    body: video
  };

  async.series([

    // Check auth
    function(callback) {
      self.googleOAuthHelper.getFreshToken(function(error, token) {
        if (error) return callback(error);

        self.googleOAuthHelper.oauth2Client.setCredentials(token);
        callback();
      });
    },

    // Upload video
    function(callback) {
      uploadParams.auth = self.googleOAuthHelper.oauth2Client;
      youtube.videos.insert(uploadParams, function(error, video) {
        if (error) {
          callback(error);
          return;
        }
        mediaId = video.id;
        callback();
      });

    }
  ], function(error) {
    callback(error, mediaId);
  });

};


/**
 * Uploads to youtube in a fail safe way, using resumable uploads.
 *
 * The upload can fail 3 times before failing globally, each times it fails it perform an upload again
 * starting where it previously failed (ie: not re-upoloading all the video)
 *
 * @method uploadResumable
 * @async
 * @param {String} videoFilePath the path to the video to upload
 * @param {Object} uploadParams params to send to youtube when calling their api
 * @param {Function} callback callback function with :
 *  - **Error** The error if an error occurred, null otherwise
 *  - **String** The uploaded media id
 */
YoutubeProvider.prototype.uploadResumable = function(videoFilePath, uploadParams, callback) {
  var self = this;
  var mediaId;
  var stats;

  async.series([

    // Check auth
    function(callback) {
      self.googleOAuthHelper.getFreshToken(function(error, token) {
        if (error) return callback(error);

        uploadParams.auth = token;
        callback();
      });
    },

    // Get file size
    function(callback) {
      fs.stat(videoFilePath, function(error, st) {
        if (error) {
          callback(error);
          return;
        }
        stats = st;
        callback();
      });
    },

    // Upload video
    function(callback) {
      if (!uploadParams.hasOwnProperty('auth') || !uploadParams.auth) {
        callback(new Error('Auth has not been set correctly'));
        return;
      }
      var resumableUpload = new YoutubeResumableUpload();

      resumableUpload.tokens = uploadParams.auth;
      resumableUpload.filepath = videoFilePath;
      resumableUpload.stats = stats;
      resumableUpload.metadata = uploadParams.resource;
      resumableUpload.retry = 3; // Maximum retries when upload failed.

      resumableUpload.on('progress', function(progress) {
        process.logger.debug('Upload progress', progress);
      });
      resumableUpload.on('error', function(error) {
        process.logger.debug('Upload error', error);
        if (resumableUpload.retry === 0) {
          callback(error);
        }
      });
      resumableUpload.on('success', function(video) {
        video = JSON.parse(video);
        mediaId = video.id;
        callback();
      });
      resumableUpload.upload();
    }
  ], function(error) {
    callback(error, mediaId);
  });

};

/**
 * Gets information about a video hosted by Youtube.
 *
 * @example
 *     // Returned data example
 *     {
 *       available : true,
 *       pictures : [],
 *       sources : [],
 *       mediaId : '123456'
 *     }
 *
 * @method getVideoInfo
 * @async
 * @param {String} mediaId The Youtube id of the video
 * @param {Function} callback The function to call when it's done
 *   - **Error** The error if an error occurred, null otherwise
 *   - **Object** Information about the video
 */
YoutubeProvider.prototype.getVideoInfo = function(mediaId, definition, callback) {
  if (!mediaId) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  // sources and pictures are not necessary: youtube player manage its own data
  callback(null, {available: true, sources: [], pictures: [], mediaId: mediaId});
};

/**
 * Removes a video from the Youtube platform.
 *
 * @method remove
 * @async
 * @param {Array} mediaIds Media Ids array of videos to remove
 * @param {Function} callback The function to call when the remove
 * is done
 *   - **Error** The error if an error occurred, null otherwise
 */
YoutubeProvider.prototype.remove = function(mediaIds, callback) {
  var self = this;

  if (!mediaIds) {
    callback(new Error('media id should be defined'), null);
    return;
  }
  var series = [];

  series.push(function(callback) {
    self.googleOAuthHelper.getFreshToken(function(error, token) {
      if (error) return callback(error);

      self.googleOAuthHelper.oauth2Client.setCredentials(token);
      callback();
    });
  });

  mediaIds.forEach(function(mediaId) {
    series.push(function(callback) {
      var deleteParam = {
        id: mediaId,
        part: 'id'
      };
      deleteParam.auth = self.googleOAuthHelper.oauth2Client;
      youtube.videos.delete(deleteParam, function(error) {
        if (error) {
          callback(error);
          return;
        }
        callback();
      });
    });
  });

  async.series(series, function(error) {
    callback(error);
  });
};
