'use strict';

var applicationConf = process.requirePublish('conf.js');

/**
 * Gets the list of minified JavaScript files from the given list of files.
 *
 * It will just replace ".js" by ".min.js".
 *
 * @param Array files The list of files
 * @return Array The list of minified files
 */
function getMinifiedJSFiles(files) {
  var minifiedFiles = [];
  files.forEach(function(path) {
    minifiedFiles.push('<%= publish.uglify %>/' + path.replace('.js', '.min.js').replace('/publish/', ''));
  });
  return minifiedFiles;
}

module.exports = {
  lib: {

    // Concatenate back office JavaScript library files
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptLibFiles']['dev']),

    // Concatenate all files into libOpenveoPublish.js
    dest: '<%= publish.beJSAssets %>/libOpenveoPublish.js'

  },
  publishjs: {

    // Concatenate all back office JavaScript files
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptFiles']['dev']),

    // Concatenate all files into openveoPublish.js
    dest: '<%= publish.beJSAssets %>/openveoPublish.js'

  },
  frontJS: {

    // Concatenate all front JavaScript files
    src: getMinifiedJSFiles(applicationConf['custom']['scriptFiles']['publishPlayer']['dev']),

    // Concatenate all files into openveoPublishPlayer.js
    dest: '<%= publish.playerJSAssets %>/openveoPublishPlayer.js'

  }
};
