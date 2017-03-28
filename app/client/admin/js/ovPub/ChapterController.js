'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   */
  function ChapterController(
          $window,
          $scope,
          $filter,
          $timeout,
          entityService,
          i18nService,
          ovMultirangeViews,
          media,
          publishName,
          publishService) {

    var orderBy = $filter('orderBy');
    var uploadAborted = false;

    /**
     * Reconstructs ranges with chapters and cut array.
     */
    function updateRange() {
      $scope.ranges = ($scope.media[$scope.selectedData.value] ? $scope.media[$scope.selectedData.value] : [])
              .concat(($scope.media.cut ? $scope.media.cut : []));

      orderBy($scope.ranges, '+value', false);
    }

    /**
     * Initializes chapters and start / end cuts.
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

      $scope.slider = {
        views: ovMultirangeViews.TIME($scope.duration),
        view: 0
      };
    }

    var myPlayer = document.getElementById('chapterPlayer');
    var playerController;

    /**
     * Executes, safely, the given function in AngularJS process.
     *
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
     * @param {Number} duration Media duration
     */
    function preinit(duration) {
      safeApply(function() {

        // only gets called once
        if (!playerController || duration) {
          playerController = angular.element(myPlayer).controller('ovPlayer');

          // Set Duration
          $scope.duration = duration / 1000;
          init();
        }
      });
    }

    /**
     *  TAG
     */

    /**
     * Abort upload and delete file
     *
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
     * @param  {String} collectionName object key of the properties to clean
     * @param  {Bool} cleanAll condition if all Object has to be cleaned
     * @return {Object} clean Object
     */
    function cleanObjectToSave(collectionName, cleanAll) {
      var objToSave = {};
      objToSave[collectionName] = [];
      var tmpEl;
      if (!cleanAll) {
        if ($scope.media.hasOwnProperty(collectionName)) {
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
     */
    function saveChapterErrorCb(resp) {
      if (resp.status > 0)
        $scope.errorMsg = resp.status + ': ' + resp.data;

      // emit alert
      if (uploadAborted) {
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.CHAPTER.UPLOAD_CANCELED'), 4000);
        uploadAborted = false;
      } else {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.CHAPTER.SAVE_ERROR'), 4000);
        if (status === 401)
          $scope.$parent.logout();
      }
      $scope.upload = null;
    }

    /**
     * Save chapter success callback
     */
    function saveChapterSuccessCb(resp) {
      if (typeof resp.data === 'string') {
        saveChapterErrorCb(resp);
        return;
      }

      $scope.file = null;
      $scope.modelToEdit = resp.data[$scope.selectedData.value][0];
      $scope.simpleMimeType = $scope.getFileMimeType();
      if (!$scope.selectRow) {

        // ADD the new model
        $scope.media[$scope.selectedData.value].push($scope.modelToEdit);
      } else {
        var i = searchPosition($scope.modelToEdit.id);
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
     */
    function saveChapter() {
      var objToSave = cleanObjectToSave($scope.selectedData.value, true);
      $scope.upload = publishService.updateTags($scope.media.id, $scope.file, objToSave);

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
     * @param {Boolean} addOrRemove Forces the addition or removal of the cut
     */
    function toggleBegin(addOrRemove) {
      toggleCut($scope.beginCut.range, addOrRemove);
    }

    /**
     * Selects or unselect the ending cut.
     *
     * @param {Boolean} addOrRemove Forces the addition or removal of the cut
     */
    function toggleEnd(addOrRemove) {
      toggleCut($scope.endCut.range, addOrRemove);
    }

    /**
     * Save chapter and cut
     */
    function saveCut() {

      // Validate if end is after begin
      if ($scope.endCut.isInArray && $scope.beginCut.isInArray &&
        $scope.endCut.range.value <= $scope.beginCut.range.value) {
        // Reset end
        $scope.endCut.range.value = 1;
        $scope.$emit('setAlert', 'warning', $filter('translate')('PUBLISH.CHAPTER.DELETE_END_CUT'), 8000);
        toggleEnd(false);

        // the watch for endCut.isInArray will save everything
        $scope.endCut.isInArray = false;
        return;
      }

      // CALL SAVE HTTP
      var objToSave = cleanObjectToSave('cut');
      entityService.updateEntity('videos', publishName, $scope.media.id, objToSave).success(function() {
        if ($scope.selectRow) {
          $scope.selectRow.select = false;
          $scope.selectRow = null;
        }
        updateRange();
        $scope.isCollapsed = true;
      }).error(function(data, status) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('PUBLISH.CUT.SAVE_ERROR'), 4000);
        if (status === 401)
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
      $scope.$emit('setAlert', 'danger', error.message, 8000);
      $scope.back();
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
    delete $scope.mediaPlayer.chapters;
    delete $scope.mediaPlayer.tags;
    delete $scope.mediaPlayer.cut;

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
        value: 1,
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
      }]
    };

    $scope.$watch('selectedData.value', function() {
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

    // Get simple mimetype
    $scope.getFileMimeType = function() {
      if (!$scope.modelToEdit || !$scope.modelToEdit.file) return null;
      else if ($scope.modelToEdit.file.mimetype.substr(0, 'image'.length) == 'image') return 'image';
      else if ($scope.modelToEdit.file.mimetype.substr(0, 'video'.length) == 'video') return 'video';
      else if ($scope.modelToEdit.file.mimetype.substr(0, 'audio'.length) == 'audio') return 'audio';
      else return $scope.modelToEdit.file.mimetype;
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
      playerController.setTime(parseInt(value * $scope.duration) * 1000);

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
      var ranges = $scope.media[$scope.selectedData.value];
      var tagsToRemove = {};
      var rangesToRemove = tagsToRemove[$scope.selectedData.value] = [];
      for (var i = 0; i < ranges.length; i++) {
        if (ranges[i].check) rangesToRemove.push(ranges[i]);
      }
      $scope.selectRow = null;

      publishService.removeTags($scope.media.id, tagsToRemove).then(function(resp) {
        if ($scope.checkAllSelected) $scope.media[$scope.selectedData.value] = [];
        else for (var i = 0; i < tagsToRemove[$scope.selectedData.value].length; i++) {
          var id = tagsToRemove[$scope.selectedData.value][i]['id'];
          var k = searchPosition(id);
          if (k >= 0) {
            $scope.media[$scope.selectedData.value].splice(k, 1);
          }
        }
        updateRange();
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
        var d = new Date(parseInt(Math.round($scope.modelToEdit.value * Math.round($scope.duration * 1000))));
        var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        var nd = new Date(utc);
        $scope.editTime = nd;
      } else
        changebyRange = true;
    };
    $scope.updateRange = function() {
      if ($scope.myForm.time.$valid && $scope.editTime) {
        var d = new Date($scope.editTime.getTime());
        var local = d.getTime() - (d.getTimezoneOffset() * 60000);
        changebyRange = false;
        $scope.modelToEdit.value = local / Math.round($scope.duration * 1000);
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

    $scope.editTime = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  }

  app.controller('ChapterController', ChapterController);
  ChapterController.$inject = [
    '$window',
    '$scope',
    '$filter',
    '$timeout',
    'entityService',
    'i18nService',
    'ovMultirangeViews',
    'media',
    'publishName',
    'publishService'
  ];

})(angular.module('ov.publish'));
