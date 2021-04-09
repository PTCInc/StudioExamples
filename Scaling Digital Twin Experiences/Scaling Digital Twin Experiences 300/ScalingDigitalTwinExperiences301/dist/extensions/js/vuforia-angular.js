/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
var PTC = {};
(function() {
    var byocModule = angular.module('twx.byoc', []); // Forward declaration of the twx.byoc module, used by Studio, but not by View.
    var vuforiaModule = angular.module('vuforia-angular', ['twx.byoc']);

    vuforiaModule.factory('tml3dRenderer', function($window, $injector){
        if($window.cordova) { //assuming this means we are in the thing-browser
            return vuforia; //from vuforia.js
        } else {
            return $injector.get('threeJsTmlRenderer');
        }
    });

    vuforiaModule.config(function($sceDelegateProvider, $compileProvider) {
        var originalWhitelist = $sceDelegateProvider.resourceUrlWhitelist();
        $sceDelegateProvider.resourceUrlWhitelist(originalWhitelist.concat([
            // Allow same origin resource loads.
            'self',
            // allow vufora-* scheme
            'vuforia-vumark://**',
            'vuforia-image://**',
            'vuforia-object://**',
            'vuforia-model://**',
            'vuforia-cloud://**',
            'vuforia-user://**',
            // allow spatial-* scheme
            'spatial-anchor://**',
            'spatial://**'
        ]));
        // Original regular expression comes from ionic.bundle.js .config function
        // Added thingworxview, vuforiachalk, and vuforiaview, ms-appdata, ms-local-stream to be whitelisted
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|sms|tel|geo|ftp|mailto|file|ghttps?|ms-local-stream|ms-appdata|ms-appx-web|ms-appx|x-wmapp0|thingworxview|vuforiachalk|vuforiaview):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|content|blob|ms-appdata|ms-local-stream|ms-appx|ms-appx-web|x-wmapp0):|data:image\//);

    });

    vuforiaModule.controller('VuforiaController', ['$scope', function ($scope) {
    }]);

    vuforiaModule.factory('vuforiaErrorCodes', [ function() {
        return VF_ANG.errorCodes;
    }]);

    vuforiaModule.factory('vuforiaCleanup', ['tml3dRenderer', function(renderer) {
        var cleanupAndPauseRequested = false;

        var cleanUpAndPause = function() {
            // Manually clean up the javascript scene graph
            PTC.GLOBAL_SCENE = new PTC.ARScene();

            if (renderer && renderer.cleanUpAndPause) {
                // Tell the native side to clean up its scene graph and pause
                return new Promise(function(resolve, reject) {
                    renderer.cleanUpAndPause(resolve, reject);
                });
            } else {
                console.log("WARNING: cleanUpAndPause had no API to call");
                return Promise.resolve();
            }
        };

        var requestCleanupAndPause = function() {
            cleanupAndPauseRequested = true;
        };

        var cleanUpAndPauseIfRequested = function() {
            if (cleanupAndPauseRequested) {
                cleanupAndPauseRequested = false;
                return cleanUpAndPause();
            }
            return Promise.resolve();
        };

        var resetGestureTransforms = function() {
            if (renderer && typeof(renderer.resetGestureTransforms) === "function") {
                renderer.resetGestureTransforms();
            }
        };

        var resetSpatialTracking = function() {
            if (renderer && typeof(renderer.resetSpatialTracking) === "function") {
                renderer.resetSpatialTracking();
            }
        };

        return {
            cleanUpAndPause: cleanUpAndPause,
            requestCleanupAndPause: requestCleanupAndPause,
            cleanUpAndPauseIfRequested: cleanUpAndPauseIfRequested,
            resetGestureTransforms: resetGestureTransforms,
            resetSpatialTracking: resetSpatialTracking
        };
    }]);

    vuforiaModule.factory('appSpeechService', ['tml3dRenderer', function(renderer) {
        var generateErrorHandler = function(messagePrefix) {
            return function(errorInfo) {
                var message = errorInfo;

                if (errorInfo.message) {
                    message = errorInfo.message;
                }

                console.log(messagePrefix + message);
            };
        };

        /**
         * Add another constraint to the speech recognition system in the form of an SRGS grammar file
         *
         * @param {Object} params
         * @param {string} params.grammarURL - The URL to the grammar file. If a relative URL is specified, then it will be resolved relative to location.origin
         * @param {string} params.grammarTag - The tag to assign to the grammar file constraint. This must be unique.
         * @param {function} successCallback - Invoked after the grammar has been added to the recognizer
         * @param {function} errorCallback
         */
        var addGrammar = function(params, successCallback, failureCallback) {
            if (renderer && typeof(renderer.addSRGSSpeechRecognitionGrammar) === "function") {
                if (typeof (failureCallback) !== "function") {
                    failureCallback = generateErrorHandler("Adding speech grammar failed: ");
                }

                renderer.addSRGSSpeechRecognitionGrammar(params, successCallback, failureCallback);
            }
        };

        /**
         * Synthesize a string of text into audible speech
         *
         * @param {Object} params
         * @param {string} params.text - The text to synthesize into speech
         * @param {function} successCallback - Invoked after the speech has been completely synthesized
         * @param {function} errorCallback
         */
        var synthesizeSpeech = function(params, successCallback, failureCallback) {
            if (renderer && typeof(renderer.synthesizeSpeech) === "function") {
                if (typeof (failureCallback) !== "function") {
                    failureCallback = generateErrorHandler("Synthesizing speech failed: " );
                }

                renderer.synthesizeSpeech(params, successCallback, failureCallback);
            }
        };

        return {
            addGrammar: addGrammar,
            synthesizeSpeech: synthesizeSpeech
        };
    }]);

    vuforiaModule.directive('twxDtView', ['tml3dRenderer', '$rootScope', function (renderer, $rootScope) {
        var loadTrackerDefSuccessCallback = function (dataset, element) {
            try {
                document.body.style.backgroundColor = 'rgba(255,0,0,0)';

                // before we load the content, lets see if there are any shaders defined in <script> form
                gatherShaders(function(s, ts) {
                    renderer.setShader(s, ts.vertex, ts.fragment);
                });

                var cssApplyFunction = VF_ANG.applyStyles() || function() {};

                var enableTrackingEvents = false;

                dataset.trackers.forEach(function(tracker) {
                    var isPreview = window.thingworxview && window.thingworxview.configuration && window.thingworxview.configuration.platform === "preview";
                    if (!isPreview && tracker.targets.length === 0) {
                        return; // ignore a tracker without any target.
                    }
                    var successCallback = function() {
                        tracker.targets.forEach(function(target) {
                            target.addAsset(tracker);
                        });

                        VF_ANG.processTree(tracker, tracker.rootAssets.slice(), cssApplyFunction);

                        tracker.assetsLoaded = true;
                    };

                    var failureCallback = function(error) {
                        console.log("Error adding tracker: [" + tracker.name + "] due to [" + error + "]");

                        tracker.assetsLoaded = true;
                    };

                    enableTrackingEvents = enableTrackingEvents | tracker.enableTrackingEvents;

                    if (window.thingworxview &&
                        window.thingworxview.configuration &&
                        window.thingworxview.configuration.trackingHints === true) {
                        renderer.addTracker(
                            {
                                name: tracker.name,
                                enableTrackingEvents: tracker.enableTrackingEvents,
                                trackingHints: tracker.trackingHints
                            },
                            successCallback,
                            failureCallback
                        );
                    }
                    else {
                        renderer.addTracker(tracker.name,
                                            successCallback,
                                            failureCallback
                                           );
                    }
                });

                if (enableTrackingEvents) {
                    renderer.setupTrackingEventsCommand(function (trackerId, position, gaze, up) {
                        var trackerElement = element[0].querySelector("twx-dt-tracker[id='" + trackerId + "']");

                        if (trackerElement) {
                            var angularElement = angular.element(trackerElement);
                            var args = {
                                trackerElement: angularElement,
                                position: position,
                                gaze: gaze,
                                up: up
                            };
                            angularElement.scope().$emit('tracking', args);

                            // There is no need to pass trackerElement in HTML event since you can inspect event.target
                            // for that.
                            args = {
                                position: position,
                                gaze: gaze,
                                up: up
                            };
                            var event = new CustomEvent('tracking', { detail: args });
                            trackerElement.dispatchEvent(event);
                        }
                    }, undefined);
                }

                renderer.getTracked(function(trackedObjects) {
                    angular.forEach(trackedObjects, function(tracked) {
                        var elementToFireEventAgainst =
                            element[0].querySelector('twx-dt-target[src*="id=' + tracked + '"]') ||
                            element[0];
                        console.log("firing trackingacquired via $rootScope and domID [" + elementToFireEventAgainst.id + "] for target [" + tracked +"]");
                        $rootScope.$broadcast("trackingacquired", tracked, "twx-dt-target");
                        var evt = new CustomEvent("trackingacquired", {
                            detail: { targetName: tracked },
                            bubbles: true
                        });
                        elementToFireEventAgainst.dispatchEvent(evt);
                    });
                }, function() {
                    console.log('Failed getting tracked objects.');
                });
            } catch (err) {
                console.log(err);
                alert(err.message);
            }
        };

        function linkFunc( scope, element, attrs ) {
            setTimeout(VF_ANG.makeTransparent(element), 1000); // In case that a handcrafted experience hasn't made it transparent in the first place.
            /**
             * View's event handler to propagate any event fired from native side, such as 'trackingacquired', 'trackinglost', 'userpick', etc.
             * Preview also uses this handler for the 'userpick' event
             *
             * A custom DOM event is emitted on a target DOM element with 'targetName' property in its event data.
             * For 'trackingaquired' and 'trackinglost' event, the thing code or target name is 'targetName'.
             * For other events, 'targetName' is the target DOM element id.
             * In addition, an angular event is broadcasted on the $rootScope with 'evtName', 'targetName', 'targetType' and 'evtData',
             * where 'targetType' is either 'twx-dt-target' or null.
             *
             * @param {string} evtName event name such as 'trackingacquired'
             * @param {string} targetName - event target name. A value to look up in DOM for the DOM element to emit event on.
             * In case no DOM element is found by it, event will be emitted on the 'twx-dt-view' element.
             *      For trackingacquired/trackinglost events targetName could be thingmark such as '4:3'
             *      For other events the targetName is the dom element id such as 'model-1'
             * @param {string} targetType - target type such as 'twx-dt-target', 'twx-dt-model', '3DImage'
             *      For trackingacquired/trackinglost events targetType could be 'twx-dt-target'
             *      For userpick event it will be 'twx-dt-model' or '3DImage'
             *          - when target is a model, targetType is 'twx-dt-model', logic handles finding specific model item if any,
             *          - when target is a 3D image (including image of twx-dt-target), 3D gauge, or 3D label targetType is '3DImage'
             * @param {string} evtData - event data such as '{"occurrence": "0/1"}' when a model is clicked, may be undefined
             */
            VF_ANG.nativeEventHandler = function(evtName, targetName, targetType, evtData) {
                if (!evtName) {
                    console.warn("TML layer asked to emit an event with no name!");
                    return;
                }

                var evt;
                var parsedEventData = {};
                try {
                    if (evtData) {
                        parsedEventData = angular.fromJson(evtData);
                    }
                }
                catch (e) {
                    console.warn("TML layer was given event data for ["+evtName+"] that could not be parsed as json. evtData is: ");
                    console.warn(evtData);
                    // The DOM Event will be fired as if evtData were {}, but the angular event will be fired with the literal evtData passed in.
                    // This is to preserve historic behaviour.
                }

                var elementToDispatchWith = null;

                // search for the right element to dispatch with
                if (targetType === 'twx-dt-target') {
                    // dt-targets have a special form
                    elementToDispatchWith =
                        element[0].querySelector(targetType + '[src*="id=' + targetName +'"]');
                }

                if (!elementToDispatchWith) {
                    // At this point, we assume that targetName is the DOM id, which should be unique
                    elementToDispatchWith = element[0].querySelector('[id="' + targetName +'"]');
                }

                if (elementToDispatchWith) {
                    if (targetType === "twx-dt-model" && parsedEventData.occurrence) {
                        // A "twx-dt-model" event with "occurrence" property in event data on a twx-dt-model element
                        // means user pick on a model item of the model with the occurrence. The model item with that
                        // exact ocurrence (i.e. idpath) might be defined in TML or not. In case not, find the model
                        // item with the occurrence that has the longest prefix of that occurrence. If no mode item
                        // is found in TML, fire the event on the twx-dt-model element.
                        var modelItem = VF_ANG.modelItemDOMLookup(elementToDispatchWith, parsedEventData.occurrence);
                        if (modelItem) {
                            elementToDispatchWith = modelItem;
                        }
                    }
                }

                if (!elementToDispatchWith) {
                    // fall back to the first linking element (i.e. twx-dt-view)
                    elementToDispatchWith = element[0];
                } else if (targetType !== 'twx-dt-target') {
                    targetName = elementToDispatchWith.id;
                    targetType = null; // It means that targetName is a unique DOM id
                }

                console.log("event [" + evtName + "] broadcast on rootScope" +
                            " and dispatched against domID [" + elementToDispatchWith.id + "]" +
                            " with type [" + targetType + "], targetName [" + targetName + "] and data [" + evtData + "]");

                //choosing to use rootScope over an emit + a broadcast
                $rootScope.$broadcast(evtName, targetName, targetType, evtData);

                evt = new CustomEvent(evtName, {
                    detail: angular.extend( {targetName: targetName}, parsedEventData),
                    bubbles: true
                });
                elementToDispatchWith.dispatchEvent(evt);
            };

            var elementExists = true;

            var clickHandler = function(event) {
                console.log("Tap on twx-dt-view element at pageX = " + event.pageX + ", pageY = " + event.pageY);
                if (typeof(renderer.exitSpatialPlacementMode) === "function") {
                    renderer.exitSpatialPlacementMode(function () {
                        // Do nothing
                    }, function (error) {
                        // Call userPick method on failure of exitSpatialPlacementMode
                        if (typeof(renderer.userPick) === "function") {
                            renderer.userPick({x: event.pageX, y: event.pageY});
                        }
                    });
                } else if (typeof(renderer.userPick) === "function") {
                    renderer.userPick({x: event.pageX, y: event.pageY});
                }
            };
            element[0].addEventListener('click', clickHandler);

            var touchStartEventHandler = function(event) {
                var i = 0;
                var touches = event.changedTouches;
                for (i = 0; i < touches.length; i++) {
                    if (touches[i].target.tagName === "TWX-DT-VIEW") {
                        if (typeof(renderer.allowNextGesture) === "function") {
                            // Allow the next native gesture only if it started on the TWX-DT-VIEW and not a 2D element.
                            renderer.allowNextGesture();
                        }
                    }
                }
            };
            element[0].addEventListener('touchstart', touchStartEventHandler);

            scope.lockCameraAndOrientation = function () {
                if (renderer.lockCameraAndOrientation) {
                    renderer.lockCameraAndOrientation();
                }
            };

            scope.unlockCameraAndOrientation = function () {
                if (renderer.unlockCameraAndOrientation) {
                    renderer.unlockCameraAndOrientation();
                }
            };
            VF_ANG.addServiceInvokeListener(scope);

            element.on('$destroy', function() {
                console.log("twx-dt-view tag is removed from DOM.");
                elementExists = false;
                element[0].removeEventListener('click', clickHandler);
                element[0].removeEventListener('touchstart', touchStartEventHandler);
            });

            renderer.setupAREventsCommand(VF_ANG.nativeEventHandler, function () {
                console.log('setupAREventsCommand Failed setting up callback data set');
            });

            var maxtracking = (attrs.maxtracking === undefined) ? 1 : attrs.maxtracking;
            var extendedtracking = (attrs.extendedtracking === undefined) ? true : attrs.extendedtracking;
            var persistmap = (attrs.persistmap === undefined) ? false : attrs.persistmap;
            renderer.initializeAR(scope.arMechanism, maxtracking, extendedtracking, persistmap, attrs.near, attrs.far, function () {
                if (elementExists === false) {
                    console.log('Skip success callback of initializeAR');
                    return;
                }

                scope.$watch(
                    function () { return element.attr('dropshadow'); },
                    function (value) {
                        if (typeof(renderer.setViewProperties) === 'function') {
                            renderer.setViewProperties({ 'dropshadow': element.attr('dropshadow') });
                        }
                    });

                var dataset = scope.dataset;
                var markerArg = [];
                dataset.trackers.forEach(function(tracker) {
                    tracker.targets.forEach(function(target) {
                        var markerDef = {};
                        markerDef.src = target.element.attr("src");
                        if (target.element.attr("size") !== undefined) {
                            markerDef.size = target.element.attr("size");
                        }
                        markerArg.push(markerDef);
                    });
                });

                renderer.loadTrackerDef(markerArg,
                                        function(successMarkerSrcs) {
                                            if (elementExists) {
                                                if (angular.isArray(successMarkerSrcs) && successMarkerSrcs.length > 0) {
                                                    var trackersWithTarget = [];
                                                    dataset.trackers.forEach(function(tracker) {
                                                        var successTargets = [];
                                                        tracker.targets.forEach(function(target) {
                                                            if (successMarkerSrcs.indexOf(target.element.attr("src")) >= 0) {
                                                                successTargets.push(target);
                                                            }
                                                        });
                                                        tracker.targets = successTargets;
                                                        if (successTargets.length > 0) {
                                                            trackersWithTarget.push(tracker);
                                                        }
                                                    });
                                                    dataset.trackers = trackersWithTarget;
                                                }
                                                loadTrackerDefSuccessCallback(dataset, element);
                                            } else {
                                                console.log('Skip success callback of loadTrackerDef');
                                            }
                                        },
                                        function () {
                                            console.log('Failed loading data set');
                                        });
            }, function () {
                console.log('Failed initializing AR');
            });
        }

        return {
            restrict: 'E',
            scope: true,
            controller: function ($scope, $element, $attrs) {
                $scope.dataset = {
                    trackers: []
                };

                this.addTracker = function (t) {
                    $scope.dataset.trackers.push(t);
                };
            },
            link: linkFunc
        };
    }]);

    vuforiaModule.directive('twxDtTracker', ['tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtView',
            controller: function ($scope, $element, $attrs) {
                $scope.tracker = {
                    scope: $scope,
                    targets: [],
                    registeredAssets: {},
                    assetsThatNeedParents: {},
                    rootAssets: [],
                    models: [],
                    trackingHints: {}
                };

                var cssApplyFunction = VF_ANG.applyStyles() || function() {};

                $scope.tracker.name = $element.attr('id');

                $scope.tracker.enableTrackingEvents = $element.attr('enabletrackingevents') === 'true';

                if ($element.attr('stationary') === 'false') {
                    $scope.tracker.trackingHints.stationary = false;
                }

                this.getTracker = function () {
                    return $scope.tracker;
                };
                this.queueTargetForAddition = function (target) {
                    $scope.tracker.targets.push(target);
                };
                this.queueAssetForAddition = function (asset) {
                    this.addAssetOrQueueForAdditionIfNeeded($scope.tracker, asset);
                };
                this.addAssetOrQueueForAdditionIfNeeded = function (tracker, asset) {
                    //console.log("adding " + asset.id + " to " + tracker.name);
                    if(tracker.registeredAssets[asset.id]){
                        console.log("Error: " + asset.id + "already exists");
                        return;
                    }

                    //console.log("registering " + asset.id + " to " + tracker.name);
                    tracker.registeredAssets[asset.id] = asset;
                    if(tracker.assetsThatNeedParents[asset.id]){
                        //console.log( asset.id + " has pending children, adding adding them to assets");
                        asset.childrenAssetIds = tracker.assetsThatNeedParents[asset.id];
                        tracker.assetsThatNeedParents[asset.id] = undefined;
                    }

                    if(asset.parentId){
                        //console.log( asset.id + " has parent " + asset.parentId);
                        var parent = tracker.registeredAssets[asset.parentId];
                        if(parent){
                            //console.log( asset.id + " parent " + asset.parentId + " exists");
                            if(!parent.childrenAssetIds){
                                parent.childrenAssetIds = [];
                            }
                            //console.log("adding " + asset.id + " to " + asset.parentId + " children list");
                            parent.childrenAssetIds.push(asset.id);
                        } else {
                            //console.log( asset.id + " parent " + asset.parentId + " doesn't exist, adding to pending assets");
                            if(!tracker.assetsThatNeedParents[asset.parentId]){
                                tracker.assetsThatNeedParents[asset.parentId] = [];
                            }
                            tracker.assetsThatNeedParents[asset.parentId].push(asset.id);
                        }
                    } else {
                        //console.log( asset.id + " has no parent, adding to root assets");
                        tracker.rootAssets.push(asset.id);
                    }

                    if (tracker.assetsLoaded) {
                        VF_ANG.processTree(tracker,[asset.id],cssApplyFunction);
                    }
                };
                this.associateModelItem = function (modelName, obj) {
                    if($scope.tracker.models[modelName] === undefined) {
                        $scope.tracker.models[modelName] = [];
                    }
                    $scope.tracker.models[modelName].push(obj);
                };
            },
            link: function (scope, element, attrs, ctrl) {
                ctrl.addTracker(scope.tracker);
            }
        };
    }]);

    vuforiaModule.directive('twxDtTarget', [ 'tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            controller: function ($scope, $element, $attrs) {
                $scope.target = VF_ANG.createObj("twx-dt-target", $element);
                this.getTarget = function () {
                    return $scope.target;
                };
            },
            link: function (scope, element, attrs, ctrl) {
                if (element.attr("src") && element.attr("src").startsWith('spatial://')) {
                    ctrl.getTracker().scope.arMechanism = "spatial";
                }
                VF_ANG.addServiceInvokeListener(scope);
                scope.resetGesture = function() {
                    if (renderer && typeof(renderer.resetGestureTransforms) === "function") {
                        renderer.resetGestureTransforms();
                    }
                };
                scope.resetSpatialTracking = function() {
                    if (renderer && typeof(renderer.resetSpatialTracking) === "function") {
                        renderer.resetSpatialTracking();
                    }
                };
                scope.target.addAsset = function(tracker) {
                    var successCallback = function() {
                        if (!VF_ANG.hasBatch()) {
                            renderer.setRotation(element.attr("id"), element.attr("rx"), element.attr("ry"), element.attr("rz"));
                            renderer.setTranslation(element.attr("id"), element.attr("x"), element.attr("y"), element.attr("z"));
                        }

                        scope.$watch(function () { return element.attr('rx') + element.attr('ry') + element.attr('rz'); }, function (value) {
                            renderer.setRotation(element.attr('id'), element.attr('rx'), element.attr('ry'), element.attr('rz'));
                        });
                        scope.$watch(function () { return element.attr('x') + element.attr('y') + element.attr('z'); }, function (value) {
                            renderer.setTranslation(element.attr('id'), element.attr('x'), element.attr('y'), element.attr('z'));
                        });

                        var originalSize;
                        if (element.attr("size") !== undefined) {
                            originalSize = element.attr("size").trim().split(" ");

                            // Validate that the first element of the specified size is actually a number.
                            // The empty string always coerces to 0, so we have to explicitly check for it.
                            // isNaN handles most other cases, but reports the string "Infinity" as a number.
                            // So the third check ensures we have a finite number.
                            if (originalSize[0] === "" ||
                                isNaN(originalSize[0]) ||
                                !isFinite(originalSize[0])) {
                                console.log("Warning, initial size specified on [" + element.attr("id") + "] is not a number: [" + element.attr("size") + "]");
                                originalSize = undefined;
                            }
                        }

                        if (originalSize !== undefined) {
                            scope.$watch(function() { return element.attr("size"); }, function (value) {
                                if (value === undefined || value === null || value === "") {
                                    // This should really go back to the default size (from dataset file)
                                    // as if size where never specified in TML in the first place.
                                    console.log("a size on the twx-dt-target is now required.");
                                    return;
                                }
                                var newSize = value.split(" ");
                                var scale = newSize[0] / originalSize[0];
                                if (scale) { // a valid, non-zero, non-nan number
                                    renderer.setScale(element.attr("id"), scale, scale, scale);
                                } else {
                                    console.log("Cannot set scale to 0 or NaN: " + newSize[0] + " / " + originalSize[0]);
                                }
                            });
                        }
                    };
                    var failureCallback = function(error) {
                        console.log("Error adding marker [" + target.element.attr("id") + "] due to [" + error + "]");
                    };

                    VF_ANG.addMarker(renderer, element, function() {
                        if (typeof(renderer.addTargetGuide) === "function") {
                            renderer.addTargetGuide({
                                tracker: tracker.name,
                                target: element.attr("id"),
                                src: element.attr("guide-src")
                            });
                        }
                        renderer.addMarker(tracker.name,
                                           element.attr("id"),
                                           element.attr("src"),
                                           element.attr("size"),
                                           successCallback,
                                           failureCallback);
                    });
                };

                ctrl.queueTargetForAddition(scope.target);
                scope.$on('trackingacquired', function(event, args) {
                    if ( event.currentScope.me === undefined ) {
                        return;
                    }
                    event.currentScope.$apply(function() { event.currentScope.me.istracked = true; });
                    // console.log('istracked set to true for %s', event.currentScope.me.markerId);
                });
                scope.$on('trackinglost', function(event, args) {
                    if ( event.currentScope.me === undefined ) {
                        return;
                    }
                    event.currentScope.$apply(function() { event.currentScope.me.istracked = false; });
                    // console.log('istracked set to false for %s', event.currentScope.me.markerId);
                });

                if (typeof(renderer.setGestures) === "function") {
                    var enableTranslateGestureWatch = function () { return element.attr('enabletranslategesture'); };
                    var enableRotateGestureWatch = function () { return element.attr('enablerotategesture'); };
                    var enableScaleGestureWatch = function () { return element.attr('enablescalegesture'); };

                    scope.$watchGroup([ enableTranslateGestureWatch, enableRotateGestureWatch, enableScaleGestureWatch ],
                        function (values) {
                            var params = {
                                nodeId: element.attr('id'),
                                gestures: {
                                    enableTranslate: element.attr('enabletranslategesture') === "true",
                                    enableRotate: element.attr('enablerotategesture') === "true",
                                    enableScale: element.attr('enablescalegesture') === "true"
                                }
                            };
                            renderer.setGestures(params);
                        });
                }
            }
        };
    }]);

    vuforiaModule.directive('twxDt3dobject',[ 'tml3dRenderer', function (renderer)  {
        return {
            restrict: 'E',
            require: '^twxDtTracker',/* TODO: a content widget may be attached to target as well*/
            link: function (scope, element, attrs, ctrl) {
                // if user hasn't declared a shader, provide a default
                if (element.attr('shader') === undefined) {
                    element.attr('shader', 'file:Default');
                }
                var asset = VF_ANG.createObj("twx-dt-3dobject", element);
                asset.addAsset = function(tracker) {
                    var successCallback = function () {
                        VF_ANG.addAssetCallback(scope, asset, renderer);
                    };
                    var failureCallback = function (error) {
                        console.log("Problem adding 3dObject with id [" + element.attr("id") + "] due to [" + error + "]");
                    };
                    VF_ANG.addAsset(renderer, asset, function() {
                        renderer.add3DObject(tracker.name,
                                             element.attr("id"),
                                             parseAttribute(element.attr("vertices")),
                                             parseAttribute(element.attr("normals")),
                                             parseAttribute(element.attr("texcoords")),
                                             parseAttribute(element.attr("indexes")),
                                             parseAttribute(element.attr("color")),
                                             element.attr("texture"),
                                             asset.parentId,
                                             successCallback,
                                             failureCallback
                                            );
                    });
                };
                ctrl.queueAssetForAddition(asset);
            }
        };
    }]);

    vuforiaModule.directive('twxDtEmitter', [ 'tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',/* TODO: a content widget may be attached to target as well*/
            link: function (scope, element, attrs, ctrl) {
                var asset = VF_ANG.createObj("twx-dt-emitter", element);
                asset.addAsset = function(tracker) {
                    var successCallback = function () {
                        VF_ANG.addAssetCallback(scope, asset, renderer);
                    };

                    var failureCallback = function (error) {
                        console.log("Error in addEmitter for [" + element.attr("id") + "] due to [" + error + "]");
                    };

                    VF_ANG.addAsset(renderer, asset, function() {
                        renderer.addEmitter(tracker.name,
                                            element.attr("id"),
                                            scope.$eval(element.attr("particles")),
                                            scope.$eval(element.attr("radius")),
                                            scope.$eval(element.attr("velocity")),
                                            scope.$eval(element.attr("decay")),
                                            scope.$eval(element.attr("gravity")),
                                            scope.$eval(element.attr("spread")),
                                            scope.$eval(element.attr("size")),
                                            scope.$eval(element.attr("mass")),
                                            scope.$eval(element.attr("rate")),
                                            scope.$eval(element.attr("wind")),
                                            scope.$eval(element.attr("blend")),
                                            scope.$eval(element.attr("color")),
                                            element.attr("texture"),
                                            asset.parentId,
                                            successCallback,
                                            failureCallback
                                           );
                    });
                };

                ctrl.queueAssetForAddition(asset);
            }
        };
    }]);

    vuforiaModule.directive('twxDtLabel', [ 'tml3dRenderer', '$animate', function (renderer, $animate) {
        function getLabelAttributes(el) {
            return {
                text: el.attr('text'),
                textAttrs: el.attr('textattrs'),
                fontFamily: el.attr('fontFamily'),
                fontColor: el.attr('fontColor'),
                fontOutlineColor: el.attr('fontOutlineColor'),
                height: VF_ANG.getLabelHeightAttribute(el),
                width: el.attr('width')
            };
        }

        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-label", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function() {
                        var successCallback = function() {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function(error) {
                            addFunctionFailureCallback();

                            console.log("twx-dt-label: Error in add3DImage id: [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        VF_ANG.addAsset(renderer, asset, function() {
                            addFunctionAddAPICallCallback();

                            var properties = getLabelAttributes(element);
                            var params = {
                                "tracker" : tracker.name,
                                "id" : element.attr("id"),
                                "src" : VF_ANG.textToImage(element, properties),
                                "parent" : asset.parentId,
                                "leaderX" : undefined, // Unused leaderX
                                "leaderY" : undefined, // Unused leaderY
                                "anchor" : undefined, // Unused anchor
                                "width" : element.attr("width"),
                                "height": properties.height, //Calculated height from textToImage includes border,padding,etc.
                                "pivot" : element.attr("pivot"),
                                "preload" : element.attr("preload")
                            };

                            renderer.add3DImage(
                                params,
                                successCallback,
                                failureCallback
                            );
                        });
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    renderer.setTexture(element.attr('id'),
                                        VF_ANG.textToImage(element, getLabelAttributes(element)));
                };

                var attributeNames = [ 'class', 'text', 'textattrs' ];

                var addSetTriggerFunctions = VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames,
                    addFunction, setFunction);

                VF_ANG.addStyleReadyListener(element, addSetTriggerFunctions.eventFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtImage', [ 'tml3dRenderer', '$animate', function (renderer, $animate) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-image", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function() {
                        var addSuccessCallback = function() {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var addFailureCallback = function (error) {
                            addFunctionFailureCallback();

                            console.log("Error in add3DImage for [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        var image = element.attr("src");
                        if (ArSensor.isSVG(image) || VF_ANG.hasCustomCss(element[0], window)) {
                            ArSensor.loadImage(image, element[0], function(imageObj) {
                                if (imageObj === null) {
                                    console.log("Failed to load svg for twx-dt-image id: [" + element.attr("id") + "] url [" + image + "]");
                                    return;
                                }

                                var canvasData = ArSensor.rebuildCanvas(element, imageObj);

                                VF_ANG.addAsset(renderer, asset, function() {
                                    addFunctionAddAPICallCallback();

                                    var params = {
                                        "tracker" : tracker.name,
                                        "id" : element.attr("id"),
                                        "src" : canvasData.imageData,
                                        "parent" : asset.parentId,
                                        "leaderX" : element.attr("leaderx"),
                                        "leaderY" : element.attr("leadery"),
                                        "anchor" : element.attr("anchorType"),
                                        "width" : canvasData.imagePhysicalWidth,
                                        "height" : canvasData.imagePhysicalHeight,
                                        "pivot" : element.attr("pivot"),
                                        "preload" : element.attr("preload")
                                    };

                                    renderer.add3DImage(params,
                                                        addSuccessCallback,
                                                        addFailureCallback);
                                });
                            });
                        } else {
                            VF_ANG.addAsset(renderer, asset, function() {
                                addFunctionAddAPICallCallback();

                                var params = {
                                    "tracker" : tracker.name,
                                    "id" : element.attr("id"),
                                    "src" : image,
                                    "parent" : asset.parentId,
                                    "leaderX" : element.attr("leaderx"),
                                    "leaderY" : element.attr("leadery"),
                                    "anchor" : element.attr("anchorType"),
                                    "width" : element.attr("width"),
                                    "height" : element.attr("height"),
                                    "pivot" : element.attr("pivot"),
                                    "preload" : element.attr("preload")
                                };

                                renderer.add3DImage(params,
                                                    addSuccessCallback,
                                                    addFailureCallback);
                            });
                        }
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    var image = element.attr("src");
                    if (ArSensor.isSVG(image) || VF_ANG.hasCustomCss(element[0], window)) {
                        ArSensor.loadImage(image, element[0], function(imageObj) {
                            if (imageObj === null) {
                                console.log("Failed to load svg for twx-dt-image id: [" + element.attr("id") + "] url [" + image + "]");
                                return;
                            }
                            if (imageObj.origsrc === element.attr("src")) {
                                var imageData = ArSensor.rebuildCanvas(element, imageObj).imageData;
                                renderer.setTexture(element.attr("id"), imageData);
                            }
                        });
                    } else {
                        renderer.setTexture(element.attr('id'), element.attr('src'));
                    }
                };

                var attributeNames = [ "class", "src" ];
                VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames, addFunction, setFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDt3dbutton', [ 'tml3dRenderer', '$animate', function (renderer, $animate) {
        function getLabelAttributes(el) {
            return {
                text: el.attr('text'),
                textAttrs: el.attr('textattrs'),
                fontFamily: el.attr('fontFamily'),
                fontColor: el.attr('fontColor'),
                fontOutlineColor: el.attr('fontOutlineColor'),
                height: VF_ANG.getLabelHeightAttribute(el),
                width: el.attr('width')
            };
        }

        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-3dbutton", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function() {
                        var successCallback = function() {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function(error) {
                            addFunctionFailureCallback();

                            console.log("twx-dt-3dbutton: Error in add3DButton id: [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        if (typeof(renderer.add3DButton) === "function") {
                            VF_ANG.addAsset(renderer, asset, function() {
                                addFunctionAddAPICallCallback();

                                // If "src" exists, use that. If not, use "text" to generate an image, if that exists.
                                var imageSrc = element.attr("src");
                                if (imageSrc === undefined || imageSrc === null || imageSrc === "") {
                                    var properties = getLabelAttributes(element);
                                    if (properties.text !== undefined && properties.text !== null && properties.text !== "") {
                                        imageSrc = VF_ANG.textToImage(element, properties);
                                    }
                                }
                                var backervisibility = element.attr("backervisibility");// hides/shows the back plate of the new types of buttons
                                if(backervisibility === undefined) {
                                    backervisibility = "true";
                                }

                                var buttonParams = {
                                    "tracker" : tracker.name,
                                    "id" : element.attr("id"),
                                    "parent" : asset.parentId,
                                    "width" : element.attr("width"),
                                    "height" : element.attr("height"),
                                    "src" : imageSrc,
                                    "color" : element.attr("color"),
                                    "backercolor" : element.attr("backercolor"),
                                    "backervisibility": backervisibility
                                };
                                renderer.add3DButton(
                                    buttonParams,
                                    successCallback,
                                    failureCallback
                                );
                            });
                        } else {
                            failureCallback("add3DButton not supported by the current platform");
                        }
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    var color = element.attr('color');
                    if (!(color === undefined || color === null || color === "")) {
                        renderer.setColor(element.attr("id"), element.attr('color'));
                    }
                    var imageSrc = element.attr("src");
                    if (imageSrc === undefined || imageSrc === null || imageSrc === "") {
                        var properties = getLabelAttributes(element);
                        if (properties.text !== undefined && properties.text !== null && properties.text !== "") {
                            renderer.setTexture(element.attr('id'), VF_ANG.textToImage(element, properties));
                        }
                    } else {
                        renderer.setTexture(element.attr('id'), imageSrc);
                    }
                };

                var attributeNames = [ 'class', 'text', 'textattrs', 'src', 'color' ];

                var addSetTriggerFunctions = VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames,
                    addFunction, setFunction);

                VF_ANG.addStyleReadyListener(element, addSetTriggerFunctions.eventFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtAudioplayback', [ 'tml3dRenderer', '$animate', function (renderer, $animate) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-audioplayback", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function() {
                        var successCallback = function() {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function(error) {
                            addFunctionFailureCallback();

                            console.log("twx-dt-audioplayback: Error in add3DAudio id: [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        if (typeof(renderer.add3DAudio) === "function") {
                            VF_ANG.addAsset(renderer, asset, function() {
                                addFunctionAddAPICallCallback();

                                var params = {
                                    "tracker" : tracker.name,
                                    "id" : element.attr("id"),
                                    "parent" : asset.parentId,
                                    "width" : element.attr("width"),
                                    "height" : element.attr("height"),
                                    "src" :  element.attr("src"),
                                    "preload" : element.attr("preload"),
                                    "visual" : element.attr("visual"),
                                    "spatial" : element.attr("spatial")
                                };
                                renderer.add3DAudio(
                                    params,
                                    successCallback,
                                    failureCallback
                                );
                            });
                        } else {
                            failureCallback("add3DAudio not supported by the current platform");
                        }
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    var params = {
                        "id" : element.attr("id"),
                        "src" :  element.attr("src"),
                        "spatial" : element.attr("spatial")
                    };
                    renderer.setAudio(params);
                };

                var attributeNames = ['src', 'spatial'];

                var addSetTriggerFunctions = VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames,
                    addFunction, setFunction);

                VF_ANG.addStyleReadyListener(element, addSetTriggerFunctions.eventFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtLeaderline', [ 'tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                var asset = VF_ANG.createObj("twx-dt-leaderline", element);
                asset.addAsset = function(tracker) {
                    var successCallback = function() {
                        scope.$watch(function () { return element.attr('vertices'); }, function (value) {
                            renderer.setVertices(element.attr('id'), scope.$eval(element.attr('vertices')));
                        });

                        VF_ANG.addAssetCallback(scope, asset, renderer);
                    };

                    var failureCallback = function (error) {
                        console.log("Error adding leader line [" + element.attr("id") + "] due to [" + error + "]");
                    };

                    VF_ANG.addAsset(renderer, asset, function() {
                        renderer.addLeaderLine(tracker.name,
                                               element.attr('id'),
                                               scope.$eval(element.attr("vertices")),
                                               scope.$eval(element.attr("color")),
                                               element.attr("texture"),
                                               element.attr("nbScreenCoord"),
                                               element.attr("pointSize"),
                                               element.attr("lineWidth"),
                                               asset.parentId,
                                               successCallback,
                                               failureCallback
                                              );
                    });
                };

                ctrl.queueAssetForAddition(asset);
            }
        };
    }]);

    vuforiaModule.directive('twxDtSensor', [ 'tml3dRenderer', '$animate', function (renderer, $animate) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup it as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;
                var currentImage = null;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-sensor", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function() {
                        var successCallback = function () {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function (error) {
                            addFunctionFailureCallback();

                            console.log("Error adding sensor [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        var originalImageSrc = element.attr("src");

                        ArSensor.loadImage(originalImageSrc, element[0], function(image) {
                            if (image === null) {
                                addFunctionFailureCallback();

                                console.log("Sensor image download failed for [" + originalImageSrc + "]");
                                return;
                            }

                            currentImage = image;
                            var imageData = ArSensor.rebuildCanvas(element, currentImage).imageData;
                            VF_ANG.addAsset(renderer, asset, function() {
                                addFunctionAddAPICallCallback();


                                var params = {
                                    "tracker" : tracker.name,
                                    "id" : element.attr("id"),
                                    "src" : imageData,
                                    "parent" : asset.parentId,
                                    "leaderX" : undefined, // Unused leaderX
                                    "leaderY" : undefined, // Unused leaderY
                                    "anchor" : undefined, // Unused anchor
                                    "width" : element.attr("width"),
                                    "height" : element.attr("height"),
                                    "pivot" : element.attr("pivot"),
                                    "preload" : element.attr("preload")
                                };
                                renderer.add3DImage(params,
                                                    successCallback,
                                                    failureCallback);
                            });
                        });
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var downloadAttributeNames = [ "class", "src" ];

                var attributeNames = ArSensor.CANVAS_RENDERING_ATTRIBUTES.slice();
                attributeNames = attributeNames.concat(downloadAttributeNames);

                var setFunction = function setFunction (oldValues, newValues) {
                    var redraw = function () {
                        var imageData = ArSensor.rebuildCanvas(element, currentImage).imageData;
                        renderer.setTexture(element.attr('id'), imageData);
                    };

                    var loadAndRedraw = function () {
                        var newValue = element.attr('src');
                        if (currentImage !== null && newValue === currentImage.origsrc &&
                            !VF_ANG.hasCustomCss(VF_ANG.getParentTwxWidget(element) || element[0], window)) {
                            // ignore this firing, we've already cached that src.
                            return;
                        }

                        ArSensor.loadImage(newValue, element[0], function (image) {
                            if (image === null) {
                                console.log("Download of sensor image failed.");
                                return;
                            }
                            if (image.origsrc !== element.attr('src') && !image.origsrc.startsWith('data:image')) {
                                // the src updated while we were downloading an older src.
                                console.log("Skipping updating of image since src was updated while we were downloading the image.");
                                console.log("Downloaded image url [" + image.origsrc + "]  vs [" + element.attr('src') + "]");
                                return;
                            }
                            currentImage = image;
                            redraw();
                        });
                    };

                    // This means setFunction has been called by event function.
                    if (arguments.length == 0) {
                        loadAndRedraw();
                    } else {
                        var changedAttributes = VF_ANG.findChangedAttributes(attributeNames, oldValues, newValues);

                        var didAnyDownloadAttributeChanged = downloadAttributeNames.some(function(attributeName) {
                            return changedAttributes.indexOf(attributeName) != -1;
                        });
                        if (didAnyDownloadAttributeChanged) {
                            loadAndRedraw();
                        } else {
                            redraw();
                        }
                    }
                };

                var addSetTriggerFunctions = VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames,
                    addFunction, setFunction);

                VF_ANG.addStyleReadyListener(element, addSetTriggerFunctions.eventFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtSvg', [ 'tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-svg", element);
                    asset.addAsset = function() {
                        var successCallback = function () {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function (error) {
                            addFunctionFailureCallback();

                            console.log("Error adding SVG [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        VF_ANG.buildARSVG(asset, function(ctx) {
                            VF_ANG.svgToImage(ctx, function(ctx, imageData) {
                                VF_ANG.addAsset(renderer, asset, function() {
                                    addFunctionAddAPICallCallback();

                                    var params = {
                                        "tracker" : tracker.name,
                                        "id" : element.attr("id"),
                                        "src" : imageData,
                                        "parent" : asset.parentId,
                                        "leaderX" : undefined, // Unused leaderX
                                        "leaderY" : undefined, // Unused leaderY
                                        "anchor" : undefined, // Unused anchor
                                        "width" : element.attr("width"),
                                        "height" : element.attr("height"),
                                        "pivot" : element.attr("pivot"),
                                        "preload" : element.attr("preload")
                                    };

                                    renderer.add3DImage(params,
                                                        successCallback,
                                                        failureCallback);
                                });
                            });
                        });
                    };

                    asset.svgElem = element.find("svg")[0];
                    asset.svgElem.hidden = true; // We dont want to render this in 2D.
                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    VF_ANG.buildARSVG(asset, function (ctx) {
                        VF_ANG.svgToImage(ctx, function (ctx, imageData) {
                            renderer.setTexture(ctx.element.attr('id'), imageData);
                        });
                    });
                };

                var attributeNames = [ "innerHTML" ];
                VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames, addFunction, setFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtModel', ['tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            scope: true,
            link: function (scope, element, attrs, ctrl) {
                // If user hasn't declared a shader, provide a default
                if (element.attr('shader') === undefined) {
                    element.attr('shader', 'file:Default');
                }

                var id = element.attr("id");

                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction (addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                        addFunctionFailureCallback) {
                    var successCallback = function () {
                        addFunctionSuccessCallback();

                        VF_ANG.addAssetCallback(scope, asset, renderer);
                    };

                    var failureCallback = function (error) {
                        if (error && (error.errorCode === VF_ANG.errorCodes.PLUGIN_API_ARGUMENTS_ERROR ||
                            error.errorCode === VF_ANG.errorCodes.PLUGIN_STATE_ERROR ||
                            error.errorCode === VF_ANG.errorCodes.NODE_ALREADY_EXISTS ||
                            error.errorCode === VF_ANG.errorCodes.PARENT_NODE_DOES_NOT_EXIST)) {
                            addFunctionFailureCallback();
                        } else {
                            // For all the other errors even though add failed we should treat it as success
                            // for purpose of add / set APIs because node is still there in scene graph and can receive
                            // set API.
                            addFunctionSuccessCallback();
                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        }

                        console.log("Error adding model [" + element.attr("id") + "] due to [" + JSON.stringify(error) + "]");

                        VF_ANG.dispatchModelLoadFailedEvent(error, element, scope);
                    };

                    var asset = VF_ANG.createObj('twx-dt-model', element);
                    asset.addAsset = function(tracker) {
                        VF_ANG.addAsset(renderer, asset, function() {
                            addFunctionAddAPICallCallback();

                            renderer.addPVS(tracker.name,
                                            element.attr('id'),
                                            element.attr("src"),
                                            element.attr("cull"),
                                            asset.parentId,
                                            VF_ANG.createModelLoadSuccessCallback(id,
                                                                                  tracker,
                                                                                  scope,
                                                                                  renderer,
                                                                                  element,
                                                                                  true,
                                                                                  successCallback),
                                            failureCallback);
                        });
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction () {
                    if (!VF_ANG.hasSetModelURL()) {
                        return;
                    }

                    if (VF_ANG.isNativeSequencerAvailable() === false) {
                        PTC.GLOBAL_SCENE.removeModelDataFromScene(id);
                    }

                    // Asset API here is only needed to trigger batching.
                    var asset = VF_ANG.createObj('twx-dt-model', element);
                    VF_ANG.addAsset(renderer, asset, function() {
                        var successCallback = function () {
                            if (!VF_ANG.hasBatch()) {
                                VF_ANG.setTransformAndRenderingProps(asset, renderer);
                            }
                        };

                        var failureCallback = function (error) {
                            console.log("Error setting model URL on [" + element.attr("id") + "] due to [" + JSON.stringify(error) + "]");

                            VF_ANG.dispatchModelLoadFailedEvent(error, element, scope);
                        };

                        var setModelURLParams = {
                            modelID : id,
                            modelURL : element.attr("src")
                        };

                        renderer.setModelURL(setModelURLParams,
                                             VF_ANG.createModelLoadSuccessCallback(id,
                                                                                   tracker,
                                                                                   scope,
                                                                                   renderer,
                                                                                   element,
                                                                                   false,
                                                                                   successCallback),
                                             failureCallback);
                    });
                };

                var attributeNames = [ "src" ];
                VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames, addFunction, setFunction);
            }
        };
    }]);

    vuforiaModule.directive('twxDtModelitem', [ 'tml3dRenderer', function (renderer) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                var tracker = ctrl.getTracker();
                var obj = VF_ANG.createObj('twx-dt-modelitem',element);
                var modelName = element.parent().attr('id');
                // if defined, use for attr instead of parent's name
                if(element.attr('for') !== undefined) {
                    modelName = element.attr('for');
                }
                else{
                    element.attr('for', modelName);
                }

                obj.addAsset = function() {
                    var occurence = attrs.occurrence;
                    var itemName = modelName + "-" + occurence;
                    VF_ANG.applyWatch(scope,element,renderer,itemName);
                    scope.$watch(function () {
                        return element.attr('color');
                    }, function (value) {
                        renderer.setColor(itemName, element.attr('color'));
                    });
                    scope.$watch(function () {
                        return element.attr('texture');
                    }, function (value) {
                        renderer.setTexture(itemName, element.attr('texture'));
                    });
                };

                if (tracker.models[modelName] === undefined) {
                    tracker.models[modelName] = [];
                }

                if (VF_ANG.isModelItemPreloadSupported() || tracker.models[modelName].modelLoaded === true) {
                    obj.addAsset();
                }

                ctrl.associateModelItem(modelName, obj);
            }
        };
    }]);

    vuforiaModule.directive('twxDtGroup', ['tml3dRenderer', '$animate', function (renderer, $animate) {
        return {
            restrict: 'E',
            require: '^twxDtTracker',
            link: function (scope, element, attrs, ctrl) {
                // We have to backup tracker as it will change when next twxDtTracker is encountered by Angular.
                var tracker = scope.tracker;

                var addFunction = function addFunction(addFunctionAddAPICallCallback, addFunctionSuccessCallback,
                                                       addFunctionFailureCallback) {
                    var asset = VF_ANG.createObj("twx-dt-group", element);
                    $animate.enabled(element, false);

                    asset.addAsset = function () {
                        var successCallback = function () {
                            addFunctionSuccessCallback();

                            VF_ANG.addAssetCallback(scope, asset, renderer);
                        };

                        var failureCallback = function (error) {
                            addFunctionFailureCallback();

                            console.log("twx-dt-group: Error in addGroup id: [" + element.attr("id") + "] due to [" + error + "]");
                        };

                        if (typeof (renderer.addGroup) === "function") {
                            VF_ANG.addAsset(renderer, asset, function () {
                                addFunctionAddAPICallCallback();

                                var params = {
                                    "tracker": tracker.name,
                                    "parent": asset.parentId,
                                    "id": element.attr("id")
                                };
                                renderer.addGroup(
                                    params,
                                    successCallback,
                                    failureCallback
                                );
                            });
                        } else {
                            failureCallback("addGroup not supported by the current platform");
                        }
                    };

                    ctrl.addAssetOrQueueForAdditionIfNeeded(tracker, asset);
                };

                var setFunction = function setFunction() {
                };

                var attributeNames = [];

                var addSetTriggerFunctions = VF_ANG.setupWatchWithAddSetConvention(scope, element, attributeNames,
                addFunction, setFunction);

                VF_ANG.addStyleReadyListener(element, addSetTriggerFunctions.eventFunction);
            }
        };
    }]);
})();



