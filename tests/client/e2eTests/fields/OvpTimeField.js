'use strict';

/**
 * @module e2e
 */

var util = require('util');
var Field = process.requireTest('lib/e2e/fields/Field.js');
var browserExt = process.requireTest('lib/e2e/browser.js');

/**
 * Define a time field to manage three inputs (hours, minutes & seconds)
 *
 * @class OvpTimeField
 * @extends Field
 * @constructor
 * @param {Object} conf The filed configuration object
 */
function OvpTimeField(conf) {
  OvpTimeField.super_.call(this, conf);
}

module.exports = OvpTimeField;
util.inherits(OvpTimeField, Field);

/**
 * Get field value.
 *
 * @example
 *
 *   myField.getValue().then(function(value) {
 *     console.log('Got value : ' + value);
 *   });
 *
 * @method getValue
 * @return {Promise} Promise resolving with field value
 */
OvpTimeField.prototype.getValue = function() {
  return this.getElement().then(function(elementFinder) {
    var fieldElements;

    fieldElements = elementFinder.all(by.css('input'));

    return fieldElements.map(function(element, index) {
      return browserExt.getProperty(element, 'value');
    }).then(function(value) {
      return protractor.promise.fulfilled(value.join(':'));
    });
  });
};

/**
 * Sets field value.
 *
 * @example
 *
 *   myField.setValue('new value').then(function() {
 *     console.log('Value set');
 *   });
 *
 * @method setValue
 * @param {String} [value='00:00:00'] Field's value format as hh:mm:ss
 * @return {Promise} Promise resolving when the field is filled
 */
OvpTimeField.prototype.setValue = function(value) {
  var fieldElements;
  var values = value.split(':');

  if (values.length !== 3) {
    return protractor.promise.rejected(new Error('Invalid value format'));
  }

  return this.getElement().then(function(elementFinder) {
    fieldElements = elementFinder.all(by.css('input'));

    return fieldElements.each(function(element) {
      return element.clear();
    });
  }).then(function() {
    return fieldElements.each(function(element, index) {
      return element.sendKeys(values[index]);
    });
  });
};
