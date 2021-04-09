if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'seereflection-ng';
}
(function() {
  'use strict';
  var seereflectionModule = angular.module('seereflection-ng', []);
  seereflectionModule.directive('ngSeereflection', ['$interval','$http', '$timeout', ngSeeReflection]);
  function ngSeeReflection($interval, $http,$timeout) {
    return {
      restrict: 'EA',
      scope: {
        isholoField   : '@',
        reflectiveField    : '@',
        envrotateField    : '@',
        srcField : '@',
        affects: '@',
        disableField  : '@'
      },
      template: '<div></div>',
      link: function(scope, element, attr) {
        var lastUpdated = 'unknown';
        scope.data = {
          disable : false,
          capture : {} , 
          affects  : {},
          reflect : 0,
          envrotate : 0,    
          src: '',
        };
        function isbool(v) {
          return (v==='true')||v===true;
        }
        function reflectionshader(params) {
          var isholo = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
          var shader = isholo?"reflecthl"+params : "reflectgl"+params;
          return shader;
        }
        function restore(b) {
          if(scope.$parent.view.wdg[b]!=undefined && scope.data.capture[b] != undefined) {
            var wdg = scope.$parent.view.wdg[b];
            for(var a in scope.data.capture[b]) 
              wdg[a] = scope.data.capture[b][a];
          }
        }
        function capture(b) {
          if(scope.$parent.view.wdg[b]!=undefined) {
            var wdg = scope.$parent.view.wdg[b];
            scope.data.capture[b] = {
              shader: wdg.shader, 
              visible: wdg.visible, 
              opacity: wdg.opacity, 
              decal: wdg.decal, 
              texture:wdg.texture };
            return true;
          }
          return false;
        }
        function capturelist(list) {
          var ilist = scope.data[list];
          return function(a) {
            if (capture(a) === true)
              ilist.push(a);
          };
        }
        function against(list,effect) {
          if (list.length > 0) {
            for (var x=0;x<list.length;x++) {
              var a = list[x];
              effect(a.trim());
            }
          }
        }
        var recordlist = function(list) {
          var ilist = scope[list].split(',');
          scope.data[list]=[];
          against(ilist,capturelist(list));
        }
        var resetlist = function(list) {
          against(scope.data[list],restore);
        }
        var updateEffects = function(force) {
        var reset = force!=undefined && force===true || scope.data.disable === true;
            
            
          function setdefault(b) {
            if(scope.$parent.view.wdg[b]!=undefined) {
              var wdg     = scope.$parent.view.wdg[b];
              wdg.shader  = "Default";
              wdg.decal   = "false";
              wdg.opacity = 1.0;
              wdg.visible = true;
              wdg.texture = "";
            }
          }
          function setreflect(b) {
            if(reset) setdefault(b);
            else if(scope.$parent.view.wdg[b]!=undefined) {
              var envrotate = scope.envrotateField /360 ;
              var reflective = scope.reflectiveField / 100;    
              var src = scope.srcField;
              var isholo     = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
              var shd = reflectionshader(";mixer f " + reflective + ";envrotate f " + envrotate + "");
              var wdg     = scope.$parent.view.wdg[b];
              wdg.texture = src + (isholo?"#edge=repeat":"?name=tex0&edge=repeat");
              wdg.shader  = shd;
              wdg.decal   = false;
              wdg.opacity = 1 ;
            }
          }
          function apply(affectsfn) {
            against(scope.data.affects, affectsfn);
          }
          if (scope.disableField == "true") {
            // set default shader when Disable == true
            apply(setdefault);
          }
          else {
            // set reflect shader when Disable == false
            apply(setreflect);
          }
        }
        //////////////////////////////////////////////////////////////////////////////////
        //
        // monitor inputs for any CHANGE in data
        //
        if (scope.disableField === "false")
        {
          updateEffects();
        }
        var executeEffects= function(){
          if (scope.data.disable === false) $timeout(function () {
            updateEffects();
          }
                                                     , 1);
        };
        scope.$watch('affects', function () {
          // get the list of names
          processlist('affects');
        }
                    );
        scope.$watch('disableField', function () {
          scope.data.disable = (scope.disableField != undefined && scope.disableField === 'true') ? true :false ;
          if (scope.data.disable ===true) {
            // reset the affects lists to the original settings  
            resetlist('affects');
           // updateEffects();
          }
          else {
            // recapture this (it may have changed, although binding should have caught that)
            recordlist('affects');
            // and re-apply
            executeEffects();
          }
        }
                    );
        scope.$watch('reflectiveField', function () {
          scope.data.reflect = parseFloat(scope.reflectiveField) ;
          executeEffects();
        }
                    );  
        scope.$watch('envrotateField', function () {
          scope.data.envrotate = parseFloat(scope.envrotateField) ;
          executeEffects();
        }
                    );
        scope.$watch('srcField', function () {
           scope.data.src  = (scope.srcField  != undefined) ? scope.srcField : '';
          executeEffects();
        }
                    );
        function processlist(list) {
          if (scope[list] != undefined) {
            // 1. undo/reset the previous values
            resetlist(list);
            // 2. now read the new one, and capture settings
            recordlist(list);
            // 3. finally, apply new settings to sanitised list
            executeEffects();
          }
        }
      }
      //
      //
    };
  }
}
 ());