// we ather shaders from script elements which are marker as x-shader/*
function gatherShaders(cb) {
    var shaders = {};
    var scripts = document.getElementsByTagName("script");
    if (scripts !== undefined) {
        for(var s=0; s<scripts.length; s++) {
            var typestr = scripts[s].type;
            if ((typestr !== undefined) && typestr.indexOf('x-shader') === 0) {
                var sname = scripts[s].attributes.name.value;
                var stype = typestr.substr(11);

                // have we defined this before?
                var shader = shaders[sname];
                if (shader === undefined) {
                    // no, create a new one
                    shader = {};
                    shaders[sname] = shader;
                }
                shader[stype] = scripts[s].innerHTML;
            }
        }
    }
    if (cb !== undefined) {
        for (var sh in shaders) {
            var ts = shaders[sh];
            cb(sh, ts);
        }
    }
}

/**
 * Convert complext attribute values to js objects (TEAPOT values)
 * @param {String} val
 * @returns {Object} parsed value
 */
function parseAttribute(val) {
    if (val && typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch(e) {
            console.error('Could not parse attribute:', val);
        }
    }
    return val;
}

var VF_ANG = {};

// scale factor = target resolution / provided resolution
// = 3000 pixels per meter / (96 dpi * 39.37 inches in a meter)
VF_ANG.CSS_PX_TO_LABEL_SCALE = 0.794;

