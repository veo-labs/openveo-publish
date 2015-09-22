'use strict';

process.stdin.setEncoding('utf8');
process.stdin.on('data', function() {
});

process.send({
  status: 'started'
});
