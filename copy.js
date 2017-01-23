'use strict';

// Module dependencies
var readline = require('readline');
var path = require('path');
var fs = require('fs');
var async = require('async');
var FTPS = require('ftps');

var assetsDir = path.join(__dirname, 'assets', 'player', 'videos');
var updateTmpDir = path.join(__dirname, '..', 'tmp', 'publish', 'videos');
var exit = process.exit;

// Set module root directory
process.rootPublish = __dirname;
process.requirePublish = function(filePath) {
  return require(path.join(process.rootPublish, filePath));
};

var ftps = new FTPS({
    host: '192.168.1.20', // required
    username: 'openveo', // required
    password: 'openveo', // required
    protocol: 'sftp', // optional, values : 'ftp', 'sftp', 'ftps',... default is 'ftp'
    // protocol is added on beginning of host, ex : sftp://domain.com in this case
    port: '22', // optional
    // port is added to the end of the host, ex: sftp://domain.com:22 in this case
    escape: true, // optional, used for escaping shell characters (space, $, etc.), default: true
    retries: 2, // Optional, defaults to 1 (1 = no retries, 0 = unlimited retries)
    timeout: 10,
    requiresPassword: true, // Optional, defaults to true
    autoConfirm: false // Optional, is used to auto confirm ssl questions on sftp or fish protocols, defaults to false
  });

function upload(callback) {

  // Retrieve video tmp directory
  // e.g E:/openveo/node_modules/@openveo/publish/tmp/
  var mediaId;

  async.series([
    // Checks user quota
    function(callback) {
      process.stdout.write('send.\n');
      ftps.put('LICENSE', './files/LICENSE').exec(function (err, res) {
  // err will be null (to respect async convention)
  // res is an hash with { error: stderr || null, data: stdout }
      process.stdout.write('sent.\n');
      console.log(res);
      callback(err);
    });

    },
  ], function(error) {
    callback(error);
  });
};

  // Launch copy
async.series([
  upload,
], function(error, results) {
  if (error)
    throw error;
  else {
    process.stdout.write('OK.\n');
    exit();
  }
});

