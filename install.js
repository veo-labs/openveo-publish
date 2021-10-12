'use strict';

var readline = require('readline');
var path = require('path');
var fs = require('fs');
var os = require('os');
var async = require('async');
var openVeoApi = require('@openveo/api');
var confDir = path.join(openVeoApi.fileSystem.getConfDir(), 'publish');
var exit = process.exit;

// Set module root directory
process.rootPublish = __dirname;
process.requirePublish = function(filePath) {
  return require(path.join(process.rootPublish, filePath));
};

var TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');

// Create a readline interface to interact with the user
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var rlSecure = false;

/**
 * Secure question to not show stdout
 */
function secureQuestion(query, callback) {
  rlSecure = true;
  rl.question(query, function(value) {
    rl.history = rl.history.slice(1);
    rlSecure = false;
    callback(value);
  });
}

// rewrite stdout in cas of secure rl
process.stdin.on('data', function(char) {
  if (rlSecure)
    process.stdout.write('\x1B[2K\x1B[200D' + Array(rl.line.length + 1).join('*'));
});

/**
 * Creates conf directory if it does not exist.
 */
function createConfDir(callback) {
  openVeoApi.fileSystem.mkdir(confDir, callback);
}

/**
 * Creates videos temporary directory if it does not exist.
 */
function createVideoTmpDir(callback) {
  var conf = require(path.join(confDir, 'publishConf.json'));
  openVeoApi.fileSystem.mkdir(conf.videoTmpDir, callback);
}

/**
 * Creates hot folders if they do not exist.
 */
function createHotFolder(callback) {
  var conf = require(path.join(confDir, 'watcherConf.json'));
  var parallelFunctions = [];

  /**
   * Adds closure to create a hot folder.
   *
   * @param {String} hotFolderPath The path to the hot folder to create
   * @return {Function} A function to call with async
   */
  function createFunction(hotFolderPath) {
    return function(callback) {
      openVeoApi.fileSystem.mkdir(hotFolderPath, callback);
    };
  }

  // Create a function for each hot folder
  for (var i = 0; i < conf.hotFolders.length; i++)
    parallelFunctions.push(createFunction(conf.hotFolders[i].path));

  // Create hot folders
  async.parallel(parallelFunctions, function(error, results) {
    if (error)
      throw error;
    else
      callback();
  });

}

/**
 * Creates general configuration file if it does not exist.
 */
function createConf(callback) {
  var confFile = path.join(confDir, 'publishConf.json');

  fs.access(confFile, function(error) {
    if (!error) {
      process.stdout.write(confFile + ' already exists\n');
      callback();
    } else {
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'videos');
      rl.question('Enter video temporary directory path (default: ' + defaultPath + '):\n', function(answer) {
        var conf = {
          videoTmpDir: (answer || defaultPath).replace(/\\/g, '/'),
          maxConcurrentPublish: 3,
          metadataFileName: '.session'
        };

        fs.writeFile(confFile, JSON.stringify(conf, null, '\t'), {encoding: 'utf8'}, callback);
      });
    }
  });
}

/**
 * Creates video platform configuration file if it does not exist.
 */
