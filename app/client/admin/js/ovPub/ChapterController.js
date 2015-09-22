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
  publishService,
  vdsMultirangeViews,
  vdsUtils,
  video) {

    var orderBy = $filter('orderBy');

    var updateRange = function() {
      $scope.ranges = $scope.video.chapters.concat($scope.video.cut);
      orderBy($scope.ranges, '+value', false);
    };

    // Search a value, by time or value and return or delete it
    var search = function(value, type, action) {
      var searchObj = [];
      if (value === parseFloat(value))
        searchObj = $filter('filter')($scope.video.chapters, {
          value: value
        },
        true);
      else if (type)
        searchObj = $filter('filter')($scope.video.cut, {
          type: type
        },
        true);

      if (searchObj.length > 0) {

        // Return
        if (!action)
          return searchObj[0];
        else {

          // Or Delete
          if (value)
            $scope.video.chapters.splice(
              $scope.video.chapters.indexOf(
                searchObj[0]),
              1);
          else if (type)
            $scope.video.cut.splice(
              $scope.video.cut.indexOf(
                searchObj[0]),
              1);
          updateRange();
          return true;
        }
      }
      else
        return false;
    };

    var init = function() {

      // If no chapter, add timecodes with empty values and sort them
      if (!$scope.video.chapters) {
        $scope.video.chapters = [];
        var indexTimecodes = $scope.video.timecodes;
        angular.forEach(indexTimecodes, function(value, key) {
          if (key != 0)
            $scope.video.chapters.push({
              value: parseInt(key) / ($scope.duration * 1000),
              name: '',
              description: ''
            });
        });
      }

      $scope.video.chapters = orderBy($scope.video.chapters, '+value', false);

      // If no cut add it
      if (!$scope.video.cut)
        $scope.video.cut = [];

      updateRange();

      // Init begin
      var begin;

      // At start, if begin exist, init with it, else init to 0
      begin = search(null, 'begin');
      if (begin) {
        $scope.beginRange = begin;
        $scope.beginIsInArray = true;
      } else {
        $scope.beginRange = {
          value: 0,
          name: $filter('translate')('UI.BEGIN'),
          description: '',
          type: 'begin'
        };
        $scope.beginIsInArray = false;
      }

      // Init end
      var end;

      // At start, if end exist, init with it, else init to 1
      end = search(null, 'end');
      if (end) {
        $scope.endRange = end;
        $scope.endIsInArray = true;
      } else {
        $scope.endRange = {
          value: 1,
          name: $filter('translate')(
            'UI.END'),
          description: '',
          type: 'end'
        };
        $scope.endIsInArray = false;
      }

      $scope.slider = {
        views: vdsMultirangeViews.TIME($scope.duration),
        view: 0
      };
    };

    var myPlayer = document.getElementById('chapterPlayer');
    var playerController;
    angular.element(myPlayer).on('durationChange', function(event, duration) {

      playerController = angular.element(myPlayer).controller('ovPlayer');

      // Set Duration
      $scope.duration = duration / 1000 || $scope.video.metadata.duration;
      init();

    });

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
        updateRange();
      } else {
        $scope.selectRow.select = false;
      }

      // Save
      $scope.saveChapter();
    };

    // on cancel Edit Form
    $scope.cancel = function() {
      // copy backup
      angular.copy($scope.backUpRow, $scope.selectRow);
      $scope.isCollapsed = true;
    };

    $scope.remove = function() {
      var searchObj = search($scope.selectRow.value, null, true);

      if (searchObj) {

        // If remove a cut by clicking the remove button, set th state button cut manually
        if ($scope.selectRow.type == 'begin')
          $scope.beginIsInArray = false;
        if ($scope.selectRow.type == 'end')
          $scope.endIsInArray = false;
        $scope.selectRow.select = false;
        $scope.selectRow = null;
        $scope.saveChapter();
      }
    };

    // Select or deselect a line by clicking
    $scope.select = function(value) {
      if ($scope.isCollapsed) {
        $scope.selectRow = null;
        for (var i = 0; i < $scope.ranges.length; i++) {
          if ($scope.ranges[i].value == value && !$scope.ranges[i].select && !$scope.selectRow) {
            $scope.ranges[i].select = true;
            $scope.selectRow = $scope.ranges[i];
          } else {
            $scope.ranges[i].select = false;
          }
        }
      } else {// if close by toggle, close edit form
        $scope.cancel();
        $scope.select(value);
      }
    };

    /**
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
      $scope.saveChapter();
    };

    /**
     * CUT
     */

    // Toggle Begin
    $scope.toggleBegin = function() {
      if (!$scope.beginIsInArray) {

        // Add begin Object to range array
        $scope.video.cut.push($scope.beginRange);
        updateRange();
      } else {

        // Search and delete
        search(null, 'begin', true);

      }

      // Save
      $scope.saveChapter();
    };


    // Toggle End
    $scope.toggleEnd = function() {
      if (!$scope.endIsInArray) {
        $scope.video.cut.push($scope.endRange);
        updateRange();
      } else {

        // search and delete
        search(null, 'end', true);

      }
      $scope.saveChapter();
    };

    // Save chapter and cut
    $scope.saveChapter = function() {

      // Validate if end is after begin
      if ($scope.endIsInArray && $scope.beginIsInArray && $scope.endRange.value <= $scope.beginRange.value) {

        // Else delete end in range
        search(null, 'end', true);

        // And reset end
        $scope.endRange.value = 1;
        $scope.endIsInArray = false;
        $scope.$emit('setAlert', 'warning', $filter('translate')('CHAPTER.DELETE_END_CUT'), 8000);
      }

      $scope.video.chapters = orderBy($scope.video.chapters, '+value', false);
      $scope.video.cut = orderBy($scope.video.cut, '+value', false);

      // CALL SAVE HTTP
      var chapter = [];
      for (var i = 0; i < $scope.video.chapters.length; i++) {
        chapter[i] = angular.copy($scope.video.chapters[i]);
        delete chapter[i]['_depth'];
        delete chapter[i]['select'];
      }
      var cut = [];
      for (var j = 0; j < $scope.video.cut.length; j++) {
        cut[j] = angular.copy($scope.video.cut[j]);
        delete cut[j]['_depth'];
        delete cut[j]['select'];
      }

      entityService.updateEntity('video', $scope.video.id, {
        chapters: chapter,
        cut: cut
      }).success(function() {

      }).error(function(data, status) {
        $scope.$emit('setAlert', 'danger', $filter('translate')('CHAPTER.SAVE_ERROR'), 4000);
        if (status === 401)
          $scope.$parent.logout();
      });
    };
    $scope.back = function() {
      $window.history.back();
    };

    /**
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
    $scope.editTime = new Date(Date.UTC(1970, 0, 1, 0, 0, 0));

  }

  app.controller('ChapterController', ChapterController);
  ChapterController.$inject = [
    '$window',
    '$scope',
    '$filter',
    'entityService',
    'publishService',
    'vdsMultirangeViews',
    'vdsUtils',
    'video'
  ];

})(angular.module('ov.publish'));
