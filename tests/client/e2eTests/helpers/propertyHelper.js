'use strict';

var PropertyPage = process.requirePublish('tests/client/e2eTests/pages/PropertyPage.js');
var PropertyModel = process.requirePublish('app/server/models/PropertyModel.js');

/**
 * Removes all properties from database.
 *
 * @return {Promise} Promise resolving when all custom properties have been removed
 */
module.exports.removeAllProperties = function() {
  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();
    var propertyModel = new PropertyModel();
    propertyModel.get(function(error, properties) {
      var ids = [];

      if (error)
        throw error;

      for (var i = 0; i < properties.length; i++)
        ids.push(properties[i].id);

      if (ids.length) {
        propertyModel.remove(ids, function(error) {
          if (error)
            throw error;
          else
            deferred.fulfill();
        });
      } else
        deferred.fulfill();
    });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });
  });
};

/**
 * Creates properties.
 *
 * @param {Array} properties The list of custom property to create
 * @return {Promise} Promise resolving with customed properties
 */
module.exports.createProperties = function(properties) {
  return browser.waitForAngular().then(function() {
    var propertiesPage = new PropertyPage(new PropertyModel());
    return propertiesPage.addLinesByPass(properties, false);
  });
};

/**
 * Removes properties from database.
 *
 * @param {Array} properties The list of properties to remove as returned by addLinesByPass method
 * @return {Promise} Promise resolving when properties have been removed
 */
module.exports.removeProperties = function(properties) {
  var propertiesPage = new PropertyPage(new PropertyModel());
  return propertiesPage.removeLinesByPass(properties, false);
};
