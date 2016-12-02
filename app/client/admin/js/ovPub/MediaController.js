'use strict';

(function(app) {

  /**
   * Defines the media controller for the medias page.
   */
  function MediaController(
  $scope,
  $filter,
  $location,
  $window,
  $interval,
  entityService,
  publishService,
  utilService,
  properties,
  platforms,
  groups,
  users,
  tableReloadEventService,
  i18nService,
  publishName) {
    var entityType = 'videos';

    $scope.properties = properties.data.entities;
    $scope.platforms = platforms.data.platforms;
    $scope.groups = groups.data.entities;
    $scope.users = users.data.entities;

    /*
     *
     * RIGHTS
     *
     */
    $scope.rights = {};
    $scope.rights.publish = $scope.checkAccess('publish-publish-' + entityType);
    $scope.rights.chapter = $scope.checkAccess('publish-chapter-' + entityType);
    $scope.rights.retry = $scope.checkAccess('publish-retry-' + entityType);
    $scope.rights.upload = $scope.checkAccess('publish-upload-' + entityType);

    /*
     * FORM EDIT
     */
    var scopeEditForm = $scope.editFormContainer = {};
    scopeEditForm.model = {};
    scopeEditForm.pendingEdition = false;
    scopeEditForm.pluginName = publishName;

    /*
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.pluginName = publishName;

    /**
     * Gets all categories and add a value for "none".
     *
     * @param {String} label The label for "no categories"
     * @return {Array} The list of categories
     */
    function getSelectableCategories(label) {
      return [{
        value: null,
        name: $filter('translate')(label)
      }].concat(publishService.getCategoriesOptions());
    }

    /**
     * Opens a link in a new tab.
     *
     * @param {String} link Destination url
     */
    function goToPath(link) {
      $window.open(link, '_blank');
    }

    /**
     * Opens an alert to display HTML code to share the media.
     *
     * @param {Object} media The media to share
     */
    function shareCode(media) {
      $scope.$emit('setAlert', 'info', [
        $filter('translate')('PUBLISH.MEDIAS.SHARECODE'),
        '<br><br><div class="well well-sm"><code>',
        '&lt;iframe width="768" height="500" ',
        'src="' + $location.protocol() + '://' + $location.host() + ':' + $location.port() + media.link,
        '?fullscreen&lang=' + i18nService.getLanguage() + '"',
        ' frameborder="0"&gt;&lt;/iframe&gt;',
        '</div>'
      ].join(''), 0);
    }

    // Iterate through the list of medias, if at least one media
    // is pending, poll each 30 seconds to be informed of
    // its status
    var pollMediasPromise = $interval(function() {
      if (!scopeEditForm.pendingEdition) {
        $scope.$emit('setAlert', 'info', $filter('translate')('PUBLISH.MEDIAS.RELOAD'), 4000);
        entityService.deleteCache(entityType, publishName);
        tableReloadEventService.broadcast();
      }
    }, 30000);

    /**
     * Retries a media which is on error.
     *
     * @param {Array} medias The list of medias to work on
     * @param {Function} reload Function to reload the datatable
     */
    function retryMedia(medias, reload) {
      publishService.retryMedia(medias.join(','))
        .then(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.MEDIAS.RETRY_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Asks server to start uploading the media to the chosen platform.
     *
     * @param {Array} medias The list of medias to work on
     * @param {String} platformName The name of platform to upload to
     * @param {Function} reload Function to reload the datatable
     */
    function startMediaUpload(medias, platformName, reload) {
      publishService.startMediaUpload(medias.join(','), platformName)
        .then(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.MEDIAS.UPLOAD_START_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Publishes a list of medias.
     *
     * @param {Array} medias The list of media ids to publish
     * @param {Function} reload Function to reload the datatable
     */
    function publishMedia(medias, reload) {
      publishService.publishMedia(medias.join(','))
        .then(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.MEDIAS.PUBLISHED_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Unpublishes a list of medias.
     *
     * @param {Array} medias The list of media ids to unpublish
     * @param {Function} reload Function to reload the datatable
     */
    function unpublishMedia(medias, reload) {
      publishService.unpublishMedia(medias.join(','))
        .then(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.MEDIAS.UNPUBLISHED_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Removes a list of medias.
     *
     * @param {Array} selected The list of media ids to remove
     * @param {Function} reload Function to reload the datatable
     */
    function removeRows(selected, reload) {
      entityService.removeEntity(entityType, publishName, selected.join(','))
        .then(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('PUBLISH.MEDIAS.REMOVE_SUCCESS'), 4000);
          reload();
        });
    }

    /**
     * Saves media information.
     *
     * @param {Object} media Media data
     */
    function saveMedia(media) {
      return entityService.updateEntity(entityType, publishName, media.id, {
        title: media.title,
        description: media.description,
        properties: media.properties,
        category: media.category,
        groups: media.groups,
        user: media.user
      }).then(function() {
        scopeEditForm.pendingEdition = false;
      });
    }

    /**
     * Routes to chapters edition.
     *
     * @param {Object} media The media to edit
     */
    function editChapter(media) {
      $location.path('/publish/media/' + media.id);
    }

    /*
     * FORM EDIT
     */
    scopeEditForm.entityType = entityType;

    var categoriesfield = getSelectableCategories('CORE.UI.NONE');
    scopeEditForm.fieldsBase = [
      {
        key: 'title',
        type: 'horizontalEditableInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_TITLE'),
          required: true
        }
      },
      {
        key: 'description',
        type: 'horizontalEditableInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_DESCRIPTION'),
          required: true
        }
      },
      {
        key: 'category',
        type: 'horizontalEditableSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_CATEGORY'),
          options: categoriesfield
        }
      },
      {
        key: 'groups',
        type: 'horizontalEditableSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_GROUPS'),
          options: utilService.buildSelectOptions($scope.groups)
        },
        ngModelAttrs: {
          'true': {
            value: 'multiple'
          }
        }
      }
    ];

    /*
     *
     * DATATABLE
     */
    scopeDataTable.entityType = entityType;
    scopeDataTable.cellTheme = '/publish/be/views/partial/publishCells.html';

    scopeDataTable.init = {
      sortBy: 'date',
      sortOrder: 'dsc'
    };
    var categoriesFilter = getSelectableCategories('CORE.UI.ALL');
    scopeDataTable.filterBy = [
      {
        key: 'title',
        value: '',
        label: $filter('translate')('PUBLISH.MEDIAS.TITLE_FILTER')
      }, {
        key: 'description',
        value: '',
        label: $filter('translate')('PUBLISH.MEDIAS.DESCRIPTION_FILTER')
      }, {
        key: 'date',
        type: 'date',
        value: '',
        label: $filter('translate')('PUBLISH.MEDIAS.DATE_FILTER')
      }, {
        key: 'category',
        type: 'select',
        value: null,
        label: $filter('translate')('PUBLISH.MEDIAS.CATEGORY_FILTER'),

        /*
         * [{
         "value": 'id',
         "name": 'title',
         "children" : 'id1,id2,id3'
         },
         ...
         ];
         */
        options: categoriesFilter,

        // if enable filter will filter with the selectId AND additionnal id set in the "children" key of each options
        filterWithChildren: true
      }
    ];
    scopeDataTable.header = [
      {
        key: 'title',
        name: $filter('translate')('PUBLISH.MEDIAS.NAME_COLUMN'),
        class: ['col-xs-8 col-sm-5']
      },
      {
        key: 'mediaId',
        type: 'multisources',
        name: '',
        class: ['hidden-xs col-sm-1']
      },
      {
        key: 'date',
        type: 'date',
        name: $filter('translate')('PUBLISH.MEDIAS.DATE_COLUMN'),
        class: ['col-xs-1']
      },
      {
        key: 'category',
        type: 'category',
        name: $filter('translate')('PUBLISH.MEDIAS.CATEGORY_COLUMN'),
        class: ['hidden-xs col-sm-2']
      },
      {
        key: 'state',
        type: 'status',
        name: $filter('translate')('PUBLISH.MEDIAS.STATUS_COLUMN'),
        class: ['col-xs-2']
      },
      {
        key: 'action',
        name: $filter('translate')('CORE.UI.ACTIONS_COLUMN'),
        class: ['col-xs-1 col-sm-1']
      }];
    scopeDataTable.actions = [
      {
        label: $filter('translate')('CORE.UI.VIEW'),
        condition: function(row) {
          return row.state == 11 || row.state == 12;
        },
        callback: function(row) {
          goToPath(row.link + '?lang=' + i18nService.getLanguage());
        }
      },
      {
        label: $filter('translate')('CORE.UI.SHARE'),
        condition: function(row) {
          return row.state == 12;
        },
        callback: function(row) {
          shareCode(row);
        }
      },
      {
        label: $filter('translate')('PUBLISH.MEDIAS.PUBLISH'),
        condition: function(row) {
          return $scope.rights.publish &&
            $scope.checkContentAccess(row, 'update') &&
            row.state == 11 &&
            !row.saving;
        },
        callback: function(row, reload) {
          publishMedia([row.id], reload);
        },
        global: function(selected, reload) {
          publishMedia(selected, reload);
        }
      },
      {
        label: $filter('translate')('PUBLISH.MEDIAS.UNPUBLISH'),
        condition: function(row) {
          return $scope.rights.publish &&
            $scope.checkContentAccess(row, 'update') &&
            row.state == 12 &&
            !row.saving;
        },
        callback: function(row, reload) {
          unpublishMedia([row.id], reload);
        },
        global: function(selected, reload) {
          unpublishMedia(selected, reload);
        }
      },
      {
        label: $filter('translate')('PUBLISH.MEDIAS.CHAPTER_EDIT'),
        condition: function(row) {
          return $scope.rights.chapter &&
            $scope.checkContentAccess(row, 'update') &&
            !row.saving &&
            (row.state == 11 || row.state == 12);
        },
        callback: function(row) {
          editChapter(row);
        }
      },
      {
        label: $filter('translate')('PUBLISH.MEDIAS.RETRY'),
        condition: function(row) {
          return $scope.rights.retry && $scope.checkContentAccess(row, 'update') && row.state == 0 && !row.saving;
        },
        callback: function(row, reload) {
          retryMedia([row.id], reload);
        }
      },
      {
        label: $filter('translate')('CORE.UI.REMOVE'),
        condition: function(row) {
          return $scope.checkContentAccess(row, 'delete') &&
            !row.locked &&
            !row.saving &&
            (row.state === 6 || row.state === 11 || row.state === 12 || row.state === 0);
        },
        warningPopup: true,
        callback: function(row, reload) {
          removeRows([row.id], reload);
        },
        global: function(selected, reload) {
          removeRows(selected, reload);
        }
      }
    ];

    // Add upload actions
    for (var i = 0; i < $scope.platforms.length; i++) {
      var platformName = $scope.platforms[i];
      scopeDataTable.actions.push({
        label: $filter('translate')('PUBLISH.MEDIAS.UPLOAD_' + platformName.toUpperCase()),
        condition: function(row) {
          return $scope.rights.upload && $scope.checkContentAccess(row, 'update') && row.state == 6 && !row.saving;
        },
        callback: function(row, reload) {
          startMediaUpload([row.id], this.platform, reload);
        },
        platform: platformName
      });
    }

    scopeEditForm.init = function(row) {
      scopeEditForm.fields = angular.copy(scopeEditForm.fieldsBase);
      row.groups = row.metadata.groups;
      row.user = row.metadata.user;

      if (row.metadata.user == $scope.userInfo.id || $scope.userInfo.id == 0) {
        var opt = utilService.buildSelectOptions($scope.users);
        scopeEditForm.fields.push({
          key: 'user',
          type: 'horizontalEditableSelect',
          templateOptions: {
            label: $filter('translate')('CORE.UI.OWNER'),
            options: opt
          }
        });
      }

      if ($scope.properties.length)
        scopeEditForm.fields.push({
          noFormControl: true,
          template: '<hr>'
        });

      // Create a formly field for each property
      angular.forEach($scope.properties, function(property, index) {
        if (property.type === 'text') {
          scopeEditForm.fields.push({
            key: property.id,
            type: 'horizontalEditableInput',
            model: row.properties,
            templateOptions: {
              label: property.name || property.id
            }
          });

        } else if (property.type === 'list') {

          // Build list options with list values
          var options = [{
            value: '',
            name: $filter('translate')('CORE.UI.EMPTY')
          }];

          for (var i = 0; i < property.values.length; i++) {
            options.push({
              value: property.values[i],
              name: property.values[i]
            });
          }

          scopeEditForm.fields.push({
            key: property.id,
            type: 'horizontalEditableSelect',
            model: row.properties,
            templateOptions: {
              label: property.name || property.id,
              options: options
            }
          });
        } else if (property.type === 'boolean') {
          scopeEditForm.fields.push({
            key: property.id,
            type: 'horizontalEditableCheckbox',
            model: row.properties,
            templateOptions: {
              label: property.name || property.id
            }
          });
        }
      });

    };

    scopeEditForm.conditionToggleDetail = function(row) {
      return row.state !== 0;
    };

    scopeEditForm.conditionEditDetail = function(row) {
      return $scope.checkContentAccess(row, 'update') && !row.locked && row.state !== 0;
    };
    scopeEditForm.onSubmit = function(model) {
      return saveMedia(model);
    };

    // Listen to destroy event on the view to update
    $scope.$on('$destroy', function() {
      $interval.cancel(pollMediasPromise);
    });
  }

  app.controller('MediaController', MediaController);
  MediaController.$inject = [
    '$scope',
    '$filter',
    '$location',
    '$window',
    '$interval',
    'entityService',
    'publishService',
    'utilService',
    'properties',
    'platforms',
    'groups',
    'users',
    'tableReloadEventService',
    'i18nService',
    'publishName'
  ];

})(angular.module('ov.publish'));
