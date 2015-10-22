'use strict';

(function(app) {

  /**
   * Defines the categories controller for the categories page.
   */
  function ChapterController(
          $window,
          $scope,
          $filter,
          entityService,
          i18nService,
          ovMultirangeViews,
          video) {

    var orderBy = $filter('orderBy');

    /**
     * Reconstructs ranges with chapters and cut array.
     */
    function updateRange() {
      $scope.ranges = ($scope.video.chapters ? $scope.video.chapters : [])
              .concat(($scope.video.cut ? $scope.video.cut : []));
      orderBy($scope.ranges, '+value', false);
    }

    /**
     * Initializes chapters and start / end cuts.
     */
    function init() {

      // If no chapter, add timecodes with empty values and sort them
      if (!$scope.video.chapters) {
        $scope.video.chapters = [];
        var indexTimecodes = $scope.video.timecodes;
        angular.forEach(indexTimecodes, function(obj) {
          $scope.video.chapters.push({
            value: obj.timecode / ($scope.duration * 1000),
            name: '',
            description: ''
          });
        });
      }

      // If no cut add it
      if (!$scope.video.cut) {
        $scope.video.cut = [];
      }

      $scope.slider = {
        views: ovMultirangeViews.TIME($scope.duration),
        view: 0
      };
    }

    var myPlayer = document.getElementById('chapterPlayer');
    var playerController;

    /**
     * Gather some parameters before calling init
     * @param {type} duration a parameter needed before init
     */
    function preinit(duration) {
      $scope.$apply(function() {

        // only gets called once
        if (!playerController || duration) {
          playerController = angular.element(myPlayer).controller('ovPlayer');

          // Set Duration
          $scope.duration = duration / 1000 || ($scope.video.metadata && $scope.video.metadata.duration);
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

    /**
     * ... we also use a timer for initition, we consider 2 sec to be long enougth
     */
    var timer = setTimeout(function() {
      preinit(null);
      clearTimeout(timer);
    }, 2000);

    // Init
    $scope.video = video.data.entity;

    $scope.isCollapsed = true;
    $scope.selectRow = null;

    // Copy of object to edit or add
    $scope.modelToEdit = {};

    // Backup of an existing object to cancel its edition
    $scope.backUpRow = {};

    // Init object for player
    $scope.videoPlayer = angular.copy($scope.video);
    delete $scope.videoPlayer.chapters;
    delete $scope.videoPlayer.cut;

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
        $scope.video.chapters.push($scope.modelToEdit);
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
        $scope.video.chapters.splice($scope.video.chapters.indexOf($scope.selectRow), 1);
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
      } else {// if close by toggle, close edit form
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

    $scope.releaseRange = function() {
      playerController.setTime(parseInt($scope.selectRow.value * $scope.duration) * 1000);

      // we only save the chnage if the time of the selected row has changed
      if ($scope.selectRow.value !== $scope.selectRowInitialValue) {
        $scope.saveChapter();
        $scope.selectRowInitialValue = $scope.selectRow.value;
      }
    };

    /*
     * CUT
     */

    /**
     * Selects and unselect a provided cut
     * @param {Object} cut the cut to toggle
     * @param {Boolean} addOrRemove forces the addition or removal of the cut
     */
    function toggleCut(cut, addOrRemove) {
      var index = $scope.video.cut.indexOf(cut);

      // cuts will be updated by the watchCollection
      if (index === -1 && addOrRemove !== false) {
        $scope.video.cut.push(cut);
      } else if (index !== -1 && addOrRemove !== true) {
        $scope.video.cut.splice(index, 1);
      }

    }

    /**
     * Selects or unselect the begin cut
     * @param {Boolean} addOrRemove forces the addition or removal of the cut
     */
    function toggleBegin(addOrRemove) {
      toggleCut($scope.beginCut.range, addOrRemove);
    }

    /**
     * Selects or unselect the ending cut
     * @param {Boolean} addOrRemove foreces the addition or removal of the cut
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

        // the watch for endCut.isInArray will save everything
        $scope.endCut.isInArray = false;
        return;
      }

      // CALL SAVE HTTP
      var objToSave = {chapters: [], cut: []};
      for (var collectionName in objToSave) {
        if ($scope.video.hasOwnProperty(collectionName)) {
          for (var i = 0; i < $scope.video[collectionName].length; i++) {
            var element = angular.copy($scope.video[collectionName][i]);
            delete element['_depth'];
            delete element['select'];
            objToSave[collectionName].push(element);
          }
          orderBy(objToSave[collectionName], '+value', false);
        }
      }
      entityService.updateEntity('video', $scope.video.id, objToSave).success(function() {

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
    $scope.$watchCollection('video.chapters', updateRange);
    $scope.$watchCollection('video.cut', updateRange);

    // maintain the data consistency when cuts are moved/deleted and during initition of the controller
    $scope.$watchCollection('video.cut', function() {
      $scope.beginCut.isInArray = false;
      $scope.endCut.isInArray = false;
      if (!$scope.video.cut) {
        return;
      }

      // we use angular.extend to keep the same object reference
      for (var i = 0; i < $scope.video.cut.length; i++) {
        if ($scope.video.cut[i].type === 'begin') {
          $scope.video.cut[i] = angular.extend($scope.beginCut.range, $scope.video.cut[i]);
          $scope.beginCut.isInArray = true;
        }
        if ($scope.video.cut[i].type === 'end') {
          $scope.video.cut[i] = angular.extend($scope.endCut.range, $scope.video.cut[i]);
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
    'entityService',
    'i18nService',
    'ovMultirangeViews',
    'video'
  ];

})(angular.module('ov.publish'));
