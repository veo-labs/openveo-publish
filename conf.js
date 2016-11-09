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
      'app/server/controllers/ConfigurationController.handleGoogleOAuthCodeAction',
      'post /configuration/upload': 'app/server/controllers/ConfigurationController.saveUploadConfiguration'
    },
    ws: {
      'get /propertiesTypes': 'app/server/controllers/PropertyController.getPropertyTypesAction',
      'post /statistics/:entity/:type/:id': 'app/server/controllers/StatisticsController.statisticsAction'
    }
  },
  entities: {
    properties: 'app/server/controllers/PropertyController',
    videos: 'app/server/controllers/VideoController'
  },
  webServiceScopes: [
    {
      id: 'publish-statistics',
      name: 'PUBLISH.WS_SCOPES.INCREASE_VIEW_NAME',
      description: 'PUBLISH.WS_SCOPES.INCREASE_VIEW_DESCRIPTION',
      paths: [
        'post /publish/statistics*'
      ]
    }
  ],
  permissions: [
    {
      id: 'publish-access-videos-page',
      name: 'PUBLISH.PERMISSIONS.ACCESS_VIDEOS_PAGE_NAME'
    },
    {
      id: 'publish-access-properties-page',
      name: 'PUBLISH.PERMISSIONS.ACCESS_PROPERTIES_PAGE_NAME'
    },
    {
      id: 'publish-access-categories-page',
      name: 'PUBLISH.PERMISSIONS.ACCESS_CATEGORIES_PAGE_NAME'
    },
    {
      id: 'publish-access-watcher-page',
      name: 'PUBLISH.PERMISSIONS.ACCESS_WATCHER_PAGE_NAME'
    },
    {
      id: 'publish-manage-watcher',
      name: 'PUBLISH.PERMISSIONS.MANAGE_WATCHER_NAME',
      description: 'PUBLISH.PERMISSIONS.MANAGE_WATCHER_DESCRIPTION',
      paths: [
        'get /publish/stopWatcher*',
        'get /publish/startWatcher*'
      ]
    },
    {
      id: 'publish-access-conf-page',
      name: 'PUBLISH.PERMISSIONS.ACCESS_PUBLISH_CONF_PAGE_NAME',
      paths: [
        'get /publish/configuration/all',
        'post /publish/configuration/upload'
      ]
    },
    {
      id: 'publish-manage-publish-config',
      name: 'PUBLISH.PERMISSIONS.MANAGE_PUBLISH_CONF_NAME',
      description: 'PUBLISH.PERMISSIONS.MANAGE_PUBLISH_CONF_DESCRIPTION',
      paths: [
        'get /publish/configuration/all'
      ]
    },
    {
      label: 'PUBLISH.PERMISSIONS.GROUP_VIDEOS',
      permissions: [
        {
          id: 'publish-publish-videos',
          name: 'PUBLISH.PERMISSIONS.PUBLISH_VIDEO_NAME',
          description: 'PUBLISH.PERMISSIONS.PUBLISH_VIDEO_DESCRIPTION',
          paths: [
            'get /publish/publishVideo*',
            'get /publish/unpublishVideo*'
          ]
        },
        {
          id: 'publish-chapter-videos',
          name: 'PUBLISH.PERMISSIONS.EDIT_CHAPTER_NAME',
          description: 'PUBLISH.PERMISSIONS.EDIT_CHAPTER_DESCRIPTION'
        },
        {
          id: 'publish-retry-videos',
          name: 'PUBLISH.PERMISSIONS.RETRY_VIDEO_NAME',
          description: 'PUBLISH.PERMISSIONS.RETRY_VIDEO_DESCRIPTION'
        },
        {
          id: 'publish-upload-videos',
          name: 'PUBLISH.PERMISSIONS.UPLOAD_VIDEO_NAME',
          description: 'PUBLISH.PERMISSIONS.UPLOAD_VIDEO_DESCRIPTION'
        }
      ]
    }
  ],
  backOffice: {
    menu: [
      {
        weight: -100,
        label: 'PUBLISH.MENU.PUBLISH',
        subMenu: [
          {
            label: 'PUBLISH.MENU.VIDEOS',
            path: 'publish/medias-list',
            permission: 'publish-access-videos-page'
          },
          {
            label: 'PUBLISH.MENU.CATEGORIES',
            path: 'publish/categories-list',
            permission: 'publish-access-categories-page'
          },
          {
            label: 'PUBLISH.MENU.PROPERTIES',
            path: 'publish/properties-list',
            permission: 'publish-access-properties-page'
          },
          {
            label: 'PUBLISH.MENU.WATCHER',
            path: 'publish/watcher',
            permission: 'publish-access-watcher-page'
          },
          {
            label: 'PUBLISH.MENU.CONFIGURATION',
            path: 'publish/configuration',
            permission: 'publish-access-conf-page'
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
        '/publish/lib/video.js/dist/video.min.js',
        '/publish/lib/dashjs/dist/dash.all.min.js',
        '/publish/lib/videojs-contrib-dash/index.js',
        '/publish/lib/videojs-contrib-hls/index.js',
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
      '/publish/lib/video.js/dist/video-js.min.css'
    ]
  },
  custom: {
    scriptFiles: {
      base: [
        '/publish/lib/angular/angular.min.js',
        '/publish/lib/angular-animate/angular-animate.min.js',
        '/publish/lib/angular-cookies/angular-cookies.min.js',
        '/publish/lib/openveo-player/dist/openveo-player.min.js',
        '/publish/lib/video.js/dist/video.min.js',
        '/publish/lib/dashjs/dist/dash.all.min.js',
        '/publish/lib/videojs-contrib-dash/index.js',
        '/publish/lib/videojs-contrib-hls/index.js'
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
      '/publish/lib/video.js/dist/video-js.min.css'
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
