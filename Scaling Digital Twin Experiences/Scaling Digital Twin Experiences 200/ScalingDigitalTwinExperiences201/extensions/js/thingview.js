"use strict";

/**
 * @file thingview.js
 * @fileOverview
 * @author PTC
 */

var Module = {
    'locateFile': function (name) {
        return ThingView.modulePath + name;
    },
    /**
     * Callback when the ThingView asm/wasm module has initialised
     * @private
     */
    onRuntimeInitialized : function () {
        ThingView.loaded = true;
        if (ThingView.initCB != undefined) {
            ThingView._completeInit();
            ThingView._setResourcePath(ThingView.resourcePath);
            ThingView.LoadPreferences(function(jsonObj, defaultPrefs) {
                if (jsonObj !== undefined) {
                    ThingView.StorePreferences(jsonObj, defaultPrefs);
                }
                if (ThingView.initCB) {
                    ThingView.initCB();
                }
            });
        }
    }
};

/**
 * The ThingView global object is created automatically when a html page includes thingview.js in a script source tag.
 * @global
 * @class
 */
var ThingView = (function () {
    var id = 0;
    var thingView;
    var _currentApp = null;
    var _currentSession = null;
    var _nextCanvasId = 0;
    var resourcePath = null;
    var loadedPreferences = {};
    var defaultPreferences = {};
    var s_fileversion = "0.56.0.0";
    var s_productversion = "0.56.0+N3EIXi";
    var s_productname = "ThingView 0.56";
    var doCapture = false;
    var captureWrapper;
    var requestID = null;
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var edge = /Edge\/\d+/.test(navigator.userAgent);
    var thingView2dScript = "";

    var returnObj = {

        /**
          * Callback is fired when thingview has initialised
          * @callback initCallback
          * @memberof ThingView.init
          */

        /**
          * Initialise ThingView Viewer
          * @method init
          * @param {string} path - The url to the web server endpoint where ThingView component has been deployed.
          * @param {initCallback} initCB - Called once ThingView has initialised
          * @async
          * @memberof ThingView
          */
        init: function (path, initCB) {
            ThingView.resourcePath = path;
            ThingView.initCB = initCB;
            if (ThingView.loaded) {
                ThingView._completeInit();
                ThingView.LoadPreferences(function(jsonObj, defaultPrefs) {
                    if (jsonObj !== undefined) {
                        ThingView.StorePreferences(jsonObj, defaultPrefs);
                    }
                    if (ThingView.initCB) {
                        ThingView.initCB();
                    }
                });
            }
            else {
                var head = document.getElementsByTagName('head').item(0);
                ThingView.id = document.createElement("SCRIPT");
                var loaderLib;
                if ( (typeof(WebAssembly) == "undefined") || (iOS == true) || (edge == true))
                    loaderLib = "libthingview.js";
                else
                {
                    loaderLib = "libthingview_wasm.js";
                    ThingView.id.onerror = this.failedWasmLoad;
                }

                if (path) {
                    var idx = path.lastIndexOf('/');
                    if ((idx == -1) ||  (idx < path.length-1))
                        path += "/";
                    loaderLib = path + loaderLib;
                    ThingView.modulePath = path;
                }
                ThingView.id.src = loaderLib;
                head.appendChild(ThingView.id);
            }
        },
        /**
          * Load the asm module if the wasm module fails to load
          * @private
          * @memberof ThingView
          */
        failedWasmLoad: function() {
            console.warn("Failed loading wasm so try asmjs");
            var head = document.getElementsByTagName('head').item(0);

            var id = document.createElement("SCRIPT");
            id.src =ThingView.modulePath + "libthingview.js";
            head.appendChild(id);

        },
        /**
         * Return the ThingView date code
         */
        GetDateCode: function() {
                return thingView.GetDateCode();
        },
        /**
         * Return the ThingView file version
         */
        GetFileVersion: function() {
            return s_fileversion;
        },
        _completeInit: function () {
            thingView = Module.ThingView.GetThingView();
            if (requestID == null)
                requestID = requestAnimationFrame(_DoRender);
        },
        _setResourcePath: function(path) {
            thingView.SetResourcePath(path);
        },
        /**
          * @deprecated
          * @memberof ThingView
          * @see ThingView.SetDefaultSystemPreferences
          * @see ThingView.SetSystemPreferencesFromJson
          * @see ThingView.AddSystemPreferencesFromJson
          */
        SetInitFlags: function (flags) {
            thingView.SetInitFlags(flags);
        },
        /**
          * Set preferences to CreoView or ThingView defaults
          * @memberof ThingView
          * @param {enum}  prefs - Apply default settings for ThingView
          * <br>
          * <br>Module.ApplicationType.CREOVIEW
          * <br>Module.ApplicationType.THINGVIEW
          */
        SetDefaultSystemPreferences: function (prefs) {
            thingView.SetDefaultSystemPreferences(prefs);
        },
        /**
          * Set preferences from json string. This API clears any previously set preferences.
          * @memberof ThingView
          * @param {string} prefstr
          */
        SetSystemPreferencesFromJson: function (prefstr) {
            thingView.SetSystemPreferencesFromJson(prefstr);
        },
        /**
          * Add preferences from json string. This API can be used after setting default preferences
          * via the following API so only deltas from the defaults are requried  {@link ThingView.SetDefaultSystemPreferences}
          * @memberof ThingView
          * @param {string} prefstr - JSON preference string
          */
        AddSystemPreferencesFromJson: function (prefstr) {
            thingView.AddSystemPreferencesFromJson(prefstr);
        },
        /**
          * Create a ThingView application with access to ModelItem capabilities.
          * It is recomended to use the {@link ThingView.CreateCVApplication|CreateCVApplication} API to create
          * the application unless you require access to ModelItem APIs.
          * @memberof ThingView
          * @param {string} parentCanvasId - div id to embed ThingView within
          */
        CreateTVApplication: function(parentCanvasId) {
            var app = _createTVApplication(parentCanvasId);
            return app;
        },
        /**
          * Create a CreoView application
          * @memberof ThingView
          * @param {string} parentCanvasId - div id to embed ThingView within
          */
        CreateCVApplication: function(parentCanvasId) {
            var app = _createCVApplication(parentCanvasId);
            return app;
        },
        /**
         * Set a value in megabytes for memory usage (geometry only) that once reached will prioritize using less memory over loading faster
         * @param {number} megaBytes
         */
        SetHighMemoryUsageValue: function (megaBytes) {
            thingView.SetHighMemoryUsageValue(megaBytes);
        },
        ClearCanvas: function (){
            _ClearCanvas();
        },
        EnableSession: function(session) {
            _enableSession(session);
        },
        DeleteSession: function(session) {
            _deleteSession(session);
        },
        Hide3DCanvas: function(session) {
            if (session) {
                _hide3DCanvas(session);
            } else {
                _hide3DCanvas(_currentSession);
            }
        },
        Show3DCanvas: function(session) {
            if (session) {
                _show3DCanvas(session);
            } else {
                _show3DCanvas(_currentSession);
            }
        },
        StorePreferences: function(jsonObj, defaultPrefs) {
            try {
                if (jsonObj != undefined) {
                    ThingView.loadedPreferences = jsonObj;
                }
                if (defaultPrefs != undefined) {
                    ThingView.defaultPreferences = defaultPrefs;
                }
            } catch (e) {
                console.warn("StorePreferences, exception: " + e);
            }
        },
        LoadPreferences: function(callbackFunc) {
            _loadPreferences(function(jsonObj, defaultPrefs) {
                callbackFunc(jsonObj, defaultPrefs);
            });
        },
        GetLoadedPreferences: function() {
            return _getLoadedPreferences();
        },
        CaptureCanvas: function(captureFunc) {
            doCapture = true;
            captureWrapper = captureFunc;
        },
        GetNextCanvasID: function() {
            var returnID = _nextCanvasId;
            _nextCanvasId++;
            return returnID;
        },
        LoadDocument: function(viewable, parentCanvasId, model, watermarkUrl, isWindowless, callback) {
            if (thingView2dScript == "") {
                thingView2dScript = document.createElement("script");
                thingView2dScript.src = ThingView.resourcePath ? ThingView.resourcePath + "/thingview2d.js" : "thingview2d.js";
                thingView2dScript.onload = function(){
                    ThingView.LoadDocument(viewable, parentCanvasId, model, watermarkUrl, isWindowless, callback);
                };
                document.getElementsByTagName('head').item(0).appendChild(thingView2dScript);
            }
        },
        LoadPdfAnnotationSet: function(viewable, parentCanvasId, docScene, structure, annoSet, watermarkUrl, isWindowless, callback) {
            if (thingView2dScript == "") {
                thingView2dScript = document.createElement("script");
                thingView2dScript.src = ThingView.resourcePath ? ThingView.resourcePath + "/thingview2d.js" : "thingview2d.js";
                thingView2dScript.onload = function(){
                    ThingView.LoadPdfAnnotationSet(viewable, parentCanvasId, docScene, structure, annoSet, watermarkUrl, isWindowless, callback);
                };
                document.getElementsByTagName('head').item(0).appendChild(thingView2dScript);
            }
        },
        LoadPDF: function(parentCanvasId, data, isUrl, watermarkUrl, isWindowless, callback) {
            if (thingView2dScript == "") {
                thingView2dScript = document.createElement("script");
                thingView2dScript.src = ThingView.resourcePath ? ThingView.resourcePath + "/thingview2d.js" : "thingview2d.js";
                thingView2dScript.onload = function(){
                    ThingView.LoadPDF(parentCanvasId, data, isUrl, watermarkUrl, isWindowless, callback);
                };
                document.getElementsByTagName('head').item(0).appendChild(thingView2dScript);
            }
        },
        IsPDFSession: function() {
            return false;
        },
        IsSVGSession: function() {
            return false;
        },
        /**
          * Force Edge browser to use WASM when embedded in Creo View
          * @private
          * @memberof ThingView
          */
        OverrideEdgeValue: function(val) {
            edge = val;
        },
        SetPrintDeprecated: function() {
            thingView.SetPrintDeprecated();
        },
        HasUsedDeprecated: function() {
            return thingView.HasUsedDeprecated();
        },
        ResetDeprecatedUse: function() {
            thingView.ResetDeprecatedUse();
        }
    };
    return returnObj;// End of public functions

    function _DoRender(timeStamp) {
        var doRender = true;
        try
        {
            if((doCapture === true) && (captureWrapper !== undefined) && (captureWrapper instanceof Function)) {
                doCapture = false;
                captureWrapper(function() {
                    thingView.DoRender(timeStamp);
                });
            } else {
                thingView.DoRender(timeStamp);
            }
        } catch (err) {
            console.error("Javascript caught exception "+ err);
            doRender = false;
        }
        if (doRender)
            requestID = requestAnimationFrame(_DoRender);
    }

    function _createTVApplication(parentCanvasId)
    {
        var sessionCanvas = document.createElement("canvas");
        var parent = document.getElementById(parentCanvasId);
        sessionCanvas.id = parentCanvasId + "_CreoViewCanvas" + _nextCanvasId;
        _nextCanvasId++;
        var posStyle = "position: relative; width: 100%; height: 100%;";
        var selStyle = "-moz-user-select: none; -webkit-user-select: none; -ms-user-select: none; user-select: none;";
        sessionCanvas.setAttribute('style', posStyle + selStyle);

        var width = parent.clientWidth;
        var height = parent.clientHeight;

        sessionCanvas.width = width;
        sessionCanvas.height = height;
        parent.insertBefore(sessionCanvas, parent.childNodes[0]);

        sessionCanvas.oncontextmenu = function (e) {
            e.preventDefault();
            return false;
        };
        _currentApp = thingView.CreateTVApplication(sessionCanvas.id);
        _currentSession = _currentApp.GetSession();
        return _currentApp;
    }

    function _createCVApplication(parentCanvasId) {
        var sessionCanvas = document.createElement("canvas");
        var parent = document.getElementById(parentCanvasId);
        sessionCanvas.id = parentCanvasId + "_CreoViewCanvas" + _nextCanvasId;
        _nextCanvasId++;
        var posStyle = "position: relative; width: 100%; height: 100%;";
        var selStyle = "-moz-user-select: none; -webkit-user-select: none; -ms-user-select: none; user-select: none;";
        sessionCanvas.setAttribute('style', posStyle + selStyle);

        var width = parent.clientWidth;
        var height = parent.clientHeight;

        sessionCanvas.width = width;
        sessionCanvas.height = height;
        parent.insertBefore(sessionCanvas, parent.childNodes[0]);

        sessionCanvas.oncontextmenu = function (e) {
            e.preventDefault();
            return false;
        };
        _currentApp = thingView.CreateCVApplication();
        _currentSession = _currentApp.GetSession();
        return _currentApp;
    }

    function _ClearCanvas() {
        if (_IsPDFSession()) {
            var session_html = Module.castToSession_html(_currentSession);
            var canvasId = session_html.GetCanvasName();
            var canvas = document.getElementById(canvasId);
            var context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    function _enableSession(session)
    {
        if (_currentSession != null)
        {
            _currentSession.Disable();
        }
        session.Enable();
        _currentSession = session;
    }

    function _deleteSession(session) {
        var app = session.GetApplication();
        if (_currentSession == session) {
            _currentSession = null;
            _currentApp = null;
        }
        var session_html = Module.castToSession_html(session);
        var canvasId = session_html.GetCanvasName();
        var canvas = document.getElementById(canvasId);
        session.delete();
        session_html.delete();
        app.delete();
        if (canvas != null && canvas.parentElement != null)
            canvas.parentElement.removeChild(canvas);
    }

    function _loadPreferences(callback) {
        callback();
    }

    function _hide3DCanvas(session){
        var session_html = Module.castToSession_html(session);
        var canvasId = session_html.GetCanvasName();
        if (canvasId) {
            var canvas = document.getElementById(canvasId);
            canvas.setAttribute('style', "width: 0%; height: 0%");
        }
    }

    function _show3DCanvas(session){
        var session_html = Module.castToSession_html(session);
        var canvasId = session_html.GetCanvasName();
        var canvas = document.getElementById(canvasId);
        canvas.setAttribute('style',"width: 100%; height: 100%");
        canvas.parentNode.style.overflow = "";
    }

    function _getLoadedPreferences() {
        if (ThingView.loadedPreferences) {
            if (Object.keys(ThingView.loadedPreferences).length > 0) {
                return ThingView.loadedPreferences;
            }
        }
        return {};
    }
})();
