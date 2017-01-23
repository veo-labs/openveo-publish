'use strict';

module.exports = {

  // Publish plugin unit tests
  publish: {
    options: {
      reporter: 'spec'
    },
    src: [
      'tests/server/init.js',
      'tests/server/controllers/*.js',
      'tests/server/models/*.js',
      'tests/server/providers/*.js',
      'tests/server/watcher/*.js'
    ]
  }

};