// 96 dpi * 39.37 inches in a meter
VF_ANG.CSS_PX_TO_METER_SCALE = 3779.528;

VF_ANG.DEFAULT_LINE_WIDTH = "1px";

/**
    Scene graph does not change when operation fails with those errors except for exceptions to the rule noted below.
*/
VF_ANG.errorCodes = {
    MAX_VIEW_LIMIT_REACHED: "MAX_VIEW_LIMIT_REACHED",

    /**
        This will be received if server error report will be in unsupported format.
    */
    SERVER_ERROR_JSON_INVALID: "twx-dt-SERVER_ERROR_JSON_INVALID",
    OTHER_HTTP_ERROR: "twx-dt-OTHER_HTTP_ERROR",
    OTHER_DOWNLOAD_ERROR: "twx-dt-OTHER_DOWNLOAD_ERROR",

    PLUGIN_API_ARGUMENTS_ERROR: "twx-dt-PLUGIN_API_ARGUMENTS_ERROR",
    PLUGIN_STATE_ERROR: "twx-dt-PLUGIN_STATE_ERROR",

    INCOMPATIBLE_NODE: "twx-dt-INCOMPATIBLE_NODE",
    NODE_ALREADY_EXISTS: "twx-dt-NODE_ALREADY_EXISTS",
    NODE_DOES_NOT_EXIST: "twx-dt-NODE_DOES_NOT_EXIST",
    PARENT_NODE_DOES_NOT_EXIST: "twx-dt-PARENT_NODE_DOES_NOT_EXIST",

    /**
        When this error is received scene graph no longer contains the node (unless it was readded right afer removal).
    */
    LOAD_CANCELED_NODE_REMOVED: "twx-dt-LOAD_CANCELED_NODE_REMOVED",
    LOAD_CANCELED_NODE_RETAINED: "twx-dt-LOAD_CANCELED_NODE_RETAINED",

    THINGVIEW_ERROR: "twx-dt-THINGVIEW_ERROR",
    UNKNOWN_ERROR: "twx-dt-UNKNOWN_ERROR"
};

