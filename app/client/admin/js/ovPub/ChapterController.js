(function (app) {

  "use strict"

  app.controller("ChapterController", ChapterController);

  ChapterController.$inject = ["$window", "$scope", "$filter", "entityService", "publishService","vdsMultirangeViews", "vdsUtils", "video"];
  /**
   * Defines the categories controller for the categories page.
   */

  function ChapterController($window, $scope, $filter, entityService, publishService, vdsMultirangeViews, vdsUtils, video) {

    var myPlayer = document.getElementById("chapterPlayer");
    var playerController;
    angular.element(myPlayer).on("durationChange", function (event, duration) {
      
      playerController = angular.element(myPlayer).controller("ovPlayer");
      //set Duration
      $scope.duration = duration / 1000 || $scope.video.metadata.duration;
      init();
     
    });
    
    //Init
    $scope.video = video.data.entity;
    console.log($scope.video);
    
    $scope.isCollapsed = true;
    $scope.selectRow = null;
    //Copy of object to edit or add
    $scope.modelToEdit= {};
    // Backup of an existing object to cancel its edition
    $scope.backUpRow = {};
    
    //Init object for player
    $scope.videoPlayer = angular.copy($scope.video);
    delete $scope.videoPlayer.chapter;
    
    var init = function(){
       //If no chapter, add timecodes with empty values and sort them
      if (!$scope.video.chapter) {
        $scope.video.chapter = [];
        var indexTimecodes = $scope.video.timecodes;
        angular.forEach(indexTimecodes, function (value, key) {
          if (key != 0)
            $scope.video.chapter.push({'value': parseInt(key) / ($scope.duration * 1000), 'name': "", 'description': ""});
        });
      }
     
      $scope.video.chapter = orderBy($scope.video.chapter, '+value', false);

      //If no cut add it
      if (!$scope.video.cut)
        $scope.video.cut = [];
      
      $scope.ranges;
      updateRange();

      //Init begin
      var begin;
      //At start, if begin exist, init with it, else init to 0
      if (begin = search(null, 'begin')) {
        $scope.beginRange = begin;
        $scope.beginIsInArray = true;
      } else {
        $scope.beginRange = {'value': 0, 'name': $filter('translate')('UI.BEGIN'), 'description': "", 'type': 'begin'};
        $scope.beginIsInArray = false;
      }

      //Init end
      var end;
      //At start, if end exist, init with it, else init to 1
      if (end = search(null, 'end')) {
        $scope.endRange = end;
        $scope.endIsInArray = true;
      } else {
        $scope.endRange = {'value': 1, 'name': $filter('translate')('UI.END'), 'description': "", 'type': 'end'};
        $scope.endIsInArray = false;
      }
      
      $scope.slider = {
        views: vdsMultirangeViews.TIME($scope.duration),
        view: 0
      };
    }
    
    var orderBy = $filter('orderBy');
    var updateRange = function () {
      $scope.ranges = $scope.video.chapter.concat($scope.video.cut);
      orderBy($scope.ranges, '+value', false);
    }
    
    // Search a value, by time or value and return or delete it
    var search = function(value, type, action){
      var searchObj = []
      if (value === parseFloat(value)) 
        searchObj = $filter('filter')($scope.video.chapter, {value:value}, true);
      else if(type) 
        searchObj = $filter('filter')($scope.video.cut, {type:type}, true);
      
      if(searchObj.length > 0){
        //return
        if(!action) return searchObj[0];
        else {
          //or Delete
          if(value) $scope.video.chapter.splice($scope.video.chapter.indexOf(searchObj[0]),1);
          else if(type) $scope.video.cut.splice($scope.video.cut.indexOf(searchObj[0]),1);
          updateRange();
          return true;
        };
      }
      else return false;
    }

    //Open a new value
    $scope.openNew = function(){
      $scope.modelToEdit = {value:0};
      if($scope.selectRow){
        $scope.selectRow.select= false;
        $scope.selectRow = null;
      }
      $scope.isCollapsed = false;
    };
    
    //Open an value to edit
    $scope.openEdit = function(){
      if($scope.isCollapsed){
        //set backup
        angular.copy($scope.selectRow, $scope.backUpRow);
        //copy 
        $scope.modelToEdit = $scope.selectRow;
        $scope.isCollapsed = false;
      }
      // close edit on toggle
      else {
        $scope.cancel();
      }
    };
    
    // on Submit Edit Form
    $scope.submit = function(){
      $scope.isCollapsed = true;
      
      if (!$scope.selectRow) {
        //ADD the new model
        $scope.video.chapter.push($scope.modelToEdit);
        updateRange();
      } else {
        $scope.selectRow.select = false;
      }
      //Save
      $scope.saveChapter();
    }
    
    // on cancel Edit Form
    $scope.cancel = function(){
      // copy backup
      angular.copy($scope.backUpRow, $scope.selectRow);
      $scope.isCollapsed = true;
    }

    $scope.remove = function () {
      var searchObj = search($scope.selectRow.value, null, true);
      // 
      if(searchObj){
        //If remove a cut by clicking the remove button, set th state button cut manually
        if($scope.selectRow.type == "begin") $scope.beginIsInArray = false;
        if($scope.selectRow.type == "end") $scope.endIsInArray = false;
        $scope.selectRow.select= false;
        $scope.selectRow = null;
        $scope.saveChapter();
      }
    };
    
    //Select or deselect a line by clicking
    $scope.select= function (value) {
      if ($scope.isCollapsed) {
        $scope.selectRow = null;
        for (var i = 0; i <  $scope.ranges.length ; i++) {
          if ( $scope.ranges[i].value == value && ! $scope.ranges[i].select && !$scope.selectRow) {
             $scope.ranges[i].select = true;
            $scope.selectRow =  $scope.ranges[i];
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
        0 > indexView ? indexView = 0 : indexView >= $scope.slider.views.length && (indexView = $scope.slider.views.length - 1),
        $scope.slider.view = indexView;
    };
    
    $scope.releaseRange = function(){
      playerController.setTime(parseInt($scope.selectRow.value* $scope.duration)* 1000);
      $scope.saveChapter();
    };
    
 
    
    /**
     * CUT
     */
    
 
    //Toggle Begin
    $scope.toggleBegin = function(){
      if(!$scope.beginIsInArray){
        // Add begin Object to range array
        $scope.video.cut.push($scope.beginRange);
        updateRange();
      }else{
        //search and delete
        search(null, 'begin', true);
      }
      //Save
      $scope.saveChapter();
    }
    
    
    //Toggle End
    $scope.toggleEnd = function(){
      if(!$scope.endIsInArray){
        $scope.video.cut.push($scope.endRange);
        updateRange();
      }else {
        //search and delete
        search(null, 'end', true);
      }
      $scope.saveChapter();
    }
      
    //Save chapter and cut
    $scope.saveChapter = function(){
      //Validate if end is after begin
      if($scope.endIsInArray && $scope.beginIsInArray && $scope.endRange.value <= $scope.beginRange.value){
        //else delete end in range
        search(null, 'end', true);
        //and reset end
        $scope.endRange.value = 1;
        $scope.endIsInArray = false;
      }
      
      $scope.video.chapter = orderBy($scope.video.chapter, '+value',false);
      $scope.video.cut = orderBy($scope.video.cut, '+value',false);
      
      //CALL SAVE HTTP
      entityService.updateEntity('video', $scope.video.id, {
        chapter: $scope.video.chapter,
        cut: $scope.video.cut
      }).success(function (data, status, headers, config) {

      }).error(function (data, status, headers, config) {
        $scope.$emit("setAlert", 'danger', $filter('translate')('CHAPTER.SAVE_ERROR'), 4000);
        if (status === 401)
          $scope.$parent.logout();
      });
    }
    $scope.back = function(){
      $window.history.back();
    }
    
    /**
     * 
     *  Time  
    */
    var changebyRange = true;
    $scope.updateTime = function(){
      if(changebyRange){
      var d = new Date(parseInt($scope.modelToEdit.value* $scope.duration)* 1000);
      var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      var nd = new Date(utc);
      $scope.editTime = nd;
      } else changebyRange = true;
    }
    $scope.updateRange = function(){
      if($scope.myForm.time.$valid && $scope.editTime){
        var d = new Date($scope.editTime.getTime());
        var local = d.getTime() - (d.getTimezoneOffset() * 60000);
        changebyRange = false;
        $scope.modelToEdit.value = local/($scope.duration *1000);
      }
    }
    $scope.$watch('modelToEdit.value', function(newValue, oldValue) {
      $scope.updateTime();
    });
    $scope.editTime = new Date(Date.UTC(1970, 0, 1, 0, 0, 0 ));
 
  }
})(angular.module("ov.publish"));