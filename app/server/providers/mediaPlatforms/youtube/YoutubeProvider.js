'use strict';

/**
 * @module publish/providers/mediaPlatforms/youtube/YoutubeProvider
 */

var fs = require('fs');
var util = require('util');
var mime = require('mime');
var async = require('async');
var google = require('googleapis').google;
var youtube = google.youtube('v3');
var YoutubeResumableUpload = process.requirePublish(
  'app/server/providers/mediaPlatforms/youtube/YoutubeResumableUpload.js'
);
var MediaPlatformProvider = process.requirePublish('app/server/providers/mediaPlatforms/MediaPlatformProvider.js');

/**
 * Available upload methods.
 *
 * @memberof module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider
 * @const
 * @type {Array}
 * @private
 */
var UPLOAD_METHODS = ['uploadClassic', 'uploadResumable'];
Object.freeze(UPLOAD_METHODS);

/**
 * Available privacy statuses.
 *
 * @memberof module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider
 * @const
 * @type {Array}
 */
var PRIVACY_STATUSES = ['public', 'private', 'unlisted'];
Object.freeze(PRIVACY_STATUSES);

/**
 * Defines a YoutubeProvider class to interact with [youtube platform](https://youtube.com/).
 *
 * @class YoutubeProvider
 * @extends module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider
 * @constructor
 * @param {Object} providerConf A youtube configuration object
 * @param {String} providerConf.uploadMethod The upload method to use (see UPLOAD_METHODS)
 * @param {String} providerConf.privacy The media privacy on Youtube (see PRIVACY_STATUSES)
 * @param {module:publish/providers/mediaPlatforms/youtube/GoogleOAuthHelper~GoogleOAuthHelper} googleOAuthHelper The
 * Google OAuth helper
 */
function YoutubeProvider(providerConf, googleOAuthHelper) {
  YoutubeProvider.super_.call(this, providerConf);

  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider */
    {

      /**
       * Youtube upload method, uploadClassic or uploadResumable.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      uploadMethod: {
        value: UPLOAD_METHODS.indexOf(this.conf.uploadMethod) > -1 ? this.conf.uploadMethod : 'uploadClassic'
      },

      /**
       * Privacy to apply to uploaded medias either public, private or unlisted.
       *
       * @type {String}
       * @instance
       * @readonly
       */
      privacy: {
        value: PRIVACY_STATUSES.indexOf(this.conf['privacy']) > -1 ? this.conf['privacy'] : 'public'
      },

      /**
       * The Google OAuth Helper to use to connect to Google APIs.
       *
       * @type {GoogleOAuthHelper}
       * @instance
       * @readonly
       */
      googleOAuthHelper: {value: googleOAuthHelper}

    }

  );
}

module.exports = YoutubeProvider;
util.inherits(YoutubeProvider, MediaPlatformProvider);

/**
 * Youtube category ids.
 *
 * @const
 * @type {Object}
 */
YoutubeProvider.CATEGORIES = {
  EDUCATION: 27
};
Object.freeze(YoutubeProvider.CATEGORIES);

/**
 * Uploads a media to the Youtube platform.
 *
 * @param {String} mediaFilePath The absolute path of the media to upload
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~uploadCallback} callback
 * The function to call when it's done
 */
YoutubeProvider.prototype.upload = function(mediaFilePath, callback) {
  var uploadParams = {
    resource: {
      snippet: {
        title: 'Media name',
        description: 'Media description',
        categoryId: YoutubeProvider.CATEGORIES.EDUCATION
      },
      status: {
        privacyStatus: this.privacy
      }
    }
  };
  uploadParams.part = (['id'].concat(Object.keys(uploadParams.resource))).join(',');
  this[this.uploadMethod](mediaFilePath, uploadParams, callback);
};

/**
 * Uploads to Youtube in the classic way, using Youtube API.
 *
 * @param {String} mediaFilePath The absolute path to the media to upload
 * @param {Object} uploadParams Parameters to send to Youtube when calling the API
 * @param {module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider~uploadClassicCallback}
 * callback callback The function to call when its done
 */
YoutubeProvider.prototype.uploadClassic = function(mediaFilePath, uploadParams, callback) {
  var self = this;
  var mediaId;
  var media = fs.createReadStream(mediaFilePath);

  uploadParams.media = {
    mediaType: mime.getType(mediaFilePath),
    body: media
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

    // Upload media
    function(callback) {
      uploadParams.auth = self.googleOAuthHelper.oauth2Client;
      youtube.videos.insert(uploadParams, function(error, response) {
        if (error) {
          callback(error);
          return;
        }
        mediaId = response.id;
        callback();
      });

    }
  ], function(error) {
    callback(error, mediaId);
  });

};


