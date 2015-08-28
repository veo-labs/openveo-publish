// Karma configuration
module.exports = function(config){
  
  config.set({

    // Base path that will be used to resolve all patterns 
    // (eg. files, exclude)
    basePath: "../../",

    // List of files / patterns to load in the browser
    files: [
      "public/publish/lib/angular/angular.js",
      "public/publish/lib/angular-route/angular-route.js",
      "public/publish/lib/angular-animate/angular-animate.js",
      "public/publish/lib/angular-cookies/angular-cookies.js",
      "public/publish/lib/angular-animate/angular-animate.js",
      "public/publish/lib/angular-mocks/angular-mocks.js",
      "public/publish/lib/ng-jsonpath/dist/ng-jsonpath.js",
      "tests/client/unitTests/front/player/playerApp.js",
      "tests/client/unitTests/admin/tableForm/tableForm.js",
      "tests/client/unitTests/admin/route/RouteApp.js",
      "tests/client/unitTests/admin/i18n/I18nApp.js",
      "tests/client/unitTests/admin/entity/EntityApp.js",
      "app/client/admin/js/ovPub/PublishApp.js",
      "app/client/admin/js/ovPub/**/*.js",
      "app/client/front/js/PublishPlayerApp.js",
      "app/client/front/js/**/*.js",
      "tests/client/unitTests/admin/*.js",
      "tests/client/unitTests/front/*.js"
    ]
    
  });
  
};