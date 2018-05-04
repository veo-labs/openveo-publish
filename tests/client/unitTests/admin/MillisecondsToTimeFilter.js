'use strict';

window.assert = chai.assert;

// MillisecondsToTimeFilter.js
describe('MillisecondsToTimeFilter', function() {
  var $filter;

  beforeEach(function() {
    module('ov.publish');

    inject(function(_$filter_) {
      $filter = _$filter_;
    });
  });

  it('Should convert an integer value', function() {
    assert.equal($filter('millisecondsToTime')(10000), '00:00:10');
    assert.equal($filter('millisecondsToTime')(600000), '00:10:00');
    assert.equal($filter('millisecondsToTime')(36000000), '10:00:00');
    assert.equal($filter('millisecondsToTime')('359999000'), '99:59:59');
  });

  it('Should not convert an invalid value', function() {
    assert.isUndefined($filter('millisecondsToTime')(true), '00:00:00');
    assert.isUndefined($filter('millisecondsToTime')(), '00:00:00');
  });
});
