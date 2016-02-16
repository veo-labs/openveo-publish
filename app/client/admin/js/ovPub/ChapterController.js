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
          media) {

    var orderBy = $filter('orderBy');

    /**
     * Reconstructs ranges with chapters and cut array.
     */
    function updateRange() {
      $scope.ranges = ($scope.media.chapters ? $scope.media.chapters : [])
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
        var indexTimecodes = $scope.media.timecodes;
        angular.forEach(indexTimecodes, function(obj) {
          $scope.media.chapters.push({
            value: obj.timecode / ($scope.duration * 1000),
            name: '',
            description: ''
          });
        });
      }

      // If no cut add it
      if (!$scope.media.cut) {
        $scope.media.cut = [];
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

    // Init
    $scope.media = media.data.entity;
    $scope.playerType = $scope.media.type == 'youtube' ? 'youtube' : 'html';

    $scope.isCollapsed = true;
    $scope.selectRow = null;

    // Copy of object to edit or add
    $scope.modelToEdit = {};

    // Backup of an existing object to cancel its edition
    $scope.backUpRow = {};

    // Init object for player
    $scope.mediaPlayer = angular.copy($scope.media);
    delete $scope.mediaPlayer.chapters;
    delete $scope.mediaPlayer.cut;

    // Set player language
    $scope.playerLanguage = i18nService.getLanguage();

    // Init default cuts
    $scope.beginCut = {
      isInArray: undefined,
      range: {
        value: 0,
        name: 'UI.BEGIN',
        description: '',
        type: 'begin'
      }
    };
    $scope.endCut = {
      isInArray: undefined,
      range: {
        value: 1,
        name: 'UI.END',
        description: '',
        type: 'end'
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
      $scope.isCollapsed = false;
    };

    // Open an value to edit
    $scope.openEdit = function() {
      if ($scope.isCollapsed) {

        // Set backup
        angular.copy($scope.selectRow, $scope.backUpRow);

        // Copy
        $scope.modelToEdit = $scope.selectRow;
        $scope.isCollapsed = false;
      } else {

        // Close edit on toggle
        $scope.cancel();
      }
    };

    // on Submit Edit Form
    $scope.submit = function() {
      $scope.isCollapsed = true;

      if (!$scope.selectRow) {

        // ADD the new model
        $scope.media.chapters.push($scope.modelToEdit);
      } else {
        $scope.selectRow.select = false;
        $scope.selectRow = null;
      }

      // Save
      $scope.saveChapter();
    };

    // on cancel Edit Form
    $scope.cancel = function() {

      // Copy backup
      angular.copy($scope.backUpRow, $scope.selectRow);
      $scope.isCollapsed = true;
    };

    $scope.remove = function() {
      if ($scope.selectRow) {
        $scope.media.chapters.splice($scope.media.chapters.indexOf($scope.selectRow), 1);
        $scope.selectRow.select = false;
        $scope.selectRow = null;
        $scope.saveChapter();
      }
    };

    // Select or deselect a line by clicking
    $scope.select = function(object) {
      if ($scope.isCollapsed) {
        $scope.selectRow = null;
        for (var i = 0; i < $scope.ranges.length; i++) {
          if ($scope.ranges[i] === object && !$scope.ranges[i].select && !$scope.selectRow) {
            $scope.ranges[i].select = true;
            $scope.selectRow = $scope.ranges[i];
          } else {
            $scope.ranges[i].select = false;
          }
        }
      } else { // if close by toggle, close edit form
        $scope.cancel();
        $scope.select(object);
      }
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
        $scope.saveChapter();
      }
      if (range.select)
        $scope.selectRowInitialValue = range.value;
    };

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

    // Save chapter and cut
    $scope.saveChapter = function() {
      // Validate if end is after begin
      if ($scope.endCut.isInArray && $scope.beginCut.isInArray &&
              $scope.endCut.range.value <= $scope.beginCut.range.value) {
        // Reset end
        $scope.endCut.range.value = 1;
        $scope.$emit('setAlert', 'warning', $filter('translate')('CHAPTER.DELETE_END_CUT'), 8000);
        toggleEnd(false);

        // the watch for endCut.isInArray will save everything
        $scope.endCut.isInArray = false;
        return;
      }

      // CALL SAVE HTTP
      var objToSave = {chapters: [], cut: []};
      for (var collectionName in objToSave) {
        if ($scope.media.hasOwnProperty(collectionName)) {
          for (var i = 0; i < $scope.media[collectionName].length; i++) {
            var element = angular.copy($scope.media[collectionName][i]);
            delete element['_depth'];
            delete element['select'];
            objToSave[collectionName].push(element);
          }
          orderBy(objToSave[collectionName], '+value', false);
        }
      }
      entityService.updateEntity('video', $scope.media.id, objToSave).success(function() {

      }).error(function(data, status) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('CHAPTER.SAVE_ERROR'), 4000);
        if (status === 401)
          $scope.$parent.logout();
      });
    };
    $scope.back = function() {
      $window.history.back();
    };

    /*
     *
     *  Time
     */
    var changebyRange = true;
    $scope.updateTime = function() {
      if (changebyRange) {
        var d = new Date(parseInt($scope.modelToEdit.value * $scope.duration) * 1000);
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
        $scope.modelToEdit.value = local / ($scope.duration * 1000);
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

    // watching the button to toggle begin in and out of the cut array
    // we do the same for end
    // we do not toggle if previous value was undefined cause it means we are still initiating the controller
    $scope.$watch('beginCut.isInArray', function(newVal, oldVal) {
      if (newVal !== oldVal && oldVal !== undefined) {
        toggleBegin(newVal);
        $scope.saveChapter();
      }
    });
    $scope.$watch('endCut.isInArray', function(newVal, oldVal) {
      if (newVal !== oldVal && oldVal !== undefined) {
        toggleEnd(newVal);
        $scope.saveChapter();
      }
    });

    // range depends on chapters and cut
    $scope.$watchCollection('media.chapters', updateRange);
    $scope.$watchCollection('media.cut', updateRange);

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
    'media'
  ];

})(angular.module('ov.publish'));
