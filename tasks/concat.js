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
  'back-office-libraries': {
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptLibFiles']['dev']),
    dest: '<%= publish.beJSAssets %>/libOpenveoPublish.js'
  },

  // Concatenate all back office client JavaScript files
  'back-office-js': {
    src: getMinifiedJSFiles(applicationConf['backOffice']['scriptFiles']['dev']),
    dest: '<%= publish.beJSAssets %>/openveoPublish.js'
  },

  // Concatenate all front office client JavaScript files
  'front-js': {
    src: getMinifiedJSFiles(applicationConf['custom']['scriptFiles']['publishPlayer']['dev']),
    dest: '<%= publish.playerJSAssets %>/openveoPublishPlayer.js'
  }

};