VF_ANG.dispatchModelLoadFailedEvent = function dispatchModelLoadFailedEvent(modelError, modelElement, scope) {
    var result = modelElement[0];
    var args = {
        modelElement: modelElement,
        error: modelError
    };
    scope.$emit('modelloadfailed', args);

    if (result !== undefined) {
        // There is no need to pass modelElement in HTML event since you can inspect event.target for that.
        args = {
            error: modelError
        };
        var event = new CustomEvent('modelloadfailed', { detail: args });
        result.dispatchEvent(event);
    }
};

VF_ANG.processAsset = function (tracker, asset, cssApplyFunction) {
    cssApplyFunction(asset.element);
    asset.addAsset(tracker);
    asset.loaded = true;
};

VF_ANG.processTree = function (tracker, assetIds, cssApplyFunction){
    for(var index in assetIds){
        var asset = tracker.registeredAssets[assetIds[index]];
        if(asset){
            if((asset.parentId && tracker.registeredAssets[asset.parentId].loaded) || asset.parentId === undefined) {
                if(!asset.loaded){
                    VF_ANG.processAsset(tracker, tracker.registeredAssets[assetIds[index]], cssApplyFunction);
                }
                if(asset.childrenAssetIds){
                    VF_ANG.processTree(tracker,asset.childrenAssetIds.slice(),cssApplyFunction);
                }
            }
        }
    }
};

VF_ANG.applyStyles = function(media) {
    var styles = document.getElementById('styles');
    if (styles !== undefined && styles !== null) {
        var st = styles.innerHTML;
        var css = CSSLoader;
        css.loadcss(st, media||'{}');
        return function(element) {
            var ename = element[0].tagName.toLowerCase();
            css.gather(ename,element.attr('id'),element.attr('class'),element.attr('style'),function(vals) {
                //console.log(vals);
                for(var a in vals) {
                    element.attr(a, vals[a]);
                }
            });
        };
    }
    else
        return undefined;
};

VF_ANG.WATCH_STAGE_IDLE = 0;
VF_ANG.WATCH_STAGE_ADD_SCHEDULE = 1;
VF_ANG.WATCH_STAGE_ADD_IN_PROGRESS = 2;
VF_ANG.WATCH_STAGE_SET = 3;

VF_ANG.createAddSetTriggerFunctions = function createAddSetTriggerFunctions(element, addFunction, setFunction) {
    // This is used to recognize case where previous load callback is called after current one.
    var loadIndex = element.data("twxDtLoadIndex");
    if (loadIndex === undefined) {
        loadIndex = 0;
    } else {
        loadIndex++;
    }
    element.data("twxDtLoadIndex", loadIndex);

    var currentStage = VF_ANG.WATCH_STAGE_IDLE;

    var addFunctionAddAPICallCallback = function() {
        var currentLoadIndex = element.data("twxDtLoadIndex");
        if (loadIndex === currentLoadIndex) {
            console.log("addFunctionAddAPICallCallback called for ID: " + element.attr("id"));
            currentStage = VF_ANG.WATCH_STAGE_ADD_IN_PROGRESS;
        } else {
            // This should not happen at all.
            console.error("Unexpected addFunctionAddAPICallCallback call for ID: " + element.attr("id"));
        }
    };

    var addFunctionSuccessCallback = function() {
        var currentLoadIndex = element.data("twxDtLoadIndex");
        if (loadIndex === currentLoadIndex) {
            console.log("addFunctionSuccessCallback called for ID: " + element.attr("id"));
            currentStage = VF_ANG.WATCH_STAGE_SET;
        } else {
            console.warning("Out of order addFunctionSuccessCallback call");
        }
    };

    var addFunctionFailureCallback = function() {
        var currentLoadIndex = element.data("twxDtLoadIndex");
        if (loadIndex === currentLoadIndex) {
            console.log("addFunctionFailureCallback called for ID: " + element.attr("id"));
            currentStage = VF_ANG.WATCH_STAGE_IDLE;
        } else {
            // This can be a valid situation. I do not think that previous load failure callback is guaranteed to be
            // called before success of the current load.

            console.log("Unexpected or dangling addFunctionFailureCallback call for ID: " + element.attr("id"));
        }
    };

    var watchFunction = function watchFunction (newValues, oldValues) {
        switch (currentStage) {
            case VF_ANG.WATCH_STAGE_IDLE: {
                currentStage = VF_ANG.WATCH_STAGE_ADD_SCHEDULE;

                addFunction(addFunctionAddAPICallCallback, addFunctionSuccessCallback, addFunctionFailureCallback,
                    newValues, oldValues);

                break;
            }
            case VF_ANG.WATCH_STAGE_ADD_SCHEDULE: {
                // Nothing to do here. If renderer add API was not yet called then up-to-date attributes will be read
                // at add time anyways.
                break;
            }
            case VF_ANG.WATCH_STAGE_ADD_IN_PROGRESS: {
                // This will work because set will be queued by Cordova after add. If add fails set will fail too.
                // We could in theory add watch values parameter (named currentValues?)
                // to addFunctionAddAPICallCallback and addFunctionSuccessCallback and then call set if there was
                // a change between those two but this would complicate things even further and prevent us from
                // replacing load from add with load from set (if any attributes can cause element reload e.g.
                // src on twxDtModel).
                setFunction(newValues, oldValues);
                break;
            }
            case VF_ANG.WATCH_STAGE_SET: {
                setFunction(newValues, oldValues);
                break;
            }
        }
    };

    var eventFunction = function eventFunction () {
        switch (currentStage) {
            case VF_ANG.WATCH_STAGE_IDLE: {
                // Nothing to do here. If renderer add API was not yet called then up-to-date attributes
                // will be read at add time anyways.
                break;
            }
            case VF_ANG.WATCH_STAGE_ADD_SCHEDULE: {
                // Nothing to do here. If renderer add API was not yet called then up-to-date attributes
                // will be read at add time anyways.
                break;
            }
            case VF_ANG.WATCH_STAGE_ADD_IN_PROGRESS: {
                // This will work because set will be queued by Cordova after add.
                setFunction();
                break;
            }
            case VF_ANG.WATCH_STAGE_SET: {
                setFunction();
                break;
            }
        }
    };

    var addSetTriggerFunctions = {
        watchFunction: watchFunction,
        eventFunction: eventFunction
    };

    return addSetTriggerFunctions;
};

/**
    @returns Object containing watchFunction and eventFunction. Usually the result is unused by caller.
    @warning Remember that if you use eventFunction, setFunction will be called without newValues and oldValues parameters!
*/

VF_ANG.setupWatchWithAddSetConvention = function setupWatchWithAddSetConvention (scope, element, attributeNames, addFunction, setFunction) {
    var addSetTriggerFunctions = VF_ANG.createAddSetTriggerFunctions(element, addFunction, setFunction);
    VF_ANG.setupWatchGroup(scope, element, attributeNames, addSetTriggerFunctions.watchFunction);
    return addSetTriggerFunctions;
};

VF_ANG.attributeValuesToArray = function attributeValuesToArray(element, attributeNames) {
    var result = [];
    attributeNames.forEach(function (attributeName) {
        result.push(element.attr(attributeName));
    });
    return result;
};

/**
    @returns Array with subset of watchAttributeNames that changed according to compare between oldValues and newValues.
*/

VF_ANG.findChangedAttributes = function findChangedAttributes (watchAttributeNames, oldValues, newValues) {
    var results = [];
    for (var i = 0; i < watchAttributeNames.length; i++) {
        if (oldValues[i] !== newValues[i]) {
            results.push(watchAttributeNames[i]);
        }
    }
    return results;
};

VF_ANG.applyWatch = function(scope,element,renderer,id) {
    var nodeId = id || element.attr('id');
    scope.$watch(function () { return element.attr('rx') + element.attr('ry') + element.attr('rz'); }, function (value) {
        renderer.setRotation(nodeId, element.attr('rx'), element.attr('ry'), element.attr('rz'));
    });
    scope.$watch(function () { return element.attr('x') + element.attr('y') + element.attr('z'); }, function (value) {
        renderer.setTranslation(nodeId, element.attr('x'), element.attr('y'), element.attr('z'));
    });
    scope.$watch(function () { return element.attr('sx') + element.attr('sy') + element.attr('sz'); }, function (value) {
        renderer.setScale(nodeId, element.attr('sx'), element.attr('sy'), element.attr('sz'));
    });
    if (typeof(renderer.setInteractableHint) === 'function') {
        scope.$watch(function () { return element.attr('interactable-hint'); }, function (value) {
            var params = {
                "nodeId": nodeId,
                "interactable": element.attr('interactable-hint')
            };
            renderer.setInteractableHint(params);
        });
    }
    scope.$watch(function () { return nodeId + element.attr('billboard') + element.attr('tagalong') + element.attr('occlude') + element.attr('hidden') + element.attr('phantom') + element.attr('opacity') + element.attr('decal') + element.attr('shader') + element.attr('force-hidden') + element.attr('experimental-one-sided'); }, function (value) {

        var decalValue = element.attr('decal');
        var eleType = element[0].localName;
        if(decalValue === undefined && (eleType === 'twx-dt-sensor' || eleType === 'twx-dt-svg' || eleType === 'twx-dt-label'  || eleType === 'twx-dt-image')) {
            decalValue = true;
        }

        var phantomValue = false;
        var forceHiddenValue = false;
        if(eleType === 'twx-dt-model' || eleType === 'twx-dt-modelitem'){
            phantomValue = element.attr('phantom');
            forceHiddenValue = element.attr('force-hidden');
        }

        renderer.setProperties(nodeId, {
            billboard: element.attr('billboard'),
            tagalong:  element.attr('tagalong'),
            occlude:   element.attr('occlude'),
            opacity:   element.attr('opacity'),
            hidden:    element.attr('hidden'),
            decal:     decalValue,
            shader:    element.attr('shader'),
            phantom:   phantomValue,
            experimentalOneSided: element.attr('experimental-one-sided'),
            forceHidden: forceHiddenValue
        });
    });
};

VF_ANG.setupWatchGroup = function setupWatchGroup (scope, element, attributeNames, listener) {
    var watchGroup = [];
    attributeNames.forEach(function (attributeName) {
        watchGroup.push(function() { return element.attr(attributeName); });
    });
    scope.$watchGroup(watchGroup, listener);
};

VF_ANG.createObj = function(name,element) {
    var parentId;
    var groupParent = VF_ANG.getParentGroup(element);
    if (groupParent) {
        parentId = groupParent.getAttribute('id');
    }

    var obj = {
        objtype: name,
        element: element,
        parentId: parentId,
        id: element.attr("id")
    };
    return obj;
};

/**
 * Get the height setting of the label, using .05 as the default only when textattrs is not defined
 *  to be backwards compatible
 * @param element
 */
VF_ANG.getLabelHeightAttribute = function getLabelHeightAttribute(element) {
    var height = element.attr('height');
    if (!height || height === 'NaN') {
        if (!element.attr('textattrs')) {
            //No textattrs means its a 8.0.2 version compatible label
            height = '.05';
        }
    }
    return height;
};

/**
 * Apply default value, handle case-insensitive property key
 * Converts string to number
 */
