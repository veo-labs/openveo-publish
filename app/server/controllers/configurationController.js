'use strict';

/**
 * @module publish-controllers
 */

// Module dependencies
var googleOAuthHelper = process.requirePublish('app/server/googleOAuthHelper.js');
var logger = require('winston').loggers.get('publish');

/**
 * Retrieve informations about oAuth authenfifiction :
 *  - the url to authenticate to google
 *  - a boolean to chec kwheter we already have a token or not
 *
 * @param {type} request express request
 * @param {type} response express response
 */
module.exports.getOAuthInformationsAction = function(request, response) {
  console.log('toto');
  var infos = {};
  googleOAuthHelper.hasToken(function(hasToken) {
    console.log('tata');
    infos.hasToken = hasToken;
    infos.authUrl = googleOAuthHelper.getAuthUrl(
            {scope: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload']}
    );
    response.send({authInfos: infos});
  });
};


/**
 * Redirect action that will be called by google when the user associate our application,
 * a code will be in the parameters
 *
 * @param {type} request express request
 * @param {type} response express response
 */
module.exports.handleGoogleOAuthCodeAction = function(request, response) {
  var code = request.query.code;
  logger.debug('Code received ', code);
  googleOAuthHelper.persistTokenWithCode(code, function() {
    response.redirect('/be/publish/configuration');
  });
};
