'use strict';

// Karma configuration
module.exports = function(config) {

  config.set({

    // Base path that will be used to resolve all patterns
    // (eg. files, exclude)
    basePath: '../../',

    // List of files / patterns to load in the browser
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-route/angular-route.js',
      'node_modules/angular-animate/angular-animate.js',
      'node_modules/angular-cookies/angular-cookies.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/tinymce/tinymce.min.js',
      'node_modules/angular-ui-tinymce/dist/tinymce.min.js',
      'tests/client/unitTests/front/player/playerApp.js',
      'tests/client/unitTests/admin/tableForm/tableForm.js',
      'tests/client/unitTests/admin/util/UtilApp.js',
      'tests/client/unitTests/admin/route/RouteApp.js',
      'tests/client/unitTests/admin/i18n/I18nApp.js',
      'tests/client/unitTests/admin/entity/EntityApp.js',
      'tests/client/unitTests/admin/uploader/UploaderApp.js',
      'app/client/admin/js/multirange/multirange.js',
      'app/client/admin/js/ovPub/PublishApp.js',
      'app/client/admin/js/ovPub/**/*.js',
      'app/client/front/js/PublishPlayerApp.js',
      'app/client/front/js/**/*.js',
      'tests/client/unitTests/admin/*.js',
      'tests/client/unitTests/front/*.js'
    ]

  });

};
