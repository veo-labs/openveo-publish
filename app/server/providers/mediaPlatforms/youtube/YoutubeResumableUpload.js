'use strict';

/**
 * @module publish/providers/mediaPlatforms/youtube/YoutubeResumableUpload
 */

var fs = require('fs');
var https = require('https');
var util = require('util');

var EventEmitter = require('events').EventEmitter;
var mime = require('mime');

/**
 * TODO
 *
 * @class ResumableUpload
 * @constructor
 */
function ResumableUpload() {
  Object.defineProperties(this,

    /** @lends module:publish/providers/mediaPlatforms/youtube/YoutubeResumableUpload~ResumableUpload  */
    {

      /**
       * TODO
       *
       * @type {Number}
       * @instance
       */
      byteCount: {value: 0, writable: true},

      /**
       * TODO
       *
       * @type {Object}
       * @instance
       */
      tokens: {value: {}, writable: true},

      /**
       * TODO
       *
       * @type {String}
       * @instance
       */
      filepath: {value: '', writable: true},

      /**
       * TODO
       *
       * @type {Object}
       * @instance
       */
      metadata: {value: {}, writable: true},

      /**
       * TODO
       *
       * @type {Number}
       * @instance
       */
      retry: {value: -1, writable: true},

      /**
       * TODO
       *
       * @type {String}
       * @instance
       */
      host: {value: 'www.googleapis.com'},

      /**
       * TODO
       *
       * @type {String}
       * @instance
       */
      api: {value: '/upload/youtube/v3/videos'},

      /**
       * TODO
       *
       * @type {Object}
       * @instance
       */
      stats: {value: {}, writable: true}
    }

  );
}

util.inherits(ResumableUpload, EventEmitter);

/**
 * Inits the upload by POSTing google for an upload URL (saved to self.location).
 */
ResumableUpload.prototype.upload = function() {
  var self = this;
  var options = {
    hostname: self.host,
    path: self.api + '?uploadType=resumable&part=snippet,status,contentDetails',
    port: 443,
    method: 'POST',
    headers: {
      Host: self.host,
      Authorization: 'Bearer ' + self.tokens.access_token,
      'Content-Length': Buffer.from(JSON.stringify(self.metadata)).length,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': self.stats.size,
      'X-Upload-Content-Type': mime.getType(self.filepath)
    }
  };

  var handleError = function(error) {
    if ((self.retry > 0) || (self.retry <= -1)) {
      self.emit('progress', 'Retrying ...');
      self.retry--;
      self.upload();
    } else {
      self.emit('error', new Error('max try reached with last error: "' + error.message + '"'));
    }
  };

  var request = https.request(options, function(response) {
    let result = '';

    response.setEncoding('utf8');
    response.on('error', handleError);
    response.on('data', function(chunk) {
      result += chunk;
    });
    response.on('end', function() {
      var body;
      if (result) {
        try {
          body = JSON.parse(result);
        } catch (error) {
          return handleError(new Error('Server error, response is not valid JSON'));
        }

        if (body.error) {
          self.retry = 0;
          return handleError(new Error(body.error.message));
        }
      }

      if (!response.headers.location)
        return handleError(new Error('Location not specified'));

      self.location = response.headers.location;
      self.send();
    });
  });

  request.on('error', handleError);

  request.write(JSON.stringify(self.metadata));
  return request.end();
};

/**
 * Pipes uploadPipe to self.location (Google's Location header).
 */
ResumableUpload.prototype.send = function() {
  var self = this;
  var health;
  var uploadPipe;
  var options = {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + self.tokens.access_token,
      'Content-Length': self.stats.size - self.byteCount,
      'Content-Type': mime.getType(self.filepath)
    }
  };
  var handleError = function(error) {
    clearInterval(health);
    self.emit('error', error);

    if ((self.retry > 0) || (self.retry <= -1)) {
      self.retry--;
      self.getProgress(function(getProgressError, response, body) {
        if (response && response.headers && typeof response.headers.range !== 'undefined') {
          self.byteCount = response.headers.range.substring(8); // parse response
        } else {
          self.byteCount = 0;
        }
        self.send();
      });
    }
  };

  try {
    // creates file stream, pipes it to self.location
    uploadPipe = fs.createReadStream(self.filepath, {
      start: self.byteCount,
      end: self.stats.size
    });
  } catch (e) {
    self.emit('error', new Error(e));
    return;
  }

  health = setInterval(function() {
    self.getProgress(function(err, res, body) {
      if (!err && typeof res.headers.range !== 'undefined') {
        self.emit('progress', res.headers.range.substring(8));
      }
    });
  }, 5000);

  // self.location becomes the Google-provided URL to PUT to
  var request = https.request(self.location, options, function(response) {
    var result = '';

    response.setEncoding('utf8');
    response.on('error', handleError);
    response.on('data', function(chunk) {
      result += chunk;
    });
    response.on('end', function() {
      clearInterval(health);
      self.emit('success', result);
    });
  });

  request.on('error', handleError);
  uploadPipe.pipe(request);
};

/**
 * TODO.
 *
 * @param {} handler TODO
 */
ResumableUpload.prototype.getProgress = function(handler) {
  var self = this;
  var options = {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + self.tokens.access_token,
      'Content-Length': 0,
      'Content-Range': 'bytes */' + self.stats.size
    }
  };

  var request = https.request(self.location, options, function(response) {
    var result = '';

    response.setEncoding('utf8');
    response.on('error', handler);
    response.on('data', function(chunk) {
      result += chunk;
    });
    response.on('end', function() {
      handler(null, response, result);
    });
  });

  request.on('error', handler);
};

module.exports = ResumableUpload;
