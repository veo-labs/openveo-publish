(function (app) {

  "use strict"

  app.controller("ChapterController", ChapterController);

  ChapterController.$inject = ["$scope", "$filter", "entityService", "publishService","vdsMultirangeViews", "vdsUtils", "video"];
  /**
   * Defines the categories controller for the categories page.
   */

  function ChapterController($scope, $filter, entityService, publishService, vdsMultirangeViews, vdsUtils, video) {
    $scope.video = video.data.entity;
    
    //Init object for player
    $scope.videoPlayer = angular.copy($scope.video);
    delete $scope.videoPlayer.chapter;
    
    //Init
    var indexTimecodes = $scope.video.timecodes;
    $scope.duration = 60*60|| $scope.video.metadata.duration;
    $scope.isCollapsed = true;


    if(!$scope.video.chapter){
      $scope.video.chapter = [];
      angular.forEach(indexTimecodes, function(value, key) {
        if(key!=0)
        $scope.video.chapter.push({'value':parseInt(key)/($scope.duration * 1000), 'name':"", 'description':""});
      });
    }
     var search = function(value, type, action){
      for (var i = 0; i < $scope.video.chapter.length; i++) {
        if((value && $scope.video.chapter[i].value == value) ||
        (type && $scope.video.chapter[i].type == type)) {
          if(!action) return $scope.video.chapter[i];
          else if(action) $scope.video.chapter.splice(i,1);
        }
      }
      return false;
    }

    var orderBy = $filter('orderBy');
    $scope.video.chapter = orderBy($scope.video.chapter, '+value',false);

    $scope.modelToEdit= {};
    $scope.backUpRow = {};
    $scope.openNew = function(){
      $scope.modelToEdit = {value:0};
      if($scope.selectRow){
        $scope.selectRow.select= false;
        $scope.selectRow = null;
      }
      $scope.isCollapsed = false;
    };
    
    $scope.openEdit = function(){
      if($scope.isCollapsed){
        angular.copy($scope.selectRow, $scope.backUpRow);
        $scope.modelToEdit = $scope.selectRow;
        $scope.isCollapsed = false;
      }
      else {
        $scope.cancel();
      }
      
    };
    $scope.submit = function(){
      $scope.isCollapsed = true;
      if (!$scope.selectRow) {
        //ADD
        $scope.video.chapter.push($scope.modelToEdit);
        $scope.video.chapter = orderBy($scope.video.chapter, '+value', false);
      }
      $scope.saveChapter();
    }
    $scope.cancel = function(){
      angular.copy($scope.backUpRow, $scope.selectRow);
      $scope.isCollapsed = true;
    }

    $scope.remove = function () {
      var found = false;
      for(var i=0; !found && i<$scope.video.chapter.length ;i++){
        if($scope.video.chapter[i].value == $scope.selectRow.value){
          $scope.video.chapter.splice(i,1);
          found = true;
          $scope.selectRow.select= false;
          $scope.selectRow = null;
          $scope.saveChapter();
        }
      }
    };
    $scope.selectRow = null;
    $scope.select= function (value) {
      if ($scope.isCollapsed) {
        $scope.selectRow = null;
        for (var i = 0; i < $scope.video.chapter.length ; i++) {
          if ($scope.video.chapter[i].value == value && !$scope.video.chapter[i].select && !$scope.selectRow) {
            $scope.video.chapter[i].select = true;
            $scope.selectRow = $scope.video.chapter[i];
          } else {
            $scope.video.chapter[i].select = false;
          }
        }
      } else {
        $scope.cancel();
        $scope.select(value);
      }
    };

    $scope.slider = {
        views: vdsMultirangeViews.TIME($scope.duration),
        view: 0
    };

    $scope.changeSliderView = function(event, direction) {
        var indexView = $scope.slider.view + direction;
        0 > indexView ? indexView = 0 : indexView >= $scope.slider.views.length && (indexView = $scope.slider.views.length - 1),
        $scope.slider.view = indexView;
    }
    
    //Init begin
     var begin;
    if(begin = search(null, 'begin')){
      $scope.beginRange = begin;
      $scope.beginIsInArray = true;
    } else {
      $scope.beginRange = {'value':0, 'name':$filter('translate')('UI.BEGIN'), 'description':"", 'type':'begin'};
      $scope.beginIsInArray = false; 
    }
    //Toggle Begin
    $scope.toggleBegin = function(){
      if(!$scope.beginIsInArray){
        $scope.video.chapter.push($scope.beginRange);
        $scope.video.chapter = orderBy($scope.video.chapter, '+value',false);
      }else {
        //search and delete
        search(null, 'begin', true);
      }
      $scope.saveChapter();
    }
    
    //Init end
    var end;
    if(end = search(null, 'end')){
      $scope.endRange = end;
      $scope.endIsInArray = true;
    } else {
      $scope.endRange = {'value':1, 'name':$filter('translate')('UI.END'), 'description':"", 'type':'end'};
      $scope.endIsInArray = false; 
    }
    //Toggle End
    $scope.toggleEnd = function(){
      if(!$scope.endIsInArray){
        $scope.video.chapter.push($scope.endRange);
        $scope.video.chapter = orderBy($scope.video.chapter, '+value',false);
      }else {
        //search and delete
        search(null, 'end', true);
      }
      $scope.saveChapter();
    }
      
    $scope.saveChapter = function(){
      if($scope.endIsInArray && $scope.beginIsInArray && $scope.endRange.value <= $scope.beginRange.value){
        search(null, 'end', true);
        $scope.endRange.value = 1;
        $scope.endIsInArray = false;
      }
      
      //CALL SAVE HTTP
      entityService.updateEntity('video', $scope.video.id, {
        chapter: $scope.video.chapter
      }).success(function (data, status, headers, config) {

      }).error(function (data, status, headers, config) {
        $scope.$emit("setAlert", 'danger', $filter('translate')('CHAPTER.SAVE_ERROR'), 4000);
        if (status === 401)
          $scope.$parent.logout();
      });
    }
  }
})(angular.module("ov.publish"));