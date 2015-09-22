'use strict';

(function(app) {

  /**
   * Defines the video controller for the videos page.
   */
  function VideoController(
  $scope,
  $filter,
  $location,
  $window,
  $interval,
  $timeout,
  entityService,
  publishService,
  properties,
  categories,
  platforms,
  jsonPath,
  tableReloadEventService) {

    $scope.properties = properties.data.entities;

    // Replace Id in Video by the name of the category
    // Category Id can be overwritten, it is only for display purpose
    $scope.categories = categories.data.taxonomy;
    $scope.platforms = platforms.data.platforms;

    /**
     *
     * RIGHTS
     *
     */
    $scope.rights = {};
    $scope.rights.edit = $scope.checkAccess('update-video');
    $scope.rights.delete = $scope.checkAccess('delete-video');
    $scope.rights.publish = $scope.checkAccess('publish-video');
    $scope.rights.chapter = $scope.checkAccess('chapter-video');

    /**
     * FORM
     */
    var scopeEditForm = $scope.editFormContainer = {};
    scopeEditForm.model = {};
    scopeEditForm.pendingEdition = false;

    /**
     * DATATABLE
     */
    var scopeDataTable = $scope.tableContainer = {};

    /**
     * Gets all categories.
     */
    function categoryOptions() {
      var categories = jsonPath($scope.categories, '$..*[?(@.id)]');
      var options = [];
      angular.forEach(categories, function(value) {
        var children = jsonPath($scope.categories, '$..[?(@.id==' + value.id + ')]..*[?(@.id)].id');
        options.push({
          value: value.id,
          name: value.title,
          children: children ? children.join(',') : ''
        });
      });
      return options;
    }

    /**
     * Gets all categories and add null value for selectable categories.
     */
    function getSelectableCategories(label) {
      var catArray = categoryOptions();
      return [{
        value: '',
        name: $filter('translate')(label)
      }].concat(catArray);
    }

    /**
     * Redirect to row path
     */
    var goToPath = function(row) {
      $window.open(row.link, '_blank');
    };

    var shareCode = function(video) {
      $scope.$emit('setAlert', 'info', [
        $filter('translate')('VIDEOS.SHARECODE'),
        '<br><br><div class="well well-sm"><code>',
        '&lt;iframe width="480" height="270" src=' + video.link + '?fullscreen"frameborder="0"&gt;&lt;/iframe&gt;',
        '</div>'
      ].join(''), 0);
    };

    // Iterate through the list of videos, if at least one video
    // is pending, poll each 30 seconds to be informed of
    // its status
    var pollVideosPromise = $interval(function() {
      if (!scopeEditForm.pendingEdition) {
        $scope.$emit('setAlert', 'info', $filter('translate')('VIDEOS.RELOAD'), 4000);
        entityService.deleteCache(scopeDataTable.entityType);
        tableReloadEventService.broadcast();
      }
    }, 30000);

    /**
     * Retries a video which is on error.
     * @param Array videos The list of videos to work on
     * @param Function reload Function to reload the datatable
     */
    var retryVideo = function(videos, reload) {
      publishService.retryVideo(videos.join(','))
        .success(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('VIDEOS.RETRY_SUCCESS'), 4000);
          reload();
        })
        .error(function(data, status) {
          $scope.$emit('setAlert', 'danger', $filter('translate')('VIDEOS.RETRY_FAIL'), 4000);
          if (status === 401)
            $scope.$parent.logout();
        });
    };

    /**
     * Asks server to start uploading the video to the chosen platform.
     * @param Array videos The list of videos to work on
     * @param String platformName The name of platform to upload to
     * @param Function reload Function to reload the datatable
     */
    var startVideoUpload = function(videos, platformName, reload) {
      publishService.startVideoUpload(videos.join(','), platformName)
        .success(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('VIDEOS.UPLOAD_START_SUCCESS'), 4000);
          reload();
        })
        .error(function(data, status) {
          $scope.$emit('setAlert', 'danger', $filter('translate')('VIDEOS.UPLOAD_START_FAIL'), 4000);
          if (status === 401)
            $scope.$parent.logout();
        });
    };

    /**
     * Publishes a video.
     * @param Object video The video to publish
     */
    var publishVideo = function(video, reload) {
      publishService.publishVideo(video.join(','))
        .success(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('VIDEOS.PUBLISHED_SUCCESS'), 4000);
          reload();
        })
        .error(function(data, status) {
          $scope.$emit('setAlert', 'danger', $filter('translate')('VIDEOS.PUBLISHED_FAIL'), 4000);
          if (status === 401)
            $scope.$parent.logout();
        });
    };

    /**
     * Unpublishes the given video.
     * @param Object video The video to publish
     */
    var unpublishVideo = function(video, reload) {
      publishService.unpublishVideo(video.join(','))
        .success(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('VIDEOS.UNPUBLISHED_SUCCESS'), 4000);
          reload();
        })
        .error(function(data, status) {
          $scope.$emit('setAlert', 'danger', $filter('translate')('VIDEOS.UNPUBLISHED_FAIL'), 4000);
          if (status === 401)
            $scope.$parent.logout();
        });
    };

    /**
     * Removes the row.
     * @param Object row The row to remove
     */
    var removeRows = function(selected, reload) {
      entityService.removeEntity('video', selected.join(','))
        .success(function() {
          $scope.$emit('setAlert', 'success', $filter('translate')('VIDEOS.REMOVE_SUCCESS'), 4000);
          reload();
        })
        .error(function(data, status) {
          $scope.$emit('setAlert', 'danger', $filter('translate')('VIDEOS.REMOVE_FAIL'), 4000);
          if (status === 401)
            $scope.$parent.logout();
        });
    };

    /**
     * Saves video information.
     * @param Object form The angular edition form controller
     * @param Object video The video associated to the form
     */
    var saveVideo = function(video, successCb, errorCb) {
      entityService.updateEntity('video', video.id, {
        title: video.title,
        description: video.description,
        properties: video.properties,
        category: video.category
      }).success(function() {
        scopeEditForm.pendingEdition = false;
        successCb();
      }).error(function(data, status) {
        errorCb();
        if (status === 401)
          $scope.$parent.logout();
      });
    };

    var editChapter = function(video) {
      $location.path('admin/publish/be/video/' + video.id);
    };

    var replacePropIdByName = function(id) {
      var found = -1;
      for (var i = 0; i < $scope.properties.length && found < 0; i++) {
        var value = $scope.properties[i];
        if (value.id == String(id)) {
          found = i;
          break;
        }
      }

      if (found != -1)
        return $scope.properties[found].name;
      else
        return id;
    };

    scopeEditForm.fieldsBase = [
      {
        key: 'title',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: $filter('translate')('VIDEOS.ATTR_TITLE'),
          required: true
        }
      },
      {
        key: 'description',
        type: 'horizontalExtendInput',
        templateOptions: {
          label: $filter('translate')('VIDEOS.ATTR_DESCRIPTION'),
          required: true
        }
      },
      {
        key: 'category',
        type: 'horizontalExtendSelect',
        templateOptions: {
          label: $filter('translate')('VIDEOS.ATTR_CATEGORY'),
          options: getSelectableCategories('UI.NONE')
        }
      }
    ];

    /**
     *
     * DATATABLE
     */
    scopeDataTable.entityType = 'video';
    scopeDataTable.cellTheme = 'publish/admin/views/partial/publishCells.html';
    scopeDataTable.conditionTogleDetail = function(row) {
      return (row.state === 11 || row.state === 12);
    };

    scopeDataTable.init = {
      sortBy: 'date',
      sortOrder: 'dsc'
    };
    scopeDataTable.filterBy = [
      {
        key: 'title',
        value: '',
        label: $filter('translate')('VIDEOS.TITLE_FILTER')
      }, {
        key: 'description',
        value: '',
        label: $filter('translate')('VIDEOS.DESCRIPTION_FILTER')
      }, {
        key: 'date',
        type: 'date',
        value: '',
        label: $filter('translate')('VIDEOS.DATE_FILTER')
      }, {
        key: 'category',
        type: 'select',
        value: '',
        label: $filter('translate')('VIDEOS.CATEGORY_FILTER'),

        /*
         * [{
         "value": 'id',
         "name": 'title',
         "children" : 'id1,id2,id3'
         },
         ...
         ];
         */
        options: getSelectableCategories('UI.ALL'),

        // if enable filter will filter with the selectId AND additionnal id set in the "children" key of each options
        filterWithChildren: true
      }
    ];
    scopeDataTable.header = [
      {
        key: 'title',
        name: $filter('translate')('VIDEOS.NAME_COLUMN'),
        class: ['col-xs-12 col-sm-5']
      },
      {
        key: 'date',
        type: 'date',
        name: $filter('translate')('VIDEOS.DATE_COLUMN'),
        class: ['hidden-xs col-sm-1']
      },
      {
        key: 'category',
        type: 'category',
        name: $filter('translate')('VIDEOS.CATEGORY_COLUMN'),
        class: ['hidden-xs col-sm-3']
      },
      {
        key: 'state',
        type: 'status',
        name: $filter('translate')('VIDEOS.STATUS_COLUMN'),
        class: ['hidden-xs col-sm-2']
      },
      {
        key: 'action',
        name: $filter('translate')('UI.ACTIONS_COLUMN'),
        class: [' hidden-xs col-sm-1']
      }];
    scopeDataTable.actions = [
      {
        label: $filter('translate')('UI.VIEW'),
        condition: function(row) {
          return row.state == 12;
        },
        callback: function(row) {
          goToPath(row);
        }
      },
      {
        label: $filter('translate')('UI.SHARE'),
        condition: function(row) {
          return row.state == 12;
        },
        callback: function(row) {
          shareCode(row);
        }
      },
      {
        label: $filter('translate')('VIDEOS.PUBLISH'),
        condition: function(row) {
          return $scope.rights.publish && row.state == 11 && !row.saving;
        },
        callback: function(row, reload) {
          publishVideo([row.id], reload);
        },
        global: function(selected, reload) {
          publishVideo(selected, reload);
        }
      },
      {
        label: $filter('translate')('VIDEOS.UNPUBLISH'),
        condition: function(row) {
          return $scope.rights.publish && row.state == 12 && !row.saving;
        },
        callback: function(row, reload) {
          unpublishVideo([row.id], reload);
        },
        global: function(selected, reload) {
          unpublishVideo(selected, reload);
        }
      },
      {
        label: $filter('translate')('VIDEOS.CHAPTER_EDIT'),
        condition: function(row) {
          return $scope.rights.chapter && !row.saving && (row.state == 11 || row.state == 12);
        },
        callback: function(row) {
          editChapter(row);
        }
      },
      {
        label: $filter('translate')('VIDEOS.RETRY'),
        condition: function(row) {
          return row.state == 0 && !row.saving;
        },
        callback: function(row, reload) {
          retryVideo([row.id], reload);
        }
      },
      {
        label: $filter('translate')('UI.REMOVE'),
        condition: function(row) {
          return $scope.rights.delete &&
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
        label: $filter('translate')('VIDEOS.UPLOAD_' + platformName.toUpperCase()),
        condition: function(row) {
          return row.state == 6 && !row.saving;
        },
        callback: function(row, reload) {
          startVideoUpload([row.id], this.platform, reload);
        },
        platform: platformName
      });
    }

    scopeEditForm.init = function(row) {
      scopeEditForm.fields = angular.copy(scopeEditForm.fieldsBase);
      angular.forEach(row.properties, function(value, key) {
        var newField = {
          key: key,
          type: 'horizontalExtendInput',
          model: row.properties,
          templateOptions: {
            label: replacePropIdByName(key)
          }
        };
        scopeEditForm.fields.push(newField);
      });
    };

    scopeEditForm.conditionToggleDetail = function(row) {
      return row.state !== 0;
    };

    scopeEditForm.conditionEditDetail = function(row) {
      return $scope.rights.edit && !row.locked && row.state !== 0;
    };
    scopeEditForm.onSubmit = function(model, successCb, errorCb) {
      saveVideo(model, successCb, errorCb);
    };

    // Listen to destroy event on the view to update
    $scope.$on('$destroy', function() {
      $interval.cancel(pollVideosPromise);
    });
  }

  app.controller('VideoController', VideoController);
  VideoController.$inject = [
    '$scope',
    '$filter',
    '$location',
    '$window',
    '$interval',
    '$timeout',
    'entityService',
    'publishService',
    'properties',
    'categories',
    'platforms',
    'jsonPath',
    'tableReloadEventService'
  ];

})(angular.module('ov.publish'));
