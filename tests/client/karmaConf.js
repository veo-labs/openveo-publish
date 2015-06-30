// Karma configuration
module.exports = function(config){
  
  config.set({

    // Base path that will be used to resolve all patterns 
    // (eg. files, exclude)
    basePath: "../../",

    // Use mocha and chai for tests
    frameworks: ["mocha", "chai"],

    // List of files / patterns to load in the browser
    files: [
        "tests/client/unitTests/front/player/ovPlayerDirectory.js",
        "public/publish/lib/angular/angular.js",
        "public/publish/lib/angular-route/angular-route.js",
        "public/publish/lib/angular-cookies/angular-cookies.js",
        "public/publish/lib/angular-mocks/angular-mocks.js",
        "public/publish/lib/ng-jsonpath/dist/ng-jsonpath.js",
        "tests/client/unitTests/admin/route/RouteApp.js",
        "tests/client/unitTests/admin/i18n/I18nApp.js",
        "tests/client/unitTests/admin/edit/EditApp.js",
        "tests/client/unitTests/admin/entity/EntityApp.js",
        "public/publish/lib/openveo-player/templates/**/*.html",
        "public/publish/admin/js/PublishApp.js",
        "public/publish/admin/js/**/*.js",
        "public/publish/front/js/PublishPlayerApp.js",
        "public/publish/front/js/**/*.js",
        "public/publish/lib/openveo-player/PlayerApp.js",
        "public/publish/lib/openveo-player/**/*.js",
        "tests/client/unitTests/admin/*.js",
        "tests/client/unitTests/front/*.js"
    ],
    
    preprocessors: {
      "public/publish/lib/openveo-player/templates/**/*.html": "html2js"
    },    
    
    ngHtml2JsPreprocessor: {
      moduleName: "templates"
    },

    // Web server port
    port: 9876,

    // Enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR 
    // || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // Enable / disable watching file and executing tests whenever
    // any file changes
    autoWatch: false,

    // List of browsers to execute tests on
    browsers: [
      "Firefox",
      "Chrome",
      "IE",
      "PhantomJS"
    ],
    
    plugins: [
      "karma-ng-html2js-preprocessor",
      "karma-mocha",
      "karma-chai",
      "karma-chrome-launcher",
      "karma-firefox-launcher",
      "karma-ie-launcher",
      "karma-phantomjs-launcher"
    ],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true

  });
  
};