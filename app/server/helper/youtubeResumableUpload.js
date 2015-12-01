'use strict';

var fs = require('fs');
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var mime = require('mime');
var util = require('util');

/**
 * Contructor
 */
function resumableUpload() {
  this.byteCount = 0; // init variables
  this.tokens = {};
  this.filepath = '';
  this.metadata = {};
  this.retry = -1;
  this.host = 'www.googleapis.com';
  this.api = '/upload/youtube/v3/videos';
  this.stats = {}; // needed for package size
}

util.inherits(resumableUpload, EventEmitter);

// Init the upload by POSTing google for an upload URL (saved to self.location)
resumableUpload.prototype.upload = function() {
  var self = this;
  var options = {
    url: 'https://' + self.host + self.api + '?uploadType=resumable&part=snippet,status,contentDetails',
    headers: {
      Host: self.host,
      Authorization: 'Bearer ' + self.tokens.access_token
    },
    body: JSON.stringify(self.metadata)
  };
  options.headers['Content-Length'] = new Buffer(JSON.stringify(self.metadata)).length;
  options.headers['Content-Type'] = 'application/json';
  options.headers['X-Upload-Content-Length'] = self.stats.size;
  options.headers['X-Upload-Content-Type'] = mime.lookup(self.filepath);

  // Send request and start upload if success
  request.post(options, function(err, res, body) {
    if (err || !res.headers.location) {
      self.emit('error', new Error(err));
      if ((self.retry > 0) || (self.retry <= -1)) {
        self.emit('progress', 'Retrying ...');
        self.retry--;
        self.upload();// retry
      } else {
        if (err)
          self.emit('error', new Error(err));
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

// Pipes uploadPipe to self.location (Google's Location header)
resumableUpload.prototype.send = function() {
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

resumableUpload.prototype.getProgress = function(handler) {
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

module.exports = resumableUpload;
