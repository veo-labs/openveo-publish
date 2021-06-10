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

  // Concatenate back office client JavaScript library files
  'admin-libraries': {
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptLibFiles']['dev']),
    dest: '<%= publish.beJSAssets %>/libOpenveoPublish.js'
  },

  // Concatenate all back office client JavaScript files
  'admin-js': {
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptFiles']['dev']),
    dest: '<%= publish.beJSAssets %>/openveoPublish.js'
  },
  frontJS: {

    // Concatenate all front JavaScript files
    src: getMinifiedJSFiles(applicationConf['custom']['scriptFiles']['publishPlayer']['dev']),

    // Concatenate all files into openveoPublishPlayer.js
    dest: '<%= publish.playerJSAssets %>/openveoPublishPlayer.js'

  }
};
