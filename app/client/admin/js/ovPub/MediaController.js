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
  $q,
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
    var isUserManager = $scope.hasPermission('publish-manage-videos');
    var addMediaPromise = null;

    $scope.properties = properties.data.entities;
    $scope.platforms = platforms.data.platforms;
    $scope.groups = groups.data.entities;
    $scope.users = users.data.entities;
    $scope.isCollapsed = true;
    $scope.fileToUpload = null;
    $scope.thumbToAdd = null;
    $scope.thumbToEdit = null;

    // Fetch permissions of the connected user for MediaController features
    $scope.rights = {};
    $scope.rights.add = $scope.checkAccess('publish-add-' + entityType);
    $scope.rights.publish = $scope.checkAccess('publish-publish-' + entityType);
    $scope.rights.editor = $scope.checkAccess('publish-editor-' + entityType);
    $scope.rights.retry = $scope.checkAccess('publish-retry-' + entityType);
    $scope.rights.upload = $scope.checkAccess('publish-upload-' + entityType);
    $scope.rights.update = $scope.checkAccess('publish-update-' + entityType);
    $scope.rights.remove = $scope.checkAccess('publish-delete-' + entityType);

    // Define add form
    var scopeAddForm = $scope.addFormContainer = {};
    scopeAddForm.model = {
      date: new Date(),
      properties: {}
    };

    // Define edit form
    var scopeEditForm = $scope.editFormContainer = {};
    scopeEditForm.model = {};
    scopeEditForm.pendingEdition = false;
    scopeEditForm.pluginName = publishName;

    // Define datatable
    var scopeDataTable = $scope.tableContainer = {};
    scopeDataTable.pluginName = publishName;

    // TinyMCE options
    var tinyOptions = {
      plugins: 'lists link autolink autoresize textpattern',
      autoresize_bottom_margin: 20, // eslint-disable-line
      menubar: false,
      toolbar: 'undo redo | styleselect removeformat | bold italic ' +
      '| alignleft aligncenter alignright alignjustify | bullist numlist | link',
      style_formats: [{ // eslint-disable-line
        title: 'Headers',
        items: [
        {title: 'Header 1', format: 'h1'},
        {title: 'Header 2', format: 'h2'},
        {title: 'Header 3', format: 'h3'},
        {title: 'Header 4', format: 'h4'}
        ]
      }, {
        title: 'Inline', items: [
        {title: 'Bold', icon: 'bold', format: 'bold'},
        {title: 'Italic', icon: 'italic', format: 'italic'},
        {title: 'Underline', icon: 'underline', format: 'underline'},
        {title: 'Code', icon: 'code', format: 'code'}
        ]
      }, {
        title: 'Blocks',
        items: [
        {title: 'Paragraph', format: 'p'},
        {title: 'Blockquote', format: 'blockquote'}
        ]
      }],
      content_css: '/be/css/tinymce.css?' + new Date().getTime() // eslint-disable-line
    };

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
        ' frameborder="0" allowfullscreen&gt;&lt;/iframe&gt;',
        '</div>'
      ].join(''), 0);
    }

    // Iterate through the list of medias, if at least one media
    // is pending, poll each 30 seconds to be informed of
    // its status
    var pollMediasPromise = $interval(function() {
      if (!scopeEditForm.pendingEdition) {
        entityService.deleteCache(entityType, publishName);
        tableReloadEventService.broadcast(function() {
          $scope.$emit('setAlert', 'info', $filter('translate')('PUBLISH.MEDIAS.RELOAD'), 4000);
        });
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
      entityService.removeEntities(entityType, publishName, selected.join(','))
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
      return publishService.updateMedia(media.id, {
        title: media.title,
        date: media.date.getTime(),
        leadParagraph: media.leadParagraph,
        description: media.description,
        thumbnail: $scope.thumbToEdit,
        properties: media.customProperties,
        category: media.category,
        groups: media.groups,
        user: media.user
      }).then(function() {
        scopeEditForm.pendingEdition = false;
      });
    }

    /**
     * Routes to media editor.
     *
     * @param {Object} media The media to edit
     */
    function mediaEditor(media) {
      $location.path('/publish/media/' + media.id);
    }

    /**
     * Builds custom properties fields descriptors for formly.
     *
     * @param {Object} [model] Model where to find default values
     * @param {Boolean} [inlineEditable] true to generate an inline editable field instead of a simple editable field
     * @return {Array} The list of formly fields descriptors
     */
    function getCustomPropertiesFields(model, inlineEditable) {
      var fields = [];

      angular.forEach($scope.properties, function(property, index) {
        if (property.type === 'text') {
          fields.push({
            key: property.id,
            type: inlineEditable ? 'horizontalEditableInput' : 'horizontalInput',
            model: model,
            templateOptions: {
              label: property.name || property.id
            }
          });

        } else if (property.type === 'list') {

          // Build list options with list values
          var options = [{
            value: null,
            name: $filter('translate')('CORE.UI.EMPTY')
          }];

          for (var i = 0; i < property.values.length; i++) {
            options.push({
              value: property.values[i],
              name: property.values[i]
            });
          }

          fields.push({
            key: property.id,
            type: inlineEditable ? 'horizontalEditableSelect' : 'horizontalSelect',
            model: model,
            defaultValue: options[0].value,
            templateOptions: {
              label: property.name || property.id,
              options: options
            }
          });
        } else if (property.type === 'boolean') {
          fields.push({
            key: property.id,
            type: inlineEditable ? 'horizontalEditableCheckbox' : 'horizontalCheckbox',
            defaultValue: false,
            model: model,
            templateOptions: {
              label: property.name || property.id
            }
          });
        }
      });

      return fields;
    }

    // Setup add form
    scopeAddForm.fields = [
      {
        key: 'title',
        type: 'horizontalInput',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_TITLE'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_TITLE_DESC'),
          required: true
        }
      },
      {
        key: 'date',
        type: 'horizontalDatepicker',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_DATE'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_DATE_DESC'),
          required: true
        },
        link: function(scope, el, attrs, ctrl) {
          // Workaround: Formly doesn't reset this field properly
          scope.options.resetModel = function() {
            scope.model.date = new Date();
          };
        }
      },
      {
        key: 'leadParagraph',
        type: 'horizontalTinymce',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_LEAD_PARAGRAPH'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_LEAD_PARAGRAPH_DESC')
        },
        data: {
          tinymceOptions: tinyOptions
        }
      },
      {
        key: 'description',
        type: 'horizontalTinymce',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_DESCRIPTION'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_DESCRIPTION_DESC')
        },
        data: {
          tinymceOptions: tinyOptions
        }
      },
      {
        key: 'file',
        type: 'horizontalFile',
        defaultValue: -1,
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_MEDIA'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_MEDIA_DESC'),
          acceptedTypes: '.mp4,.tar',
          required: true,
          progressBar: false,
          onFileChange: function(files, file, newFiles, duplicateFiles, invalidFiles, event) {
            $scope.fileToUpload = file;
          }
        }
      },
      {
        key: 'thumbnail',
        type: 'horizontalFile',
        defaultValue: -1,
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_THUMBNAIL'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_THUMBNAIL_DESC'),
          acceptedTypes: '.jpeg,.jpg',
          required: false,
          progressBar: false,
          onFileChange: function(files, file, newFiles, duplicateFiles, invalidFiles, event) {
            $scope.thumbToAdd = file;
          }
        }
      },
      {
        key: 'category',
        type: 'horizontalSelect',
        defaultValue: null,
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_CATEGORY'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_CATEGORY_DESC'),
          options: getSelectableCategories('CORE.UI.NONE')
        }
      },
      {
        key: 'groups',
        type: 'horizontalSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_GROUPS'),
          description: $filter('translate')('PUBLISH.MEDIAS.FORM_ADD_GROUPS_DESC'),
          options: utilService.buildSelectOptions($scope.groups)
        },
        ngModelAttrs: {
          'true': {
            value: 'multiple'
          }
        }
      }
    ];

    // Separator between built-in properties and custom properties
    if ($scope.properties.length) {
      scopeAddForm.fields.push({
        noFormControl: true,
        template: '<hr>'
      });
    }

    // Custom properties
    scopeAddForm.fields = scopeAddForm.fields.concat(getCustomPropertiesFields(scopeAddForm.model.properties));

    /**
     * Collapses / extends the add form.
     */
    $scope.toggleAddForm = function() {
      $scope.isCollapsed = !$scope.isCollapsed;
    };

    scopeAddForm.onSubmit = function(model) {
      var groups = [];

      // Remove group "null" from the list of selected groups
      if (model.groups) {
        groups = model.groups.filter(function(group) {
          return group;
        });
      }

      addMediaPromise = publishService.addMedia({
        title: model.title,
        date: model.date.getTime(),
        leadParagraph: model.leadParagraph,
        description: model.description,
        category: model.category,
        groups: groups,
        file: $scope.fileToUpload,
        thumbnail: $scope.thumbToAdd,
        properties: model.properties
      });

      return addMediaPromise.then(function() {
        entityService.deleteCache(entityType, publishName);
        addMediaPromise = null;
        $scope.isCollapsed = true;
      }, function() {
        addMediaPromise = null;
        model.file = null;
        return $q.reject();
      }, function(event) {

        // Update progress bar
        model.file = Math.min(100, parseInt(100.0 * event.loaded / event.total));

      });
    };

    // Setup edit form
    scopeEditForm.entityType = entityType;
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
        key: 'date',
        type: 'horizontalEditableDatepicker',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_DATE'),
          required: true
        }
      },
      {
        key: 'leadParagraph',
        type: 'horizontalEditableTinymce',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_LEAD_PARAGRAPH')
        },
        data: {
          tinymceOptions: tinyOptions
        }
      },
      {
        key: 'description',
        type: 'horizontalEditableTinymce',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_DESCRIPTION')
        },
        data: {
          tinymceOptions: tinyOptions
        }
      },
      {
        key: 'thumbnail',
        type: 'horizontalEditableFile',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_THUMBNAIL'),
          acceptedTypes: '.jpeg,.jpg',
          required: false,
          progressBar: false,
          onFileChange: function(files, file, newFiles, duplicateFiles, invalidFiles, event) {
            $scope.thumbToEdit = file;
          }
        },
        link: function(scope, element, attrs) {
          var ts = Date.now();

          scope.show = function() {
            if (!scope.originalModel.thumbnail)
              return $filter('translate')('CORE.UI.EMPTY');

            var src = new URL(scope.originalModel.thumbnail);

            src.searchParams.append('style', 'publish-thumb-200');

            // Workaround: add timestamp to src
            // As the URL don't change even if a new thumbnail is submitted,
            // adding this parameter will force regeneration of the tag.
            src.searchParams.append('ts', ts);

            return '<img class="img-thumbnail" src="' + src + '">';
          };
        }
      },
      {
        key: 'category',
        type: 'horizontalEditableSelect',
        templateOptions: {
          label: $filter('translate')('PUBLISH.MEDIAS.ATTR_CATEGORY'),
          options: getSelectableCategories('CORE.UI.NONE')
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

    // Setup datatable
    scopeDataTable.entityType = entityType;
    scopeDataTable.cellTheme = '/publish/be/views/partial/publishCells.html';

    scopeDataTable.init = {
      sortBy: 'date',
      sortOrder: 'dsc',
      notSortBy: ['mediaId']
    };
    scopeDataTable.filterBy = [
      {
        key: 'query',
        value: '',
        label: $filter('translate')('PUBLISH.MEDIAS.QUERY_FILTER')
      }, {
        key: 'date',
        type: 'date',
        param: 'date',
        value: '',
        label: $filter('translate')('PUBLISH.MEDIAS.DATE_FILTER')
      }, {
        key: 'category',
        type: 'select',
        param: 'categories',
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
        options: getSelectableCategories('CORE.UI.ALL'),

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
            ($scope.checkContentAccess(row, 'update') || isUserManager) &&
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
            ($scope.checkContentAccess(row, 'update') || isUserManager) &&
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
          return $scope.rights.editor &&
            ($scope.checkContentAccess(row, 'update') || isUserManager) &&
            !row.saving &&
            (row.state == 11 || row.state == 12);
        },
        callback: function(row) {
          mediaEditor(row);
        }
      },
      {
        label: $filter('translate')('PUBLISH.MEDIAS.RETRY'),
        condition: function(row) {
          return $scope.rights.retry &&
            ($scope.checkContentAccess(row, 'update') || isUserManager) &&
            row.state == 0 &&
            !row.saving;
        },
        callback: function(row, reload) {
          retryMedia([row.id], reload);
        }
      },
      {
        label: $filter('translate')('CORE.UI.REMOVE'),
        condition: function(row) {
          return $scope.rights.remove &&
            ($scope.checkContentAccess(row, 'delete') || isUserManager) &&
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
          return $scope.rights.upload &&
            ($scope.checkContentAccess(row, 'update') || isUserManager) &&
            row.state == 6 &&
            !row.saving;
        },
        callback: function(row, reload) {
          startMediaUpload([row.id], this.platform, reload);
        },
        platform: platformName
      });
    }

    scopeEditForm.init = function(row) {
      var properties = {};
      scopeEditForm.fields = angular.copy(scopeEditForm.fieldsBase);
      if (!row.mediaId)
        scopeEditForm.fields = scopeEditForm.fields.filter(function(field) {
          return field.key !== 'thumbnail';
        });

      row.groups = row.metadata.groups;
      row.user = row.metadata.user;
      row.date = new Date(row.date);

      // Build properties
      for (var propertyId in row.properties) {
        if (row.properties[propertyId])
          properties[propertyId] = row.properties[propertyId].value || null;
      }

      row.customProperties = properties;

      // User field
      if (row.metadata.user == $scope.userInfo.id ||
          $scope.userInfo.id == openVeoSettings.superAdminId ||
          isUserManager
         ) {
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

      // Separator between built-in properties and custom properties
      if ($scope.properties.length) {
        scopeEditForm.fields.push({
          noFormControl: true,
          template: '<hr>'
        });
      }

      scopeEditForm.fields = scopeEditForm.fields.concat(getCustomPropertiesFields(row.customProperties, true));
    };

    scopeEditForm.conditionToggleDetail = function(row) {
      return row.state !== 0;
    };

    scopeEditForm.conditionEditDetail = function(row) {
      return $scope.rights.update &&
        ($scope.checkContentAccess(row, 'update') || isUserManager) &&
        !row.locked &&
        row.state !== 0;
    };
    scopeEditForm.onSubmit = function(model) {
      return saveMedia(model);
    };

    // Listen to destroy event on the view to update
    $scope.$on('$destroy', function() {
      $interval.cancel(pollMediasPromise);

      // Abort upload if any
      if (addMediaPromise) {
        addMediaPromise.abort();
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.MEDIAS.UPLOAD_CANCELED'), 4000);
      }
    });
  }

  app.controller('MediaController', MediaController);
  MediaController.$inject = [
    '$scope',
    '$filter',
    '$location',
    '$window',
    '$interval',
    '$q',
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