VF_ANG.handleLineWidth = function handleLineWidth(textAttrs) {
    if (textAttrs.linewidth) {
        textAttrs.lineWidth = textAttrs.linewidth;  //Backwards compatible for mis-spelled property
    }
    if (!textAttrs.lineWidth || textAttrs.lineWidth === 'NaN') {
        textAttrs.lineWidth = VF_ANG.DEFAULT_LINE_WIDTH;
    }
    var width = textAttrs.lineWidth.trim().match(/(\d*\.?\d*)(.*)/);
    var val = Number(width[1]);

    var screen_dpi = window.devicePixelRatio * 96;
    if (width[2] == "cm") {
        val = val * screen_dpi / 2.54;
    }
    else if (width[2] == "mm") {
        val = val * screen_dpi / 25.4;
    }
    else if (width[2] == "in") {
        val = val * screen_dpi;
    }
    else if (width[2] == "pt") {
        val = val * screen_dpi / 72;
    }
    else if (width[2] == "pc") {
        val = val * screen_dpi * 12 / 72;
    }

    // Do not convert to a number, as this stops units being converted
    textAttrs.lineWidth = val + "px";
};

/**
 * Modifies textAttrs to contain fill and stroke based on font color choices, and a proper font style
 * @param config - Object with properties:
 *   textAttrs - Computed properties from CSS and old textattributes
 *   fontColor - Custom font fill color
 *   fontOutlineColor - Custom font outline color (stroke)
 *   fontFamily - font family to use if font is not defined yet
 *   fontSize - font size to use if the font is not defined yet
 *   cssFontFamily - font family computed from css
 */
VF_ANG.applyFontOverrideValues = function applyFontOverrideValues(config) {
    if (config.fontColor) {
        config.textAttrs.fillColor = config.fontColor;
    }

    if (config.fontOutlineColor) {
        config.textAttrs.strokeColor = config.fontOutlineColor;
    }

    if (!config.textAttrs.font || config.fontFamily) {
        var fontStyle = (config.textAttrs.fontStyle ? config.textAttrs.fontStyle + ' ' : '');
        var fontSize = (config.fontSize || 150) + '';
        if (fontSize.indexOf('px') < 0) {
            fontSize += 'px';
        }
        var fontFamily = config.fontFamily || config.cssFontFamily || 'Arial';

        config.textAttrs.font =  fontStyle + fontSize + ' ' + fontFamily;
    }
};

/**
 * Mapping of CSS keys to copy from Widget Element to the Canvas/Context when creating Text
 */
VF_ANG.CSS_KEYS_SUPPORTED = [
    {from: 'font-size',           to: 'fontSize'},
    {from: 'text-decoration',     to: 'textDecoration'},
    {from: 'font-weight',         to: 'fontWeight'},
    {from: 'font-style',          to: 'fontStyle'},
    {from: '--text-stroke-color', to: 'strokeColor'},
    {from: '--text-stroke-width', to: 'lineWidth'},
    {from: 'color',               to: 'fillColor'},
    {from: 'background-color',    to: 'backgroundColor' },
    {from: 'padding-top',         to: 'padding' },
    {from: 'border-top-style',    to: 'borderStyle' },  //Edge does not report border-style, applies it to the 4 sides
    {from: 'border-top-width',    to: 'borderWidth' },
    {from: 'border-top-color',    to: 'borderColor' },
    {from: 'border-top-left-radius', to: 'borderRadius' }
];

VF_ANG.getCssAttrs = function getCssAttrs(computed) {
    var textAttrs = {};
    if (computed) {
        VF_ANG.CSS_KEYS_SUPPORTED.forEach(function (item) {
            var propertyValue = computed.getPropertyValue([item.from]);
            propertyValue = propertyValue === null ? undefined : propertyValue;
            textAttrs[item.to] = propertyValue;
        });
    }
    return textAttrs;
};

VF_ANG.getTextAttrs = function getTextAttrs(textPropertyString, fontFamily, fontColor, fontOutlineColor, defaultFontSize, element) {
    var textAttrs = {};
    var cssFontFamily;
    if (element) {
        var computed = window.getComputedStyle(element[0]);
        if (computed) {
            textAttrs = VF_ANG.getCssAttrs(computed);
            cssFontFamily = computed.fontFamily;
        }
    }

    textAttrs = VF_ANG.overrideLocallyDefinedInlineAttributes(textAttrs, textPropertyString);

    VF_ANG.applyFontOverrideValues({
        textAttrs: textAttrs,
        fontColor: fontColor,
        fontOutlineColor: fontOutlineColor,
        fontFamily: fontFamily,
        fontSize: defaultFontSize,
        cssFontFamily: cssFontFamily
    });

    VF_ANG.handleLineWidth(textAttrs);

    return textAttrs;
};

VF_ANG.getMeasurementCssStyle = function(textAttrs) {
    var style = {};
    style.font = textAttrs.font;
    return style;
};

VF_ANG.measureTextWidth = function(ctx, text, textAttrs) {
    var fontBackup = ctx.font;

    ctx.font = textAttrs.font;

    var width = ctx.measureText(text).width;

    if (width <= 0) {
        // If the width is 0 (for example with an empty string) then use 1.
        // This is to force the canvas to render something.
        width = 1;
    }

    ctx.font = fontBackup;

    // Unfortunately ctx.lineWidth does not affect measureText results... so I do not even try to set it and approximate
    // width difference using textAttrs.linewidth. Difference on one side of text should be textAttrs.linewidth / 2
    // which gives 2 * textAttrs.linewidth / 2 == textAttrs.linewidth for both sides of text. I'm assuming that letters
    // are not getting spaced differently when textAttrs.linewidth changes.

    // +2 for antialiasing

    var lineWidth = parseFloat(textAttrs.lineWidth || textAttrs.linewidth);
    lineWidth = textAttrs.strokeColor !== undefined && lineWidth ? lineWidth : 0;
    return width + lineWidth + 2;
};

/**
 * Returns true for DOM elements that have a class specified in Studio (1 more than the default basic style) or
 *  The computed style finds a non-zero border or padding.
 * @param element - Dom element to check
 * @param win - window object, for getComputedStyle
 */
VF_ANG.hasCustomCss = function (element, win) {
    var computedStyle = win.getComputedStyle(element);
    return !!(parseFloat(computedStyle.borderTopWidth) || parseFloat(computedStyle.paddingTop) || element.classList.length > 1);
};

VF_ANG.textToImage = function textToImage(element, properties) {
    var canvas = document.createElement('canvas');
    VF_ANG.drawTextToCanvas(canvas, element, properties);
    return canvas.toDataURL();
};

/**
 * To be backwards compatible, the font used for labels with customization needs to be different since the font
 * drives the size of the label.  All other labels will use height to drive size and font is used for thickness of the
 * text. Without this, upgraded labels will appear to be 3x bigger.
 * @param properties
 * @returns {boolean} true if the label has the textAttrs or textprops property defined
 */
VF_ANG.isLabelVersion_1 = function isLabelVersion_1(properties) {
    return !!((properties.textAttrs || properties.textprops) && (!properties.height || properties.height === 'NaN'));  //true if either exists. Coerce to convert to boolean
};

/**
 * Adds a styleReady custom Dom event listener on the parent twx-widget element
 */
VF_ANG.addStyleReadyListener = function addStyleReadyListener(element, listener) {
    var parentTwxWidget = VF_ANG.getParentTwxWidget(element);
    if (parentTwxWidget && parentTwxWidget.addEventListener) {
        //re-draw due to css changes
        parentTwxWidget.addEventListener('styleReady', listener);
    }
};

VF_ANG.getParentTwxWidget = function getParentTwxWidget(element) {
    if (element && element[0]) {
        element = element[0];
    }
    if (element && element.closest) {
        return element.closest('twx-widget');
    }
};

VF_ANG.getParentGroup = function getParentGroup(element) {
    if (element && element[0]) {
        element = element[0];
    }
    if (element && element.parentNode && element.parentNode.closest) {
        return element.parentNode.closest('twx-dt-group');
    } else {
        return undefined;
    }
};

/**
 * Cap the text height font conversion ratio at 250px.
 * The default ratio of text height to canvas pixels is 3000 for small labels to make the text
 * thick enough to avoid anti-aliasing rough edges when scaled up, but avoid going too large
 * for large labels to reduce memory usage and increase performance of label rendering.
 *
 * @param height {number} Height of label, used to determine optimial font size and height of the canvas.
 */
VF_ANG.getTextHeightRatio = function getTextHeightRatio(height) {
    //250 max font size, 250/height is the ratio needed to keep textheight at 250 for larger labels
    //3000 is the default ratio and large labels will end up with a smaller number
    return Math.min(3000, 250 / height);
};

VF_ANG.drawTextToCanvas = function drawTextToCanvas(canvas, element, properties) {
    var textHeightRatio = 3000;
    var ctx = canvas.getContext('2d');
    var defaultFontSize = VF_ANG.isLabelVersion_1(properties) ? 36 : 150;

    var text = properties.text;
    if (text === undefined || text === null) {
        text = "";
    }

    var height = properties.height;
    var textHeight;
    if (height && height !== 'NaN') {
        height = parseFloat(height);
    }
    if (height > 0) {
        textHeightRatio = VF_ANG.getTextHeightRatio(height);
        textHeight = height * textHeightRatio;
    }

    //Runtime uses 'textattrs' property, design time uses textprops property
    var textAttrs = VF_ANG.getTextAttrs(properties.textAttrs || properties.textprops, properties.fontFamily, properties.fontColor, properties.fontOutlineColor, textHeight || defaultFontSize, element);

    var scale_factor = VF_ANG.CSS_PX_TO_LABEL_SCALE;
    var strokeWidth = parseFloat(textAttrs.lineWidth || VF_ANG.DEFAULT_LINE_WIDTH) * scale_factor;
    var padding = parseFloat(textAttrs.padding) * scale_factor;
    if (!padding) {
        padding = 0;
    }
    var borderWidth = parseFloat(textAttrs.borderWidth) * scale_factor;
    if (!borderWidth) {
        borderWidth = 0;
    }

    if (!textHeight) {
        // Text height is not set for legacy upgraded projects, so use value from textAttrs instead
        textHeight = parseFloat(textAttrs.font);
    }
    var textWidth = VF_ANG.measureTextWidth(ctx, text, textAttrs);

    // Add a little extra padding to height (textHeight * 1.2) and width (textHeight * 0.2)
    // Just because text strings without descenders look odd if you don't.
    canvas.height = (textHeight * 1.2) + strokeWidth + (padding * 2) + (borderWidth * 2);
    canvas.width = textWidth + (padding * 2) + (borderWidth * 2) + (textHeight * 0.2);

    Object.keys(textAttrs).forEach(function(key) {
        ctx[key] = textAttrs[key];
    });

    VF_ANG.drawTextBorder(ctx, textAttrs, canvas.width, canvas.height, borderWidth);

    // Draw the actual text
    ctx.setLineDash([]);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    var textBox = {
        left: (canvas.width - textWidth) / 2,
        bottom: canvas.height - padding - borderWidth - (strokeWidth / 2),
        height: textHeight,
        width: textWidth
    };

    if (textAttrs.fillColor !== undefined) {
        //DT-12229: Safari cannot handle leading spaces on color names, and it will convert rgba(255,255,255,1)  to ' white'
        ctx.fillStyle = textAttrs.fillColor.trim();
        ctx.fillText(text, textBox.left, textBox.bottom);
    }
    if (textAttrs.strokeColor !== undefined) {
        //DT-12229: Safari cannot handle leading spaces on color names, and it will convert rgba(255,255,255,1)  to ' white'
        ctx.strokeStyle = textAttrs.strokeColor.trim();
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(text, textBox.left, textBox.bottom);
    }

    VF_ANG.drawTextDecoration(ctx, textAttrs, textBox);

    if (!VF_ANG.isLabelVersion_1(properties)) {
        //don't override height for v1 labels
        properties.height = canvas.height / textHeightRatio;
    }
    properties.width = canvas.width / textHeightRatio;
    //console.log("Text drawn with sizes (canvas/widget): ", canvas.height, canvas.width, properties.height, properties.width);
};

/**
 * Draws a border around widget
 *
 * @param {CanvasRenderingContext2D} ctx The context onto which the border will be drawn
 * @param {Object} textAttrs The attributes describing the text appearance
 * @param {Number} width The total (i.e. external) width of the border box
 * @param {Number} height The total (i.e. external) height of the border box
 * @param {Number} lineWidth The width of the border line itself
 */
VF_ANG.drawTextBorder = function(ctx, textAttrs, width, height, lineWidth) {
    if (!lineWidth) { //Handle NaN, null, undefined, epmty str
        lineWidth = 0;
    }
    var halfLineWidth = lineWidth / 2;
    var box = {
        top: halfLineWidth,
        left: halfLineWidth,
        bottom: height - halfLineWidth,
        right: width - halfLineWidth,
        width: width - (2 * halfLineWidth),
        height: height - (2 * halfLineWidth)
    };

    var scale_factor = VF_ANG.CSS_PX_TO_LABEL_SCALE;
    var radius = parseFloat(textAttrs.borderRadius) * scale_factor;
    if (radius > box.width / 2) {
        radius = box.width / 2;
    }
    if (radius > box.height / 2) {
        radius = box.height / 2;
    }

    if (textAttrs.backgroundColor !== undefined) {
        ctx.fillStyle = textAttrs.backgroundColor;
    }

    if (lineWidth > 0) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = textAttrs.borderColor || "#000000";

        if (textAttrs.borderStyle === "dotted") {
            ctx.setLineDash([1, lineWidth * 2]);
            ctx.lineCap = 'round';
        }
        else if (textAttrs.borderStyle === "dashed") {
            ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
        }

        if (radius > 0) {
            if (textAttrs.backgroundColor !== undefined) {
                if (textAttrs.borderStyle === "dotted" || textAttrs.borderStyle === "dashed") {
                    var inflatedBox = {left: 0, top: 0, right: width, bottom: height};
                    VF_ANG.createBorderPath(ctx, inflatedBox, radius + halfLineWidth);
                    ctx.fill();
                    VF_ANG.createBorderPath(ctx, box, radius);
                }
                else {
                    VF_ANG.createBorderPath(ctx, box, radius);
                    ctx.fill();
                }
            }
            else {
                VF_ANG.createBorderPath(ctx, box, radius);
            }
            ctx.stroke();
        }
        else {
            if (textAttrs.backgroundColor !== undefined) {
                ctx.fillRect(0, 0, width, height);
            }
            ctx.strokeRect(box.left, box.top, box.width, box.height);
        }
    }
    else if (textAttrs.backgroundColor !== undefined) {
        ctx.fillRect(0, 0, width, height);
    }
};

/**
 * Creates the path for a text-box's border
 *
 * @param {CanvasRenderingContext2D} ctx The context onto which the text decoration will be drawn
 * @param {Object} box The coordinates (left, top, right, bottom) describing the border
 * @param {Number} radius The radius of the curves at the corners of the border
 */
VF_ANG.createBorderPath = function(ctx, box, radius) {
    ctx.beginPath();
    ctx.moveTo(box.left + radius, box.top);
    ctx.lineTo(box.right - radius, box.top);
    ctx.arcTo(box.right, box.top, box.right, box.top + radius, radius);
    ctx.lineTo(box.right, box.bottom - radius);
    ctx.arcTo(box.right, box.bottom, box.right - radius, box.bottom, radius);
    ctx.lineTo(box.left + radius, box.bottom);
    ctx.arcTo(box.left, box.bottom, box.left, box.bottom - radius, radius);
    ctx.lineTo(box.left, box.top + radius);
    ctx.arcTo(box.left, box.top, box.left + radius, box.top, radius);
    ctx.closePath();
};

/**
 * Draws the text decoration (e.g. underline) for a text-box
 *
 * @param {CanvasRenderingContext2D} ctx The context onto which the text decoration will be drawn
 * @param {Object} textAttrs The attributes describing the text appearance
 * @param {Object} textBox The bounding box (left, top, width, height) of the text
 */
VF_ANG.drawTextDecoration = function(ctx, textAttrs, textBox) {

    var height = textBox.height / 18; // abitary fraction of total text height, looks about right
    var top = 0;
    var display = false;

    if (textAttrs.textDecoration.startsWith("underline")) {
        // Draw a line some amount above the baseline of the text
        top = textBox.bottom - (textBox.height / 6);
        display = true;
    }
    else if (textAttrs.textDecoration.startsWith("overline")) {
        // Draw a line a small amount above the top of the text
        top = textBox.bottom - (textBox.height * 1.1);
        display = true;
    }
    else if (textAttrs.textDecoration.startsWith("line-through")) {
        // Draw a line through the middle of the text
        top = textBox.bottom - ((textBox.height + height) / 2);
        display = true;
    }

    if (display) {
        if (textAttrs.fillColor !== undefined) {
            ctx.fillRect(textBox.left, top, textBox.width, height);
        }
        if (textAttrs.strokeColor !== undefined) {
            ctx.strokeRect(textBox.left, top, textBox.width, height);
        }
    }
};

