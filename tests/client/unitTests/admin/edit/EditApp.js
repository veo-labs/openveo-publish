(function(angular){

  "use strict"

  var app = angular.module("ov.edit", []);
  app.directive("ovForm", ovForm);
  app.directive("ovEditable", ovEditable);
  ovForm.$inject = ["ovFormLink"];
  ovEditable.$inject = ["ovEditableLink", "$compile"];

  function ovForm(ovFormLink){
    return{
      restrict : "A",
      require : "^form",
      scope : {},
      link : ovFormLink,
      controller: ["$scope", function($scope){
      }]
    };
  };
  
  app.factory("ovFormLink", function(){
    return function(scope, element, attrs, formController){};
  });
  
  function ovEditable(ovEditableLink){
    return{
      restrict : "E",
      require : ["^ovForm", "^form"],
      transclude : true,
      scope : {
        ovValue : "=",
        ovType : "@",
        ovOptions : "=?"
      },
      link : ovEditableLink
    };
  };
  
  app.factory("ovEditableLink", ["$compile", "$timeout", function($compile, $timeout){
    return function(scope, element, attrs, controllers, transclude){};
  }]);

})(angular);