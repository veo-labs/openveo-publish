'use strict';

// Module dependencies
var readline = require('readline');
var path = require('path');
var os = require('os');
var fs = require('fs');
var async = require('async');
var openVeoAPI = require('@openveo/api');

var assetsDir = path.join(__dirname, 'assets', 'player', 'videos');
var backupDir = path.join(os.tmpdir(), 'openveo', 'publish', 'update', 'videos');
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
 * Verifies that assets directory exists and continue to back up.
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
 * Verifies that backup directory does not exists to continue backing up
 */
function verifyTmpIsEmpty(callback) {
  fs.exists(backupDir, function(exists) {
    if (exists) {
      rl.question('Backup files already exists. Do you want to abort (Y/n)?\n', function(answer) {
        if (answer != 'n') exit(128);
        else
          openVeoAPI.fileSystem.rmdir(backupDir, callback);
      });
    } else callback();
  });
}

/**
 * Copies assets files to tmp.
 */
function copyAssetsToTmp(callback) {
  openVeoAPI.fileSystem.copy(assetsDir, backupDir, callback);
}

/**
 * Verifies that backup directory exist and continue to restore.
 */
function verifyTmpNotEmpty(callback) {
  fs.exists(backupDir, function(exists) {
    if (!exists) {
      process.stdout.write('No files to restore.\n');
      exit();
    } else callback();
  });
}

/**
 * Verifies that assets does not exist to continue restoring.
 */
function verifyAssetIsEmpty(callback) {
  fs.exists(assetsDir, function(assetsExists) {
    if (assetsExists) {
      rl.question('Restored files already exists. Do you want to abort (Y/n)?\n', function(answer) {
        if (answer != 'n') exit(128);
        else
          openVeoAPI.fileSystem.rmdir(assetsDir, callback);
      });
    }
    else callback();
  });
}

/**
 * Copies assets back from tmp directory.
 */
function copyTmpToAssets(callback) {
  openVeoAPI.fileSystem.copy(backupDir, assetsDir, callback);
}

/**
 * Removes tmp directory if it exists.
 */
function removeTmpDir(callback) {
  openVeoAPI.fileSystem.rmdir(backupDir, callback);
}

// Get args 'backup' or 'restore', default 'backup'
var args = process.argv.length > 2 ? process.argv.slice(2) : 'backup';

if (args == 'backup') {

  // Launch backup
  async.series([
    verifyAssetNotEmpty,
    verifyTmpIsEmpty,
    copyAssetsToTmp
  ], function(error) {
    if (error)
      throw error;
    else {
      process.stdout.write('Backup complete.\n');
      process.stdout.write('Backup folder : ' + backupDir + '\n');
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
      process.stdout.write('Restored folder : ' + assetsDir + '\n');
      exit();
    }
  });
} else {

  // Bad script launch
  process.stdout.write('Bad arguments for backup script.\n');
  exit(128);

}
