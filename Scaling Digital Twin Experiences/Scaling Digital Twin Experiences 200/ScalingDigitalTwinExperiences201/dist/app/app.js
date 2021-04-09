(function(){
  window.twx = window.twx || {};

  var requires = ["ionic","twx.byoc"];
  var twxViewControllersModule = angular.module('twxViewControllers', requires);
  twxViewControllersModule.run(function($templateCache) {
    //Inject an ng-if for preview cases where the web-assembly module needs time to load & compile async.
    //Delays loading model-items until its ready and the model tags are processed.
    
      var viewHTML =  '<ion-view hasGridEvenRows="false" view-type="ar" twx-view="Home" view-title="Home" ctrl-name="Home_TwxViewController" can-swipe-back="false"><div class="overlay ng-hide" ng-show=""></div><ion-content scroll="false" ><twx-widget widget-id="view-1" original-widget="twx-view" widget-name="view-1"><twx-widget-property name="widgetName" datatype="string" value="view-1"></twx-widget-property><twx-widget-property name="viewtype" datatype="string" value="ar"></twx-widget-property><twx-widget-property name="class" datatype="string"></twx-widget-property><twx-widget-content><twx-container-content class="{{me.class}}"><twx-widget widget-id="3DContainer-1" original-widget="twx-dt-view" widget-name="3D Container"><twx-widget-service name="unlockCameraAndOrientation"></twx-widget-service><twx-widget-service name="lockCameraAndOrientation"></twx-widget-service><twx-widget-property name="widgetName" datatype="string" value="3D Container"></twx-widget-property><twx-widget-property name="far" datatype="number" value="200"></twx-widget-property><twx-widget-property name="near" datatype="number" value="0.01"></twx-widget-property><twx-widget-property name="dropshadow" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="enabletrackingevents" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="camera" datatype="json" value="{}"></twx-widget-property><twx-widget-property name="persistmap" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="src" datatype="string" value="TW-VuMark.xml"></twx-widget-property><twx-widget-property name="extendedtracking" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="visible" datatype="boolean" value="true"></twx-widget-property><twx-widget-content><twx-dt-view near="0.01" far="200" extendedtracking="true" persistmap="false" dropshadow="{{me.dropshadow}}">\n'+
'     <twx-dt-tracker id="tracker1" enabletrackingevents="false">\n'+
'        <twx-container-content>\n'+
'           <div class="targetGuide" ng-class="targetGuideClass" ng-hide="hideTargetGuide">\n'+
'               <div class="bracket-top-left"></div>\n'+
'               <div class="bracket-top-right"></div>\n'+
'               <div class="bracket-bottom-right"></div>\n'+
'               <div class="bracket-bottom-left"></div>\n'+
'               <div class="targetGuideText hint" ng-hide="hideTargetGuide">{{targetGuideHint}}</div>\n'+
'           </div>\n'+
'        <twx-widget widget-id="spatialTarget-1" original-widget="twx-dt-target-spatial" widget-name="spatialTarget-1"><twx-widget-service name="resetGesture"></twx-widget-service><twx-widget-property name="widgetName" datatype="string" value="spatialTarget-1"></twx-widget-property><twx-widget-property name="enablescalegesture" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="enablerotategesture" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="enabletranslategesture" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="istracked" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="url" datatype=""></twx-widget-property><twx-widget-property name="placeholder_img" datatype="" value="/extensions/images/placeholder_spatial.svg"></twx-widget-property><twx-widget-property name="rz" datatype="number" value="0"></twx-widget-property><twx-widget-property name="ry" datatype="number" value="0"></twx-widget-property><twx-widget-property name="rx" datatype="number" value="-90"></twx-widget-property><twx-widget-property name="z" datatype="number" value="0"></twx-widget-property><twx-widget-property name="y" datatype="number" value="0"></twx-widget-property><twx-widget-property name="x" datatype="number" value="0"></twx-widget-property><twx-widget-content><twx-dt-target id="spatialTarget-1" x="{{me.x}}" y="{{me.y}}" z="{{me.z}}" rx="{{me.rx}}" ry="{{me.ry}}" rz="{{me.rz}}" src="spatial://" istracked="{{me.istracked}}" enabletranslategesture="{{me.enabletranslategesture}}" enablerotategesture="{{me.enablerotategesture}}" enablescalegesture="{{me.enablescalegesture}}"></twx-dt-target></twx-widget-content></twx-widget><twx-widget widget-id="quadcopter" original-widget="twx-dt-model" widget-name="quadcopter"><twx-widget-service name="stop"></twx-widget-service><twx-widget-service name="rewind"></twx-widget-service><twx-widget-service name="reset"></twx-widget-service><twx-widget-service name="playAll"></twx-widget-service><twx-widget-service name="play"></twx-widget-service><twx-widget-service name="forward"></twx-widget-service><twx-widget-property name="widgetName" datatype="string" value="quadcopter"></twx-widget-property><twx-widget-property name="sequencePartIds" datatype="string"></twx-widget-property><twx-widget-property name="playing" datatype="boolean"></twx-widget-property><twx-widget-property name="stepDescription" datatype="string"></twx-widget-property><twx-widget-property name="stepName" datatype="string"></twx-widget-property><twx-widget-property name="currentStep" datatype="number"></twx-widget-property><twx-widget-property name="steps" datatype="number"></twx-widget-property><twx-widget-property name="showSequenceInCanvas" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="sequence" datatype="resource_url" value=""></twx-widget-property><twx-widget-property name="sequenceList" datatype="infotable"></twx-widget-property><twx-widget-property name="shader" datatype="string" value=""></twx-widget-property><twx-widget-property name="translucent" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="opacity" datatype="number" value="1"></twx-widget-property><twx-widget-property name="decal" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="occlude" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="forceHidden" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="visible" datatype="boolean" value="true"></twx-widget-property><twx-widget-property name="rz" datatype="number" value="0.00"></twx-widget-property><twx-widget-property name="ry" datatype="number" value="0.00"></twx-widget-property><twx-widget-property name="rx" datatype="number" value="0.00"></twx-widget-property><twx-widget-property name="z" datatype="number" value="0.0000"></twx-widget-property><twx-widget-property name="y" datatype="number" value="0.05"></twx-widget-property><twx-widget-property name="x" datatype="number" value="0.0000"></twx-widget-property><twx-widget-property name="scale" datatype="string" value="1.0000"></twx-widget-property><twx-widget-property name="src" datatype="resource_url" value=""></twx-widget-property><twx-widget-content><twx-dt-model id="quadcopter" ng-src="{{me.src | trustUrl}}" src="" sx="{{me.scale.split(&apos; &apos;)[0] || me.scale}}" sy="{{me.scale.split(&apos; &apos;)[1] || me.scale}}" sz="{{me.scale.split(&apos; &apos;)[2] || me.scale}}" x="{{me.x}}" y="{{me.y}}" z="{{me.z}}" rx="{{me.rx}}" ry="{{me.ry}}" rz="{{me.rz}}" hidden="{{!app.fn.isTrue(me.visible)}}" force-hidden="{{me.forceHidden}}" occlude="{{me.occlude}}" decal="{{me.decal}}" opacity="{{me.opacity}}" phantom="{{!me.translucent}}" shader="{{me.shader}}" sequencelist="{{me.sequenceList}}" sequence="{{me.sequence}}" showsequenceincanvas="{{me.showSequenceInCanvas}}" steps="{{me.steps}}" currentstep="{{me.currentStep}}" stepname="{{me.stepName}}" stepdescription="{{me.stepDescription}}" playing="{{me.playing}}" sequencepartids="{{me.sequencePartIds}}"><twx-container-content></twx-container-content></twx-dt-model></twx-widget-content><twx-databind databind-id="db-1617983016512" source-type="data" source-name="model" source-item-type="value" source-item-name="model" binding-type="custom_field" from-expression="app.params[&apos;model&apos;]" to-property="src"><twx-data-filter filter-id="df-1617983083896" filter-body="return &apos;app/resources/Uploaded/quadcopterDT&apos;+value+&apos;.pvz&apos;"></twx-data-filter></twx-databind></twx-widget></twx-container-content>\n'+
'     </twx-dt-tracker>\n'+
'</twx-dt-view></twx-widget-content></twx-widget><twx-widget widget-id="2DOverlay-1" original-widget="twx-overlay" widget-name="2D Overlay"><twx-widget-property name="widgetName" datatype="string" value="2D Overlay"></twx-widget-property><twx-widget-property name="class" datatype="string"></twx-widget-property><twx-widget-property name="visible" datatype="boolean" value="true"></twx-widget-property><twx-widget-content><div class="twx-2d-overlay {{me.class}}" ng-show="app.fn.isTrue(me.visible)"><twx-container-content><div class="panel undefined top" style=" "></div><div class="panel body undefined"><div class="panel undefined left" style=" "></div><div class="panel undefined center" style=" "></div><div class="panel undefined right" style=" "></div></div><div class="panel undefined bottom" style=" "><twx-widget widget-id="gridLayout-1" original-widget="twx-gridlayout" widget-name="gridLayout-1"><twx-widget-property name="widgetName" datatype="string" value="gridLayout-1"></twx-widget-property><twx-widget-property name="evenlyspacedrows" datatype="boolean" value="false"></twx-widget-property><twx-widget-property name="margin" datatype="string" value=""></twx-widget-property><twx-widget-property name="class" datatype="string"></twx-widget-property><twx-widget-property name="visible" datatype="boolean" value="true"></twx-widget-property><twx-widget-content><div ng-show="app.fn.isTrue(me.visible)" even-rows="false" class="gridLayout {{me.class}}" style="padding:;"><twx-container-content><div class="row undefined" style=""><div class="col undefined" style="flex-direction:column;justify-content: flex-start;align-items: flex-end;padding: 0px;flex-wrap: wrap;"></div></div></twx-container-content></div></twx-widget-content></twx-widget></div></twx-container-content></div></twx-widget-content></twx-widget></twx-container-content></twx-widget-content><twx-fragment-parameters></twx-fragment-parameters><twx-view-data></twx-view-data></twx-widget></ion-content></ion-view>\n';
      if (twx.app.isPreview() && viewHTML.indexOf('view-type="ar"') > 0) {
        viewHTML = viewHTML.replace(/<twx-dt-modelitem /ig, '<twx-dt-modelitem ng-if="$root.thingViewReady !== false" ');
      }
      $templateCache.put('app/components/Home.html', viewHTML);
    

    
  });

  

  twxViewControllersModule.controller('Home_TwxViewController',
      function ($scope, $element, $attrs, $timeout, $interval, $http, $ionicPopup, $ionicPopover, $stateParams, $location, $rootScope, tml3dRenderer, $injector, $sce) {
    $scope.app = twx.appScope;
    $scope.device = twx.device;
    $scope.view = {
        mdl: {
            custom: {}
        },
        wdg: {},
        fn: {},
        evt: {},
        prm: {},
        view: {}
    };

    var myWidgets = '';
    var activeWidgetEvents = {};
    var customWidgetEventListeners = [];

    if( $attrs['twxView'] !== undefined && $attrs['twxView'].length > 0 ) {
        $scope.app.view = $scope.app.view || {};
        $scope.app.view[$attrs['twxView']] = $scope.view;
    }

    this.setProperty = function(widgetProperty,value) {
        $scope.view.wdg[$attrs.widgetId][widgetProperty] = value;

    };

    this.addWidget = function(widgetScope,widgetElem,widgetAttrs) {
        var widgetId = widgetAttrs['widgetId'] || widgetAttrs['model'];
        var x = $scope;
        $scope.view.wdg = $scope.view.wdg || {};
        $scope.view.wdg[widgetId] = widgetScope[widgetId];
        myWidgets += '|' + widgetId;
        widgetScope['_widgetId'] = widgetId;
        //console.log('twxView --- adding widget "' + widgetId + '" to view - total widgets: ' + myWidgets);
    };

    $scope.getWidgetScope = function(widgetId){
      return $scope.view.wdg[widgetId];
    };

    $scope.getWidgetProp = function (widgetId, prop) {
      return $scope.view.wdg[widgetId] ? $scope.view.wdg[widgetId][prop] : undefined;
    };

    $scope.setWidgetProp = function (widgetId, prop, val) {
      if ($scope.view.wdg[widgetId]) {
        $scope.view.wdg[widgetId][prop] = val;
      }
    };

    $scope.addWidgetEventListener = function (widgetId, widgetEvent, callback) {
      customWidgetEventListeners.push({
        widgetId: widgetId,
        widgetEvent: widgetEvent,
        callback: callback
      });
      if (!activeWidgetEvents[widgetEvent]) {
        activeWidgetEvents[widgetEvent] = true;
        $scope.$on(widgetEvent, function (event, args) {
          _.each(customWidgetEventListeners, function (listenerInfo) {
            if (listenerInfo.widgetId == event.targetScope.widgetId && listenerInfo.widgetEvent == event.name) {
              listenerInfo.callback();
            }
          });
        });
      }
    };

    $scope.pulse = 1.0;

    $scope.tracerWidth = 0.0;
    $scope.tracerHeight = 0.0;
    $scope.tracerDimensions = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    $scope.loadingPromise = null;
    $scope.modelLoaded = $element.find('twx-dt-model').length === 0;
    var modelCount = $element.find('twx-dt-model').length;
    var modelLoadedCount = 0;
    var targets = $element.find('twx-dt-target');

    // hide the target guide initially until the actual image to use is known.
    $scope.hideTargetGuide = true;

    function setImageTrackerTracerDimensions(src) {
      let image = new Image();
      image.onload = () => {
        $scope.tracerWidth = image.width;
        $scope.tracerHeight = image.height;
        $scope.$apply();
      };

      image.src = src;
    }

    var setGuideImageData = function() {
      if (targets[0]) { // assume one target only
        var src = targets[0].getAttribute("src");

        if (src.startsWith("vuforia-vumark://")) {
          $scope.hideTargetGuide = false;
          $scope.targetGuideClass = "thingmark";
          $scope.targetGuideHint = "Point camera at ThingMark";
        } else if (src.startsWith('vuforia-image://')) {
          $scope.hideTargetGuide = false;
          $scope.targetGuideClass = "imageTarget";
          $scope.targetGuideHint = 'Point camera at image';
          setImageTrackerTracerDimensions(targets[0].getAttribute("guide-src"));
        } else if (!src.startsWith("spatial://")) {
          $scope.hideTargetGuide = false;
          var targetGuideDiv = $element[0].querySelector("div.targetGuide");
          var guideSrc = targets[0].getAttribute("guide-src");
          if (targetGuideDiv && guideSrc) {
            $scope.targetGuideClass = "imagemark";
            targetGuideDiv.style.backgroundImage = "url('" + guideSrc + "')";
          }
        }
      }
    };

    $scope.$applyAsync(function() {
      // This has to be invoked asynchronously now to give angular time to digest and interpolate the value of
      // guide-src="{{ ... }}" to the real value.
      setGuideImageData();
    });

    $scope.$on('trackingacquired', function (evt, arg) {
      tml3dRenderer.getTracked(function(trackedObjects) {
        $scope.startLoadingIndicatorIfNeeded(trackedObjects);
        $scope.applyTargetGuideIfNeeded(trackedObjects);
      });
    });

    $scope.$on('trackinglost', function (evt, arg) {
      tml3dRenderer.getTracked(function(trackedObjects) {
        $scope.applyTargetGuideIfNeeded(trackedObjects);
      });
    });

    $scope.$on('modelLoaded', function (evt, arg) {
      modelLoadedCount++;
      $scope.modelLoaded = true;

      tml3dRenderer.getTracked(function(trackedObjects) {
        $scope.applyTargetGuideIfNeeded(trackedObjects);
      });
    });

    // starts the 'spinner' animation around the thing code while the model is loading
    $scope.startLoadingIndicatorIfNeeded = function (trackedObjects) {
      if (!twx.app.fn.isCompatibleObjectsTracked(trackedObjects, targets)) {
        return;
      }

      // Start animation if this is first successful call to startLoadingIndicatorIfNeeded.
      var spinnerInterval = 0.03;
      if ($scope.pulse === 1.0 && $scope.loadingPromise === null) {
        $scope.loadingPromise = $interval(function () {
          // stop the animation after it makes one complete loop around
          if($scope.pulse <= 0) {
            // stop the animation
            $interval.cancel($scope.loadingPromise);
            $scope.loadingPromise = null;
            $scope.pulse = 0;
          }
          $scope.pulse -= spinnerInterval;
        }, 100);
      }
    };

    /**
     * @param trackedObjects [Elements]
     */
    $scope.applyTargetGuideIfNeeded = function(trackedObjects) {
      var hideTargetGuide = twx.app.fn.computeHideTargetGuide(trackedObjects, targets, modelLoadedCount, modelCount);

      $scope.$apply(function () {
        $scope.hideTargetGuide = hideTargetGuide;
      });
    };

    (function($scope, $element, $attrs, $timeout){

      // $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicpopup services are available

//
// object to hold color possibilities in RGBA format
var colorPalette = {
  'red'    : 'rgba(255,0,0,1);',
  'green'  : 'rgba(0,255,0,1);',
  'blue'   : 'rgba(0,0,255,1);',
  'yellow' : 'rgba(255,255,0,1);',
  'purple' : 'rgba(255,0,255,1);',
  'cyan'   : 'rgba(0,255,255,1);',
  'white'  : 'rgba(245,245,245,1);',
  'black'  : 'rgba(10,10,10,1);'
}

//
// function for setting the color based on the color app parameter
$scope.setColor = function (model) {
 
  //
  // if color is defined, set color
  // check if there is a part that can have its color changed
  if ($scope.app.params.color != undefined) {
    
    var paintColor = colorPalette[$scope.app.params.color];
    if (paintColor != undefined)
      PTC.Metadata.fromId('quadcopter')
    			  .then((metadata) => {
        //
        // create variable named toPaint to become an array of ID paths that fit the input text
        // "like" will look for a partial text match to what is typed in. use 'same' to get an exact match
        var toPaint = metadata.find('painted').like('true').getSelected();
        
        //
        // if statement for determining parts that have the painted attribute and setting their color using the tml 3d renderer
        if (toPaint != undefined && toPaint.length > 0 ) {
          
          toPaint.forEach(function(p) {
            
            tml3dRenderer.setColor(model+ '-' +p,paintColor);
            
          }) // for each end
          
        } // if statement end
        
      }) //.then end
    
    //
    // catch statement for if this operation fails
    .catch((err) => { console.log("metadata extraction failed with reason : " + err) })
    
  } // end of if statement for paintColor
  
} // end of setColor function

//modelLoaded event listener triggers when the model has completed loading
$scope.$on('modelLoaded', function (event,model) {
  
  //
  // call setColor function to change the color of the model
  $scope.setColor(model)
  
}) // modelloaded end




    }($scope, $element, $attrs, $timeout))

  });

  

  var moduleDependencies = ['ionic', 'ngCordova', 'vuforia-angular', 'com.thingworx.services', 'twxRuntime'];
  var app = angular.module('app', moduleDependencies);
    twx = twx || {};
    twx.appXXX = app;

  app.config(function(DataConnectorConfigProvider, $ionicConfigProvider) {
    //Configured TWX server
    app.twxRoot = "/Thingworx";

    // Get this from application config later
    DataConnectorConfigProvider.addDataProvider({
        name: 'ThingworxConnector',
        urlRoot: app.twxRoot
    });

    $ionicConfigProvider.views.swipeBackEnabled(false);
  });

  // filter to allow remote resources (images, models, etc.) to be loaded
  app.filter('trustUrl', function($sce) {
      return function(url) {
          return $sce.trustAsResourceUrl(url);
      };
  });

  app.controller('AppCtrl', function ($scope, $rootScope, $state, $stateParams, $ionicModal, $location, $http, $injector, $templateCache) {
      var appScope = this;
      twx.appScope = this;
      var locationParams = {};
      // replace any occurrences of unreplaced URL params (i.e. {{foo:bar}}) with an empty string - DT-18867
      for(var entry of (new URLSearchParams(location.search.replace(/{{[a-zA-Z]*:[a-zA-Z]*}}/g, ''))).entries()) {
        locationParams[entry[0]] = entry[1];
      }
      twx.app.params = angular.extend(twx.app.params, $stateParams, locationParams);
      $scope.app.params = angular.extend({}, twx.app.params);
      appScope.params = twx.app.params;
      appScope.fn = twx.app.fn;
      appScope.mdl = twx.app.mdl;
      appScope.evt = twx.app.evt;

      twx.device.mdl['CurrentDevice'] = {
            svc: {
              'getCameraPictureURL': {}
            }
          };

      appScope.camera = {};
      appScope.camera.lastPictureData = "";
      appScope.camera.getPictureData = function(){
        var options = {
          destinationType: Camera.DestinationType.DATA_URL,
          sourceType: Camera.PictureSourceType.CAMERA
        };
        var $cordovaCamera = $injector.get('$cordovaCamera');
        $cordovaCamera.getPicture(options).then(function (imageData) {
          appScope.camera.lastPictureData = imageData;
        }, function (err) {
          console.error('Error getting camera.', err);
        });
      };

      appScope.camera.getPictureURL = function(){
        var options = {
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: Camera.PictureSourceType.CAMERA
        };
        var $cordovaCamera = $injector.get('$cordovaCamera');
        $cordovaCamera.getPicture(options).then(function (imageURI) {
          appScope.camera.lastPictureURL = imageURI;
          twx.device.mdl['CurrentDevice'].svc['getCameraPictureURL'].data = imageURI;
        }, function (err) {
          console.error('Error getting camera picture.', err);
        });
      };

      $scope.$on('device.mdl.CurrentDevice.svc.getCameraPictureURL', function () {
            appScope.camera.getPictureURL();
        });

      $scope.$on('app-fn-navigate',function(e,data) {
        twx.app.fn.navigate(data['viewname']);
      });

      if($rootScope.enableVoiceCommands && twx.app.isPreview()) {
        $rootScope.$on('$ionicView.afterEnter', function(event, toState, toParams, fromState, fromParams) {
          // get the app events each time the view changes to ensure we're displaying the "triggerable" app events for the current view
          $scope.appEvents = twx.app.getAppEventsWithHandlers();
        });
       }

      $scope.showModal = function(view){

        var modalContents = '';
        var modalUrl = 'app/components/' + view + '.html';
        $http.get(modalUrl).then(function(response) {
          modalContents = response.data;
          var modalTransformedContents = modalContents.replace('ion-view','ion-modal-view');
          $scope.modal = $ionicModal.fromTemplate(modalTransformedContents, {
            scope: $scope,
            animation: 'slide-in-up'
          });
          $scope.modal.show();
          $scope.$broadcast('show-modal');
        });

      };

      $scope.hideModal = function(){
        $scope.modal.hide();
        $scope.modal.remove();
      };

      $scope.$on('app-fn-show-modal',function(e,data) {
        // DT-18461 modalIsActive helps us to add particular listener in twxWidget controller (in runtime)
        $scope.modalIsActive = true;
        $scope.showModal(data['viewname']);
      });

      $scope.$on('app-fn-hide-modal',function(e,data) {
        delete $scope.modalIsActive;
        $scope.hideModal();
      });

      appScope.acceleration = {};
      appScope.location = {};
      appScope.location.getCurrentLocation = function(){
        var posOptions = {timeout: 10000, enableHighAccuracy: false};
        var $cordovaGeolocation = $injector.get('$cordovaGeolocation');
        $cordovaGeolocation
          .getCurrentPosition(posOptions)
          .then(function (position) {
            var lat  = position.coords.latitude;
            var long = position.coords.longitude;
            appScope.location.lastLocation = { latitude: lat, longitude: long };
          }, function(err) {
            console.error("Error getting current position", err);
          });
      };
      appScope.location.lastLocation = {
        latitude: 40.056545,
        longitude: -99.672037
      };

      if($rootScope.enableVoiceCommands) {
        // add the speech service to the app scope when there are voice alias'd app events
        appScope.speech = $injector.get('appSpeechService');
        if(twx.app.isPreview()) {
            // in preview for eyewear projects, we'll wrap the calls to app.speech.synthesizeSpeech so we can display the text in the snackbar
            appScope.speech.synthesizeSpeech = _.wrap(appScope.speech.synthesizeSpeech, function(func, info) {
              twx.app.fn.addSnackbarMessage(info.text, 'voice-response');
              return func(info);
            });
        }
      }

      twx.device.camera = appScope.camera;
      twx.device.location = appScope.location;
      twx.device.acceleration = appScope.acceleration;
      appScope.listCanSwipe = true;
    });

  app.controller('AppsMenuCtrl', function ($scope, $timeout, $http, $ionicSideMenuDelegate, $location, $ionicHistory) {
      $scope.isCordovaApp = window.cordova === undefined ? false : true;
      if( !($scope.isCordovaApp) ) {
        $scope.hasBackView = function () {
           return ($ionicHistory.backView() != null);
        };
      }
      else {
        //DT-12925: Disable swipe gesture to show the menu when the spatial target is in view
        $scope.$on('$ionicView.afterEnter', function() {
          $timeout(function() {
            $ionicSideMenuDelegate.canDragContent(document.querySelectorAll('[original-widget="twx-dt-target-spatial"]').length === 0);
          }, 10); //Just after other listeners still removing the old view widgets
        });
      }

      $scope.toggleLeftMenu = function () {
        $ionicSideMenuDelegate.toggleLeft();
      };

      $scope.navigateFromLeftMenu = function (path) {
        $location.path(path);
        $ionicSideMenuDelegate.toggleLeft();
      };

      $scope.$watch(function(){
          return $ionicSideMenuDelegate.getOpenRatio();
      }, function(newValue, oldValue) {
          $scope.hideLeftMenu = !$ionicSideMenuDelegate.isOpenLeft();
      });
    });

  app.controller('BaseCtrl', function ($scope, $parse, $location, $state, $ionicPopup, $timeout, $injector) {
    $scope['twInvokeAction'] = function(name){
      if (this['twActions'] && this['twActions'][name]){
        var action = this['twActions'][name];
        var fn = $parse(action.do, /* interceptorFn */ null, /* expensiveChecks */ true);
        fn(action.scope);
      } else {
        console.log('Action "' + name + '" not found');
      }
    };

    $scope._setCurrentAndNavigate = function(items, item, target){
      items.Current = item;
      $scope.navigate(target);
    };

    $scope.showConfirmPopup = function (title, subtitle, confirmEventId, confirmView) {
      var confirmPopup = $ionicPopup.confirm({
        title: title,
        template: subtitle
      });
      confirmPopup.then(function (res) {
        if (res) {
          $scope.$emit(confirmEventId);
          if (confirmView !== '') {
            $scope.navigateOnTimeout(confirmView);
          }
        }
      });
    };

    $scope.navigateOnTimeout = function(target){
      $timeout(function () {
        $scope.navigate(target);
      }, 300);
    };

    $scope.$on('$stateChangeStart',function() {
      try {
        var vuforiaCleanup = $injector.get('vuforiaCleanup');
        if (vuforiaCleanup) {
          vuforiaCleanup.requestCleanupAndPause();
        }
      } catch(e) {console.log(e);}
    });

    $scope.navigate = function(target){
      $state.go(target);
    };
  });

}(window, document, angular));