VF_ANG.encodeImg = function(objctx, src, callback) {
    //debugger;
    var retImg;
    if (src === undefined) { callback(retImg); return; }
    var image = new Image();
    image.onload = function () {
        //console.log(image.width);
        //console.log(image.height);

        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        // Get drawing context for the Canvas
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        var retImg = canvas.toDataURL();
        callback(objctx, retImg, image.width, image.height);
    };
    image.src = src;
};

VF_ANG.svgToImage = function(objCtx, callback) {
    //debugger;
    var svgElem = objCtx.element.find("svg")[0];
    var seri = new XMLSerializer();
    var src = seri.serializeToString(svgElem);
    var imgSrc = 'data:image/svg+xml;base64,' + window.btoa(src);

    var image = new Image();
    image.width = objCtx.element.attr("canvaswidth");
    image.height = objCtx.element.attr("canvasheight");
    image.src = imgSrc;
    image.onerror = function(e,b) { console.error(e,b); };
    image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        // Get drawing context for the Canvas
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        var retImg = canvas.toDataURL();
        callback(objCtx, retImg);
    };
};

VF_ANG.buildARSVG = function (objCtx, callback) {
    var svgElem = objCtx.element.find("svg")[0];
    callback(objCtx);
};

VF_ANG.makeTransparent =  function(ele) {
    var x = ele;
    return function() {
        var keepGoing = true;
        do {
            x = angular.element(x.parent());
            if (x === undefined || x[0] === undefined)  { // this can happen in tml unit tests
                break;
            }
            x[0].style.backgroundColor = 'rgba(255,0,0,0)';
            if (x[0].tagName.toLowerCase() === 'body') {
                keepGoing = false;
            }
        } while (keepGoing);
        //Hack fix to force DOM back to transparent, sometimes it leaves itself on top of AR
        angular.element(document.body)[0].style.backgroundColor = 'rgba(1, 0, 0, .01)';
        setTimeout(function() {
            angular.element(document.body)[0].style.backgroundColor = 'rgba(255,0,0,0)';
        }, 500);
    };
};

/**
 * Returns a no-arg function that will apply the TML values of modelItems to the renderer/scene graph.
 *
 * This function is safe to call more than once.
 */
VF_ANG.applyTMLToModelItemsFactory = function(tracker, modelName, renderer) {
    return function() {
        var items = tracker.models[modelName]; // this is a flat list of twx-dt-modelitems associated with the twx-dt-model.
        if (items === null || items === undefined) {
            return;
        }

        items.forEach(function(modelItemObj) {
            var element = modelItemObj.element;
            var modelItemID = modelName + "-" + element.attr("occurrence");

            // get the values from the DOM just once
            var tmlValues = {};
            ['rx', 'ry', 'rz', 'x', 'y', 'z', 'sx', 'sy', 'sz', 'color', 'texture', 'interactable-hint'].forEach(function(attr) {
                tmlValues[attr] = element.attr(attr);
            });

            // Check to see which values from the DOM need to be set:
            if (tmlValues.rx !== undefined || tmlValues.ry !== undefined || tmlValues.rz !== undefined) {
                renderer.setRotation(modelItemID, tmlValues.rx, tmlValues.ry, tmlValues.rz);
            }

            if (tmlValues.x !== undefined || tmlValues.y !== undefined || tmlValues.z !== undefined) {
                renderer.setTranslation(modelItemID, tmlValues.x, tmlValues.y, tmlValues.z);
            }

            if (tmlValues.sx !== undefined || tmlValues.sy !== undefined || tmlValues.sz !== undefined) {
                renderer.setScale(modelItemID, tmlValues.sx, tmlValues.sy, tmlValues.sz);
            }

            if (tmlValues.color) {
                renderer.setColor(modelItemID, tmlValues.color);
            }

            if (tmlValues.texture !== undefined) {
                renderer.setTexture(modelItemID, tmlValues.texture);
            }

            if (typeof(renderer.setInteractableHint) === 'function') {
                if (tmlValues['interactable-hint'] !== undefined) {
                    var params = {
                        "nodeId": modelItemID,
                        "interactable": tmlValues['interactable-hint']
                    };
                    renderer.setInteractableHint(params);
                }
            }

            renderer.setProperties(modelItemID, {
                billboard:    element.attr("billboard"),
                occlude:      element.attr("occlude"),
                hidden:       element.attr("hidden"),
                opacity:      element.attr("opacity"),
                decal:        element.attr("decal"),
                shader:       element.attr("shader"),
                phantom:      element.attr('phantom'),
                forceHidden:  element.attr('force-hidden')
            });
        });
    };
};

VF_ANG.findAndRemoveAllPivotNodes = function(modelID, renderer) {
    var pivotNodeNames = [];
    var findPivotNodes = function(node) {
        if (node.name.startsWith("PIVOT_")) {
            pivotNodeNames.push(node.name);
        }
        node.children.forEach(findPivotNodes);
    };

    var model = PTC.GLOBAL_SCENE.getItem(modelID+"-/");
    if (!model) {
        return;
    }

    findPivotNodes(model);

    pivotNodeNames.forEach(function(nodeName) {
        renderer.removeNode({name:nodeName, reparent:true});
    });
};

VF_ANG.resetSceneGraphsToAsLoaded = function(modelID, renderer) {
    VF_ANG.findAndRemoveAllPivotNodes(modelID, renderer);
    PTC.GLOBAL_SCENE.reloadModelData(modelID);

    // This is the json datastructure that is sent as part of the modelLoaded callback
    var modelAndModelItems = PTC.GLOBAL_SCENE.getAsLoadedModelData(modelID);

    modelAndModelItems.forEach(function(item) {
        renderer.setTranslation(item.name, item.x, item.y, item.z);
        var q = new THREE.Quaternion(item.qx, item.qy, item.qz, item.qw);
        var eu = new THREE.Euler();
        eu.setFromQuaternion(q,"ZYX");
        renderer.setRotation(item.name,
                             eu.x * 180/Math.PI,
                             eu.y * 180/Math.PI,
                             eu.z * 180/Math.PI);

        if ((item.sx !== undefined) && (item.sy !== undefined) && (item.sz !== undefined)) {
            renderer.setScale(item.name, item.sx, item.sy, item.sz);
        } else {
            renderer.setScale(item.name, 1.0, 1.0, 1.0);
        }

        if (item.cr === undefined) {
            renderer.setColor(item.name, null);
        } else {
            var color = [item.cr, item.cg, item.cb, item.ca];
            renderer.setColor(item.name, color);
        }

        renderer.setProperties(item.name, {
            hidden: -1,
            phantom: true,
            opacity: -1,
            forceHidden: false
        });
    });
};

VF_ANG.resetScopeAndTMLValues = function(scope, element, applyTMLValuesFunc) {
    // apply TML values
    if(typeof(applyTMLValuesFunc) === "function") {
        applyTMLValuesFunc();
    }

    // The sequence attribute was cleared;
    // set an "empty" player and set steps/currentStep to the empty string for display purposes.

    scope.me.steps = "";
    scope.me.currentStep = "";
    scope.me.playing = false;
    scope.me.sequenceList = {};
    scope.$emit('sequenceloaded', element.attr('id'), 'twx-dt-model', undefined);
};

VF_ANG.isHybridSequencerAvailable = function() {
    if (window.thingworxview &&
        window.thingworxview.configuration &&
        window.thingworxview.configuration.hybridSequencer === true) {
        return true;
    }

    return false;
};

VF_ANG.isNativeSequencerAvailable = function() {
    if (window.thingworxview && window.thingworxview.configuration && window.thingworxview.configuration.nativeSequencer) {
        return true;
    }

    return false;
};

VF_ANG.isModelItemPreloadSupported = function() {
    /* Currently model item preload is supported precisely when the native sequencer is available,
       so we just check that rather than introducing additional configuration flags.
    */
    return VF_ANG.isNativeSequencerAvailable();
};

VF_ANG.NativeSequencerHelper = function (modelId, aEventEmitter, renderer) {
    var MODEL_ID = modelId;
    var TOTALSTEPS = 0;
    var STEPS = [];
    var FIRST_STEP = 0;
    var CURRENT_STEP = 0;
    var eventEmitterFunc = aEventEmitter;

    function emitEventAsync(eventName, eventData) {
        var localData = eventData;

        if (typeof(eventData) !== "string") {
            localData = JSON.stringify(eventData);
        }

        setTimeout(function() {
            eventEmitterFunc(eventName, MODEL_ID, "twx-dt-model", localData);
        }, 0);
    }

    function getStepName(number) {
        return STEPS[number].name;
    }

    function getStepDuration(number) {
        return STEPS[number].duration;
    }

    function getCurrentStep() {
        return CURRENT_STEP;
    }

    function getTotalSteps() {
        return TOTALSTEPS - FIRST_STEP;
    }

    function getFirstStep() {
        return FIRST_STEP;
    }

    function loadSequence(url, speed, callback) {
        // ignore speed, native sequencer doesn't have such concept
        var pviParams = {
            modelID: MODEL_ID,
            url: url
        };
        renderer.loadPVI(pviParams, function (sequenceData) {
            // load completed callback
            STEPS = sequenceData.stepVec;
            TOTALSTEPS = STEPS.length;
            FIRST_STEP = 0;

            // if step 0 has acknowledgment, start on step 0, otherwise start on step 1
            if ((TOTALSTEPS > 0) && (STEPS[0].acknowledge === false) ) {
                FIRST_STEP = 1;
            }
            // ThingView might still be on step 0, but the next step to be played is CURRENT_STEP
            CURRENT_STEP = FIRST_STEP;

            if ( callback !== undefined ) {
                callback(undefined, undefined);
            }
        }, function () {
            // load failed callback
            console.log(MODEL_ID + " failed to load pvi " + url);
        });
    }

    function playSequence(callback) {
        var playParams = {
            modelID: MODEL_ID,
            stepNumber: CURRENT_STEP
        };
        renderer.playStep(playParams, null, function () {
            console.log(MODEL_ID + " failed to play step number " + CURRENT_STEP);
        });
        CURRENT_STEP++;
    }

    function previousSequence(callback) {
        if (CURRENT_STEP <= 0) {
            console.log("ignoring attempt to back up beyond step 1");
            return;
        }

        CURRENT_STEP--;
        var gotoParams = {
            modelID: MODEL_ID,
            stepNumber: CURRENT_STEP,
            position: "start"
        };
        renderer.gotoStep(gotoParams, null, null);
    }

    function nextSequence(callback) {
        if (CURRENT_STEP >= TOTALSTEPS) {
            console.log("ignoring attempt to next beyond last step");
            return;
        }

        CURRENT_STEP++;
        var gotoParams = {
            modelID: MODEL_ID,
            stepNumber: CURRENT_STEP,
            position: "start"
        };

        // if we do forward on last step, go to the end of the step
        if (CURRENT_STEP == TOTALSTEPS) {
            gotoParams.stepNumber = CURRENT_STEP - 1;
            gotoParams.position = "end";
        }

        renderer.gotoStep(gotoParams, null, null );
    }

    function reset(callback) {
        CURRENT_STEP = FIRST_STEP;
        var gotoParams = {
            modelID: MODEL_ID,
            stepNumber: CURRENT_STEP,
            position: "start"
        };
        renderer.gotoStep(gotoParams, null, null );

        if (callback !== undefined) {
            callback();
        }
    }

    function goToStep(step) {
        var gotoParams = {
            modelID: MODEL_ID,
            stepNumber: step,
            position: "start"
        };
        if (step >= FIRST_STEP && step < TOTALSTEPS ) {
            renderer.gotoStep(gotoParams, null, null);
            CURRENT_STEP = step;
        }
    }

    function unloadSequence(callback) {
        // Tell the native engine to load the empty-string sequence, which it interprets as unloading the sequence
        var pviParams = {
            modelID: MODEL_ID,
            url: ""
        };
        renderer.loadPVI(pviParams, function (sequenceData) {
            if (typeof(callback) === "function") {
                callback();
            }
        });
    }

    return {
        getStepName: getStepName,
        getStepDuration: getStepDuration,
        getCurrentStep: getCurrentStep,
        getTotalSteps: getTotalSteps,
        getFirstStep: getFirstStep,
        goToStep: goToStep,
        loadSequence: loadSequence,
        playSequence: playSequence,
        nextSequence: nextSequence,
        previousSequence: previousSequence,
        reset: reset,
        unloadSequence: unloadSequence
    };
};

VF_ANG.clearModelLoaded = function (data) {
    if (data.tracker.models[data.name] === undefined) {
        data.tracker.models[data.name] = [];
    }
    data.tracker.models[data.name].modelLoaded = undefined;
};

VF_ANG.updateModelLoaded = function (data, startSrc) {
    var currentSrc = data.element.attr("src");
    if (currentSrc === startSrc) {
        data.tracker.models[data.name].modelLoaded = true;
    } else {
        if (data.tracker.models[data.name].modelLoaded !== undefined) {
            console.log("Unexpected state in VF_ANG.updateModelLoaded because modelLoaded !== undefined && " +
                "currentSrc !== startSrc, currentSrc is '" + currentSrc + " and startSrc was '" + startSrc + "'");
        } else {
            console.log("Skipping modelLoaded assignment because currentSrc !== startSrc, currentSrc is '" +
                currentSrc + " and startSrc was '" + startSrc + "'");
        }
    }
};

VF_ANG.handleViewState = function(renderer, data, list) {
    var viewStates = [];
    angular.copy(list, viewStates);
    var eventParams = {
        modelID: data.name,
        viewStates: viewStates
    };
    data.scope.$emit('viewStateListLoaded', eventParams);
    data.scope.$watch( function () { return data.element.attr('view-state-id'); }, function (viewStateID) {
        eventParams.viewStateID = viewStateID;
        renderer.loadViewState(eventParams, function () {
            data.scope.$emit('modelViewStateLoaded', eventParams);
        }, function () {
            data.scope.$emit('modelViewStateLoadFailed', eventParams);
        });
    });
};

VF_ANG.handleModelSequence = function(renderer, data, isFirstLoad) {
    // Setup sequence.

    data.scope.$apply(function() { // Make sure setupSequence is done in angular digest loop for setting up watches
        if (isFirstLoad) {
            var applyTMLValuesFunc = VF_ANG.applyTMLToModelItemsFactory(data.tracker, data.name, renderer);
            VF_ANG.setupSequence(data.scope, data, data.name, data.element, renderer, applyTMLValuesFunc);
        }
    });

    // Load sequence if needed.

    // If first PVS load succeeded and no replace was issued until this point then sequence load was done by
    // VF_ANG.setupSequence above. If first PVS load succeeded but replace was issued then code below will
    // handle the load. Code below will also be used in all the other cases.
    if (!isFirstLoad && data.tracker.models[data.name].modelLoaded) {
        var sequenceToLoad = data.tracker.models[data.name].sequenceToLoad;
        if (VF_ANG.isValidSequenceValue(sequenceToLoad)) {
            var applyTMLValuesFunc = VF_ANG.applyTMLToModelItemsFactory(data.tracker, data.name, renderer);
            VF_ANG.loadSequence(data.scope, data, data.name, data.element, renderer, sequenceToLoad, applyTMLValuesFunc);
        }
    }
};

VF_ANG.createModelLoadSuccessCallback = function (name, tracker, scope, renderer, element, isFirstLoad, callback) {
    var data = {
        name: name,
        tracker: tracker,
        scope: scope,
        element: element
    };

    // This is used to recognize loads that completed after a new load was requested. In such cases modelLoaded should
    // not be set. This case is higly unlikely as next model load would have to be scheduled for execution from JS side
    // but not executed before previous model load calls JS callback.
    var startSrc = element.attr("src");

    VF_ANG.clearModelLoaded(data);

    return function (modelInfo) {
        try {
            // Update ThreeJS scene graph if needed.

            if (VF_ANG.isNativeSequencerAvailable() === false && typeof modelInfo !== 'undefined') {
                if (Array.isArray(modelInfo)) {
                    PTC.GLOBAL_SCENE.loadModelData(data.name, modelInfo);
                } else if (modelInfo.hasOwnProperty('modelData')) {
                    PTC.GLOBAL_SCENE.loadModelData(data.name, modelInfo.modelData);
                }
            }

            VF_ANG.updateModelLoaded(data, startSrc);

            // Setup model items if needed.

            if (!VF_ANG.isModelItemPreloadSupported()) {
                data.tracker.models[data.name].forEach(function (modelItemAsset) {
                    modelItemAsset.addAsset();
                });
            }

            VF_ANG.handleModelSequence(renderer, data, isFirstLoad);

            if (modelInfo && modelInfo.hasOwnProperty('sequenceList')) {
                VF_ANG.setScopeSequenceListValue(data.scope, modelInfo.sequenceList);
            }

            if (modelInfo && modelInfo.hasOwnProperty('viewStateList')) {
                VF_ANG.handleViewState(renderer, data, modelInfo.viewStateList);
            }

            // Send event up and down the scope chain. The view up the chain needs to know to keep track of the count
            // of the loaded models, the twx-widget down the chain needs to know to invoke its specific bindings.
            // The rootscope wouldn't work here as the event binding code would confuse the event from coming from
            // other models.

            data.scope.$emit('modelLoaded', data.name);
            data.scope.$broadcast('modelLoaded', data.name);
            data.scope.$root.modelLoaded = true;

            if (typeof(callback) === "function") {
                callback();
            }
        } catch (e) {
            //Error was being completely ignored before thus logging at warn rather than error
            console.warn('Error caught in VF_ANG.createModelLoadSuccessCallback: %o', e);
        }
    };
};

