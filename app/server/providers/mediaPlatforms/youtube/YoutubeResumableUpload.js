'use strict';

/**
 * @module providers
 */

var fs = require('fs');
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var mime = require('mime');
var util = require('util');

/**
 * TODO
 *
 * @class ResumableUpload
 * @constructor
 */
function ResumableUpload() {
  Object.defineProperties(this, {

    /**
     * TODO
     *
     * @property byteCount
     * @type Number
     */
    byteCount: {value: 0, writable: true},

    /**
     * TODO
     *
     * @property tokens
     * @type Object
     */
    tokens: {value: {}, writable: true},

    /**
     * TODO
     *
     * @property filepath
     * @type String
     */
    filepath: {value: '', writable: true},

    /**
     * TODO
     *
     * @property metadata
     * @type Object
     */
    metadata: {value: {}, writable: true},

    /**
     * TODO
     *
     * @property retry
     * @type Number
     */
    retry: {value: -1, writable: true},

    /**
     * TODO
     *
     * @property host
     * @type String
     */
    host: {value: 'www.googleapis.com'},

    /**
     * TODO
     *
     * @property api
     * @type String
     */
    api: {value: '/upload/youtube/v3/videos'},

    /**
     * TODO
     *
     * @property stats
     * @type Object
     */
    stats: {value: {}, writable: true}
  });
}

util.inherits(ResumableUpload, EventEmitter);

/**
 * Inits the upload by POSTing google for an upload URL (saved to self.location).
 *
 * @method upload
 */
ResumableUpload.prototype.upload = function() {
  var self = this;
  var options = {
    url: 'https://' + self.host + self.api + '?uploadType=resumable&part=snippet,status,contentDetails',
    headers: {
      Host: self.host,
      Authorization: 'Bearer ' + self.tokens.access_token
    },
    body: JSON.stringify(self.metadata)
  };
  options.headers['Content-Length'] = Buffer.from(JSON.stringify(self.metadata)).length;
  options.headers['Content-Type'] = 'application/json';
  options.headers['X-Upload-Content-Length'] = self.stats.size;
  options.headers['X-Upload-Content-Type'] = mime.getType(self.filepath);

  // Send request and start upload if success
  request.post(options, function(err, res, body) {
    if (body) {
      body = JSON.parse(body);

      if (body.error) {
        self.retry = 0;
        self.emit('error', new Error(body.error.message));
        return;
      }
    }

    if (err || !res.headers.location) {
      self.emit('error', err);
      if ((self.retry > 0) || (self.retry <= -1)) {
        self.emit('progress', 'Retrying ...');
        self.retry--;
        self.upload();// retry
      } else {
        if (err)
          self.emit('error', err);
        else
          self.emit('error', new Error('max try reached'));
        return;
      }
    } else {
      self.location = res.headers.location;
      self.send();
    }
  });
};

/**
 * Pipes uploadPipe to self.location (Google's Location header).
 *
 * @method send
 */
ResumableUpload.prototype.send = function() {
  var self = this;
  var uploadPipe;

  // self.location becomes the Google-provided URL to PUT to
  var options = {
    url: self.location,
    headers: {
      Authorization: 'Bearer ' + self.tokens.access_token
    }
  };
  options.headers['Content-Length'] = self.stats.size - self.byteCount;
  options.headers['Content-Type'] = mime.lookup(self.filepath);

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

  var health = setInterval(function() {
    self.getProgress(function(err, res, body) {
      if (!err && typeof res.headers.range !== 'undefined') {
        self.emit('progress', res.headers.range.substring(8));
      }
    });
  }, 5000);

  uploadPipe.pipe(request.put(options, function(error, response, body) {
    clearInterval(health);
    if (!error) {
      self.emit('success', body);
      return;
    }
    self.emit('error', new Error(error));
    if ((self.retry > 0) || (self.retry <= -1)) {
      self.retry--;
      self.getProgress(function(err, res, b) {
        if (res && res.headers && typeof res.headers.range !== 'undefined') {
          self.byteCount = res.headers.range.substring(8); // parse response
        } else {
          self.byteCount = 0;
        }
        self.send();
      });
    }
  }));
};

/**
 * TODO.
 *
 * @method getProgress
 * @param {} handler TODO
 */
ResumableUpload.prototype.getProgress = function(handler) {
  var self = this;
  var options = {
    url: self.location,
    headers: {
      Authorization: 'Bearer ' + self.tokens.access_token
    }
  };
  options.headers['Content-Length'] = 0;
  options.headers['Content-Range'] = 'bytes */' + self.stats.size;
  request.put(options, handler);
};

module.exports = ResumableUpload;
