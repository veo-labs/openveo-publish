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
        'post /configuration/medias': 'app/server/controllers/ConfigurationController.saveMediasSettings',
        'post /configuration/tls': 'app/server/controllers/ConfigurationController.saveTlsSettingsAction'
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
        'post /videos/:ids/unpublish': 'app/server/controllers/VideoController.unpublishVideosAction'
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
      base: [
      ],
      dev: [
        '/publish/multirange/multirange.js'
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
        '/publish/ovPub/PropertiesController.js',
        '/publish/ovPub/CategoriesController.js',
        '/publish/ovPub/EditorController.js',
        '/publish/ovPub/ConfigurationController.js',
        '/publish/ovPub/PublishService.js',
        '/publish/ovPub/TimeDirective.js',
        '/publish/ovPub/MillisecondsToTimeFilter.js',
        '/publish/ovPub/TimeToMillisecondsFilter.js'
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
  }
};