function createVideoPlatformConf(callback) {
  var confFile = path.join(confDir, 'videoPlatformConf.json');
  var vimeoConf;
  var youtubeConf;
  var wowzaConf;
  var localConf;
  var tlsConf;

  async.series([
    function(callback) {
      fs.access(confFile, function(error) {
        if (!error)
          callback(new Error(confFile + ' already exists\n'));
        else
          callback();
      });
    },

    // Vimeo
    function(callback) {
      rl.question('Do you want to configure OpenVeo to host medias on Vimeo? (y/N):\n', function(answer) {
        if (answer === 'y') vimeoConf = {};
        callback(null);
      });
    },
    function(callback) {
      if (!vimeoConf) return callback();
      rl.question('Enter Vimeo web service client id (available in your Vimeo account):\n', function(answer) {
        vimeoConf.clientId = answer;
        callback();
      });
    },
    function(callback) {
      if (!vimeoConf) return callback();
      secureQuestion('Enter Vimeo web service client secret (available in your Vimeo account):\n', function(answer) {
        vimeoConf.clientSecret = answer;
        callback();
      });
    },
    function(callback) {
      if (!vimeoConf) return callback();
      secureQuestion('Enter Vimeo web service access token (available in your Vimeo account):\n', function(answer) {
        vimeoConf.accessToken = answer;
        callback();
      });
    },

    // Youtube
    function(callback) {
      rl.question('Do you want to configure OpenVeo to host medias on Youtube? (y/N):\n', function(answer) {
        if (answer === 'y') {
          youtubeConf = {
            uploadMethod: 'uploadResumable',
            googleOAuth: {},
            privacy: 'unlisted'
          };
        }
        callback();
      });
    },
    function(callback) {
      if (!youtubeConf) return callback();
      rl.question('Enter Youtube API client id (available in your Google Developper Console):\n', function(answer) {
        youtubeConf.googleOAuth.clientId = answer;
        callback();
      });
    },
    function(callback) {
      if (!youtubeConf) return callback();
      secureQuestion('Enter Youtube API client secret (available in your Google Developper Console):\n',
        function(answer) {
          youtubeConf.googleOAuth.clientSecret = answer;
          callback();
        }
      );
    },
    function(callback) {
      if (!youtubeConf) return callback();
      rl.question('Enter Youtube redirect URL (available in your Google Developper Console):\n', function(answer) {
        youtubeConf.googleOAuth.redirectUrl = answer;
        callback();
      });
    },
    function(callback) {
      if (!youtubeConf) return callback();
      rl.question('Do you want to overwrite Youtube resumable upload by classic upload? (y/N):\n', function(answer) {
        if (answer === 'y') youtubeConf.uploadMethod = 'uploadClassic';
        callback();
      });
    },
    function(callback) {
      if (!youtubeConf) return callback();
      rl.question(
        'Which Youtube privacy mode will be used? (0:unlisted -default-, 1:private, 2:public):\n',
        function(answer) {
          if (answer === '1') youtubeConf.privacy = 'private';
          if (answer === '2') youtubeConf.privacy = 'public';
          callback();
        }
      );
    },

    // WOWZA
    function(callback) {
      rl.question('Do you want to configure OpenVeo to host medias on Wowza? (y/N):\n', function(answer) {
        if (answer === 'y') wowzaConf = {
          host: 'localhost',
          protocol: 'sftp',
          port: '22'
        };
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter Wowza server host (default: ' + wowzaConf.host + '):\n', function(answer) {
        if (answer) wowzaConf.host = answer;
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter Wowza file transfer protocol (0:SFTP -default-, 1:FTP):\n', function(answer) {
        if (answer && answer === '1') wowzaConf.protocol = 'ftp';
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter Wowza file transfer port (let empty to set port acccording to protocol):\n', function(answer) {
        if (answer) wowzaConf.port = parseInt(answer);
        else if (wowzaConf.protocol == 'ftp') wowzaConf.port = 21;
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter FTP/SFTP user login:\n', function(answer) {
        wowzaConf.user = answer;
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      secureQuestion('Enter FTP/SFTP user password:\n', function(answer) {
        wowzaConf.pwd = answer;
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter path of the directory where to store medias, this is relative to FTP/SFTP user home ' +
                  'directory:\n',
      function(answer) {
        wowzaConf.vodFilePath = answer;
        callback();
      });
    },
    function(callback) {
      if (!wowzaConf) return callback();
      rl.question('Enter Wowza streaming URL for the VOD application ' +
                  '(e.g. https://WOWZA_HOST:WOWZA_PORT/WOWZA_VOD_APPLICATION):\n',
      function(answer) {
        wowzaConf.streamPath = answer;
        callback();
      });
    },

    // Local
    function(callback) {
      rl.question('Do you want to configure Openveo to host video on local file system? (y/N):\n', function(answer) {
        if (answer === 'y') localConf = {
          vodFilePath: path.join(__dirname, '/assets/player/videos/local'),
          streamPath: 'publish/player/videos/local'
        };
        callback();
      });
    },
    function(callback) {
      if (!localConf) return callback();
      rl.question(
        'Enter file system path where to store medias (default: "' + localConf.vodFilePath + '"):\n',
        function(answer) {
          if (answer !== '') localConf.vodFilePath = answer;
          callback();
        }
      );
    },
    function(callback) {
      if (!localConf) return callback();
      rl.question(
        'Enter streaming URI relative to OpenVeo base URL (default: "' + localConf.streamPath + '"):\n',
        function(answer) {
          if (answer !== '') localConf.streamPath = answer;
          callback();
        }
      );
    },

    // TLS
    function(callback) {
      rl.question('Do you want to configure OpenVeo to host medias on TLS? (y/N):\n', function(answer) {
        if (answer === 'y') tlsConf = {
          nfsPath: path.join(__dirname, '/assets/player/videos'),
          mediaDirectoryPath: 'tls'
        };
        callback();
      });
    },
    function(callback) {
      if (!tlsConf) return callback();
      rl.question(
        'Enter system path of the NFS root directory (default: "' + tlsConf.nfsPath + '"):\n',
        function(answer) {
          if (answer !== '') tlsConf.nfsPath = answer;
          callback();
        }
      );
    },
    function(callback) {
      if (!tlsConf) return callback();
      rl.question('Enter path of the directory where to store medias, this is relative to NFS root directory ' +
                  '(default: "' + tlsConf.mediaDirectoryPath + '"):\n',
      function(answer) {
        if (answer !== '') tlsConf.mediaDirectoryPath = answer;
        callback();
      });
    },
    function(callback) {
      if (!tlsConf) return callback();
      secureQuestion('Enter TLS access token:\n', function(answer) {
        if (answer !== '') tlsConf.accessToken = answer;
        callback();
      });
    },
    function(callback) {
      if (!tlsConf) return callback();
      rl.question('Enter TLS web service URL:\n', function(answer) {
        if (answer !== '') tlsConf.url = answer;
        callback();
      });
    },
    function(callback) {
      if (!tlsConf) return callback();
      rl.question('Enter the system path of the TLS web service full chain certificate:\n', function(answer) {
        if (answer !== '') tlsConf.certificate = answer;
        callback();
      });
    }
  ],
  function(error, results) {
    if (error) {
      process.stdout.write(error.message);
      callback();
    } else {
      var conf = {};
      if (vimeoConf) conf.vimeo = vimeoConf;
      if (youtubeConf) conf.youtube = youtubeConf;
      if (wowzaConf) conf.wowza = wowzaConf;
      if (localConf) conf.local = localConf;
      if (tlsConf) conf.tls = tlsConf;
      fs.writeFile(confFile, JSON.stringify(conf, null, '\t'), {encoding: 'utf8'}, callback);
    }
  });
}

/**
 * Creates watcher configuration file if it does not exist.
 */
function createWatcherConf(callback) {
  var videoPlatformConf = require(path.join(confDir, 'videoPlatformConf.json'));
  var confFile = path.join(confDir, 'watcherConf.json');
  var conf = {hotFolders: []};

  async.series([
    function(callback) {
      fs.access(confFile, function(error) {
        if (!error)
          callback(new Error(confFile + ' already exists\n'));
        else
          callback();
      });
    },
    function(callback) {
      if (!videoPlatformConf.vimeo) return callback();
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'hotFolder', TYPES.VIMEO);
      rl.question('Enter Vimeo hot folder path to listen to (default: ' + defaultPath + '):\n', function(answer) {
        conf.hotFolders.push({
          type: TYPES.VIMEO,
          path: (answer || defaultPath).replace(/\\/g, '/')
        });
        callback();
      });
    },
    function(callback) {
      if (!videoPlatformConf.youtube) return callback();
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'hotFolder', TYPES.YOUTUBE);
      rl.question('Enter Youtube hot folder path to listen to (default: ' + defaultPath + '):\n', function(answer) {
        conf.hotFolders.push({
          type: TYPES.YOUTUBE,
          path: (answer || defaultPath).replace(/\\/g, '/')
        });
        callback();
      });
    },
    function(callback) {
      if (!videoPlatformConf.wowza) return callback();
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'hotFolder', TYPES.WOWZA);
      rl.question('Enter Wowza hot folder path to listen to (default: ' + defaultPath + '):\n', function(answer) {
        conf.hotFolders.push({
          type: TYPES.WOWZA,
          path: (answer || defaultPath).replace(/\\/g, '/')
        });
        callback();
      });
    },
    function(callback) {
      if (!videoPlatformConf.local) return callback();
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'hotFolder', TYPES.LOCAL);
      rl.question('Enter local hot folder path to listen to (default: ' + defaultPath + '):\n', function(answer) {
        conf.hotFolders.push({
          type: TYPES.LOCAL,
          path: (answer || defaultPath).replace(/\\/g, '/')
        });
        callback();
      });
    },
    function(callback) {
      if (!videoPlatformConf.tls) return callback();
      var defaultPath = path.join(os.tmpdir(), 'openveo', 'publish', 'hotFolder', TYPES.TLS);
      rl.question('Enter TLS hot folder path to listen to (default: ' + defaultPath + '):\n', function(answer) {
        conf.hotFolders.push({
          type: TYPES.TLS,
          path: (answer || defaultPath).replace(/\\/g, '/')
        });
        callback();
      });
    }
  ], function(error, results) {
    if (error) {
      process.stdout.write(error.message);
      callback();
    } else
      fs.writeFile(confFile, JSON.stringify(conf, null, '\t'), {encoding: 'utf8'}, callback);
  });
}

// Launch installation
async.series([
  createConfDir,
  createConf,
  createVideoTmpDir,
  createVideoPlatformConf,
  createWatcherConf,
  createHotFolder
], function(error, results) {
  if (error)
    throw error;
  else {
    process.stdout.write('Installation complete\n');
    exit();
  }
});
