if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
    module.exports = 'seeinside-ng';
}
(function() {
        'use strict';
        var seeinsideModule = angular.module('seeinside-ng', []);
        seeinsideModule.directive('ngSeeinside', ['$interval','$http', '$timeout', ngSeeInside]);

        function ngSeeInside($interval, $http, $timeout) {
            return {
                restrict: 'EA',
                scope: {
                    inner         : '@',
                    outer         : '@',
                    isholoField   : '@',
                    colorField    : '@',
                    nearfadeField : '@',
                    farfadeField  : '@',
                    xrayField     : '@',
                    physicaldigitalField: '@',
                    ambientField  : '@',
                    attenuateField: '@',
                    disableField  : '@'
                },
                template: '<div></div>',
                link: function(scope, element, attr) {
                    var lastUpdated = 'unknown';
                    scope.data = { 
                        inner          : [],
                        outer          : [],
                        disable        : false,
                        physicaldigital: true,
                        xray           : false,
                        capture        : {}
                    };
                    function isbool(v) {
                        return (v==='true')||v===true;
                    }
                    function xrayshader(params) {
                        var isholo = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
                        var shader = isholo?"xray2hl"+params : "xray2gl"+params;
                        return shader;
                    }
                    function desatshader() {
                        var isholo = !twx.app.isPreview() && (scope.isholoField != undefined) ? isbool(scope.isholoField) : false;
                        var shader = isholo?"desaturatedhl" : "desaturatedgl";
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
                        scope.data.capture[b] = { shader: wdg.shader, 
                                                 visible: wdg.visible, 
                                                 opacity: wdg.opacity, 
                                                   decal: wdg.decal };
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
                        
                        function dohide(b) {
                          if(scope.$parent.view.wdg[b]!=undefined) {
                            scope.$parent.view.wdg[b].visible = reset;
                          }
                        }
                        function dodefault(b) {
                          if(scope.$parent.view.wdg[b]!=undefined) {
                            var wdg     = scope.$parent.view.wdg[b];
                            wdg.shader  = "Default";
                            wdg.decal   = "false";
                            wdg.opacity = 1.0;
                            wdg.visible = true;
                          }
                        }
                        function dotranslucent(b) {
                          if(reset) dodefault(b);  
                          if(scope.$parent.view.wdg[b]!=undefined) {
                            var wdg     = scope.$parent.view.wdg[b];
                            wdg.shader  = "Default";
                            wdg.decal   = "false";
                            wdg.opacity = 0.8;
                            wdg.visible = true;
                          }
                        }
                        function dodesaturate(b) {
                          if(reset) dodefault(b);  
                          else if(scope.$parent.view.wdg[b]!=undefined) {
                            var wdg     = scope.$parent.view.wdg[b];
                            wdg.visible = "true" ;
                            wdg.shader  = desatshader();
                            wdg.decal   = false;
                            wdg.opacity = 0.35 * (1 - scope.attenuateField);
                          }
                        }
                        function doxray(b) {
                          if(reset) dodefault(b);  
                          else if(scope.$parent.view.wdg[b]!=undefined) {
                            var clrs     = scope.colorField.substring(1, scope.colorField.length - 1);
                            var farfade  = scope.farfadeField;
                            var nearfade = scope.nearfadeField;
                            var shd = xrayshader(";r f " + clrs[0] + ";g f " + clrs[2] + ";b f " + clrs[4] + ";farFade f " + farfade + ";nearFade f " + nearfade + ";ambient f " + scope.ambientField + ";attenuate f " + scope.attenuateField + "");
                            
                            var wdg     = scope.$parent.view.wdg[b];
                            wdg.shader  = shd;
                            wdg.decal   = true;
                            wdg.opacity = 1;
                          }
                        }
                      
                        function apply(outerfn,innerfn) {
                          against(scope.data.outer, outerfn);
                          against(scope.data.inner, innerfn);
                        }
                    
                        // physical outer/digital inner //
                        //                              //
                        //                              //
                        //                              //
                        //////////////////////////////////   

                        if (scope.data.physicaldigital === true) {
                            ////means model is PHYSICAL: 
                            
                            if (scope.data.xray === false) {
                                
                                // Model physical and xray unchecked
                                apply(dohide,dotranslucent);

                            } else {
                                
                                // Model physical and xray checked
                                apply(dohide,doxray);
                                
                                //am not convinced that showing the desturated model ON TOP of the physical
                                //is really adding value - in fact, if alignment not good enough (hololens)
                                //it doesnt look so good
                                
                                //apply(dodesaturate,doxray);

                            }
                        }
                        
                        // digital outer/digital inner //
                        //                             //
                        //                             //
                        //                             //
                        /////////////////////////////////        

                        if (scope.data.physicaldigital === false) {
                            // means model is Digital 
                            
                            if (scope.data.xray === false) {
                                
                                // Model Digital and xray unchecked
                                apply(dodesaturate,dodefault);
                            
                            } else {
                                
                                // Model Digital and xray checked
                                apply(dodesaturate,doxray);
                            }
                        }

                    }
                    
                    //////////////////////////////////////////////////////////////////////////////////
                    //
                    // monitor inputs for any CHANGE in data
                    //
                    
                    if (scope.disableField == "false")
                        {updateEffects();}
                
                    
                    var executeEffects= function(){
                      if (scope.data.disable === false) $timeout(function () {
                        updateEffects();
                      }, 1);
                    };
                  
                    scope.$watch('disableField', function () {
                      scope.data.disable = (scope.disableField != undefined && scope.disableField === 'true') ? true :false ;
                      
                      if (scope.data.disable === true) {
                          
                        // reset the outer/inner lists to the original settings  
                        resetlist('inner');
                        resetlist('outer');
                        
                      } else {
                        
                        // recapture this (it may have changed, although binding should have caught that)
                        recordlist('outer');
                        recordlist('inner');
                        
                        // and re-apply
                        executeEffects();
                      }
                    });
                    
                    scope.$watch('physicaldigitalField', function () {
                      scope.data.physicaldigital = (scope.physicaldigitalField != undefined && scope.physicaldigitalField === 'true') ? true :false ;
                      executeEffects();
                    });
                    
                    scope.$watch('xrayField', function () {
                      scope.data.xray = (scope.xrayField != undefined && scope.xrayField === 'true') ? true :false ;
                      executeEffects();
                    });                   
                        
                    function processlist(list) {
                      if (scope[list] != undefined) {
                          
                        // when this field CHANGES,...
                          
                        // 1. undo/reset the previous values
                        resetlist(list);
                        
                        // 2. now read the new one, and capture settings
                        recordlist(list);
                        
                        // 3. finally, apply new settings to sanitised list
                        executeEffects();
                      }
                    }
                        
                    scope.$watch('inner', function () {
                                 
                      processlist('inner');
                  
                    });
                        
                    scope.$watch('outer', function () {
                                 
                      processlist('outer');
                  
                    });
                    
                }
                
                //
                   
                //
                
            };
        }
    }
    ());