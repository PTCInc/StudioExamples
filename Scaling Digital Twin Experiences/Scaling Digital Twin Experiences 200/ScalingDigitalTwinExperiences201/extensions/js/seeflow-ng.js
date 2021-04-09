if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'seeflow-ng';
}
(function() {
  'use strict';
  var seeflowModule = angular.module('seeflow-ng', []);
  seeflowModule.directive('ngSeeflow', ['$interval','$http', '$timeout', ngSeeFlow]);
  function ngSeeFlow($interval, $http,$timeout) {
    return {
      restrict: 'EA',
      scope: {
        isholoField   : '@',
        duField       : '@',
        dvField       : '@',
        deltauField   : '@',
        deltavField   : '@',
        sc1Field      : '@',
        sc2Field      : '@',
        srcField      : '@',
        affects       : '@',
        intensityField: '@',
        physicalField : '@',
        disableField  : '@'
      },
      template: '<div></div>',
      link: function(scope, element, attr) {
        var lastUpdated = 'unknown';
        scope.data = {
          disable  : false,
          capture  : {} , 
          affects  : {},
          sc1      : 0,
          sc2      : 0,
          deltau   : 0,
          deltav   : 0,
          du       : 0, 
          dv       : 0,    
          src      : '',
          intensity: 1,
          physical : true
        };
        function isbool(v) {
          return (v==='true')||v===true;
        }
        function flowshader(params) {
          var isholo = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
          var shader = isholo?"flow_onedir_scale_hl"+params : "flow_onedir_scale_gl"+params;
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
          
          function setflow(b) {
            if(reset) setdefault(b);
            else if (scope.$parent.view.wdg[b]!=undefined) {
              var du   = scope.data.du ;
              var dv   = scope.data.dv ;    
              var uoff = scope.data.deltau ;
              var voff = scope.data.deltav ;    
              var sc1  = scope.data.sc1 ;
              var sc2  = scope.data.sc2 ;    
              var src  = scope.data.src ;
              
              var intensity = scope.data.intensity;
              var blend     = scope.data.physical ? 0 : 1;
              
              var isholo = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
              var shd    = flowshader(";blend f "     + blend + 
                                      ";intensity f " + intensity + 
                                      ";uoff f " + uoff + ";voff f " + voff +
                                      ";du f "   + du   + ";dv f "   + dv   +
                                      ";sc1 f "  + sc1  + ";sc2 f "  + sc2);
              var wdg    = scope.$parent.view.wdg[b];
              
              wdg.texture = src + (isholo ? "#edge=repeat" : "?edge=repeat");
              wdg.shader  = shd;
              wdg.decal   = false;
              wdg.opacity = scope.data.physical ? 0.9 * intensity : 0.9 ;
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
            apply(setflow);
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
        });
            
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
        });
            
        scope.$watchGroup(['duField','dvField'], function () {
          scope.data.dv = parseFloat(scope.dvField) ;
          scope.data.du = parseFloat(scope.duField) ;
          executeEffects();
        });
            
        scope.$watchGroup(['sc1Field','sc2Field'], function () {
          scope.data.sc1 = parseFloat(scope.sc1Field) ;
          scope.data.sc2 = parseFloat(scope.sc2Field) ;
          executeEffects();
        });
           
        scope.$watchGroup(['deltauField','deltavField'], function () {
          scope.data.deltau = parseFloat(scope.deltauField) ;
          scope.data.deltav = parseFloat(scope.deltavField) ;
          executeEffects();
        });
            
        scope.$watch('intensityField', function () {
          scope.data.intensity = parseFloat(scope.intensityField) ;
          executeEffects();
        });
            
        scope.$watch('physicalField', function () {
          scope.data.physical = (scope.physicalField != undefined && scope.physicalField === 'true') ? true :false ;
          executeEffects();
        });
            
        scope.$watch('srcField', function () {
          scope.data.src  = (scope.srcField  != undefined) ? scope.srcField : '';
          executeEffects();
        });
            
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