/**
 * Adds a description meta tag for each supported language.  If the meta tag already exists, it will update the contents.
 */
function appendDescriptionMetaData(descriptionObj) {
  descriptionObj = descriptionObj || {};
  var head = document.querySelector('head');

  // append a 'description' meta tag for each supported language
  Object.keys(descriptionObj).forEach(function(lang) {
    var meta = document.querySelector('meta[name="description"][lang="' + lang + '"]');
    if(!meta) {
      meta = document.createElement('meta');
      meta.name = "description";
      meta.lang = lang;
      meta.content = descriptionObj[lang];

      // add the meta tag to the document's head element
      head.appendChild(meta);
    } else {
      // update the meta tag value
      meta.content = descriptionObj[lang];
    }
  });
};

/**
 *  initialize the mobile app/experience title and populate the params in the window.twx.app.params object.
 */
function updateTitleWithExpTitle() {
  var defaultParams = {"vumark":{"id":"vumark","isbound":"false","isdeletable":"false","name":"ThingMark","value":""},"template":{"id":"template","isbound":"false","isdeletable":"false","name":"Thing Template","value":""},"thing":{"id":"thing","isbound":"false","isdeletable":"false","name":"Thing","value":""},"color":{"id":"color","isbound":"false","isdeletable":"true","name":"color","value":"purple"},"model":{"id":"model","isbound":"false","isdeletable":"true","name":"model","value":"2"}};

  Object.keys(defaultParams).forEach(function(key) {
    if (defaultParams[key].value) {
      window.twx.app.params[key] = defaultParams[key].value;
    }
  });

  // get the index of the experience being loaded, default to the first view if the 'expIndex' is not passed on the URL

  var urlParams = new URLSearchParams(location.search);
  var title = '';
  var descriptionObj = {};
  if (urlParams.has('expIndex')) {
    //Old bookmarks will come through here, may not be correct if experiences have been redone in a different order
    var expIdx = parseInt(twx.app.fn.getParameterByName('expIndex', location.href) || '0', 10);
    title = experienceInfo.getTitleByIndex(expIdx);
    descriptionObj = experienceInfo.getDescription(expIdx);
  }
  else if (urlParams.has('expId')) {
    //expId could still be old/stale if experiences have been all deleted and redone
    var exp = experienceInfo.findExperienceById(parseFloat(urlParams.get('expId')));
    title = experienceInfo.getTitle(exp);
    descriptionObj = exp.description;
  }
  else {
    title = experienceInfo.getTitleByIndex(0);
    descriptionObj = experienceInfo.getDescription(0);
    if (!title) {
      title = urlParams.get('project');
    }
  }

  // set the page title as the name of the loaded experience
  document.title = title;

  appendDescriptionMetaData(descriptionObj);
}

