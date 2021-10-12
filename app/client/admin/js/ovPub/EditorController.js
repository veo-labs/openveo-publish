'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   *
   * @class EditorController
   * @memberof module:ov.publish
   * @inner
   * @ignore
   */
  function EditorController(
    $window,
    $scope,
    $http,
    $filter,
    $timeout,
    i18nService,
    ovMultirangeViews,
    media,
    publishName,
    publishService
  ) {

    var orderBy = $filter('orderBy');
    var uploadAborted = false;

    /**
     * Reconstructs ranges with chapters and cut array.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function updateRange() {
      $scope.ranges = ($scope.media[$scope.selectedData.value] || []).concat($scope.media.cut || []);
      $scope.ranges.forEach(function(range) {
        range.value = parseInt(range.value);
      });

      orderBy($scope.ranges, '+value', false);
    }

    /**
     * Initializes chapters and start / end cuts.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function init() {

      // If no chapter, add timecodes with empty values and sort them
      if (!$scope.media.chapters) {
        $scope.media.chapters = [];
      }

      // If no cut add it
      if (!$scope.media.cut) {
        $scope.media.cut = [];
      }

      // If no cut add it
      if (!$scope.media.tags) {
        $scope.media.tags = [];
      }

      if (null === $scope.endCut.range.value) {
        $scope.endCut.range.value = $scope.duration;
      }

      $scope.slider = {
        views: ovMultirangeViews.TIME($scope.duration),
        view: 0
      };
    }

    var myPlayer = document.getElementById('editorPlayer');
    var playerController;

    /**
     * Executes, safely, the given function in AngularJS process.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param {Function} functionToExecute The function to execute as part of
     * the angular digest process.
     */
    function safeApply(functionToExecute) {

      // Execute each apply on a different loop
      $timeout(function() {

        // Make sure we're not on a digestion cycle
        var phase = $scope.$root.$$phase;

        if (phase === '$apply' || phase === '$digest')
          functionToExecute();
        else
          $scope.$apply(functionToExecute);
      }, 1);
    }

    /**
     * Gathers some parameters before calling init.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param {Number} duration Media duration
     */
    function preinit(duration) {
      safeApply(function() {

        // only gets called once
        if (!playerController || duration) {
          playerController = angular.element(myPlayer).controller('oplPlayer');

          // Set Duration
          $scope.duration = duration;
          init();
        }
      });
    }

    angular.element(myPlayer).on('needPoiConversion', function(event, duration) {
      $http
        .post('/publish/videos/' + $scope.media.id + '/poi/convert', {duration: duration})
        .then(function(response) {
          $scope.media = response.data.entity;
          preinit(duration);
        });
    });

    /**
     *  TAG
     */

    /**
     * Abort upload and delete file
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function deleteUpload() {
      if ($scope.upload) {
        uploadAborted = true;
        $scope.upload.abort();
        $scope.file = null;
      }
    }

    /**
     * Clean object to save deleting all unecessary data
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param  {String} collectionName object key of the properties to clean
     * @param  {Bool} cleanAll condition if all Object has to be cleaned
     * @return {Object} clean Object
     */
    function cleanObjectToSave(collectionName, cleanAll) {
      var objToSave = {};
      objToSave[collectionName] = [];
      var tmpEl;
      if (!cleanAll) {
        if (Object.prototype.hasOwnProperty.call($scope.media, collectionName)) {
          for (var i = 0; i < $scope.media[collectionName].length; i++) {
            tmpEl = angular.copy($scope.media[collectionName][i]);
            delete tmpEl['_depth'];
            delete tmpEl['select'];
            delete tmpEl['check'];
            objToSave[collectionName].push(tmpEl);
          }
          orderBy(objToSave[collectionName], '+value', false);
        }
      } else {
        tmpEl = angular.copy($scope.selectRow ? $scope.selectRow : $scope.modelToEdit);
        delete tmpEl['_depth'];
        delete tmpEl['select'];
        delete tmpEl['check'];
        objToSave[collectionName].push(tmpEl);
      }

      return objToSave;
    }

    /**
     * Retreive element position in array by its id
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param  {String} id The element id to search
     * @return {Number} The position of this element, -1 otherwise
     */
    function searchPosition(id) {
      var ids = $scope.media[$scope.selectedData.value].map(function(item) {
        return item.id;
      });
      return ids.indexOf(id);
    }


    /**
     * Save chapter error callback
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function saveChapterErrorCb(resp) {
      var fileError;
      if (resp.status > 0 && !resp.data.error)
        fileError = {message: resp.statusText};

      // emit alert
      if (uploadAborted) {
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.EDITOR.UPLOAD_CANCELED'), 4000);
        uploadAborted = false;
      } else if (fileError) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.EDITOR.SAVE_TAG_ERROR', null, fileError));
      } else {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.EDITOR.SAVE_ERROR'));
        if (status === 401)
          $scope.$parent.logout();
      }
      $scope.upload = null;
      $scope.file = null;
    }

    /**
     * Save chapter success callback
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function saveChapterSuccessCb(resp) {
      $scope.file = null;
      $scope.modelToEdit = resp.data.poi;
      $scope.simpleMimeType = $scope.getFileMimeType();

      var i = searchPosition($scope.modelToEdit.id);
      if (i < 0) { // ADD the new model
        $scope.media[$scope.selectedData.value].push($scope.modelToEdit);
      } else {
        $scope.media[$scope.selectedData.value][i] = $scope.modelToEdit;
      }

      if ($scope.selectRow) {
        $scope.selectRow.select = false;
        $scope.selectRow = null;
      }
      updateRange();
      $scope.isCollapsed = true;
      $scope.upload = null;
    }

    /**
     * Save chapter
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function saveChapter() {
      var objToSave = cleanObjectToSave($scope.selectedData.value, true);

      if ($scope.selectedData.value === 'tags')
        $scope.upload = publishService.updateTag($scope.media.id, $scope.file, objToSave.tags[0]);
      else if ($scope.selectedData.value === 'chapters')
        $scope.upload = publishService.updateChapter($scope.media.id, objToSave.chapters[0]);

      $scope.upload.then(
        saveChapterSuccessCb,
        saveChapterErrorCb,
        function(evt) {
          if ($scope.file)
            $scope.file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        }
      );
    }

    /*
     * CUT
     */

    /**
     * Selects and unselect a provided cut.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param {Object} cut The cut to toggle
     * @param {Boolean} addOrRemove Forces the addition or removal of the cut
     */
    function toggleCut(cut, addOrRemove) {
      var index = $scope.media.cut.indexOf(cut);

      // cuts will be updated by the watchCollection
      if (index === -1 && addOrRemove !== false) {
        $scope.media.cut.push(cut);
      } else if (index !== -1 && addOrRemove !== true) {
        cut.select = false;
        $scope.media.cut.splice(index, 1);
      }

    }

    /**
     * Selects or unselect the begin cut.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param {Boolean} addOrRemove Forces the addition or removal of the cut
     */
    function toggleBegin(addOrRemove) {
      toggleCut($scope.beginCut.range, addOrRemove);
    }

    /**
     * Selects or unselect the ending cut.
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     * @param {Boolean} addOrRemove Forces the addition or removal of the cut
     */
    function toggleEnd(addOrRemove) {
      toggleCut($scope.endCut.range, addOrRemove);
    }

    /**
     * Save chapter and cut
     *
     * @memberof module:ov.publish~EditorController
     * @instance
     * @private
     */
    function saveCut() {

      // Validate if end is after begin
      if ($scope.endCut.isInArray && $scope.beginCut.isInArray &&
        $scope.endCut.range.value <= $scope.beginCut.range.value) {
        // Reset end
        $scope.endCut.range.value = $scope.duration;
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.EDITOR.DELETE_END_CUT'), 8000);
        toggleEnd(false);

        // the watch for endCut.isInArray will save everything
        $scope.endCut.isInArray = false;
        return;
      }

      // CALL SAVE HTTP
      var objToSave = cleanObjectToSave('cut');
      publishService.updateMedia($scope.media.id, objToSave).then(function() {
        if ($scope.selectRow) {
          $scope.selectRow.select = false;
          $scope.selectRow = null;
        }
        updateRange();
        $scope.isCollapsed = true;
      }).catch(function(response) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.EDITOR.SAVE_ERROR'));
        if (response.status === 401)
          $scope.$parent.logout();
      });
    }


    /**
     * Calling preinit with a duration chnage on the player, it sometimes fail so...
     */
    angular.element(myPlayer).on('durationChange', function(event, duration) {
      preinit(duration);
    });

    // Listen to player errors
    // If an error occurs go back to catalog with an alert
    angular.element(myPlayer).on('error', function(event, error) {
      if (error) {
        $scope.$emit('setAlert', 'danger', error.message);
        $scope.back();
      }
    });

    // inject Math
    $scope.Math = window.Math;

    // Init
    $scope.dataId = ['chapters', 'tags'];
    $scope.selectedData = {value: $scope.dataId[0]};

    $scope.media = media.data.entity;
    $scope.playerType = $scope.media.type == 'youtube' ? 'youtube' : 'html';

    $scope.isCollapsed = true;
    $scope.selectRow = null;
    $scope.checkAllSelected = false;

    // Copy of object to edit or add
    $scope.modelToEdit = {};

    // Backup of an existing object to cancel its edition
    $scope.backUpRow = {};

    // Init object for player
    $scope.mediaPlayer = angular.copy($scope.media);

    // Set player language
    $scope.playerLanguage = i18nService.getLanguage();

    // Init default cuts
    $scope.beginCut = {
      isInArray: undefined,
      range: {
        value: 0,
        name: 'CORE.UI.BEGIN',
        description: '',
        type: 'begin'
      }
    };
    $scope.endCut = {
      isInArray: undefined,
      range: {
        value: null,
        name: 'CORE.UI.END',
        description: '',
        type: 'end'
      }
    };

    $scope.nbCheckRow = 0;

    $scope.tinymceOptions = {
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

    $scope.$watch('selectedData.value', function() {
      $scope.updateGlobalCheck();
      $scope.select(null);
      $scope.cancel();
      updateRange();
    });

    // Check all chapters for removal
    $scope.checkAll = function() {
      for (var i = 0; i < $scope.media[$scope.selectedData.value].length; i++) {
        $scope.media[$scope.selectedData.value][i].check = $scope.checkAllSelected;
      }
      $scope.nbCheckRow = $scope.checkAllSelected ? $scope.media[$scope.selectedData.value].length : 0;
    };

    // Update GlobalCheck according to selectedData
    $scope.updateGlobalCheck = function() {
      $scope.nbCheckRow = 0;
      angular.forEach($scope.media[$scope.selectedData.value], function(row) {
        if (row.check)
          $scope.nbCheckRow++;
      });
      $scope.checkAllSelected = $scope.media[$scope.selectedData.value] &&
        $scope.media[$scope.selectedData.value].length ?
        $scope.nbCheckRow == $scope.media[$scope.selectedData.value].length : false;
    };

    // Check a chapter for removal
    $scope.checkRow = function(bool) {
      if (!bool) {
        $scope.checkAllSelected = false;
        $scope.nbCheckRow--;
      } else {
        $scope.nbCheckRow++;
        $scope.checkAllSelected = $scope.nbCheckRow == $scope.media[$scope.selectedData.value].length;
      }
    };

    // Open a new value
    $scope.openNew = function() {
      $scope.modelToEdit = {
        value: 0
      };
      if ($scope.selectRow) {
        $scope.selectRow.select = false;
        $scope.selectRow = null;
      }
      deleteUpload();
      $scope.simpleMimeType = null;
      $scope.isCollapsed = false;
    };

    // Open an value to edit
    $scope.openEdit = function() {
      if ($scope.isCollapsed) {

        // Set backup
        angular.copy($scope.selectRow, $scope.backUpRow);

        // Copy
        $scope.modelToEdit = $scope.selectRow;
        $scope.simpleMimeType = $scope.getFileMimeType();
        $scope.isCollapsed = false;
      } else {

        // Close edit on toggle
        $scope.cancel();
      }
    };

    // on Submit Edit Form
    $scope.submit = function() {
      if ($scope.modelToEdit.type) saveCut();
      else saveChapter();
    };

    // on cancel Edit Form
    $scope.cancel = function() {

      // Copy backup
      $scope.file = null;
      $scope.errorFile = null;
      angular.copy($scope.backUpRow, $scope.selectRow);
      $scope.isCollapsed = true;
    };

    // Select or deselect a line by clicking
    $scope.select = function(object) {
      if ($scope.isCollapsed) {
        $scope.selectRow = null;
        if ($scope.ranges && $scope.ranges.length) {
          for (var i = 0; i < $scope.ranges.length; i++) {
            if ($scope.ranges[i] === object && !$scope.ranges[i].select && !$scope.selectRow) {
              $scope.ranges[i].select = true;
              $scope.selectRow = $scope.ranges[i];
            } else {
              $scope.ranges[i].select = false;
            }
          }
        }
      } else { // if close by toggle, close edit form
        $scope.cancel();
        $scope.select(object);
      }
    };

    // Select row and open edit
    $scope.selectAndOpen = function(row) {
      if (row.select) $scope.openEdit();
      else {
        $scope.select(row);
        $scope.openEdit();
      }
    };

    // Get simple mimeType
    $scope.getFileMimeType = function() {
      if (!$scope.modelToEdit || !$scope.modelToEdit.file) return null;
      else if ($scope.modelToEdit.file.mimeType.substr(0, 'image'.length) == 'image') return 'image';
      else if ($scope.modelToEdit.file.mimeType.substr(0, 'video'.length) == 'video') return 'video';
      else if ($scope.modelToEdit.file.mimeType.substr(0, 'audio'.length) == 'audio') return 'audio';
      else return $scope.modelToEdit.file.mimeType;
    };

    /*
     * Slider
     */
    $scope.changeSliderView = function(event, direction) {
      var indexView = $scope.slider.view + direction;
      if (0 > indexView) {
        indexView = 0;
      } else if (indexView >= $scope.slider.views.length) {
        indexView = $scope.slider.views.length - 1;
      }
      $scope.slider.view = indexView;
    };

    $scope.releaseRange = function(range) {
      var value;
      if (!range.select) {
        value = range.value;
      } else {
        value = $scope.selectRow.value;
      }
      playerController.setTime(value);

      // we only save the chnage if the time of the selected row has changed
      if (!range.select || $scope.selectRow.value !== $scope.selectRowInitialValue) {
        if (range.type) saveCut();
        else saveChapter();
      }
      if (range.select)
        $scope.selectRowInitialValue = range.value;
    };

    // remove chapter and tags
    $scope.remove = function() {
      var removeMethodPromise;
      var ranges = $scope.media[$scope.selectedData.value];
      var pointsOfInterestToRemove = {};
      var rangesToRemove = pointsOfInterestToRemove[$scope.selectedData.value] = [];
      for (var i = 0; i < ranges.length; i++) {
        if (ranges[i].check) rangesToRemove.push(ranges[i].id);
      }
      $scope.selectRow = null;

      if ($scope.selectedData.value === 'tags')
        removeMethodPromise = publishService.removeTags($scope.media.id, pointsOfInterestToRemove.tags);
      else if ($scope.selectedData.value === 'chapters')
        removeMethodPromise = publishService.removeChapters($scope.media.id, pointsOfInterestToRemove.chapters);

      removeMethodPromise.then(function(resp) {
        if ($scope.checkAllSelected) {
          $scope.media[$scope.selectedData.value] = [];
          $scope.checkAllSelected = false;
        } else for (var i = 0; i < pointsOfInterestToRemove[$scope.selectedData.value].length; i++) {
          var id = pointsOfInterestToRemove[$scope.selectedData.value][i];
          var k = searchPosition(id);
          if (k >= 0) {
            $scope.media[$scope.selectedData.value].splice(k, 1);
          }
        }
        updateRange();
      }).catch(function(error) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.EDITOR.SAVE_ERROR'));
      });
    };

    $scope.back = function() {
      deleteUpload();
      $window.history.back();
    };

    /*
     *
     *  Time
     */
    var changebyRange = true;
    $scope.updateTime = function() {
      if (changebyRange) {
        $scope.editTime = $scope.modelToEdit.value;
      } else
        changebyRange = true;
    };
    $scope.updateRange = function() {
      if ($scope.myForm.time.$valid) {
        $scope.modelToEdit.value = $scope.editTime;
      }
    };
    $scope.$watch('modelToEdit.value', function() {
      $scope.updateTime();
    });

    // watching ref to the selected row to keep its initial time value
    $scope.$watch('selectRow', function(newVal) {
      if (newVal)
        $scope.selectRowInitialValue = newVal.value;
    });

    // range depends on chapters and cut
    $scope.$watchCollection('media.tags', updateRange);
    $scope.$watchCollection('media.chapters', updateRange);
    $scope.$watchCollection('media.cut', updateRange);

    // watching the button to toggle begin in and out of the cut array
    // we do the same for end
    // we do not toggle if previous value was undefined cause it means we are still initiating the controller
    $scope.$watch('beginCut.isInArray', function(newVal, oldVal) {
      if (newVal !== oldVal && oldVal !== undefined) {
        toggleBegin(newVal);
        saveCut();
      }
    });
    $scope.$watch('endCut.isInArray', function(newVal, oldVal) {
      if (newVal !== oldVal && oldVal !== undefined) {
        toggleEnd(newVal);
        saveCut();
      }
    });

    // maintain the data consistency when cuts are moved/deleted and during initition of the controller
    $scope.$watchCollection('media.cut', function() {
      $scope.beginCut.isInArray = false;
      $scope.endCut.isInArray = false;
      if (!$scope.media.cut) {
        return;
      }

      // we use angular.extend to keep the same object reference
      for (var i = 0; i < $scope.media.cut.length; i++) {
        if ($scope.media.cut[i].type === 'begin') {
          $scope.media.cut[i] = angular.extend($scope.beginCut.range, $scope.media.cut[i]);
          $scope.beginCut.isInArray = true;
        }
        if ($scope.media.cut[i].type === 'end') {
          $scope.media.cut[i] = angular.extend($scope.endCut.range, $scope.media.cut[i]);
          $scope.endCut.isInArray = true;
        }
      }
    });

    $scope.$watch('isCollapsed', function(oldval, newVal) {
      if (!newVal) deleteUpload();
    });

    $scope.$on('$destroy', function() {
      deleteUpload();
    });

    $scope.editTime = 0;
  }

  app.controller('EditorController', EditorController);
  EditorController.$inject = [
    '$window',
    '$scope',
    '$http',
    '$filter',
    '$timeout',
    'i18nService',
    'ovMultirangeViews',
    'media',
    'publishName',
    'publishService'
  ];

})(angular.module('ov.publish'));
