'use strict';

module.exports = {
  routes: {
    public: {
      'get /video/*': 'app/server/controllers/videoController.displayVideoAction',
      'get /getVideo/:id': 'app/server/controllers/videoController.getVideoReadyAction'
    },
    private: {
      'get /watcherStatus': 'app/server/controllers/watcherController.getStatusAction',
      'post /stopWatcher': 'app/server/controllers/watcherController.stopAction',
      'post /startWatcher': 'app/server/controllers/watcherController.startAction',
      'post /retryVideo/:ids': 'app/server/controllers/watcherController.retryVideoAction',
      'post /startUpload/:ids/:platform': 'app/server/controllers/watcherController.startUploadAction',
      'post /publishVideo/:id': 'app/server/controllers/videoController.publishVideoAction',
      'post /unpublishVideo/:id': 'app/server/controllers/videoController.unpublishVideoAction',
      'get /getPlatforms': 'app/server/controllers/videoController.getPlatformsAction',
      'get /configuration/all': 'app/server/controllers/configurationController.getConfigurationAllAction',
      'get /configuration/googleOAuthAssociation':
      'app/server/controllers/configurationController.handleGoogleOAuthCodeAction'
    },
    ws: {
      'get /videos/:id': 'app/server/controllers/videoController.getVideoAction',
      'get /videos': 'app/server/controllers/videoController.getVideoByPropertiesAction',
      'get /properties/:id': 'app/server/controllers/propertyController.getPropertyAction',
      'get /properties': 'app/server/controllers/propertyController.getPropertiesAction',
      'get /propertiesTypes': 'app/server/controllers/propertyController.getPropertyTypesAction',
      'get /categories/:id': 'app/server/controllers/categoryController.getCategoryAction',
      'get /categories': 'app/server/controllers/categoryController.getCategoriesAction',
      'post /statistics/:entity/:type/:id': 'app/server/controllers/statisticsController.statisticsAction'
    }
  },
  entities: {
    category: 'app/server/models/CategoryModel',
    property: 'app/server/models/PropertyModel',
    video: 'app/server/models/VideoModel'
  },
  webServiceScopes: [
    {
      id: 'video',
      name: 'WS_SCOPES.GET_VIDEO_NAME',
      description: 'WS_SCOPES.GET_VIDEO_DESCRIPTON',
      paths: [
        'get /publish/videos*'
      ]
    },
    {
      id: 'property',
      name: 'WS_SCOPES.GET_PROPERTY_NAME',
      description: 'WS_SCOPES.GET_PROPERTY_DESCRIPTON',
      paths: [
        'get /publish/properties*'
      ]
    },
    {
      id: 'category',
      name: 'WS_SCOPES.GET_CATEGORY_NAME',
      description: 'WS_SCOPES.GET_CATEGORY_DESCRIPTON',
      paths: [
        'get /publish/categories*'
      ]
    },
    {
      id: 'statistics',
      name: 'WS_SCOPES.INCREASE_VIEW_NAME',
      description: 'WS_SCOPES.INCREASE_VIEW_DESCRIPTION',
      paths: [
        'post /statistics/*'
      ]
    }
  ],
  permissions: [
    {
      id: 'access-videos-page',
      name: 'PERMISSIONS.ACCESS_VIDEO_PAGE_NAME'
    },
    {
      id: 'access-properties-page',
      name: 'PERMISSIONS.ACCESS_PROPERTY_PAGE_NAME'
    },
    {
      id: 'access-categories-page',
      name: 'PERMISSIONS.ACCESS_CATEGORIES_PAGE_NAME'
    },
    {
      id: 'access-watcher-page',
      name: 'PERMISSIONS.ACCESS_WATCHER_PAGE_NAME'
    },
    {
      id: 'manage-watcher',
      name: 'PERMISSIONS.MANAGE_WATCHER_NAME',
      description: 'PERMISSIONS.MANAGE_WATCHER_DESCRIPTION',
      paths: [
        'get /publish/stopWatcher*',
        'get /publish/startWatcher*'
      ]
    },
    {
      id: 'access-conf-page',
      name: 'PERMISSIONS.ACCESS_PUBLISH_CONF_PAGE_NAME',
      paths: [
        'get /publish/configuration/all'
      ]
    },
    {
      id: 'manage-publish-config',
      name: 'PERMISSIONS.MANAGE_PUBLISH_CONF_NAME',
      description: 'PERMISSIONS.MANAGE_PUBLISH_CONF_DESCRIPTION',
      paths: [
        'get /publish/configuration/all'
      ]
    },
    {
      label: 'PERMISSIONS.GROUP_VIDEO',
      permissions: [
        {
          id: 'publish-video',
          name: 'PERMISSIONS.PUBLISH_VIDEO_NAME',
          description: 'PERMISSIONS.PUBLISH_VIDEO_DESCRIPTION',
          paths: [
            'get /publish/publishVideo*',
            'get /publish/unpublishVideo*'
          ]
        },
        {
          id: 'chapter-video',
          name: 'PERMISSIONS.EDIT_CHAPTER_NAME',
          description: 'PERMISSIONS.EDIT_CHAPTER_DESCRIPTION'
        },
        {
          id: 'retry-video',
          name: 'PERMISSIONS.RETRY_VIDEO_NAME',
          description: 'PERMISSIONS.RETRY_VIDEO_DESCRIPTION'
        },
        {
          id: 'upload-video',
          name: 'PERMISSIONS.UPLOAD_VIDEO_NAME',
          description: 'PERMISSIONS.UPLOAD_VIDEO_DESCRIPTION'
        }
      ]
    }
  ],
  backOffice: {
    menu: [
      {
        weight: -100,
        label: 'MENU.PUBLISH',
        subMenu: [
          {
            label: 'MENU.VIDEOS',
            path: 'publish/medias',
            permission: 'access-videos-page'
          },
          {
            label: 'MENU.CATEGORIES',
            path: 'publish/categories',
            permission: 'access-categories-page'
          },
          {
            label: 'MENU.PROPERTIES',
            path: 'publish/properties',
            permission: 'access-properties-page'
          },
          {
            label: 'MENU.WATCHER',
            path: 'publish/watcher',
            permission: 'access-watcher-page'
          },
          {
            label: 'MENU.CONFIGURATION',
            path: 'publish/configuration',
            permission: 'access-conf-page'
          }
        ]
      }
    ],
    scriptLibFiles: {
      base: [],
      dev: [
        '/publish/multirange/multirange.js',
        '/publish/timePolyfill/time-polyfill.js'
      ],
      prod: [
        '/publish/be/js/libOpenveoPublish.js'
      ]
    },
    scriptFiles: {
      base: [
        '/publish/lib/openveo-player/lib/video.js/dist/video.min.js',
        '/publish/lib/openveo-player/lib/dash.js/dist/dash.all.js',
        '/publish/lib/openveo-player/lib/videojs-contrib-dash/src/js/videojs-dash.js',
        '/publish/lib/openveo-player/lib/videojs.hls.min/index.js',
        '/publish/lib/openveo-player/dist/openveo-player.min.js'
      ],
      dev: [
        '/publish/ovPub/PublishApp.js',
        '/publish/ovPub/MediaController.js',
        '/publish/ovPub/WatcherController.js',
        '/publish/ovPub/PropertiesController.js',
        '/publish/ovPub/CategoriesController.js',
        '/publish/ovPub/ChapterController.js',
        '/publish/ovPub/ConfigurationController.js',
        '/publish/ovPub/PublishService.js'
      ],
      prod: [
        '/publish/be/js/openveoPublish.js'
      ]
    },
    cssFiles: [
      '/publish/be/css/publish.css',
      '/publish/lib/openveo-player/dist/openveo-player.css',
      '/publish/lib/openveo-player/lib/video.js/dist/video-js.min.css'
    ]
  },
  custom: {
    scriptFiles: {
      base: [
        '/publish/lib/angular/angular.min.js',
        '/publish/lib/angular-animate/angular-animate.min.js',
        '/publish/lib/angular-cookies/angular-cookies.min.js',
        '/publish/lib/openveo-player/dist/openveo-player.min.js',
        '/publish/lib/openveo-player/lib/video.js/dist/video.min.js',
        '/publish/lib/openveo-player/lib/dash.js/dist/dash.all.js',
        '/publish/lib/openveo-player/lib/videojs-contrib-dash/src/js/videojs-dash.js',
        '/publish/lib/openveo-player/lib/videojs.hls.min/index.js'
      ],
      publishPlayer: {
        dev: [
          '/publish/PublishPlayerApp.js',
          '/publish/MediaService.js',
          '/publish/PlayerController.js'
        ],
        prod: [
          '/publish/player/js/openveoPublishPlayer.js'
        ]
      }
    },
    cssFiles: [
      '/publish/be/css/player_page.css',
      '/publish/lib/openveo-player/dist/openveo-player.css',
      '/publish/lib/openveo-player/lib/video.js/dist/video-js.min.css'
    ]
  },
  viewsFolders: [
    'app/client/front/views'
  ],
  imageProcessing: {
    imagesFolders: ['assets/player/videos'],
    imagesStyle: {
      small: 200
    }
  }
};