var experienceInfo = new twx.app.ExperienceInfo({"name":"","version":"1.0.0","requires":["w320dp","spatial-tracking"],"experiences":[{"vumark":"","experienceType":"none","id":1,"index-keys":[],"title":{"en":"ScalingDigitalTwinExperiences201"},"description":{"en":"","en-US":""},"requires":["AR-tracking"],"tags":[],"icon":"","viewName":"Home","url-template":"index.html?expId=1","entryPoint":"index.html?expId=1","thumbnail":"","thingTemplateName":""}],"widgetsUsage":[{"timestamp":"2021-02-24T20:28:59.916Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T15:47:49.976Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:08:10.090Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:09:45.327Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:09:57.970Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:10:00.049Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:10:18.472Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:10:41.957Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:10:54.724Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:11:05.490Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:11:32.698Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:13:27.256Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:13:45.005Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:14:53.987Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:14:55.983Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:15:34.948Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:34:12.298Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:40:00.215Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:41:42.399Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:41:46.130Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:42:09.113Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:43:17.214Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:43:44.820Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:44:11.459Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:44:13.421Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:44:52.370Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:45:01.901Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:45:08.463Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1}},{"timestamp":"2021-02-25T16:47:24.603Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-25T16:48:00.041Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-25T16:48:04.622Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-25T16:53:34.232Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-25T21:30:53.288Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T18:17:00.697Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T18:17:04.328Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T18:17:49.358Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T18:18:06.670Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:18:33.520Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:31:06.642Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:31:28.975Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:32:12.567Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:39:56.486Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:40:05.740Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:42:35.995Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:42:43.846Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:47:56.505Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:52:30.826Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:52:36.961Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:53:06.611Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:53:10.766Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T19:53:27.219Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T20:22:30.764Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T20:24:33.452Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-02-26T20:38:53.620Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-03-01T15:57:15.481Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-03-01T15:57:17.550Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-tml-text":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1,"twx-button":1}},{"timestamp":"2021-03-02T16:08:45.376Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-02T16:09:47.617Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-02T16:09:54.330Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-02T16:10:05.215Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-02T16:10:21.679Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-02T16:13:37.471Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-16T12:49:05.397Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-03-17T18:46:25.059Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T12:48:22.312Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:54:21.366Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:54:49.193Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:55:00.837Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:55:21.151Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:55:31.707Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:55:45.673Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:56:01.747Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T13:56:35.607Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:32:17.697Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:38:19.440Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:44:22.220Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:44:27.034Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:44:45.895Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:46:00.877Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:46:50.221Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:47:16.854Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}},{"timestamp":"2021-04-09T15:47:31.126Z","action":"SAVE","usage":{"twx-view":1,"twx-dt-view":1,"twx-dt-target-spatial":1,"twx-dt-model":1,"twx-overlay":1,"twx-overlay-container":5,"twx-overlay-body":1,"twx-gridlayout":1,"twx-row":1,"twx-col":1}}],"accessType":"private","designedfor":[]});
