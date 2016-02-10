'use strict';

var ConfigurationModel = process.requirePublish('app/server/models/ConfigurationModel.js');
var configurationModel = new ConfigurationModel();

/**
 * Creates a configuration by passing the browser.
 *
 * The given configuration is added directly into the database without using the WebDriver.
 *
 * @param {Object} configuration Configuration description to add
 * @return {Promise} Promise resolving when configuration has been added
 */
module.exports.createConfiguration = function(configuration) {
  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    configurationModel.add(configuration, function(error) {
      if (error)
        throw error;
      else
        deferred.fulfill();
    });

    return browser.controlFlow().execute(function() {
      return deferred.promise;
    });
  });
};

/**
 * Removes all configurations by passing the browser.
 *
 * Configurations are removed directly from database without using the WebDriver.
 *
 * @return {Promise} Promise resolving when configurations have been removed
 */
module.exports.removeAllConfigurations = function() {
  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();
    configurationModel.get(function(error, configurations) {
      var ids = [];

      if (error)
        throw error;

      for (var i = 0; i < configurations.length; i++)
        ids.push(configurations[i].id);

      if (ids.length) {
        configurationModel.remove(ids, function(error) {
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
