'use strict';

module.exports = {
  http: {
    routes: {
      public: {
        'get /video/*': 'app/server/controllers/VideoController.displayVideoAction',
        'get /getVideo/:id': 'app/server/controllers/VideoController.getVideoReadyAction',
        'post /videos/:id/poi/convert': 'app/server/controllers/VideoController.convertPoiAction'
      },
      private: {
        'get /videos/:id': 'app/server/controllers/VideoController.getEntityAction',
        'get /videos*': 'app/server/controllers/VideoController.getEntitiesAction',
        'post /videos/:id': 'app/server/controllers/VideoController.updateEntityAction',
        'post /videos/:id/chapters/:chapterid': 'app/server/controllers/VideoController.updateChapterAction',
        'post /videos/:id/chapters': 'app/server/controllers/VideoController.updateChapterAction',
        'post /videos/:id/tags/:tagid': 'app/server/controllers/VideoController.updateTagAction',
        'post /videos/:id/tags': 'app/server/controllers/VideoController.updateTagAction',
        'delete /videos/:id': 'app/server/controllers/VideoController.removeEntitiesAction',
        'delete /videos/:id/chapters/:chaptersids': 'app/server/controllers/VideoController.removeChaptersAction',
        'delete /videos/:id/tags/:tagsids': 'app/server/controllers/VideoController.removeTagsAction',
        'post /addMedia': 'app/server/controllers/VideoController.addEntityAction',
        'post /retryVideo/:ids': 'app/server/controllers/VideoController.retryVideosAction',
        'post /startUpload/:ids/:platform': 'app/server/controllers/VideoController.startUploadAction',
        'post /publishVideo/:ids': 'app/server/controllers/VideoController.publishVideosAction',
        'post /unpublishVideo/:ids': 'app/server/controllers/VideoController.unpublishVideosAction',
        'get /getPlatforms': 'app/server/controllers/VideoController.getPlatformsAction',
        'get /configuration/all': 'app/server/controllers/ConfigurationController.getConfigurationAllAction',
        'get /configuration/googleOAuthAssociation':
        'app/server/controllers/ConfigurationController.handleGoogleOAuthCodeAction',
        'post /configuration/watcher': 'app/server/controllers/ConfigurationController.saveWatcherSettings',
        'post /configuration/tls': 'app/server/controllers/ConfigurationController.saveTlsSettingsAction',
        'post /configuration/catalog': 'app/server/controllers/ConfigurationController.saveCatalogSettingsAction'
      },
      ws: {
        'get /propertiesTypes': 'app/server/controllers/PropertyController.getPropertyTypesAction',
        'post /statistics/:entity/:type/:id': 'app/server/controllers/StatisticsController.statisticsAction',
        'get /videos/:id': 'app/server/controllers/VideoController.getEntityAction',
        'post /videos/:id/poi/convert': 'app/server/controllers/VideoController.convertPoiAction',
        'get /videos*': 'app/server/controllers/VideoController.getEntitiesAction',
        'delete /videos/:id': 'app/server/controllers/VideoController.removeEntitiesAction',
        'post /videos': 'app/server/controllers/VideoController.addEntityAction',
        'post /videos/:ids/publish': 'app/server/controllers/VideoController.publishVideosAction',
        'post /videos/:ids/unpublish': 'app/server/controllers/VideoController.unpublishVideosAction',
        'get /platforms': 'app/server/controllers/VideoController.getPlatformsAction'
      }
    }
  },
  entities: {
    properties: 'app/server/controllers/PropertyController'
  },
  webServiceScopes: [
    {
      id: 'publish-statistics',
      name: 'PUBLISH.WS_SCOPES.INCREASE_VIEW_NAME',
      description: 'PUBLISH.WS_SCOPES.INCREASE_VIEW_DESCRIPTION',
      paths: [
        'post /publish/statistics*'
      ]
    },
    {
      id: 'publish-get-videos',
      name: 'PUBLISH.WS_SCOPES.GET_VIDEOS_NAME',
      description: 'PUBLISH.WS_SCOPES.GET_VIDEOS_DESCRIPTION',
      paths: [
        'get /publish/videos*',
        'post /publish/videos/:id/poi/convert'
      ]
    },
    {
      id: 'publish-delete-videos',
      name: 'PUBLISH.WS_SCOPES.DELETE_VIDEOS_NAME',
      description: 'PUBLISH.WS_SCOPES.DELETE_VIDEOS_DESCRIPTION',
      paths: [
        'delete /publish/videos*'
      ]
    },
    {
      id: 'publish-add-video',
      name: 'PUBLISH.WS_SCOPES.ADD_VIDEO_NAME',
      description: 'PUBLISH.WS_SCOPES.ADD_VIDEO_DESCRIPTION',
      paths: [
        'post /publish/videos'
      ]
    },
    {
      id: 'publish-publish-videos',
      name: 'PUBLISH.WS_SCOPES.PUBLISH_VIDEOS_NAME',
      description: 'PUBLISH.WS_SCOPES.PUBLISH_VIDEOS_DESCRIPTION',
      paths: [
        'post /publish/videos/:id/publish',
        'post /publish/videos/:id/unpublish'
      ]
    },
    {
      id: 'publish-get-platforms',
      name: 'PUBLISH.WS_SCOPES.GET_PLATFORMS_NAME',
      description: 'PUBLISH.WS_SCOPES.GET_PLATFORMS_DESCRIPTION',
      paths: [
        'get /publish/platforms'
      ]
    }
  ],
  permissions: [
    {
      label: 'PUBLISH.PERMISSIONS.GROUP_PROPERTIES',
      permissions: [
        {
          id: 'publish-access-properties-page',
          name: 'PUBLISH.PERMISSIONS.ACCESS_PROPERTIES_PAGE_NAME'
        }
      ]
    },
    {
      label: 'PUBLISH.PERMISSIONS.GROUP_CONFIGURATION',
      permissions: [
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
        }
      ]
    },
    {
      label: 'PUBLISH.PERMISSIONS.GROUP_CATEGORIES',
      permissions: [
        {
          id: 'publish-access-categories-page',
          name: 'PUBLISH.PERMISSIONS.ACCESS_CATEGORIES_PAGE_NAME'
        }
      ]
    },
    {
      label: 'PUBLISH.PERMISSIONS.GROUP_VIDEOS',
      permissions: [
        {
          id: 'publish-access-videos-page',
          name: 'PUBLISH.PERMISSIONS.ACCESS_VIDEOS_PAGE_NAME'
        },
        {
          id: 'publish-add-videos',
          name: 'PUBLISH.PERMISSIONS.ADD_VIDEOS_NAME',
          description: 'PUBLISH.PERMISSIONS.ADD_VIDEOS_DESCRIPTION',
          paths: ['post /publish/addMedia*']
        },
        {
          id: 'publish-update-videos',
          name: 'PUBLISH.PERMISSIONS.UPDATE_VIDEOS_NAME',
          description: 'PUBLISH.PERMISSIONS.UPDATE_VIDEOS_DESCRIPTION',
          paths: ['post /publish/videos*']
        },
        {
          id: 'publish-delete-videos',
          name: 'PUBLISH.PERMISSIONS.DELETE_VIDEOS_NAME',
          description: 'PUBLISH.PERMISSIONS.DELETE_VIDEOS_DESCRIPTION',
          paths: ['delete /publish/videos*']
        },
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
          id: 'publish-editor-videos',
          name: 'PUBLISH.PERMISSIONS.EDIT_CHAPTER_NAME',
          description: 'PUBLISH.PERMISSIONS.EDIT_CHAPTER_DESCRIPTION',
          paths: [
            'post /publish/videos/*',
            'delete /publish/videos/*'
          ]
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
        },
        {
          id: 'publish-manage-videos',
          name: 'PUBLISH.PERMISSIONS.MANAGE_VIDEOS_NAME',
          description: 'PUBLISH.PERMISSIONS.MANAGE_VIDEOS_DESCRIPTION'
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
            label: 'PUBLISH.MENU.CONFIGURATION',
            path: 'publish/configuration',
            permission: 'publish-access-conf-page'
          }
        ]
      }
    ],
    scriptLibFiles: {
      dev: [
        'multirange/multirange.js'
      ],
      prod: [
        'be/js/libOpenveoPublish.js'
      ]
    },
    scriptFiles: {
      dev: [
        'ovPub/PublishApp.js',
        'ovPub/MediaController.js',
        'ovPub/PropertiesController.js',
        'ovPub/CategoriesController.js',
        'ovPub/EditorController.js',
        'ovPub/ConfigurationController.js',
        'ovPub/PublishService.js',
        'ovPub/TimeDirective.js',
        'ovPub/MillisecondsToTimeFilter.js',
        'ovPub/TimeToMillisecondsFilter.js'
      ],
      prod: [
        'be/js/openveoPublish.js'
      ]
    },
    cssFiles: [
      'be/css/publish.css'
    ]
  },
  custom: {
    scriptFiles: {
      base: [
        'angular/angular.min.js',
        'angular-animate/angular-animate.min.js',
        'angular-cookies/angular-cookies.min.js',
        'openveo-player/dist/openveo-player.min.js',
        'video.js/dist/video.min.js',
        'dashjs/dist/dash.all.min.js',
        'videojs-contrib-dash/dist/videojs-dash.min.js',
        'videojs-contrib-hls/dist/videojs-contrib-hls.min.js'
      ],
      publishPlayer: {
        dev: [
          'PublishPlayerApp.js',
          'MediaService.js',
          'PlayerController.js'
        ],
        prod: [
          'player/js/openveoPublishPlayer.js'
        ]
      }
    },
    cssFiles: [
      'be/css/player_page.css',
      'openveo-player/dist/openveo-player.css',
      'video.js/dist/video-js.min.css'
    ]
  },
  viewsFolders: [
    'app/client/front/views'
  ],
  imageProcessing: {
    folders: [
      {
        imagesDirectory: 'assets/player/videos'
      }
    ],
    styles: [
      {
        id: 'publish-thumb-200',
        type: 'thumb',
        width: 200
      },
      {
        id: 'publish-square-142',
        type: 'thumb',
        width: 142,
        height: 142,
        crop: true
      },
      {
        id: 'publish-16by9-300',
        type: 'thumb',
        width: 300,
        height: 169,
        crop: true
      },
      {
        id: 'publish-16by9-142',
        type: 'thumb',
        width: 142,
        height: 80,
        crop: true
      }
    ]
  },
  libraries: [
    {
      name: 'angular',
      mountPath: 'angular',
      files: []
    },
    {
      name: 'angular-animate',
      mountPath: 'angular-animate',
      files: []
    },
    {
      name: 'angular-cookies',
      mountPath: 'angular-cookies',
      files: []
    },
    {
      name: 'html5shiv',
      mountPath: 'html5shiv',
      files: []
    },
    {
      name: '@openveo/player',
      mountPath: 'openveo-player',
      files: ['dist/openveo-player.min.js', 'dist/openveo-player.css']
    },
    {
      name: 'video.js',
      mountPath: 'video.js',
      files: ['dist/video.min.js', 'dist/video-js.min.css']
    },
    {
      name: 'dashjs',
      mountPath: 'dashjs',
      files: ['dist/dash.all.min.js']
    },
    {
      name: 'videojs-contrib-dash',
      mountPath: 'videojs-contrib-dash',
      files: ['dist/videojs-dash.min.js']
    },
    {
      name: 'videojs-contrib-hls',
      mountPath: 'videojs-contrib-hls',
      files: ['dist/videojs-contrib-hls.min.js']
    }
  ]
};
