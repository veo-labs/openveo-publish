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
      'tests/server/providers/*.js',
      'tests/server/migrations/*.js',
      'tests/server/packages/*.js',
      'tests/server/listener.js'
    ]
  }

};