VF_ANG.isValidSequenceValue = function(sequence) {
    return !(sequence === undefined || sequence === null || sequence === "");
};

VF_ANG.loadSequence = function(scope, data, modelID, element, renderer, sequence, applyTMLValuesFunc) {
    if (!scope.me) {
        scope.me = {};
    }

    var startSrc = element.attr("src");

    if (scope.SEQPLAYER && (VF_ANG.isHybridSequencerAvailable() || !VF_ANG.isValidSequenceValue(sequence))) {
        // When using the hybrid engine we always have to unload before loading a new sequence.
        // This is because unloading may do something different depending on which backend the hybrid is currently
        // using.

        // We also want to fall into this block when the passed in sequence is invalid and we want to unload
        // the currently loaded sequence.

        // Unload the old sequence first, using whatever engine was in use.
        scope.SEQPLAYER.unloadSequence(function() {

            // Re-apply tml values and correct all scope variables after unloading the sequence.
            scope.$apply(function() {
                scope.me.playing = false;
                scope.me.steps = 0;
                scope.me.currentStep = 0;
                scope.continuousPlayback = false;
                scope.validSequenceLoaded = false;

                VF_ANG.resetScopeAndTMLValues(scope, element, applyTMLValuesFunc);
            });

            scope.SEQPLAYER = undefined;

            // now, load the new sequence, if it is valid and the model hasn't changed in the meantime.
            if (VF_ANG.isValidSequenceValue(sequence) && startSrc === element.attr("src")) {
                setTimeout(function() {
                    VF_ANG.loadSequence(scope, data, modelID, element, renderer, sequence, applyTMLValuesFunc);
                }, 0);
            }
        });

        return;
    }

    if (! VF_ANG.isValidSequenceValue(sequence)) {
        // sequence has already been unloaded
        scope.validSequenceLoaded = false;
        return;
    }

    if (VF_ANG.isNativeSequencerAvailable() === true) {
        scope.SEQPLAYER = VF_ANG.NativeSequencerHelper(modelID,VF_ANG.nativeEventHandler,renderer);
    } else if (VF_ANG.isHybridSequencerAvailable() === true) {
        scope.SEQPLAYER = renderer.HybridSequenceEngine(modelID, VF_ANG.nativeEventHandler, renderer);
    } else {
        scope.SEQPLAYER = new PTC.SequencePlayer(element.attr('id'), VF_ANG.nativeEventHandler, renderer);
        scope.SEQPLAYER.setSequenceAdapter(new PTC.ARPlayerAnimationAdapter(element.attr('id'),PTC.GLOBAL_SCENE));
    }

    scope.validSequenceLoaded = false;
    scope.SEQPLAYER.loadSequence(sequence, 1, function (object, result) {
        var currentSrc = element.attr("src");

        // Same as with modelLoaded flag I have to guard against repercussions of load callback firing after model
        // replace has been initiated.
        if (currentSrc !== startSrc) {
            console.log("Skipping sequence load finalization because currentSrc !== startSrc, currentSrc is '" +
                        currentSrc + " and startSrc was '" + startSrc + "'");
            return;
        }

        scope.$apply(function() {
            var currentSrc = element.attr("src");
            if (currentSrc === startSrc) {
                scope.me.steps = scope.SEQPLAYER.getTotalSteps();
                scope.me.currentStep = scope.SEQPLAYER.getCurrentStep();
                scope.me.playing = false;
                scope.validSequenceLoaded = true;
            }
        });

        // This is intentionally in a separate $apply block so that the listener on scope.me.currentStep gets fired before the 'sequenceloaded' event is emitted.
        scope.$apply(function() {
            var currentSrc = element.attr("src");
            if (currentSrc === startSrc) {
                scope.$emit('sequenceloaded', element.attr('id'), 'twx-dt-model', sequence);

                if (scope.me.steps > 0) {
                    var name = scope.SEQPLAYER.getStepName(scope.me.currentStep);
                    var newStepEventArgument = "(" + scope.me.currentStep + "/" + scope.SEQPLAYER.getTotalSteps() + ") " + name;
                    scope.$emit('newStep', newStepEventArgument);
                }
            }
        });
        if(typeof(applyTMLValuesFunc) === "function") {
            applyTMLValuesFunc();
        }
    });
};

VF_ANG.addServiceInvokeListener = function(scope) {
    scope.$on('serviceInvoke', function(evt, data) {
        var name = data.serviceName;
        if (scope[name] && scope.hasOwnProperty(name)) {  //Don't execute parent's listeners
            scope[name](data.params);
        }
    });
};

VF_ANG.setupSequence = function(scope, data, modelID, element, renderer, applyTMLValuesFunc) {
    scope.$watch(function () { return element.attr("sequence");}, function (value, oldValue) {
        if (value === oldValue) {  // this happens the first time the watch is fired.
            if (value === undefined || value === null || value === "") {  // this means no sequence is set.
                console.log("skipping initial sequence watch invocation when there is no sequence to set.");
                return;
            }
        }

        var sequenceToLoad = element.attr("sequence");
        data.tracker.models[data.name].sequenceToLoad = sequenceToLoad;

        if (data.tracker.models[data.name].modelLoaded) {
            VF_ANG.loadSequence(scope, data, modelID, element, renderer, sequenceToLoad, applyTMLValuesFunc);
        }
    });

    VF_ANG.addServiceInvokeListener(scope);

    scope.stop = function() {
        // currently "stop" will only stop playback of a playAll when it reaches the end of a step.
        scope.continuousPlayback = false;
    };

    scope.$watch('me.currentStep', function(newVal, oldVal){
        if (newVal && oldVal !== undefined) {
            if (typeof newVal === 'string') {
                newVal = Number(newVal);
            }
            var currentSeqStep = scope.SEQPLAYER.getCurrentStep();
            var totalSeqSteps = scope.SEQPLAYER.getTotalSteps();
            if (!scope.me.playing && newVal !== currentSeqStep && newVal <= totalSeqSteps && newVal > 0) {
                setTimeout(scope.goToStep, 10);
            }
        }
    });

    scope.playAll = function() {
        if (scope.validSequenceLoaded !== true) {
            return;
        }

        if (scope.me.playing === true) {
            console.log("Ignoring attempt to playAll while playing.");
            return;
        }

        // Automatically restart from the beginning if we're at the end of the sequence.
        var currentStep = scope.SEQPLAYER.getCurrentStep();
        if (currentStep > scope.SEQPLAYER.getTotalSteps()) {
            scope.reset(function() {
                setTimeout(scope.playAll, 100);
            });

            return;
        }

        scope.continuousPlayback = true;
        scope.SEQPLAYER.playSequence();
    };

    scope.play = function() {
        if (scope.validSequenceLoaded !== true) {
            return;
        }

        if (scope.me.playing === true) {
            console.log("Ignoring attempt to play while playing.");
            return;
        }

        // Automatically restart from the beginning if we're at the end of the sequence.
        var currentStep = scope.SEQPLAYER.getCurrentStep();
        if (currentStep > scope.SEQPLAYER.getTotalSteps()) {
            scope.reset(function() {
                setTimeout(scope.play, 100);
            });

            return;
        }

        scope.SEQPLAYER.playSequence();
    };

    scope.$on('stepstarted', function(event, targetID, unused_targetType, data) {
        // Check to make sure this event applies to the correct model.
        // since angular events are broadcast from the root scope we may get events pertaining to other twx-dt-models.
        if (modelID !== targetID) {
            return;
        }

        scope.$apply(function() {
            var parsedData = JSON.parse(data);
            scope.me.playing = true;
            scope.$emit('playstarted');
        });
    });

    scope.$on('stepcompleted', function(event, targetID, unused_targetType, data) {
        // Check to make sure this event applies to the correct model.
        // since angular events are broadcast from the root scope we may get events pertaining to other twx-dt-models.
        if (modelID !== targetID) {
            return;
        }

        scope.$apply(function() {
            var parsedData = JSON.parse(data);
            var name;

            if (parsedData.nextStep === -1) {
                // Reached the last step; unilaterally turn off continuousPlayback.
                scope.continuousPlayback = false;
            }

            if (parsedData.acknowledge) {
                // Acknowledgements turn off continuous playback.
                scope.continuousPlayback = false;

                // don't emit acknowledge event on a reset (known ThingView issue)
                if (parsedData.nextStep !== 0) {
                    setTimeout(function() {
                        scope.$emit('sequenceacknowledge', parsedData);
                    }, 0);
                }
            }

            if (scope.continuousPlayback === true) {
                setTimeout(function() {
                    scope.SEQPLAYER.playSequence();
                }, 100);
            } else {
                scope.me.playing = false;
                scope.$emit('playstopped', parsedData);
            }

            if (parsedData.nextStep !== -1) {
                scope.me.currentStep = parsedData.nextStep;
                name = scope.SEQPLAYER.getStepName(parsedData.nextStep);
                scope.$emit('newStep', "(" + parsedData.nextStep + "/" + scope.SEQPLAYER.getTotalSteps() + ") " + name);
            }
        });
    });

    scope.rewind = function(callback) {
        if (scope.validSequenceLoaded !== true) {
            return;
        }

        if (scope.me.playing === true) {
            console.log("Ignoring attempt to rewind while playing");
            return;
        }
        if (scope.SEQPLAYER.getCurrentStep() === 1) {
            console.log("Ignoring attempt to rewind when already at the beginning.");
            return;
        }

        scope.SEQPLAYER.previousSequence(callback);
    };

    scope.forward = function(callback) {
        if (scope.validSequenceLoaded !== true) {
            return;
        }

        if (scope.me.playing === true) {
            console.log("Ignoring attempt to forward while playing");
            return;
        }
        if (scope.me.currentStep > scope.SEQPLAYER.getTotalSteps()) {
            console.log("Ignoring attempt to forward when already at the last step.");
            return;
        }

        scope.SEQPLAYER.nextSequence(callback);
    };

    scope.goToStep = function(callback) {
        if (scope.validSequenceLoaded !== true) {
            return;
        }

        if (scope.me.playing === true) {
            return;
        }

        if (scope.SEQPLAYER.getCurrentStep() === scope.me.currentStep) {
            return;
        }

        scope.SEQPLAYER.goToStep(scope.me.currentStep, callback);
    };

    // scope.reset() is now asynchronous. callback will be invoked for after a successful reset.
    scope.reset = function(callback) {
        scope.SEQPLAYER.reset(function() {
            // applyTMLValues is mostly synchronous.
            applyTMLValuesFunc();

            var current = "";
            var name = "";
            if (scope.validSequenceLoaded === true) {
                current = scope.SEQPLAYER.getCurrentStep();
                name = scope.SEQPLAYER.getStepName(current);
            }
            scope.me.currentStep = current;
            scope.me.playing = false;
            scope.continuousPlayback = false;
            if (scope.validSequenceLoaded === true) {
                scope.$emit('newStep',"(" + current + "/" + scope.SEQPLAYER.getTotalSteps() + ") " + name);
            }
            scope.$emit('sequencereset', modelID, "twx-dt-model");
            // be backwards compatible for now and emit the old onReset event as well.
            // note that it doesn't have any extra event data associated with it.
            // Only hand-crafted TML examples utilize this event, and in most cases do nothing with it.
            // In the few cases that something is done, that work may nolonger be necessary due to
            // appropriately applying TML values after a reset.
            scope.$emit('onReset');
            scope.$applyAsync();

            if (typeof(callback) === "function") {
                setTimeout(callback, 0);
            }
        });
    };
};

VF_ANG.setTransformProps = function(obj, renderer) {
    renderer.setScale( obj.element.attr('id'),  obj.element.attr("sx"),  obj.element.attr("sy"),  obj.element.attr("sz"));
    renderer.setRotation( obj.element.attr('id'),  obj.element.attr("rx"),  obj.element.attr("ry"),  obj.element.attr("rz"));
    renderer.setTranslation( obj.element.attr('id'),  obj.element.attr("x"),  obj.element.attr("y"),  obj.element.attr("z"));
};

VF_ANG.setRenderingProps = function(obj, renderer) {
    var decalValue = obj.element.attr("decal");
    if(decalValue === undefined && (obj.objtype === "twx-dt-sensor" || obj.objtype === "twx-dt-svg" || obj.objtype === "twx-dt-label"  || obj.objtype === "twx-dt-image")) {
        decalValue = true;
    }
    var phantomValue = false;
    var forceHiddenValue = false;
    if (obj.objtype === 'twx-dt-model' || obj.objtype === 'twx-dt-modelitem'){
        phantomValue = obj.element.attr('phantom');
        forceHiddenValue = obj.element.attr('force-hidden');
    }

    if (typeof(renderer.setInteractableHint) === 'function') {
        if (obj.element.attr("interactable-hint") !== undefined) {
            var params = {
                "nodeId": obj.element.attr('id'),
                "interactable": obj.element.attr("interactable-hint")
            };
            renderer.setInteractableHint(params);
        }
    }

    renderer.setProperties( obj.element.attr('id'),
                            {
                                billboard:  obj.element.attr("billboard"),
                                occlude : obj.element.attr("occlude"),
                                hidden : obj.element.attr("hidden"),
                                opacity:  obj.element.attr("opacity"),
                                decal : decalValue,
                                shader : obj.element.attr("shader"),
                                phantom: phantomValue,
                                forceHidden: forceHiddenValue,
                                experimentalOneSided: obj.element.attr("experimental-one-sided")
                            });
};

VF_ANG.setTransformAndRenderingProps = function(asset, renderer) {
    VF_ANG.setTransformProps(asset, renderer);
    VF_ANG.setRenderingProps(asset, renderer);
};

VF_ANG.setScopeSequenceListValue = function(scope, list) {
    scope.$apply(function() {
        if (!scope.me) {
            scope.me = {};
        }
        scope.me.sequenceList = list;
    });
};

VF_ANG.hasSetModelURL = function() {
    return window.thingworxview && window.thingworxview.configuration && window.thingworxview.configuration.setModelURL === true;
};

VF_ANG.hasBatch = function() {
    return window.thingworxview && window.thingworxview.configuration && window.thingworxview.configuration.batchProcessing === true;
};

VF_ANG.addAsset = function(renderer, asset, addFunc) {
    if (VF_ANG.hasBatch()) {
        renderer.startBatch();
        addFunc();
        VF_ANG.setTransformAndRenderingProps(asset, renderer);
        renderer.executeBatch();
    } else {
        addFunc();
    }
};

VF_ANG.addAssetCallback = function(scope, asset, renderer) {
    VF_ANG.applyWatch(scope, asset.element, renderer);
    if (!VF_ANG.hasBatch()) {
        VF_ANG.setTransformAndRenderingProps(asset, renderer);
    }
};

VF_ANG.addMarker = function(renderer, element, addFunc) {
    if (VF_ANG.hasBatch()) {
        renderer.startBatch();
        addFunc();
        renderer.setRotation(element.attr("id"), element.attr("rx"), element.attr("ry"), element.attr("rz"));
        renderer.setTranslation(element.attr("id"), element.attr("x"), element.attr("y"), element.attr("z"));
        renderer.executeBatch();
    } else {
        addFunc();
    }
};

