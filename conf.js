'use strict';

module.exports = {
  routes: {
    public: {
      'get /video/*': 'app/server/controllers/VideoController.displayVideoAction',
      'get /getVideo/:id': 'app/server/controllers/VideoController.getVideoReadyAction'
    },
    private: {
      'get /watcherStatus': 'app/server/controllers/WatcherController.getStatusAction',
      'post /stopWatcher': 'app/server/controllers/WatcherController.stopAction',
      'post /startWatcher': 'app/server/controllers/WatcherController.startAction',
      'post /retryVideo/:ids': 'app/server/controllers/WatcherController.retryVideoAction',
      'post /startUpload/:ids/:platform': 'app/server/controllers/WatcherController.startUploadAction',
      'post /publishVideo/:id': 'app/server/controllers/VideoController.publishVideoAction',
      'post /unpublishVideo/:id': 'app/server/controllers/VideoController.unpublishVideoAction',
      'get /getPlatforms': 'app/server/controllers/VideoController.getPlatformsAction',
      'get /configuration/all': 'app/server/controllers/ConfigurationController.getConfigurationAllAction',
      'get /configuration/googleOAuthAssociation':
      'app/server/controllers/ConfigurationController.handleGoogleOAuthCodeAction'
    },
    ws: {
      'get /propertiesTypes': 'app/server/controllers/PropertyController.getPropertyTypesAction',
      'post /statistics/:entity/:type/:id': 'app/server/controllers/StatisticsController.statisticsAction'
    }
  },
  entities: {
    categories: 'app/server/controllers/CategoryController',
    properties: 'app/server/controllers/PropertyController',
    videos: 'app/server/controllers/VideoController'
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
        'post /publish/statistics*'
      ]
    }
  ],
  permissions: [
    {
      id: 'access-videos-page',
      name: 'PERMISSIONS.ACCESS_VIDEOS_PAGE_NAME'
    },
    {
      id: 'access-properties-page',
      name: 'PERMISSIONS.ACCESS_PROPERTIES_PAGE_NAME'
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
      label: 'PERMISSIONS.GROUP_VIDEOS',
      permissions: [
        {
          id: 'publish-videos',
          name: 'PERMISSIONS.PUBLISH_VIDEO_NAME',
          description: 'PERMISSIONS.PUBLISH_VIDEO_DESCRIPTION',
          paths: [
            'get /publish/publishVideo*',
            'get /publish/unpublishVideo*'
          ]
        },
        {
          id: 'chapter-videos',
          name: 'PERMISSIONS.EDIT_CHAPTER_NAME',
          description: 'PERMISSIONS.EDIT_CHAPTER_DESCRIPTION'
        },
        {
          id: 'retry-videos',
          name: 'PERMISSIONS.RETRY_VIDEO_NAME',
          description: 'PERMISSIONS.RETRY_VIDEO_DESCRIPTION'
        },
        {
          id: 'upload-videos',
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
            path: 'publish/medias-list',
            permission: 'access-videos-page'
          },
          {
            label: 'MENU.CATEGORIES',
            path: 'publish/categories-list',
            permission: 'access-categories-page'
          },
          {
            label: 'MENU.PROPERTIES',
            path: 'publish/properties-list',
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
