'use strict';

module.exports = {

  // Publish plugin unit tests
  publish: {
    options: {
      reporter: 'spec'
    },
    src: ['tests/server/init.js', 'tests/server/*.js']
  }

};
