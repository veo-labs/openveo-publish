'use strict';

// Module dependencies
var readline = require('readline');
var path = require('path');
var fs = require('fs');
var async = require('async');
var openVeoAPI = require('@openveo/api');

var assetsDir = path.join(__dirname, 'assets', 'player', 'videos');
var updateTmpDir = path.join(__dirname, '..', 'tmp', 'publish', 'videos');
var exit = process.exit;

// Set module root directory
process.rootPublish = __dirname;
process.requirePublish = function(filePath) {
  return require(path.join(process.rootPublish, filePath));
};

// Create a readline interface to interact with the user
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Verify that asset file exist and continue to backing up
 */
function verifyAssetNotEmpty(callback) {
  fs.exists(assetsDir, function(exists) {
    if (!exists) {
      process.stdout.write('No files to backup.\n');
      exit();
    } else callback();
  });
}

/**
 * Verify that backup folder is empty to continue backing up
 */
function verifyTmpIsEmpty(callback) {
  fs.exists(updateTmpDir, function(exists) {
    if (exists) {
      rl.question('Backup files already exists. Do you want to abort (Y/n)?\n', function(answer) {
        if (answer != 'n') exit(128);
        else {
          openVeoAPI.fileSystem.rmdir(updateTmpDir, callback);
        }
      });
    } else callback();
  });
}

/**
 * Create Tmp if it does not exist and Copy assets files to tmp
 */
function copyFileToTmp(callback) {
  openVeoAPI.fileSystem.mkdir(updateTmpDir, function() {
    fs.rename(assetsDir, updateTmpDir, callback);
  });
}

/**
 * Verify that bakup file exist and continue to restoring
 */
function verifyTmpNotEmpty(callback) {
  fs.exists(updateTmpDir, function(exists) {
    if (!exists) {
      process.stdout.write('No files to restore.\n');
      exit();
    } else callback();
  });
}

/**
 * Verify that file in asset does not exist to continue restoring
 */
function verifyAssetIsEmpty(callback) {
  fs.exists(assetsDir, function(assetsExists) {
    if (assetsExists) {
      rl.question('Restored files already exists. Do you want to abort (Y/n)?\n', function(answer) {
        if (answer != 'n') exit(128);
        else {
          openVeoAPI.fileSystem.rmdir(assetsDir, callback);
        }
      });
    }
    else callback();
  });
}

/**
 * Create assets if it does exist and  Copy Tmp files to assets
 */
function copyTmpToAssets(callback) {
  openVeoAPI.fileSystem.mkdir(assetsDir, function() {
    fs.rename(updateTmpDir, assetsDir, callback);
  });
}

/**
 * Remove tmp directory if it does exist.
 */
function removeTmpDir(callback) {
  openVeoAPI.fileSystem.rmdir(updateTmpDir, callback);
}

// Get args 'backup' or 'restore', default 'backup'
var args = process.argv.length > 2 ? process.argv.slice(2) : 'backup';

if (args == 'backup') {

  // Launch backup
  async.series([
    verifyAssetNotEmpty,
    verifyTmpIsEmpty,
    copyFileToTmp
  ], function(error, results) {
    if (error)
      throw error;
    else {
      process.stdout.write('Backup complete.\n');
      process.stdout.write('Backup folder : '+updateTmpDir+'\n');
      exit();
    }
  });
} else if (args == 'restore') {

  // Launch restore
  async.series([
    verifyTmpNotEmpty,
    verifyAssetIsEmpty,
    copyTmpToAssets,
    removeTmpDir
  ], function(error) {
    if (error)
      throw error;
    else {
      process.stdout.write('Restore complete.\n');
      process.stdout.write('Restored folder : '+assetsDir+'\n');
      exit();
    }
  });
} else {

  // Bad script launch
  process.stdout.write('Bad arguments for update script.\n');
  exit(128);
}