VF_ANG.modelItemDOMLookup = function(model, idPath) {
    var modelItem = null;
    while(idPath.length > 0) {
        var selector = 'twx-dt-modelitem[occurrence="' + idPath + '"]';
        // Look for descendants of model first
        modelItem = model.querySelector(selector);
        if (!modelItem) {
            // Look for twx-dt-modelitem as descendant of twx-dt-view
            modelItem = document.querySelector(selector + '[for="' + model.id + '"]');
        }
        if (modelItem) {
            return modelItem;
        } else {
            idPath = idPath.substr(0, idPath.lastIndexOf('/')); //substr(0, -1) returns ""
        }
    }
    return null;
};

/**
 * Calculates the height, width, padding, and border size of the canvas to take into account pixels per meter
 *
 * returns {} with width, height, borderWidth, and padding properties
 */
VF_ANG.calculateCssSizes = function calculateCssSizes(element, imageObj, computedStyle, heightAttr, widthAttr) {
    // calculate the required physical size
    var imagePhysicalHeight = Number(heightAttr);
    var imagePhysicalWidth = Number(widthAttr);
    if (!imagePhysicalHeight && !imagePhysicalWidth) {
        imagePhysicalHeight = imageObj.height / 1000;
        imagePhysicalWidth = imageObj.width / 1000;
    }
    else if (!imagePhysicalHeight) {
        imagePhysicalHeight = imageObj.height * imagePhysicalWidth / imageObj.width;
    }
    else if (!imagePhysicalWidth) {
        imagePhysicalWidth = imageObj.width * imagePhysicalHeight / imageObj.height;
    }

    // calculate the scale (pixels per meter)
    var heightScale = imageObj.height / imagePhysicalHeight;
    var widthScale = imageObj.width / imagePhysicalWidth;
    var ppm_scale = heightScale;
    var scaled_image_height = imageObj.height;
    var scaled_image_width = imagePhysicalWidth * ppm_scale;
    if (widthScale < heightScale) {
        ppm_scale = widthScale;
        scaled_image_height = imagePhysicalHeight * ppm_scale;
        scaled_image_width = imageObj.width;
    }
    var padding = Math.round(parseFloat(computedStyle.paddingTop) * ppm_scale / VF_ANG.CSS_PX_TO_METER_SCALE);
    var borderWidth = Math.round(parseFloat(computedStyle.borderTopWidth) * ppm_scale / VF_ANG.CSS_PX_TO_METER_SCALE);
    if (!padding) {
        padding = 0;
    }
    if (!borderWidth) {
        borderWidth = 0;
    }

    imagePhysicalWidth = imagePhysicalWidth + (2 * (padding + borderWidth) / ppm_scale);
    imagePhysicalHeight = imagePhysicalHeight + (2 * (padding + borderWidth) / ppm_scale);

    return {
        height: scaled_image_height,
        width: scaled_image_width,
        borderWidth: borderWidth,
        imagePhysicalHeight: imagePhysicalHeight,
        imagePhysicalWidth: imagePhysicalWidth,
        padding: padding
    };
};

/**
 * Draws the sensor label text to the given canvas, formerly known as drawTextOnCanvas
 *
 * Differs from the 3dLabel widget with respect to padding, border, and height customization
 * but there may be yet some ways to refactor that method to share more.
 *
 * @param props Widget properties object
 * @param canvas Canvas dom element
 * @param element jqlite wrapped widget dom element.
 */
VF_ANG.drawSensorText = function drawSensorText(props, canvas, element) {
    if (props.text !== undefined && props.text.length) {

        var textAttrs = VF_ANG.deriveTextAttrs(props, element && element[0]);

        //appData.props['textattrs'] = textAttrs;

        var ctx = canvas.getContext('2d');

        ctx.font = textAttrs.font;

        if (textAttrs.textalign !== undefined) {
            ctx.textAlign = textAttrs.textalign;
        }

        if (textAttrs.textbaseline !== undefined) {
            ctx.textBaseline = textAttrs.textbaseline;
        }

        if (textAttrs.fillColor !== undefined) {
            ctx.fillStyle = textAttrs.fillColor;
            ctx.fillText(props.text, Number(textAttrs.x), Number(textAttrs.y));
        }

        if (textAttrs.strokeColor !== undefined && textAttrs.strokeColor !== null) {
            ctx.strokeStyle = textAttrs.strokeColor.trim();
            ctx.lineWidth = textAttrs.lineWidth;

            ctx.strokeText(props.text, Number(textAttrs.x), Number(textAttrs.y));
        }
    }
    else {
        console.log("skipping drawing the empty string: [", props.text, "]");
    }
};

VF_ANG.deriveTextAttrs = function deriveTextAttrs(props, element) {
    var textAttrs = {
        "fillColor": "rgba(255, 255, 255, 1)",
        "strokeColor": "rgba(255, 255, 255, 1)",
        "x": props.textx,
        "y": props.texty,
        "linewidth": VF_ANG.DEFAULT_LINE_WIDTH,
        "textbaseline": "middle",
        "textalign": "center"
    };

    textAttrs = VF_ANG.overrideLocallyDefinedInlineAttributes(textAttrs, props.textattrs);
    if (element) {
        var computed = window.getComputedStyle(element);
        if (computed) {
            var cssTextAttrs = VF_ANG.getCssAttrs(computed);
            var hasBuilderFont = !!textAttrs.font;
            Object.keys(cssTextAttrs).forEach(function(key) {
                var value = cssTextAttrs[key];
                if (value) {
                    if (!(key === 'fillColor' && value === 'rgb(0, 0, 0)')) {
                        //Maintain backwards compatible behavior
                        //Avoid overridding custom color with default CSS value unless its actually set by stateformat
                        textAttrs[key] = value;
                    }

                }
            });
            //Better backwards compatibility for sensor default font
            //To support CSS fonts, will need to have custom TML specify font properties or css if the new default is different
            if (!hasBuilderFont) {
                textAttrs.font = '30px Arial';
            }
            VF_ANG.applyFontOverrideValues({
                textAttrs: textAttrs,
                cssFontFamily: cssTextAttrs.fontFamily,
                fontSize: cssTextAttrs.fontSize
            });
        }
    }
    return textAttrs;
};


VF_ANG.overrideLocallyDefinedInlineAttributes = function overrideLocallyDefinedInlineAttributes(locallyDefined, builderDefined) {
    if (builderDefined !== undefined) {
        var tmp = builderDefined.split(";");
        var i;
        for (i = 0; i < tmp.length; i++) {
            if (tmp[i].trim().length === 0) {
                continue;
            }
            var inds = tmp[i].split(":");
            var key = inds[0].toLowerCase().trim();
            if (key === 'fill' || key === 'stroke') {
                key += 'Color';
            }
            locallyDefined[key] = inds[1].trim();
        }
    }
    return locallyDefined;
};

VF_ANG.setPropertiesToWidget = function(widgetId, properties) {
    var element = document.getElementById(widgetId);
    if(element) {
        for(var key in properties){
            element.setAttribute(key, properties[key]);
        }
    } else {
        console.error("attempted to set properties to widget [" + widgetId + "], but this widget doesn't exist");
    }
};

var ArSensor = ( function(me)  {
    var INLINE_SVG_HEADER = "data:image/svg+xml;base64,";

    function drawImageOnCanvas(props, imageObj, canvas, padding, borderWidth) {
        var imgAttrs = {
            "x": props.imagex ? props.imagex : 0,
            "y": props.imagey ? props.imagey : 0,
            "width": props.imageWidth,
            "height": props.imageHeight
        };

        imgAttrs = VF_ANG.overrideLocallyDefinedInlineAttributes(imgAttrs, props.imageattrs);

        var ctx = canvas.getContext('2d');
        ctx.drawImage(imageObj, Number(imgAttrs.x) + padding + borderWidth, Number(imgAttrs.y) + padding + borderWidth, Number(imgAttrs.width), Number(imgAttrs.height));
    }

    function createCanvas(props) {
        var canvas = document.createElement('canvas');

        canvas.width = props.canvaswidth;
        canvas.height = props.canvasheight;

        return canvas;
    }

    function adjustCanvasSize(props, imageObj, canvas, padding, borderWidth, element) {
        var width = 0;
        var height = 0;
        var ctxt = canvas.getContext('2d');

        function adjustToImage() {
            var paddingAndborder = padding + borderWidth;
            var doublePaddingWidth = paddingAndborder * 2;

            var imagex = props.imagex ? Number(props.imagex) + paddingAndborder : paddingAndborder;
            if (width < imageObj.width + imagex) {
                width = imageObj.width + imagex + paddingAndborder;
            }
            var imagey = props.imagey ? Number(props.imagey) + paddingAndborder : paddingAndborder;
            if (height < imageObj.height + imagey) {
                height = imageObj.height + imagey + paddingAndborder;
            }
        }

        function adjustToText() {
            var textAttrs = VF_ANG.deriveTextAttrs(props, element);

            var textBasedWidth = Number(props.textx) + VF_ANG.measureTextWidth(ctxt, props.text, textAttrs);
            if (width < textBasedWidth) {
                width = textBasedWidth;
            }

            var textBasedHeight = Number(props.texty) + parseFloat(textAttrs.font);
            if (height < textBasedHeight) {
                height = textBasedHeight;
            }
        }

        switch (props.canvasgrowthoverride) {
            case 'canvas':
                width = canvas.width;
                height = canvas.height;
                break;
            case 'image':
                adjustToImage();
                break;
            case 'text':
                adjustToText();
                break;
            case 'image+text':
                adjustToImage();
                adjustToText();
                break;
            default:
                width = canvas.width;
                height = canvas.height;
                if (!width || !height) {
                    adjustToImage();
                }

                break;
        }

        props.canvasheight = height;
        props.canvaswidth = width;

        canvas.height = height;
        canvas.width = width;
    }

    me.newAjaxImageRequest = function newAjaxImageRequest(url, listener) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = listener;
        httpRequest.open("GET", url);
        httpRequest.send();
        return httpRequest;
    };

    /**
     * Returns new svg xml text taking the element computed style into account
     * @param svgText - XML text of SVG image to modify
     * @param el - Dom element to use for the computed style
     */
    me.getSvgWithStyleTag = function modifySvgWithStyle(svgText, el) {
        var cc = window.getComputedStyle(el);
        var fill = cc.getPropertyValue('--foregroundColor');
        var baseFill = cc.backgroundColor;

        var style = '<style type="text/css" stateformat="true">\n';
        if (baseFill && baseFill.trim() && baseFill !== 'rgba(0, 0, 0, 0)') {
            style += '.base {  fill: ' + baseFill + ' !important; }\n';
        }
        if (fill && fill.trim() && fill !== 'rgba(0, 0, 0, 0)') {
            style += '.main {  fill: ' + fill + ' !important; }\n';
        }
        style += '</style>\n';

        var dataEl = angular.element(svgText);
        dataEl.prepend(angular.element(style));
        //Ignore leading xml or comment elements
        for (var i = 0, l = dataEl.length; i < l; i++) {
            var item = dataEl[i];
            //console.log('Check item', item.tagName, item.outerHTML);
            if (item.tagName && item.tagName.toLowerCase() === 'svg') {
                svgText = item.outerHTML;
            }
        }

        //console.log("new image xml:", baseFill, fill, svgText);
        return svgText;
    };

    /**
     * Handle sensor canvas fill color to be the secondarBackgroundColor
     * and get its value without the backgroundColor default override.
     * @param element - jqLite DOM element
     * @param cssAttrs - Object with color properties to apply, will be modified to handle backgroundColor for sensors
     * @param computedStyle - element computed style object
     */
    me.handleSensorBackgroundColor = function(element, cssAttrs, computedStyle) {
        if (element[0].tagName === 'TWX-DT-SENSOR') {
            cssAttrs.backgroundColor = computedStyle.getPropertyValue('--secondaryBackgroundColorNoDefault');
            if (!cssAttrs.backgroundColor || !cssAttrs.backgroundColor.trim()) {
                cssAttrs.backgroundColor = undefined;
            }
        }
    };

    me.isSVG = function isSVG(imageURL) {
        return !!imageURL && (imageURL.toLowerCase().endsWith(".svg") || imageURL.startsWith(INLINE_SVG_HEADER));
    };

    me.hasStateDefStyles = function hasStateDefStyles(el) {
        var parentTwxWidget = VF_ANG.getParentTwxWidget(el);
        return parentTwxWidget && parentTwxWidget.classList && parentTwxWidget.classList.contains('has-statedef-styles');
    };

    // Load an image from a URL and invoke callback; the callback will be pass 'null' in case of failure and an Image object on success.
    // imageURL: In case of a data URL, load it to the Image object directly. Otherwise, download from it and load the data to the Image object.
    me.loadImage = function loadImage(imageURL, el, callback) {
        var image = new Image();

        image.onload = function() {
            callback(image);
        };

        image.onerror = function(e) {
            console.log("Image load failed for [" + imageURL + "]");
            console.log(e);
            callback(null);
        };

        if (me.isSVG(imageURL) && me.hasStateDefStyles(el)) {
            if (imageURL && imageURL.startsWith(INLINE_SVG_HEADER)) {
                var encodedSVGData = imageURL.substr(INLINE_SVG_HEADER.length);
                var decodedSVGData = atob(encodedSVGData);
                var data = me.getSvgWithStyleTag(decodedSVGData, el);
                image.origsrc = INLINE_SVG_HEADER + btoa(data);
                image.src = image.origsrc;
            } else {
                var responseListener = function responseListener(resp) {
                    if (this.readyState === XMLHttpRequest.DONE) {
                        if (this.status === 200) {
                            var data = me.getSvgWithStyleTag(this.responseText, el);
                            var image64 = INLINE_SVG_HEADER + btoa(data);
                            image.origsrc = image64;
                            image.src = image64;
                        }
                    }
                };
                me.newAjaxImageRequest(imageURL, responseListener);
            }
        }
        else {
            if(imageURL && imageURL.startsWith('http')) {
                // if it's a remote URL, set the crossOrigin attribute so we can get image
                image.crossOrigin = "Anonymous";
            }
            // Capture the original literal string as a separate parameter.
            // This is because reading from image.src will result in a fully-qualified URL making it harder to compare with the
            // DOM attribute on the sensor.
            image.origsrc = imageURL;
            image.src = imageURL;
        }
    };

    // Returns a Data URL representation of a canvas, or null if any error happened.
    me.rebuildCanvas = function rebuildCanvas(element, imageObj) {
        var props = {};
        var canvas;

        me.CANVAS_RENDERING_ATTRIBUTES.forEach(function(canvasAttr) {
            props[canvasAttr] = element.attr(canvasAttr);
        });

        // id is useful when debugging, but we do not want to setup an angular $watch on it; so it isn't in the list of CANVAS_RENDERING_ATTRIBUTES
        props.id = element.attr('id');

        try {
            canvas = createCanvas(props);
            var computedStyle = window.getComputedStyle(element[0]);
            var calculatedSizes = VF_ANG.calculateCssSizes(element, imageObj, computedStyle, element.attr("height"), element.attr("width"));
            props.imageHeight = calculatedSizes.height;
            props.imageWidth = calculatedSizes.width;
            var extraSize = 2 * (calculatedSizes.padding + calculatedSizes.borderWidth);
            if (element[0].tagName === 'TWX-DT-IMAGE') {  //exclude gauge, has too many complications with text placement, growth override, etc.
                canvas.width = calculatedSizes.width + extraSize;
                canvas.height = calculatedSizes.height + extraSize;
                var cssAttrs = VF_ANG.getCssAttrs(computedStyle);
                me.handleSensorBackgroundColor(element, cssAttrs, computedStyle);
                VF_ANG.drawTextBorder(canvas.getContext('2d'), cssAttrs, canvas.width, canvas.height, calculatedSizes.borderWidth);
            }
            else {
                adjustCanvasSize(props, imageObj, canvas, calculatedSizes.padding, calculatedSizes.borderWidth, element[0]);
            }

            drawImageOnCanvas(props, imageObj, canvas, calculatedSizes.padding, calculatedSizes.borderWidth);
            VF_ANG.drawSensorText(props, canvas, element);
            return {
                imageData: canvas.toDataURL(),
                imagePhysicalHeight: calculatedSizes.imagePhysicalHeight,
                imagePhysicalWidth: calculatedSizes.imagePhysicalWidth
            };
        }
        catch (e) {
            console.log(e);
            return {};
        }
    };

    // These are the properties used in rendering a Sensor Canvas.
    me.CANVAS_RENDERING_ATTRIBUTES = [
        'canvaswidth',
        'canvasheight',
        'canvasgrowthoverride',
        'text',
        'textattrs',
        'textx',
        'texty',
        'imageattrs',
        'imagex',
        'imagey'
    ];

    return me;
}( ArSensor || {} ) );