/**
 * Uploads to Youtube in a fail safe way, using resumable uploads.
 *
 * The upload can fail 3 times before failing globally, each times it fails it perform an upload again starting where
 * it previously failed (ie: not re-uploading all the media)
 *
 * @param {String} mediaFilePath The absolute path to the media to upload
 * @param {Object} uploadParams Parameters to send to Youtube when calling the API
 * @param {module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider~uploadResumableCallback}
 * callback The function to call when its done
 */
YoutubeProvider.prototype.uploadResumable = function(mediaFilePath, uploadParams, callback) {
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
      fs.stat(mediaFilePath, function(error, fileStats) {
        if (error) {
          callback(error);
          return;
        }
        stats = fileStats;
        callback();
      });
    },

    // Upload media
    function(callback) {
      if (!Object.prototype.hasOwnProperty.call(uploadParams, 'auth') || !uploadParams.auth) {
        callback(new Error('Auth has not been set correctly'));
        return;
      }
      var resumableUpload = new YoutubeResumableUpload();

      resumableUpload.tokens = uploadParams.auth;
      resumableUpload.filepath = mediaFilePath;
      resumableUpload.stats = stats;
      resumableUpload.metadata = uploadParams.resource;
      resumableUpload.retry = 3;

      resumableUpload.on('progress', function(progress) {
        process.logger.debug('Upload progress: ' + progress);
      });
      resumableUpload.on('error', function(error) {
        process.logger.error('Upload error: ' + error.message);
        if (resumableUpload.retry === 0) {
          callback(error);
        }
      });
      resumableUpload.on('success', function(media) {
        media = JSON.parse(media);
        mediaId = media.id;
        callback();
      });
      resumableUpload.upload();
    }
  ], function(error) {
    callback(error, mediaId);
  });

};

/**
 * Gets information about a media hosted by Youtube.
 *
 * @param {String} mediaId The Youtube id of the media
 * @param {module:publish/providers/mediaPlatforms/MediaPlatformProvider~MediaPlatformProvider~getMediaInfoCallback}
 * callback The function to call when it's done
 */
YoutubeProvider.prototype.getMediaInfo = function(mediaId, definition, callback) {
  if (!mediaId) {
    callback(new Error('media id should be defined'), null);
    return;
  }

  // sources and pictures are not necessary: youtube player manage its own data
  callback(null, {available: true, sources: [], pictures: [], mediaId: mediaId});
};

/**
 * Removes a media from the Youtube platform.
 *
 * @param {Array} mediaIds Youtube media ids to remove
 * @param {callback} callback The function to call when it's done
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

/**
 * Updates a media resources on the platform.
 *
 * If media has several resources on the platform, the same update will be performed for all resources.
 * Actually only the media title is synchronized with Youtube.
 *
 * @param {Object} media The media
 * @param {Array} media.mediaId The list of media resource ids
 * @param {Object} data The datas to update
 * @param {String} [data.title] The media title. Be careful only the first 100 characters will be used, also
 * "less than" and "greater than" characters will be removed
 * @param {Boolean} force true to force the update even if title hasn't changed, false otherwise
 * @param {callback} callback The function to call when it's done
 */
YoutubeProvider.prototype.update = function(media, data, force, callback) {
  if (!data.title || (data.title === media.title && !force)) return callback();

  var self = this;
  var series = [];

  series.push(function(callback) {
    self.googleOAuthHelper.getFreshToken(function(error, token) {
      if (error) return callback(error);

      self.googleOAuthHelper.oauth2Client.setCredentials(token);
      callback();
    });
  });

  media.mediaId.forEach(function(mediaId) {
    series.push(function(callback) {
      youtube.videos.update({
        part: 'snippet',
        auth: self.googleOAuthHelper.oauth2Client,
        resource: {
          id: mediaId,
          snippet: {
            title: data.title.substring(0, 100).replace(/<|>/g, ''),
            categoryId: YoutubeProvider.CATEGORIES.EDUCATION
          }
        }
      }, callback);
    });
  });

  async.series(series, function(error) {
    callback(error);
  });
};

/**
 * @callback module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider~uploadClassicCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {String} id The media id on the Youtube platform
 */

/**
 * @callback module:publish/providers/mediaPlatforms/youtube/YoutubeProvider~YoutubeProvider~uploadResumableCallback
 * @param {(Error|undefined)} error The error if an error occurred
 * @param {String} id The media id on the Youtube platform
 */
