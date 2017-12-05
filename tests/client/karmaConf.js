'use strict';

// Karma configuration
module.exports = function(config) {

  config.set({

    // Base path that will be used to resolve all patterns
    // (eg. files, exclude)
    basePath: '../../',

    // List of files / patterns to load in the browser
    files: [
      'assets/lib/angular/angular.js',
      'assets/lib/angular-route/angular-route.js',
      'assets/lib/angular-animate/angular-animate.js',
      'assets/lib/angular-cookies/angular-cookies.js',
      'assets/lib/angular-mocks/angular-mocks.js',
      'assets/lib/ng-jsonpath/dist/ng-jsonpath.js',
      'assets/lib/tinymce/tinymce.min.js',
      'assets/lib/angular-ui-tinymce/dist/tinymce.min.js',
      'tests/client/unitTests/front/player/playerApp.js',
      'tests/client/unitTests/admin/tableForm/tableForm.js',
      'tests/client/unitTests/admin/util/utilService.js',
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
