'use strict';

window.assert = chai.assert;

// TimeToMillisecondsFilter.js
describe('TimeToMillisecondsFilter', function() {
  var $filter;

  beforeEach(function() {
    module('ov.publish');

    inject(function(_$filter_) {
      $filter = _$filter_;
    });
  });

  it('Should convert a valid time string to milliseconds', function() {
    assert.equal($filter('timeToMilliseconds')('99:59:59'), 359999000);
  });

  it('Should not convert an invalid string', function() {
    assert.isUndefined($filter('timeToMilliseconds')('00:00:60'));
    assert.isUndefined($filter('timeToMilliseconds')('00:60:00'));
    assert.isUndefined($filter('timeToMilliseconds')('100:00:00'));
    assert.isUndefined($filter('timeToMilliseconds')('00:01'));
    assert.isUndefined($filter('timeToMilliseconds')(' 00:00:01 '));
  });

  it('Should not convert an invalid value', function() {
    assert.isUndefined($filter('timeToMilliseconds')(true));
    assert.isUndefined($filter('timeToMilliseconds')(1));
    assert.isUndefined($filter('timeToMilliseconds')());
  });
});
