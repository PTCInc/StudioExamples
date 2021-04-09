/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
/* jshint latedef:false, multistr:true, browser: true, unused: vars */

/**
 * This file is the js Thingview renderer adapter, used in the canvas and preview pages to render 3d content.
 * It is not included in the experience runtime in the View app for mobile
 * Note that there are 2 controllers, 2 cvapi callbacks, etc below for each use-case (canvas, preview)
 * The ThingView init callback cannot take multiple listeners yet.
 */
(function () {
  'use strict';

  // Inform vuforia-angular.js about the configuration and capabilities of the preview client
  window.thingworxview = {
    configuration: {
      platform: 'preview',
      nativeSequencer: true,
      setModelURL: true,
      batchProcessing: true,
    },
  };

  var selectedWidget;
  var unRegSelect, unRegDeselect, unRegMove, unRegLoaded, unRegReady, unRegLoadErr;

  var twxWidgets = angular.module('twx-mobile-widgets-3d-ng', ['ngWidget3dUtils']);
  var twxWidgets2 = angular.module('twx.byoc', []);

  twxWidgets.factory('threeJsTmlRenderer', renderer);
  twxWidgets2.factory('threeJsTmlRenderer', renderer);
  twxWidgets.value('thingViewPath', 'extensions');
  twxWidgets2.value('thingViewPath', 'extensions');

  function isModelTargetTag(tagName) {
    return tagName === 'twx-dt-target-model' || tagName === 'twx-dt-target-advanced-model';
  }

  function is3DButtonTag(tagName) {
    return (
      tagName === 'twx-dt-3dbutton' ||
      tagName === 'twx-dt-3dpress-button' ||
      tagName === 'twx-dt-3dimage-button' ||
      tagName === 'twx-dt-3dtoggle-button' ||
      tagName === 'twx-dt-3dcheckbox-button'
    );
  }

  function is3DPanelTag(tagName) {
    return tagName === 'twx-dt-3dvideo' || tagName === 'twx-dt-3daudio' || tagName === 'twx-dt-3dpanel';
  }

  function isAreaTargetTag(ctrlWidget) {
    // Area Target is implemented as a custom widget with a model child representing the target
    // Checking tag should be done in both model child and area target parent
    if (!ctrlWidget) {
      return false;
    }
    if (ctrlWidget.getWidgetTagName() === 'twx-dt-target-area') {
      return true;
    } else if (ctrlWidget.parent && ctrlWidget.parent.getWidgetTagName() === 'twx-dt-target-area') {
      return true;
    }
    return false;
  }

  function getAreaTargetCtrl(ctrlWidget) {
    if (ctrlWidget && ctrlWidget.parent) {
      return ctrlWidget.parent;
    }
    return ctrlWidget;
  }

  function renderer($rootScope, $timeout, thingViewPath) {
    /* jshint validthis: true */
    var app, session, scene, view, cvApi;
    var renderStat;
    var ctx = this;
    var floor = { size: 0, pos: { x: 0, y: 0 }, fillColor: 0x80808080, gridColor: 0x80808080 };
    var stepPlaying = false;
    $rootScope.thingViewReady = false;

    var getCanvasOffsetTop = function (el) {
      var offsetTop = 0;
      var offsetParent = el.offsetParent;
      while (offsetParent && offsetParent.tagName !== 'body') {
        offsetTop += offsetParent.offsetTop;
        offsetParent = offsetParent.offsetParent;
      }
      getCanvasOffsetTop = function () {
        return offsetTop;
      }; //Memoize
      return offsetTop;
    };

    function cvApiReady() {
      if (!$rootScope.thingViewReady) {
        $rootScope.thingViewReady = true;
        addTwxCallbacks();
        $rootScope.$applyAsync();
      }
      if (!session) {
        var els = document.querySelectorAll('twx-dt-view');

        if (els && els.length) {
          var el = els[els.length - 1];
          if (el) {
            if (!el.id) {
              el.id = 'twxDtView' + Date.now();

              const viewScope = angular.element(el).scope();
              const is2D = viewScope ? viewScope.is2D : false;

              if (el.parentElement && !is2D) {
                var parent = el.parentElement;
                parent.setAttribute('style', 'position: absolute; width: 100vw; height: 100vh; top: 0px; left: 0px;');
              }
            }
          }

          let loadMarkups = false;
          if (window.builderSettings && window.builderSettings.annotationsEnabled === true) {
            loadMarkups = true;
          }

          let antialiasing = true;
          if (window.builderSettings && window.builderSettings.antiAliasingEnabled === false) {
            antialiasing = false;
          }

          cvApi.SetDefaultSystemPreferences(Module.ApplicationType.THINGVIEW);
          cvApi.SetSystemPreferencesFromJson(getDefaultPrefs(antialiasing, loadMarkups));
          app = cvApi.CreateTVApplication(el.id);
          session = app.GetSession();
          scene = session.GetActiveTVShapeScene();
          view = session.GetActiveShapeView();

          var canvasEl = el.querySelector('canvas[id*="' + el.id + '"]');
          if (canvasEl) {
            canvasEl.addEventListener('click', function (e) {
              if (view) {
                var offsetTop = getCanvasOffsetTop(canvasEl);

                view.DoPickWithCallback(
                  e.pageX,
                  e.pageY - offsetTop,
                  true /* invert */,
                  true /* include markups */,
                  function (pickResult) {
                    if (pickResult.IsValid()) {
                      // Do not receive pick events for hidden objects (DT-21988)
                      let cvWidget = pickResult.GetImageMarker();
                      if (cvWidget) {
                        window.twx.widgetClickCallback(cvWidget.GetUserId(), '3DImage');
                      } else {
                        cvWidget = pickResult.GetModel();
                        if (cvWidget) {
                          window.twx.widgetClickCallback(cvWidget.GetUserId(), 'twx-dt-model', pickResult.GetIdPath());
                        }
                      }
                    }
                  }
                );
              }
            });
          }

          session.EnableFileCache(5000);
          scene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRIMARYSELECTION);
          scene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRESELECTION);
          view.SetDragMode(Module.DragMode.NONE);
          view.SetDragSnap(false);
          view.ShowGnomon(false);
          view.SetNavigationMode(Module.NavMode.VUFORIA_NOPICK);
          view.AllowCameraApplications(false);

          if (window.builderSettings && window.builderSettings.annotationsEnabled === true) {
            scene.SetShapeFilters(0x7 | 0x00300000); // Turn on misc & planar annotations
          }

          // View mode - orthographic / perspective
          if (window.builderSettings && window.builderSettings.viewMode === 'orthographic') {
            view.SetOrthographicProjection(1.0);
          } else {
            view.SetPerspectiveProjection(45);
          }

          if (window.builderSettings) {
            // Background color(s)
            setBackgroundColors(
              view,
              rgbaToInteger(window.builderSettings.canvasBackgroundColor),
              rgbaToInteger(window.builderSettings.canvasBackgroundColor2)
            );

            // Floor Colors
            if (window.builderSettings.canvasFloorColor) {
              floor.fillColor = rgbaToInteger(window.builderSettings.canvasFloorColor);
            }
            if (window.builderSettings.canvasGridColor) {
              floor.gridColor = rgbaToInteger(window.builderSettings.canvasGridColor);
            }
          }

          // Render stats
          if (window.builderSettings && window.builderSettings.enableDebugLogging) {
            renderStat = addRenderStat(view, 'ion-view');
          }
        }
      }
    }
    this._cvApiReady = cvApiReady; //Test exposure
    if (!cvApi) {
      ThingView.init(thingViewPath, function () {
        ThingView.SetPrintDeprecated();
        //Preview renderer is ready
        console.log('Renderer Version: ' + ThingView.GetFileVersion());
        cvApi = ThingView;
        cvApiReady();
      });
    }

    var vrSession = {};
    var widgetsToLoad = [];
    var shaders = [];
    var defaultShader = {};

    var VrSessionObj = function (me, name, widget, type) {
      var _this = me || {};

      var mWidget = widget;
      var mType = type;

      _this.SetType = function (type) {
        mType = type;
      };

      _this.GetType = function () {
        return mType;
      };

      _this.SetWidget = function (widget) {
        mWidget = widget;
      };

      _this.GetWidget = function () {
        return mWidget;
      };

      return _this;
    };

    $rootScope.$on('loaded3DObj', function (event, args) {
      //Set properties after loading:

      var name = args.name;
      var obj = vrSession[name];
      var newLoad = false;

      if (obj) {
        applyProperties(obj);
        applyTransform(obj);
        applyColor(obj);
        let idx = widgetsToLoad.indexOf(name);
        if (idx > -1) {
          widgetsToLoad.splice(idx, 1);
          newLoad = true;
        }
      }

      var widget = obj.GetWidget();
      if (obj.GetType() === 'Model') {
        widget.AttachModelItems();

        for (var obj2 in vrSession) {
          if (vrSession[obj2].GetType() === 'Model Item') {
            if (vrSession[obj2].modelName === name) {
              var relativeidpath = vrSession[obj2].idpath.slice(vrSession[obj2].idpath.indexOf('/'));
              var modelItemWidget = vrSession[obj2].GetWidget();
              if (!modelItemWidget) {
                ctx.addModelItem(obj2);
                modelItemWidget = vrSession[obj2].GetWidget();
              }
              modelItemWidget.SetModelPtrAndIdPath(widget, relativeidpath);
              modelItemWidget.loaded = true;
              let idx = widgetsToLoad.indexOf(obj2);
              if (idx > -1) {
                widgetsToLoad.splice(idx, 1);
                newLoad = true;
              }
              applyProperties(vrSession[obj2]);
              applyTransform(vrSession[obj2]);
              applyColor(vrSession[obj2]);
              applyTexture(vrSession[obj2]);
            }
          } else if (
            vrSession[obj2].GetType() === 'Model Target' ||
            vrSession[obj2].GetType() === 'Advanced Model Target'
          ) {
            updateRuntimeModelTargetLocation(widget, vrSession[obj2].GetWidget());
          }
        }
      } else if (obj.GetType() === '3D Button') {
        widget.$imageWidget.SetPickable(false);

        // Set backer and button properties:

        const buttonName = widget.name + '_button';
        let buttonObj = vrSession[buttonName];
        applyProperties(buttonObj);

        const backerName = widget.name + '_backer';
        let backerObj = vrSession[backerName];
        applyProperties(backerObj);
      }

      if (widgetsToLoad.length === 0 && newLoad) {
        view.ZoomView(Module.ZoomMode.ZOOM_ALL, 0);
      }
    });

    $rootScope.$on('loadedSeqErr', function (event, args) {
      var name = args.name;
      var obj = vrSession[name];
      if (obj) {
        setTimeout(obj.sequenceData.seqErrCB(), 0);
      }
    });

    $rootScope.$on('loadedSeq', function (event, args) {
      var name = args.name;
      var obj = vrSession[name];
      if (obj) {
        applySequence(obj);
      }
    });

    /**
     * @param {Object} model - The model widget
     * @param {Object} modelTargetWidget - The model target widget
     */
    function updateRuntimeModelTargetLocation(model, modelTargetWidget) {
      var modelLocation = model.GetLocation();
      var box = model.CalculateBoundingBox(getListOfParts());

      if (box.valid) {
        setModelTargetExistingLocation(modelTargetWidget, modelLocation, box);
        setModelTargetWidth(modelTargetWidget, box);
      }

      setModelTargetLocation(modelTargetWidget, modelLocation);
    }

    function getResourceUrl(objName, isResource) {
      var localPath = objName;
      if (isResource === true) {
        localPath = 'app/resources/' + objName;
      }
      var a = document.createElement('a');
      a.href = localPath;
      return a.href;
    }

    function addObj(name, widget, type) {
      var addition = VrSessionObj(undefined, name, widget, type);
      vrSession[name] = addition;

      // If an object doesn't have an associated widget nor type it will never have its loaded3DObj event called,
      // so we shouldn't consider it for widgetsToLoad. I.e. this should only be skipped for image helpers of TM and Image targets.
      if (widget || type) {
        widgetsToLoad.push(name);
      }

      return addition;
    }

    function getDerivedProperty(obj, property, overridingValue, defaultValue) {
      let widget = obj.GetWidget();
      if (widget.parentModelId) {
        //model items don't need the other logic since thier hierarchy is controlled by Thingview
        return obj.properties[property];
      }
      if (obj.properties[property] !== undefined) {
        if (overridingValue) {
          if (obj.properties[property] === overridingValue) {
            return overridingValue;
          }
        } else {
          return obj.properties[property];
        }
      }
      if (widget && widget.parent) {
        let parent = vrSession[widget.parent];
        if (parent) {
          return getDerivedProperty(parent, property, overridingValue, defaultValue);
        }
      }
      return defaultValue;
    }

    function applyProperties(obj) {
      var widget = obj.GetWidget();
      if (widget) {
        if (widget.loaded) {
          if (obj.GetType() === 'Image') {
            widget.SetHiddenPickable(false);
          }
          if (obj.properties !== undefined) {
            if (obj.properties.billboard !== undefined) {
              let drawtype = Module.DrawType.WORLD_SPACE;
              if (parseBool(obj.properties.billboard)) {
                drawtype = Module.DrawType.WORLD_SPACE_BILLBOARD;
              }
              widget.SetDrawType(drawtype);
            }

            let decal = getDerivedProperty(obj, 'decal', undefined);
            if (decal !== undefined && widget.SetForceHidden) {
              widget.SetDecal(parseBool(decal));
            }

            let hidden = getDerivedProperty(obj, 'hidden', true);
            hidden = hidden || obj.properties.hidden;
            if (hidden !== undefined) {
              let hiddenBool = parseBool(hidden);
              if (obj.GetType() === '3D Button - Backer' || obj.GetType() === '3D Button - Button') {
                var backerVisibility =
                  obj.GetType() === '3D Button - Backer' ? parseBool(widget.backerVisibility) : true;
                widget.SetVisibility1(
                  backerVisibility && !hiddenBool,
                  Module.ChildBehaviour.IGNORED,
                  Module.InheritBehaviour.OVERRIDE,
                  -1
                );
              } else {
                widget.SetVisibility(!hiddenBool);
                if (obj.GetType() === '3D Button') {
                  widget.$imageWidget.SetVisibility(!hiddenBool);
                }
              }
            }

            let forceHidden = getDerivedProperty(obj, 'forceHidden', true);
            forceHidden = forceHidden || obj.properties.forceHidden;
            if (forceHidden !== undefined && widget.SetForceHidden) {
              widget.SetForceHidden(parseBool(forceHidden));
            }

            let shader = getDerivedProperty(obj, 'shader', undefined);
            if (shader !== undefined) {
              if (shader === 'demo_highlight_on') {
                if (isImageMarker(obj.GetType())) {
                  scene.SelectMarker(widget, true);
                } else if (obj.GetType() === 'Model') {
                  scene.SelectModel(widget, true);
                } else if (obj.GetType() === 'Model Item') {
                  scene.SelectModelItem(widget, true);
                }
              } else if (shader === 'demo_highlight_off') {
                if (isImageMarker(obj.GetType())) {
                  scene.SelectMarker(widget, false);
                } else if (obj.GetType() === 'Model') {
                  scene.SelectModel(widget, false);
                } else if (obj.GetType() === 'Model Item') {
                  scene.SelectModelItem(widget, false);
                }
              } else if (shader.startsWith('demo_highlight') === true) {
                applyDemoHighlight(obj);
              } else {
                // real shader stuff goes here
                applyShader(obj, shader);
              }
            }

            if (obj.properties.experimentalOneSided !== undefined) {
              widget.SetSidedness(
                parseBool(obj.properties.experimentalOneSided)
                  ? Module.Sidedness.SINGLE_SIDED
                  : Module.Sidedness.DOUBLE_SIDED
              );
            }

            if (widget.ApplyOccludeOpacity) {
              let opacity = getDerivedProperty(obj, 'opacity', undefined);
              let occlude = getDerivedProperty(obj, 'occlude', undefined);
              widget.ApplyOccludeOpacity(occlude, opacity);
            }
            resizeFloor(scene, floor, false);
          } else {
            // (DT-20747) applying properties to ThingMark based on ThingMark image
            if (obj.GetType() === 'ThingMark') {
              applyThingMarkProperties(widget, vrSession);
            }
          }
        }
        if (widget.childIds) {
          widget.childIds.forEach(function (childId) {
            let childObj = ctx.GetObject(childId);
            if (childObj) {
              applyProperties(childObj);
            } else {
              console.log("apply properties - child object doesn't exist");
            }
          });
        }
      }
    }

    function applyDemoHighlight(obj) {
      if (obj.GetType() === 'Model' || obj.GetType() === 'Model Item') {
        var select;
        var select_type;
        var fill_color;
        var outline_color;
        var highlight_style;
        var highlight_width;
        var settings = obj.properties.shader.split(';');
        var widget = obj.GetWidget();

        var customSelectVal = {
          1: Module.SelectionList.CUSTOMSELECT_1,
          2: Module.SelectionList.CUSTOMSELECT_2,
          3: Module.SelectionList.CUSTOMSELECT_3,
          4: Module.SelectionList.CUSTOMSELECT_4,
          5: Module.SelectionList.CUSTOMSELECT_5,
        };

        settings.forEach(function (uniform) {
          uniform = uniform.trim();
          var uniformSettings = uniform.split(' ');
          var name = uniformSettings[0];
          var val = uniformSettings[2];

          var selectVal = { true: true, false: false };
          if (name === 'visible') {
            select = selectVal[val];
          } else if (name === 'preset') {
            var selectNumber = Number(val);
            select_type = customSelectVal[selectNumber];
          } else if (name === 'fill_color') {
            fill_color = parseInt(val, 16);
          } else if (name === 'outline_color') {
            outline_color = parseInt(val, 16);
          } else if (name === 'highlight_style') {
            if (val === 'fill') {
              highlight_style = Module.HighlightStyle.FILL;
            } else if (val === 'outline') {
              highlight_style = Module.HighlightStyle.OUTLINE;
            }
          } else if (name === 'highlight_width') {
            highlight_width = parseFloat(val);
          }
        });

        if (select_type !== undefined) {
          if (select !== undefined) {
            if (obj.GetType() === 'Model Item') {
              var modelObj = vrSession[obj.modelName];
              if (modelObj !== undefined) {
                var modelWidget = modelObj.GetWidget();
                modelWidget.SelectPart(widget.idPath, select, select_type);
              }
            } else {
              widget.SelectPart('/', select, select_type);
            }
          }
          if (fill_color !== undefined && outline_color !== undefined) {
            view.SetSelectionColor(select_type, fill_color, outline_color);
          }
          if (fill_color !== undefined) {
            view.SetSelectionFillColor(select_type, fill_color);
          }
          if (outline_color !== undefined) {
            view.SetSelectionOutlineColor(select_type, outline_color);
          }
          if (highlight_style !== undefined) {
            view.SetSelectionHighlightStyle(select_type, highlight_style);
          }
          if (highlight_width !== undefined) {
            view.SetSelectionHighlightWidth(select_type, highlight_width);
          }
        }
      }
    }

    function applyTransform(obj) {
      var widget = obj.GetWidget();
      if (widget) {
        if (widget.loaded) {
          var transform = getTransform(obj);
          var pose = widget3dUtils.poseFromTransform(transform);
          widget.SetOrientation(pose.rotation.x, pose.rotation.y, pose.rotation.z);
          widget.SetPosition(pose.translation.x, pose.translation.y, pose.translation.z);
          widget.ApplyScale(obj, { sx: pose.scale.x, sy: pose.scale.y, sz: pose.scale.z });
          resizeFloor(scene, floor, false);
        }
        if (widget.childIds) {
          widget.childIds.forEach(function (childId) {
            var childObj = vrSession[childId];
            if (childObj) {
              applyTransform(childObj);
            } else {
              console.log('apply transform - child object ' + childId + " doesn't exist");
            }
          });
        }
      }
    }

    function getTransform(obj) {
      let pose = {};
      if (obj.rotation) {
        pose.rotation = { x: obj.rotation.rx, y: obj.rotation.ry, z: obj.rotation.rz };
      }
      if (obj.translation) {
        pose.translation = { x: obj.translation.x, y: obj.translation.y, z: obj.translation.z };
      }
      if (obj.scale) {
        pose.scale = { x: obj.scale.sx, y: obj.scale.sy, z: obj.scale.sz };
      }

      let local = widget3dUtils.transformFromPose(pose);
      let widget = obj.GetWidget();
      if (widget && widget.parent) {
        let parent = vrSession[widget.parent];
        if (parent) {
          return getTransform(parent).multiply(local);
        }
      }
      return local;
    }

    function applyColor(obj) {
      var widget = obj.GetWidget();
      if (widget !== undefined && widget.loaded) {
        if (obj.rgb) {
          if (obj.GetType() === '3D Button') {
            // TODO: Why is the object cloned here?
            // The multitude of ways a color can be represented is causing issues all over.
            const newobj = Object.assign({}, obj, {
              front_rgb: obj.rgb.input || obj.rgb,
              back_rgb: obj.rgb.input || obj.rbg,
            });
            applyFrontBackColor(newobj);
          } else {
            widget.SetColor(obj.rgb[0], obj.rgb[1], obj.rgb[2], 1.0);
          }
        } else if (obj.front_rgb) {
          if (obj.GetType() === '3D Button') {
            applyFrontBackColor(obj);
          }
        } else if (widget.UnsetColor) {
          widget.UnsetColor();
        }
      }
    }

    function applyFrontBackColor(obj) {
      const widget = obj.GetWidget();
      if (widget && widget.loaded && widget.$frontPlateWidget && widget.$backPlateWidget) {
        Set3DButtonPlateColors(widget, obj.front_rgb, obj.back_rgb);
      }
    }

    function applySequence(obj) {
      var widget = obj.GetWidget();
      if (widget !== undefined && widget.loaded) {
        var stepInfoVec = widget.stepInfoVec;
        setTimeout(obj.sequenceData.seqSuccCB({ stepVec: stepInfoVec }), 0);
      }
    }

    function loadSequence(obj) {
      var widget = obj.GetWidget();
      if (obj.sequenceData.seqURL === '') {
        obj.GetWidget().LoadIllustrationWithCallback('', widget.IllustrationLoadedHandler);
      } else {
        var sequenceName = GetSequenceNamefromUrl(obj.sequenceData.seqURL, widget);
        if (sequenceName) {
          widget.LoadIllustrationWithCallback(sequenceName, widget.IllustrationLoadedHandler);
        } else {
          setTimeout(obj.sequenceData.seqErrCB, 0);
        }
      }
    }

    function applyShader(obj, shader) {
      var widget = obj.GetWidget();
      shader = shader ? shader : obj.properties.shader;
      if (widget && shader !== undefined) {
        var shaderSettings = shader ? shader : obj.properties.shader;
        var settings = shaderSettings.split(';'); //Split by ";"
        var shaderName = settings[0];
        var res = shaders.find(function (shader) {
          return shader.name === shaderName;
        });

        var parsedShader;
        if (res) {
          parsedShader = res.shader;
        } else if (shaderName === 'Default') {
          //Insert default shader
          parsedShader = defaultShader;
        }

        if (!parsedShader) {
          if (widget.UnsetTMLShader) {
            widget.UnsetTMLShader();
          }
        } else {
          widget.SetTMLShader(parsedShader.fragment, parsedShader.vertex, parsedShader.name);
          obj.shader = parsedShader.name;

          if (shaderName === 'Default') {
            return;
          }
          //Set uniforms:

          settings.forEach(function (uniform) {
            uniform = uniform.trim(); // Trim any whitespace from beginning and end
            var uniformSettings = uniform.split(' '); //Split by " "
            var name = uniformSettings[0];
            var type = uniformSettings[1];
            var val = uniformSettings[2];

            switch (type) {
              case 'f':
                widget.SetTMLShaderFloat(name, Number(val));
                break;
              case 'i':
                widget.SetTMLShaderInt(name, Number(val));
                break;
              case 'b':
                widget.SetTMLShaderBool(name, Number(val));
                break;
              default:
                break;
            }
          }, widget);
        }
      }
    }

    function applyTexture(obj) {
      var widget = obj.GetWidget();
      if (widget !== undefined && widget.loaded) {
        if (obj.texture !== undefined) {
          ctx.setTexture(widget.name, obj.texture);
        }
      }
    }

    function applyOccludeOpacity(obj) {
      var widget = obj.GetWidget();
      if (widget !== undefined) {
        var occlude = obj.occlude;
        var opacity = obj.opacity;
        if (occlude !== undefined && parseBool(occlude)) {
          widget.SetRenderMode(Module.RenderMode.OCCLUDING, 0);
        } else if (opacity !== undefined) {
          if (opacity < 1.0) {
            widget.SetRenderMode(Module.RenderMode.PHANTOM, Number(opacity));
          } else {
            widget.SetRenderMode(Module.RenderMode.SHADED, 0);
          }
        }
      }
    }

    function setDefaultShader() {
      defaultShader.name = 'Default';
      defaultShader.vertex =
        ' \
      \
          attribute vec3 vertexPosition;\
          attribute vec3 vertexNormal;\
          attribute vec2 vertexTexCoord;\
      \
          varying vec2 texCoord;\
          varying vec3 normal;\
          varying vec3 vertex;\
      \
          uniform mat4 modelViewProjectionMatrix;\
          uniform mat4 normalMatrix;\
          uniform mat4 modelViewMatrix;\
      \
          void main() {\
      \
              gl_PointSize=40.0;\
              vec4 vp     = vec4(vertexPosition, 1.0);\
              gl_Position = modelViewProjectionMatrix * vp;\
              vertex      = vec3(modelViewMatrix * vp);\
              normal      = vec3(normalize(normalMatrix * vec4(vertexNormal,0.0)));\
              texCoord    = vertexTexCoord;\
          }\
      ';

      defaultShader.fragment =
        '\
      \
          precision mediump float;\
          varying vec3 vertex;\
          varying vec3 normal;\
          varying vec2 texCoord;\
          uniform bool  twoSided;\
          uniform bool  lightingEnabled;\
          uniform bool  useTexture;\
          uniform int   primitiveType;\
          uniform vec4  surfaceColor;\
          uniform float transparency;\
          uniform sampler2D texSampler2D;\
          const vec3 lightPos     = vec3(0.633724272, 0.443606973, 0.633724272);\
          const vec4 ambientColor = vec4(0.1, 0.1, 0.1, 1.0);\
          const vec4 specColor    = vec4(1.0, 1.0, 1.0, 0.0);\
          void main(void)  {\
              vec4 color = surfaceColor;\
              if (primitiveType==0) {\
                  color = texture2D(texSampler2D, gl_PointCoord);\
              } else if(primitiveType==1 || primitiveType==3) {\
              } else {\
                  if (useTexture) {\
                    color = texture2D(texSampler2D, texCoord);\
                  }\
                  if (lightingEnabled) {\
                      vec3 lightDir = -(lightPos);\
                      vec3 finalNormal = normalize(normal);\
                      float lambertian = dot(lightDir,finalNormal);\
                      float specular = 0.0;\
                      vec3 viewDir = normalize(-vertex);\
                      if (twoSided && lambertian < 0.0) {\
                          lambertian = -lambertian;\
                          finalNormal = -finalNormal;\
                      }\
                      if (lambertian > 0.0) {\
                          vec3 reflectDir = reflect(-lightDir, finalNormal);\
                          float specAngle = max(dot(reflectDir, viewDir), 0.0);\
                          specular = pow(specAngle, 4.0);\
                      }\
                      color = ambientColor * color +\
                              color        * vec4(lambertian,lambertian,lambertian,0.0) +\
                              specColor    * specular;\
                  }\
              }\
              color.a = color.a * transparency;\
              gl_FragColor = color;\
          }\
      ';
    }

    function checkSceneExists(scene, id, objectType, errorCb) {
      if (!scene) {
        let errorMessage = createErrorMessage(
          'twx-dt-PLUGIN_STATE_ERROR',
          'Could not load ' + objectType + ': ' + id + '; TV scene is not initialized'
        );
        setTimeout(() => errorCb(errorMessage));
        return false;
      }
      return true;
    }

    function checkNodeExists(id, objectType, errorCb) {
      let sessionObj = vrSession[id];
      if (sessionObj) {
        let widget = sessionObj.GetWidget();
        if (widget) {
          let errorMessage = createErrorMessage(
            'twx-dt-NODE_ALREADY_EXISTS',
            'Could not add ' + objectType + ': ' + id + '; node already exists'
          );
          setTimeout(() => errorCb(errorMessage));
          return false;
        }
      }
      return true;
    }

    function loadNonNativeImage(obj, url) {
      var image = new Image();
      image.onerror = function (e) {
        console.error('Could not load image.', e, url);
      };
      image.onload = function () {
        var widget = obj.GetWidget();
        var type = obj.GetType();
        const imageMarker = type === '3D Button' ? widget.$imageWidget : widget;

        var canvas = document.createElement('canvas');
        canvas.height = image.height;
        canvas.width = image.width;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);

        // TODO: Extract
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var nDataBytes = imageData.data.length * imageData.data.BYTES_PER_ELEMENT;
        var dataBytes = Module._malloc(nDataBytes);
        var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataBytes, nDataBytes);
        dataHeap.set(new Uint8Array(imageData.data.buffer));

        imageMarker.SetImage(dataHeap.byteOffset, imageData.width, imageData.height);

        Module._free(dataHeap.byteOffset);

        if (type === '3D Button') {
          widget.imageLoaded = true;
        }

        if (widget.modelLoaded === undefined || widget.modelLoaded === true) {
          widget.loaded = true;
          $rootScope.$broadcast('loaded3DObj', { name: widget.name });
        }
      };
      if (url && url.startsWith('http')) {
        image.crossOrigin = 'Anonymous';
      }
      image.src = url;
    }

    this.startBatch = function () {};

    this.executeBatch = function () {};

    function reportError(code, message, errorCb) {
      let error = createErrorMessage(code, message);
      if (errorCb) {
        setTimeout(() => errorCb(error));
      }
    }

    this.removeNode = function ({ name, reparent }, successCb, errorCb) {
      if (!name) {
        throw new Error('Missing expected name parameter');
      }

      if (reparent) {
        throw new Error('reparent = true is not yet supported in preview');
      }

      let sessionObj = vrSession[name];
      if (!sessionObj) {
        return reportError(
          'twx-dt-NODE_DOES_NOT_EXIST',
          `Could not remove node: ${name}; node does not exist`,
          errorCb
        );
      }

      let widget = sessionObj.GetWidget();
      let success = false;
      if (widget) {
        let type = sessionObj.GetType();
        if (type === 'Model') {
          success = scene.RemoveModel(widget);
        } else if (type === 'Image') {
          // This covers both 3D Image and 3D Label.
          success = scene.DeleteImageMarker(widget);
        } else if (type === '3D Button') {
          if (widget.$imageWidget) {
            success = scene.DeleteImageMarker(widget.$imageWidget);
            widget.$imageWidget.delete();
            if (success) {
              success = scene.RemoveModel(widget);
            }
          } else {
            success = scene.RemoveModel(widget);
          }
        } else {
          return reportError(
            'twx-dt-INCOMPATIBLE_NODE',
            `Could not remove node: ${name}; node is of wrong type`,
            errorCb
          );
        }

        if (success) {
          widget.delete();
          sessionObj.SetWidget(undefined);
        }
      }

      if (success) {
        delete vrSession[name];
        setTimeout(successCb);
      } else {
        setTimeout(errorCb);
      }
    };

    this.GetObject = function (name) {
      var sessionObj = vrSession[name];
      if (sessionObj === undefined) {
        var arr = name.split('/', 1);
        if (arr[0].endsWith('-') && arr[0].length > 1) {
          this.addModelItem(name);
        } else {
          addObj(name, undefined, undefined);
        }
        sessionObj = vrSession[name];
      }
      return sessionObj;
    };

    this.addPVS = function (name, id, url, cull, parent, successCb, errorCb) {
      if (!checkSceneExists(scene, id, 'model', errorCb)) {
        return null;
      }
      if (!checkNodeExists(id, 'model', errorCb)) {
        return null;
      }

      //TODO: replace with something more generic
      if (url === widget3dUtils.BoxPrimitiveTemplate) {
        url = 'app/resources/Default/holoPlate.pvz';
      }

      // Create the widget
      let widget = scene.MakeModel();
      widget.SetUserId(id);
      widget.loaded = false;
      widget.stepInfoVec = [];
      widget.detachedModelItems = [];
      widget.modelInfo = {};

      this.addWidgetToGroup(widget, parent, id);

      // Load Function
      widget.LoadModel = function (url, successCb, errorCb) {
        if (url && !ctx.isResourceUrlFullyQualified(url)) {
          url = getResourceUrl(url);
        }
        app.LoadModelFromURLWithCallback(widget, url, true, true, false, function (success, isStructure, errors) {
          if (!success) {
            let errorMessage = errors;
            if (!errors) {
              errorMessage = createErrorMessage('twx-dt-UNKNOWN_ERROR', 'Unknown error loading from url: ' + url);
            }
            setTimeout(() => errorCb(errorMessage));
            return;
          }

          if (isStructure) {
            var box = widget.CalculateBoundingBox(new Module.VectorString());
            if (box.valid) {
              widget.loaded = true;
              $rootScope.$broadcast('loaded3DObj', { name: widget.name });
            }
          } else {
            if (!widget.loaded) {
              widget.loaded = true;
              $rootScope.$broadcast('loaded3DObj', { name: widget.name });
            } else {
              // Model structure was already loaded but now the entire model has finished loading,
              // so finalize the position of the model target (if one exists).
              for (let obj in vrSession) {
                if (
                  vrSession[obj].GetType() === 'Model Target' ||
                  vrSession[obj].GetType() === 'Advanced Model Target'
                ) {
                  updateRuntimeModelTargetLocation(widget, vrSession[obj].GetWidget());
                  break;
                }
              }
            }
            widget.setModelInfoProperty('sequenceList', widget.GetSequenceList());
            setTimeout(() => successCb(widget.getModelInfo()));

            var obj = vrSession[widget.name];
            if (obj.sequenceData) {
              loadSequence(obj);
            }
          }
        });
      };

      widget.setModelInfoProperty = function (property, value) {
        widget.modelInfo[property] = value;
      };

      widget.getModelInfo = function () {
        return widget.modelInfo;
      };

      widget.GetSequenceList = function () {
        let sequenceList = [];
        let loadSource = widget.GetStructureLoadSource();
        if (loadSource) {
          const illustrations = loadSource.GetIllustrations();
          for (let i = 0; i < illustrations.size(); i++) {
            const { name, filename } = illustrations.get(i);
            sequenceList.push({ name: decodeUtf8(name), filename: decodeUtf8(filename) });
          }
        }
        return sequenceList;
      };

      // Illustration Loaded Callback
      widget.IllustrationLoadedHandler = function (success, name, TVstepInfoVec) {
        if (success) {
          widget.stepInfoVec = [];
          for (var i = 0; i < TVstepInfoVec.size(); i++) {
            var TVstepInfo = TVstepInfoVec.get(i);
            var stepInfo = {
              acknowledge: TVstepInfo.acknowledge,
              duration: TVstepInfo.duration,
              name: TVstepInfo.name,
            };

            widget.stepInfoVec.push(stepInfo);
          }
          $rootScope.$broadcast('loadedSeq', { name: widget.name });
        } else {
          $rootScope.$broadcast('loadedSeqErr', { name: widget.name });
        }
      };

      widget.SetSequenceTVObserver = function () {
        let ModelObserverClass = Module.ModelObserver.extend('ModelObserver', {
          // Sequence Event Callback
          OnSequenceEvent: function (playState, stepInfo, playPosition) {
            var eventInfo = {
              stepNumber: stepInfo.number,
              stepName: stepInfo.name,
              stepDescription: stepInfo.description,
              duration: stepInfo.duration,
              acknowledge: stepInfo.acknowledge,
              acknowledgeMessage: '',
              totalSteps: stepInfo.totalSteps,
              nextStep: stepInfo.number + 1,
            };

            if (playState === Module.SequencePlayState.STOPPED) {
              if (!stepPlaying) {
                // don't ack on forward/back/reset
                eventInfo.acknowledge = false;
              }
              stepPlaying = false;

              if (playPosition === Module.SequencePlayPosition.END) {
                if (stepInfo.number === stepInfo.totalSteps - 1) {
                  eventInfo.nextStep = -1;
                } else {
                  eventInfo.nextStep = stepInfo.number + 1;
                }
              } else {
                eventInfo.nextStep = stepInfo.number;
              }

              $rootScope.$broadcast('stepcompleted', widget.name, 'twx-dt-model', JSON.stringify(eventInfo));
            } else if (playState === Module.SequencePlayState.PLAYING) {
              stepPlaying = true;
              $rootScope.$broadcast('stepstarted', widget.name, 'twx-dt-model', JSON.stringify(eventInfo));
            }
          },
        });

        let observer = new ModelObserverClass();
        widget.AddObserver(observer);
      };

      // Apply Scale Function
      widget.ApplyScale = function (obj, scale) {
        if (!Number.isNaN(scale)) {
          applyScaleToWidget(widget, scale);
        }
      };

      // Apply Occlude and Opacity Values Function
      widget.ApplyOccludeOpacity = function (occlude, opacity) {
        obj.occlude = occlude;
        obj.opacity = opacity;
        applyOccludeOpacity(obj);
      };

      // Attach Model Items Function
      widget.AttachModelItems = function () {
        var i = this.detachedModelItems.length;
        while (i--) {
          var item = this.detachedModelItems[i];
          if (item.props.modelName === this.name) {
            ctx.addModelItem(item.name);
            var widgetObj = ctx.GetObject(item.name);
            let idx = widgetsToLoad.indexOf(item.name);
            if (idx > -1) {
              widgetsToLoad.splice(idx, 1);
            }
            widgetObj.properties = item.props.properties;
            widgetObj.rgb = item.props.rgb;
            widgetObj.rotation = item.props.rotation;
            widgetObj.scale = item.props.scale;
            widgetObj.translation = item.props.translation;
            this.detachedModelItems.splice(i, 1);
          }
        }
      };

      // Detach Model Items Function
      widget.DetachModelItems = function () {
        for (var sessionObj2 in vrSession) {
          if (vrSession[sessionObj2].GetType() === 'Model Item') {
            if (vrSession[sessionObj2].modelName === this.name) {
              var modelItemWidget = vrSession[sessionObj2].GetWidget();
              vrSession[sessionObj2].SetWidget(undefined);
              this.detachedModelItems.push({ name: sessionObj2, props: vrSession[sessionObj2] });
              delete vrSession[sessionObj2];
              scene.RemoveModelItem(modelItemWidget, true);
            }
          }
        }
      };

      widget.SetSequenceTVObserver();

      widget.name = id;
      var obj = vrSession[id];
      if (!obj) {
        obj = addObj(id, widget, 'Model');
      } else {
        obj.SetWidget(widget);
        obj.SetType('Model');
      }

      if (url) {
        widget.LoadModel(url, successCb, errorCb);
      } else {
        setTimeout(() => successCb());
      }

      return widget;
    };

    this.setModelURL = function (modelParams, successCb, errorCb) {
      var sessionObj = this.GetObject(modelParams.modelID);
      if (sessionObj !== undefined && sessionObj.GetType() === 'Model') {
        var widget = sessionObj.GetWidget();
        if (widget !== undefined) {
          widget.DetachModelItems();
          widget.loaded = false;
          widgetsToLoad.push(modelParams.modelID);
          widget.LoadModel(modelParams.modelURL, successCb, errorCb);
        }
      }
    };

    this.loadPVI = function (pviParams, successCb, errorCb) {
      if (session) {
        var sessionObj = this.GetObject(pviParams.modelID);
        if (sessionObj !== undefined && sessionObj.GetType() === 'Model') {
          var widget = sessionObj.GetWidget();
          if (widget !== undefined) {
            sessionObj.sequenceData = {
              seqSuccCB: successCb,
              seqErrCB: errorCb,
              seqURL: pviParams.url,
            };

            if (widget.loaded) {
              loadSequence(sessionObj); // triggers success/error callback
            }
          }
        }
      }
    };

    this.playStep = function (playParams, successCb, errorCb) {
      if (session) {
        var sessionObj = this.GetObject(playParams.modelID);
        if (sessionObj !== undefined && sessionObj.GetType() === 'Model') {
          var widget = sessionObj.GetWidget();
          if (widget !== undefined && playParams.stepNumber <= widget.stepInfoVec.length) {
            widget.GoToSequenceStep(Number(playParams.stepNumber), Module.SequencePlayPosition.START, true);
            setTimeout(successCb, 0);
          } else {
            setTimeout(errorCb, 0);
          }
        }
      }
    };

    this.gotoStep = function (gotoParams, successCb, errorCb) {
      if (session) {
        var sessionObj = this.GetObject(gotoParams.modelID);
        var widget = sessionObj.GetWidget();

        if (sessionObj !== undefined && sessionObj.GetType() === 'Model') {
          if (gotoParams.stepNumber === 0 || (gotoParams.stepNumber === 1 && !widget.stepInfoVec[0].acknowledge)) {
            widget.StopAnimation();
          }

          var position = Module.SequencePlayPosition.START;
          if (gotoParams.position === 'end') {
            position = Module.SequencePlayPosition.END;
          }

          if (widget !== undefined && gotoParams.stepNumber <= widget.stepInfoVec.length) {
            widget.GoToSequenceStep(Number(gotoParams.stepNumber), position, false);
            setTimeout(successCb, 0);
          } else {
            setTimeout(errorCb, 0);
          }
        }
      }
    };

    /**
     * Adds 3d image
     * This method supports backward compatibility.
     * When first parameter is string, it supports older experiences before `preload` property introduced
     * When first parameter is json object,  we get first json object, successCb - second and errorCb - third parameter
     * @param {Object} params which contains key-value properties as below
     * @param {string} params.tracker
     * @param {string} params.id
     * @param {string} params.src
     * @param {string} params.parent
     * @param {number} params.leaderX
     * @param {number} params.leaderY
     * @param {string} params.anchor
     * @param {number} params.width
     * @param {number} params.height
     * @param {number} params.pivot
     * @param {boolean} params.preload
     * @param {function} successCb success callback
     * @param {function} errorCb error callback
     */
    this.add3DImage = function (...args) {
      /* eslint-disable no-unused-vars */
      let tracker, id, src, parent, leaderX, leaderY, anchor, width, height, pivot, preload, successCb, errorCb;
      if (typeof args[0] === 'object') {
        // supports new function (params, successCallback, errorCallback)
        let params;
        [params, successCb, errorCb] = args;
        ({ tracker, id, src, parent, leaderX, leaderY, anchor, width, height, pivot, preload } = params);
      } else if (typeof args[0] === 'string') {
        // supports legacy function
        [tracker, id, src, parent, leaderX, leaderY, anchor, width, height, pivot, successCb, errorCb] = args;
        preload = true; // default true for previous experiences
      } else {
        // invalid call
        throw new Error('add3DImage call with invalid args');
      }
      /* eslint-enable no-unused-vars */

      if (session) {
        //Marker has already been added:
        if (
          src === 'img/recognised.png?name=sampler0 img/recognised2.png?name=sampler1' ||
          src === 'img/recognisedSquare.png?name=gradientSampler'
        ) {
          return;
        }

        var widget = scene.MakeImageMarker();
        widget.SetUserId(id);
        widget.name = id;
        this.addWidgetToGroup(widget, parent, id);

        var obj = vrSession[id];

        if (!obj) {
          obj = addObj(id, widget, 'Image');
        }

        if (!obj.GetWidget()) {
          obj.SetWidget(widget);
        }

        if (!obj.GetType()) {
          // Sometimes type might already be set to something different, such as 'Model Target'.
          obj.SetType('Image');
        }

        obj.width = width;
        obj.height = height;

        // LoadNonNativeImage Function
        widget.LoadNonNativeImage = function (url) {
          loadNonNativeImage(obj, url);
        };

        // LoadFromURL Function
        widget.LoadFromURL = function (url) {
          widget.LoadNonNativeImage(url);
        };

        // Apply Scale Function
        widget.ApplyScale = function (obj, scale) {
          if (Number(obj.width) > 0 && Number(obj.height) > 0) {
            widget.LockAspectRatio(false);
            widget.SetHeight(Number(obj.height));
            widget.SetWidth(Number(obj.width));
          } else if (Number(obj.width) > 0) {
            widget.LockAspectRatio(true);
            widget.SetWidth(Number(obj.width));
          } else if (Number(obj.height) > 0) {
            widget.LockAspectRatio(true);
            widget.SetHeight(Number(obj.height));
          } else {
            widget.LockAspectRatio(true);
            widget.SetHeight(Number(this.GetNativeHeight()));
          }
          if (scale && Number(scale.sx) > 0 && Number(scale.sy) > 0) {
            widget.SetScaleWidth(Number(scale.sx));
            widget.SetScaleHeight(Number(scale.sy));
          } else if (obj.GetType() === 'Spatial Target') {
            widget.SetScaleWidth(1.0);
            widget.SetScaleHeight(1.0);
          } else {
            // setting 0 for scale is invalid, therefore setting value is close to 0 (DT-20581)
            const minValue = 0.1;
            widget.SetScaleWidth(minValue);
            widget.SetScaleHeight(minValue);
          }
        };

        // Apply Occlude and Opacity Values Function
        widget.ApplyOccludeOpacity = function (occlude, opacity) {
          if (occlude !== undefined) {
            widget.SetOccluding(parseBool(occlude));
          }
          if (opacity !== undefined) {
            widget.SetOpacity(Number(opacity));
          }
        };

        this.setTexture(id, src);

        if (pivot !== undefined) {
          const anchors = [
            Module.AnchorType.TOP_LEFT,
            Module.AnchorType.TOP_CENTER,
            Module.AnchorType.TOP_RIGHT,
            Module.AnchorType.MIDDLE_LEFT,
            Module.AnchorType.MIDDLE_CENTER,
            Module.AnchorType.MIDDLE_RIGHT,
            Module.AnchorType.BOTTOM_LEFT,
            Module.AnchorType.BOTTOM_CENTER,
            Module.AnchorType.BOTTOM_RIGHT,
          ];
          widget.SetAnchor(anchors[pivot - 1]);
        }
      } else {
        setTimeout(errorCb, 0);
      }

      setTimeout(successCb, 0);
    };

    this.add3DButton = function (buttonParams, successCb, errorCb) {
      if (session) {
        var id = buttonParams.id;
        var parent = buttonParams.parent;
        var width = buttonParams.width; // < 0.04 ? 0.04 : buttonParams.width;
        var height = buttonParams.height; // < 0.04 ? 0.04 : buttonParams.height;
        var imageSrc = buttonParams.src;
        var backerColor = buttonParams.backercolor;
        var frontColor = buttonParams.color;
        var backerVisibility =
          buttonParams.backervisibility !== undefined ? parseBool(buttonParams.backervisibility) : true;

        if (!checkSceneExists(scene, id, '3D Button', errorCb)) {
          return null;
        }
        if (!checkNodeExists(id, '3D Button', errorCb)) {
          return null;
        }

        // Create the model part of the widget
        let widget = scene.MakeModel();
        widget.SetUserId(id);
        widget.imageLoaded = false;
        widget.modelLoaded = false;

        // Add ImageMarker part of the button
        if (!widget.$imageWidget) {
          widget.$imageWidget = scene.MakeImageMarker();
          widget.$imageWidget.SetUserId(id);
        }

        // Load Function
        widget.LoadModel = function (successCb, errorCb) {
          app.LoadModelFromURLWithCallback(
            widget,
            '../extensions/images/HLBtn.pvz',
            true,
            true,
            false,
            function (success, isStructure, errors) {
              if (!success) {
                let errorMessage = errors;
                if (!errors) {
                  errorMessage = createErrorMessage(
                    'twx-dt-UNKNOWN_ERROR',
                    'Unknown error loading from url: ' + '../extensions/images/HLBtn.pvz'
                  );
                }
                setTimeout(() => errorCb(errorMessage));
                return;
              }

              // Handle front and back plates as two independent Shape Instances
              var frontPlateProps = {};
              var backPlateProps = {};
              Get3DButtonPlateProps(frontPlateProps, backPlateProps);

              if (!widget.$frontPlateWidget) {
                // Add front plate part of the button
                var frontShapeInstance = widget.GetShapeInstanceFromIdPath(frontPlateProps.idpath);
                widget.$frontPlateWidget = frontShapeInstance;

                const buttonId = widget.name + '_button';
                let buttonWidget = widget.$frontPlateWidget;
                widget.CreatePlate(buttonId, widget.parent, buttonWidget, '3D Button - Button');
              }
              if (!widget.$backPlateWidget) {
                // Add back plate part of the button
                var backShapeInstance = widget.GetShapeInstanceFromIdPath(backPlateProps.idpath);
                widget.$backPlateWidget = backShapeInstance;

                const backerId = widget.name + '_backer';
                let backerWidget = widget.$backPlateWidget;
                widget.CreatePlate(backerId, widget.parent, backerWidget, '3D Button - Backer');
                backerWidget.backerVisibility = backerVisibility;
                if (backerVisibility === false) {
                  backerWidget.SetVisibility1(
                    false,
                    Module.ChildBehaviour.IGNORED,
                    Module.InheritBehaviour.OVERRIDE,
                    -1
                  );
                }
              }

              ctx.setFrontBackColor(id, frontColor, backerColor);

              if (imageSrc) {
                ctx.setTexture(id, imageSrc);
              } else {
                widget.imageLoaded = true;
              }

              if (!isStructure) {
                if (!widget.modelLoaded) {
                  widget.modelLoaded = true;
                  if (widget.imageLoaded === true) {
                    widget.loaded = true;
                    $rootScope.$broadcast('loaded3DObj', { name: widget.name });
                  }
                }
              }
            }
          );
        };

        // Add vrSession object for button:
        widget.CreatePlate = function (plateId, parentId, plateTVWidget, objType) {
          plateTVWidget.loaded = true;
          plateTVWidget.name = plateId;
          let backerObj = vrSession[plateId];
          if (!backerObj) {
            backerObj = addObj(plateId, plateTVWidget, objType);
          } else {
            backerObj.SetWidget(plateTVWidget);
            backerObj.SetType(objType);
          }

          backerObj.id = plateId;

          ctx.addWidgetToGroup(plateTVWidget, parentId, plateId);
        };

        // Apply Scale Function
        widget.ApplyScale = function (obj, scale) {
          if (Number(obj.width) > 0 && Number(obj.height) > 0) {
            // Set front plate dimentions:
            let { front_plate_scale, back_plate_scale } = TransButtonWidgetHeightWidthToScale(
              Number(obj.height),
              Number(obj.width)
            );
            if (widget.$frontPlateWidget && widget.$backPlateWidget) {
              var front_plate_loc = {
                orientation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: 0, z: 0, valid: true },
                scale: front_plate_scale,
                valid: true,
              };
              widget.$frontPlateWidget.SetRelativeLocationAttribute1(front_plate_loc, 0);

              // Set back plate dimentions:
              var back_plate_loc = widget.$backPlateWidget.GetRelativeLocationAttribute1();
              back_plate_loc.scale = back_plate_scale;

              // Calculate offset between plates based on front plate depth: front plate depth + (front plate depth*1.75):
              back_plate_loc.position.z = -front_plate_scale.z * 0.0275;
              widget.$backPlateWidget.SetRelativeLocationAttribute1(back_plate_loc, 0);
            }

            var height = Number(obj.height);
            var width = Number(obj.width);

            var element = document.getElementById(obj.id);
            if (element) {
              var src_prop = element.getAttribute('src');
              var text_prop = element.getAttribute('text');
              if ((src_prop !== undefined && src_prop !== '') || (text_prop !== undefined && text_prop !== '')) {
                var nativeHeight = Number(widget.$imageWidget.GetNativeHeight());
                var nativeWidth = Number(widget.$imageWidget.GetNativeWidth());

                var buttonAspect = height / width;
                var imageAspect = nativeHeight / nativeWidth;

                if (buttonAspect > imageAspect) {
                  height = 0;
                } else {
                  width = 0;
                }

                if (width > 0) {
                  widget.$imageWidget.LockAspectRatio(true);
                  widget.$imageWidget.SetWidth(width);
                } else if (height > 0) {
                  widget.$imageWidget.LockAspectRatio(true);
                  widget.$imageWidget.SetHeight(height);
                }
              }
            }
          }

          Update3DButtonLabelLocation(widget, widget.$imageWidget);
        };

        widget.name = id;
        this.addWidgetToGroup(widget, parent, id);

        var obj = vrSession[id];
        if (!obj) {
          obj = addObj(id, widget, '3D Button');
        } else {
          obj.SetWidget(widget);
          obj.SetType('3D Button');
        }

        obj.width = width;
        obj.height = height;
        obj.id = id;

        widget.LoadModel(successCb, errorCb);

        widget.LoadFromURL = function (src) {
          widget.$imageWidget.LoadFromURLWithCallback(src, function (success) {
            widget.imageLoaded = true;
            if (widget.modelLoaded === true) {
              widget.loaded = true;
              $rootScope.$broadcast('loaded3DObj', { name: widget.name });
            }
          });
        };

        widget.LoadFromBase64WithCallback = function (src, cb) {
          widget.$imageWidget.LoadFromBase64WithCallback(src, cb);
        };

        widget.SetTMLShaderImageFromBase64 = function (textureName, src) {
          widget.$imageWidget.SetTMLShaderImageFromBase64(textureName, src);
        };

        widget.SetTMLShaderImage = function (textureName, src) {
          widget.$imageWidget.SetTMLShaderImage(textureName, src);
        };

        widget.LoadNonNativeImage = function (imageSrc) {
          loadNonNativeImage(obj, imageSrc);
        };

        widget.ApplyOccludeOpacity = function (occlude, opacity) {
          //Do nothing
        };
      } else {
        setTimeout(errorCb, 0);
      }

      setTimeout(successCb, 0);
    };

    this.addModelItem = function (name) {
      var arr = name.split('/', 1);
      if (arr[0].endsWith('-') && arr[0].length > 1) {
        var modelName = arr[0].slice(0, arr[0].length - 1);

        var obj = vrSession[name];
        if (!obj) {
          obj = addObj(name, undefined, 'Model Item');
          obj.idpath = name;
          obj.modelName = modelName;
        }

        if (scene) {
          var widget = scene.MakeModelItem();
          widget.SetUserId(name);
          obj.SetWidget(widget);

          // Apply Scale Function
          widget.ApplyScale = function (obj, scale) {
            if (scale !== undefined) {
              applyScaleToWidget(widget, scale);
            }
          };

          // Apply Occlude and Opacity Values Function
          widget.ApplyOccludeOpacity = function (occlude, opacity) {
            obj.occlude = occlude;
            obj.opacity = opacity;
            applyOccludeOpacity(obj);
          };

          widget.name = name;
          widget.parentModelId = modelName;
          widget.idPath = name.slice(name.indexOf('/'));

          var modelObj = vrSession[modelName];
          if (modelObj !== undefined) {
            var modelWidget = modelObj.GetWidget();
            if (modelWidget !== undefined && modelWidget.loaded) {
              widget.SetModelPtrAndIdPath(modelWidget, widget.idPath);
              widget.loaded = true;
            }
          }
        }
      }
    };

    this.addGroup = function (params, successCb, errorCb) {
      if (session) {
        var name = params.tracker;
        var id = params.id;
        var parent = params.parent;
        var cull = params.cull;
        this.addPVS(name, id, '', cull, parent, successCb, errorCb);
      }
    };

    this.addWidgetToGroup = function (widget, parentId, widgetId) {
      if (parentId) {
        let parentObj = vrSession[parentId];
        if (!parentObj) {
          console.log(`Error: attmpted to add ` + widgetId + `as child to ` + parentId + ` but it doesn't exist`);
          return;
        }
        widget.parent = parentId;
        let parentWidget = parentObj.GetWidget();
        if (!parentWidget.childIds) {
          parentWidget.childIds = [];
        }
        parentWidget.childIds.push(widgetId);
      }
    };

    this.setupAREventsCommand = function () {};

    this.setupTrackingEventsCommand = function (callback) {
      if (!view) {
        console.error("Wasn't able to setupTrackingEventsCommand because view object is not available.");
        return;
      }

      view.SetCameraMoveCallback((location) => {
        let orientation = location.orientation;
        let position = location.position;
        let euler = new THREE.Euler(
          THREE.Math.degToRad(orientation.x),
          THREE.Math.degToRad(orientation.y),
          THREE.Math.degToRad(orientation.z),
          'ZYX'
        );
        let gaze = new THREE.Vector3(0, 0, -1).applyEuler(euler);

        let worldUp = new THREE.Vector3(0, 1, 0);
        let right = new THREE.Vector3().crossVectors(gaze, worldUp);
        let up = new THREE.Vector3().crossVectors(right, gaze).normalize();

        this._getTracked().forEach((tracked) => {
          // Each tracker receives camera coordinates in world space - it only makes sense for a single tracker per view.
          let trackerId = tracked.getAttribute('id');
          callback(trackerId, [position.x, position.y, position.z], gaze.toArray(), up.toArray());
        });
      });
    };

    this.addEmitter = function (
      name,
      id,
      particles,
      radius,
      velocity,
      decay,
      gravity,
      spread,
      size,
      mass,
      rate,
      wind,
      blend,
      color,
      texture,
      parent,
      successCb,
      failureCb
    ) {
      setTimeout(successCb, 0);
    };

    /**
     * @param {string} name - named of tracker, such as 'tracker1'
     * @param {string} id - id of target, such as 'thingMark-1'
     * @param {string} src - src of target, such as 'vuforia-vumark:///vumark?id='
     *                          or 'vuforia-image:///app/resources/Uploaded/DB2?id=T1'
     *                          or 'spatial://'
     * @param {string} width - width of target, such as '0.0254'
     * @param {function} successCb success callback func
     * @param {function} errorCb error callback func
     */
    this.addMarker = function (name, id, src, width, successCb, errorCb) {
      if (session) {
        let guideURL, markerType;

        if (src.startsWith('vuforia-vumark://')) {
          // Don't use the guide specified for thingmarks; use the placeholder instead.
          guideURL = '/extensions/images/placeholder_thingmark.png';
          markerType = 'ThingMark';
        } else if (src.startsWith('spatial://')) {
          // Spatial targets don't have a guide, use a hardcoded placeholder.
          guideURL = '/extensions/images/placeholder_spatial.svg';
          markerType = 'Spatial Target';
        } else if (src.startsWith('vuforia-model://')) {
          // Replace the model target image with a placeholder in preview (DT-16624)
          guideURL = '/extensions/images/placeholder_model_target.svg';
          markerType = 'Model Target';
        } else if (
          this._experienceDefinedTargets &&
          this._experienceDefinedTargets[id] &&
          this._experienceDefinedTargets[id].guide
        ) {
          guideURL = this._experienceDefinedTargets[id].guide;
          markerType = 'Image Target';
        } else {
          console.error('No placeholder available for the twx-dt-target [' + id + ']');
          setTimeout(successCb, 0);
          return;
        }

        var obj = vrSession[id];
        if (!obj) {
          addObj(id, undefined, markerType);
        }

        this.add3DImage(
          {
            tracker: name,
            id: id,
            src: guideURL,
            parent: undefined,
            leaderX: undefined,
            leaderY: undefined,
            anchor: undefined,
            width: width,
            height: undefined,
            pivot: undefined,
            preload: undefined,
          },
          successCb,
          errorCb
        );
      } else {
        console.error('addMarker called before session was available.');
        setTimeout(successCb, 0);
      }
    };

    /**
     * @param {Object} params
     * @param {string} params.tracker - The id of the tracker
     * @param {string} params.target - The id of the target
     * @param {string} params.src - The URL of the image for this guide
     * @param {function} successCb success callback func
     * @param {function} errorCb error callback func
     */
    this.addTargetGuide = function (params, successCb, errorCb) {
      if (params.tracker && params.src && params.target) {
        // Cache the guide src so it can be used in addMarker.
        if (this._experienceDefinedTargets === undefined) {
          this._experienceDefinedTargets = {};
        }

        this._experienceDefinedTargets[params.target] = { guide: params.src };
      }

      setTimeout(successCb, 0);
    };

    this.add3DObject = function (
      name,
      id,
      vertices,
      normals,
      texcoords,
      indexes,
      color,
      texture,
      parent,
      successCb,
      errorCb
    ) {
      if (!checkSceneExists(scene, id, '3Dobject', errorCb)) {
        return null;
      }

      if (!checkNodeExists(id, '3Dobject', errorCb)) {
        return null;
      }

      // Create the widget
      let widget = scene.MakeModel();
      widget.SetUserId(id);
      var obj = addObj(id, widget, 'ModelFS');

      // Apply Scale Function
      widget.ApplyScale = function (obj, scale) {
        if (!isNaN(scale)) {
          widget.SetScale(scale.sx);
        }
      };

      // Apply Occlude and Opacity Values Function
      widget.ApplyOccludeOpacity = function (occlude, opacity) {
        obj.occlude = occlude;
        obj.opacity = opacity;
        applyOccludeOpacity(obj);
      };

      // Create vertices buffer:
      var vertices_data = new Float32Array(vertices);
      var vertices_nDataBytes = vertices_data.length * vertices_data.BYTES_PER_ELEMENT;
      var vertices_dataPtr = Module._malloc(vertices_nDataBytes);
      var vertices_dataHeap = new Uint8Array(Module.HEAPU8.buffer, vertices_dataPtr, vertices_nDataBytes);
      vertices_dataHeap.set(new Uint8Array(vertices_data.buffer));

      // Create normals buffer:
      var normals_data = new Float32Array(normals);
      var normals_nDataBytes = normals_data.length * normals_data.BYTES_PER_ELEMENT;
      var normals_dataPtr = Module._malloc(normals_nDataBytes);
      var normals_dataHeap = new Uint8Array(Module.HEAPU8.buffer, normals_dataPtr, normals_nDataBytes);
      normals_dataHeap.set(new Uint8Array(normals_data.buffer));

      // Create texcoords buffer:
      var texcoords_data = new Float32Array(texcoords);
      var texcoords_nDataBytes = texcoords_data.length * texcoords_data.BYTES_PER_ELEMENT;
      var texcoords_dataPtr = Module._malloc(texcoords_nDataBytes);
      var texcoords_dataHeap = new Uint8Array(Module.HEAPU8.buffer, texcoords_dataPtr, texcoords_nDataBytes);
      texcoords_dataHeap.set(new Uint8Array(texcoords_data.buffer));

      // Create indexes buffer:
      var indexes_data = new Uint16Array(indexes);
      var indexes_nDataBytes = indexes_data.length * indexes_data.BYTES_PER_ELEMENT;
      var indexes_dataPtr = Module._malloc(indexes_nDataBytes);
      var indexes_dataHeap = new Uint8Array(Module.HEAPU8.buffer, indexes_dataPtr, indexes_nDataBytes);
      indexes_dataHeap.set(new Uint8Array(indexes_data.buffer));

      if (
        !widget.PopulateShape(
          vertices_dataHeap.byteOffset,
          vertices.length,
          normals_dataHeap.byteOffset,
          normals.length,
          texcoords_dataHeap.byteOffset,
          texcoords.length,
          indexes_dataHeap.byteOffset,
          indexes.length
        )
      ) {
        let errorMessage = createErrorMessage(
          'twx-dt-PLUGIN_STATE_ERROR',
          'Could not add 3Dobject: ' + id + '; could not populate shape'
        );
        setTimeout(() => errorCb(errorMessage));
      }

      Module._free(vertices_dataHeap.byteOffset);
      Module._free(normals_dataHeap.byteOffset);
      Module._free(texcoords_dataHeap.byteOffset);
      Module._free(indexes_dataHeap.byteOffset);

      widget.loaded = true;
      widget.SetColor(Number(color[0]), Number(color[1]), Number(color[2]), color[3]);
      this.setTexture(id, texture);
      view.ZoomView(Module.ZoomMode.ZOOM_ALL, 0);
      setTimeout(() => successCb());
    };

    this.addTracker = function (name, successCb, errorCb) {
      setTimeout(successCb, 0);
    };

    this.loadTrackerDef = function (marker, successCb, errorCb) {
      if (session) {
        if (successCb) {
          setTimeout(successCb, 0);
        }
      } else {
        setTimeout(errorCb, 0);
      }
    };

    this.initializeAR = function (license, maxtrackers, extendedtracking, persistmap, near, far, successCb, errorCb) {
      if (!cvApi) {
        var that = this;
        setTimeout(function () {
          that.initializeAR(license, maxtrackers, extendedtracking, persistmap, near, far, successCb, errorCb);
        }, 50);
        return;
      }

      cvApiReady();
      resizeFloor(scene, floor, false);

      setDefaultShader();

      $timeout(successCb, 0, false);
    };

    this.setViewProperties = function (props) {
      let shadows = parseBool(props['dropshadow']) ? Module.ShadowMode.SOFT_DROP_SHADOW : Module.ShadowMode.OFF;
      scene.SetShadowMode(shadows, 0.5); // 0.5 = 50% intensity
    };

    this.cleanUpAndPause = function (successCallback, errorCallback) {
      try {
        if (scene) {
          Object.keys(vrSession).forEach(function (sessionObjName) {
            var sessionObj = vrSession[sessionObjName];
            var widget = sessionObj.GetWidget();
            var type = sessionObj.GetType();

            if (widget) {
              if (type === 'Model') {
                scene.RemoveModel(widget);
              } else if (type === 'Model Item') {
                scene.RemoveModelItem(widget, true);
              } else if (type === 'ModelFS') {
                scene.RemoveModelFromShape(widget);
              } else if (type === '3D Button') {
                scene.DeleteImageMarker(widget.$imageWidget);
                scene.RemoveModel(widget);
              } else if (!(widget instanceof Module.ShapeInstance)) {
                // 3D Buttons produce widgets that are ShapeInstances, they are not accepted by the call below.
                scene.DeleteImageMarker(widget);
              }

              sessionObj.SetWidget(undefined);
            }
          });

          floor.size = 0;
          floor.pos = { x: 0, y: 0 };
          if (renderStat) {
            renderStat.removeRenderStat();
          }

          // Workaround for webgl contexts not getting released when switching views a lot in preview.
          // Get hold of the context object before calling deletes below, canvas will
          // be removed after that and won't be reachable anymore.
          const canvas = document.querySelector('canvas[id^=twxDtView]');
          const context = canvas && canvas.GLctxObject && canvas.GLctxObject.GLctx;
          if (!context) {
            console.warn('Was unable to get webgl context to release it');
          }

          deleteTVSessionObjects();

          // Continuation of the workaround from above - context needs to be released after TV delete calls,
          // otherwise things might blow up.
          if (context) {
            console.log('Forcefully releasing webgl context for current TV instance');
            // This call is suspicious, wrap it in a try just in case.
            try {
              context.getExtension('WEBGL_lose_context').loseContext();
            } catch (e) {
              console.error('Error while relasing context', e);
            }
          }
        }

        Object.keys(vrSession).forEach(function (sessionObj) {
          delete vrSession[sessionObj];
        });

        setTimeout(successCallback, 0);
      } catch (e) {
        console.error(e);
        errorCallback(e);
      }
    };

    function deleteTVSessionObjects() {
      cvApi.DeleteSession(session);
      session = undefined;
      if (view) {
        view.delete();
        view = undefined;
      }

      if (scene) {
        scene.delete();
        scene = undefined;
      }

      if (app) {
        app.delete();
        app = undefined;
      }
    }

    this.isResourceUrlFullyQualified = function isResourceUrlFullyQualified(src) {
      if (!src) {
        return false;
      }
      return (
        src.startsWith('http://') || src.startsWith('https://') || src.startsWith('file://') || src.startsWith('data:')
      );
    };

    this.setTexture = function (name, src) {
      if (session && src) {
        var rscUrl = src;
        if (!this.isResourceUrlFullyQualified(src)) {
          rscUrl = getResourceUrl(src);
        }
        var sessionObj = vrSession[name];
        if (sessionObj !== undefined) {
          var widget = sessionObj.GetWidget();
          if (widget !== undefined) {
            if (src.endsWith('.mp4') || src.endsWith('.webm')) {
              $rootScope.$broadcast('loaded3DObj', { name: widget.name });
              return;
            }
            var type = sessionObj.GetType();

            if (type === 'Model Item') {
              if (widget.loaded !== true) {
                sessionObj.texture = src;
                return;
              }
            }

            if (rscUrl.startsWith('data:image/png;base64,')) {
              if (isImageMarker(type)) {
                widget.SetTMLShaderImageFromBase64('texSampler2D', rscUrl);
                widget.LoadFromBase64WithCallback(rscUrl.slice(22), function (success) {
                  if (success) {
                    if (type === '3D Button') {
                      widget.imageLoaded = true;
                    }
                    if (widget.modelLoaded === undefined || widget.modelLoaded === true) {
                      widget.loaded = true;
                      $rootScope.$broadcast('loaded3DObj', { name: widget.name });
                    }
                  }
                });
              } else if (type === 'Model' || type === 'ModelFS') {
                widget.SetTMLShaderImageFromBase64('texSampler2D', rscUrl);
                widget.SetTextureFromBase64Bool(rscUrl.slice(22), Module.Wrap.CLAMP);
              }
            } else if (rscUrl.startsWith('data:image') && isImageMarker(type)) {
              widget.LoadNonNativeImage(rscUrl); // can only set image like this for now, not shader textures.
            } else {
              var urls = src.split(' ');
              var bSetImageFromURL = false;

              for (var i = 0; i < urls.length; i++) {
                var url = urls[i];
                if (!this.isResourceUrlFullyQualified(url)) {
                  url = getResourceUrl(url);
                }

                var utils = app.GetUtils();
                var urlInfo = utils.ParseURL(url);
                var protocol = urlInfo.protocol;
                var params = urlInfo.params;

                if (protocol === 'http' || protocol === 'https' || protocol === 'file') {
                  var textureName = 'texSampler2D';
                  if (i > 0) {
                    textureName += i;
                  }
                  var param = params.get('name');
                  if (param) {
                    textureName = param;
                  }

                  if (!bSetImageFromURL) {
                    bSetImageFromURL = true;

                    var wrap = Module.Wrap.CLAMP;
                    param = params.get('edge');
                    if (param === 'repeat') {
                      wrap = Module.Wrap.REPEAT;
                    } else if (param === 'mirror') {
                      wrap = Module.Wrap.MIRROR;
                    }
                    if (isImageMarker(type)) {
                      widget.LoadFromURL(url);
                    } else if (type === 'Model Item' || type === 'ModelFS') {
                      widget.SetTextureFromURL(url, wrap);
                    }
                  }
                  if (isImageMarker(type)) {
                    widget.SetTMLShaderImage(textureName, url);
                  } else if (type === 'Model Item' || type === 'ModelFS') {
                    widget.SetTMLShaderImage(textureName, url);
                  }
                }
              }
            }
          }
        }
        resizeFloor(scene, floor, false);
      }
    };

    this.setVertices = function (id, vertices) {};

    this.setColor = function (name, color) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        let rgb = color ? toRGB(color) : null;
        sessionObj.rgb = rgb;
        applyColor(sessionObj);
      }
    };

    this.setFrontBackColor = function (name, frontColor, backerColor) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.front_rgb = frontColor;
        sessionObj.back_rgb = backerColor;
        applyFrontBackColor(sessionObj);
      }
    };

    this.setRotation = function (name, rx, ry, rz) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.rotation = { rx: Number(rx), ry: Number(ry), rz: Number(rz) };
        applyTransform(sessionObj);
      }
    };

    this.setTranslation = function (name, x, y, z) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.translation = { x: Number(x), y: Number(y), z: Number(z) };
        applyTransform(sessionObj);
      }
    };

    this.setScale = function (name, x, y, z) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.scale = { sx: Number(x), sy: Number(y), sz: Number(z) };
        applyTransform(sessionObj);
      }
    };

    this.setDimention = function (name, width, height) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.width = width;
        sessionObj.height = height;
        if (sessionObj.GetType() === 'Model' && sessionObj.scale) {
          sessionObj.scale.sx = width;
          sessionObj.scale.sy = height;
        }
        applyTransform(sessionObj);
      }
    };

    this.setProperties = function (name, props) {
      var sessionObj = this.GetObject(name);
      if (sessionObj !== undefined) {
        sessionObj.properties = props;
        applyProperties(sessionObj);
      }
    };

    this.setShader = function (name, vertex, fragment) {
      var shader = shaders.find(function (shader) {
        return shader.name === name;
      });

      if (shader) {
        shader.vertex = vertex;
        shader.fragment = fragment;
      } else {
        shaders.push({ name: name, shader: { name: name, vertex: vertex, fragment: fragment } });
      }
    };

    this.getTracked = function (successCb) {
      setTimeout(() => successCb(this._getTracked()));
    };

    this._getTracked = function () {
      // Assuming that in preview we are able to track all trackers at all times.
      return Array.from(document.querySelectorAll('twx-dt-tracker'));
    };

    this.lockCameraAndOrientation = function () {
      console.log('camera locked');
    };

    this.unlockCameraAndOrientation = function () {
      console.log('camera unlocked');
    };

    /**
     * Takes a screenshot of current view.
     * @param {Object} config
     * @param {Boolean} config.withAugmentation
     * @param {Boolean} config.imgFormat - "JPEG" or "PNG"
     * @param {Boolean} config.dataURL - when true returns a Data URL, otherwise base64 encoded raw image data
     * @param {Function} successCb
     * @param {Function} failureCb - ignored in preview
     */
    this.takeScreenshot = function (config, successCb, failureCb) {
      if (isIn2dView()) {
        return takeScreenshotInHmt(config, successCb);
      }

      let elements = [];
      if (!config.withAugmentation) {
        elements = twx.app.fn.hideAll3DWidgets();
      }

      ThingView.CaptureCanvas((render) => {
        const canvas = getARCanvas();

        // These DOM operations are required so that the resulting image is not blank. Hard to say why.
        const canvasParent = canvas.parentElement;
        const clone = cloneCanvas(canvas);
        canvasParent.replaceChild(clone, canvas);
        const tempContainer = document.createElement('div');
        tempContainer.appendChild(canvas);
        document.body.appendChild(tempContainer);

        render();

        const { width, height } = config.resolution || canvas;
        const pictureCanvas = cloneCanvas(canvas, width, height);

        // Restore original DOM state.
        canvasParent.replaceChild(canvas, clone);
        tempContainer.remove();

        // No need to block rendering any more.
        setTimeout(() => {
          twx.app.fn.unhideAll3DWidgets(elements);
          const encoded = encodeImage(pictureCanvas, config);
          reportSuccess(successCb, encoded, width, height);
        });
      });
    };

    function reportSuccess(successCb, rawBase64, width, height) {
      if (successCb) {
        successCb(rawBase64, {
          width,
          height,
          orientation: width > height ? 'landscape' : 'portrait',
        });
      }
    }

    function encodeImage(canvas, config) {
      const format = (config.imgFormat || 'png').toLowerCase();
      const mimeType = 'image/' + format;
      return getBase64EncodedImage(canvas, mimeType, config.dataURL);
    }

    function isIn2dView() {
      if (document.querySelector('ion-view[view-type="hmt-2D"],ion-view[view-type="mobile-2D"]')) {
        return true;
      }

      // In case check above fails because we failed to account for some other view type
      // this one should be foolproof.
      const canvas = getARCanvas();
      return !canvas || canvas.width === 0 || canvas.height === 0;
    }

    function getARCanvas() {
      return document.querySelector('twx-dt-view canvas');
    }

    function takeScreenshotInHmt(config, successCb, failureCb) {
      // Using setTimeout because on a real divice this would be an async callback.
      setTimeout(() => {
        const width = config.width || window.innerWidth;
        const height = config.height || window.innerHeight;
        const pictureCanvas = renderMockScreenshotForPreview(width, height);
        const encoded = encodeImage(pictureCanvas, config);
        reportSuccess(successCb, encoded, width, height);
      });
    }

    let mockImageCounter = 0;
    /**
     * Renders an image on a canvas that will be displayed in studio preview for 2D eyewear devices.
     * That is because there is no ThingView in that case from which we could capture an image.
     * Each time this method is called a unique image (in terms of this preview session) will be produced.
     *
     * @param {Number} width
     * @param {Number} height
     */
    function renderMockScreenshotForPreview(width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      // Fill background.
      context.fillStyle = '#bfbfbf';
      context.fillRect(0, 0, width, height);

      // Rotate text to be fancy.
      context.translate(width / 2, height / 2);
      context.rotate((-20 * Math.PI) / 180);
      context.textAlign = 'center';
      context.fillStyle = 'black';
      context.font = 'bold 38px sans serif';
      // Changing the number, so that each new snapshot is unique and authors will be able
      // to test for changes.
      mockImageCounter += 1;
      const text = window.parent.i18next.t('ves-ar-extension:preview-2d-eyewear-mock-image-text', {
        number: mockImageCounter,
      });
      context.fillText(text, 0, 0);

      return canvas;
    }

    /**
     *
     * @param {Canvas} canvas
     * @param {String} type mime type of the resulting image
     * @param {Boolean} asDataUrl
     */
    function getBase64EncodedImage(canvas, type, asDataUrl) {
      const dataUrl = canvas.toDataURL(type);
      if (asDataUrl) {
        return dataUrl;
      } else {
        const prefix = 'data:' + type + ';base64,';
        return dataUrl.substring(prefix.length);
      }
    }

    /**
     * Clones canvas with desired dimensions, or with the original dimensions if unspecified.
     * @param {Canvas} canvas
     * @param {Number} width
     * @param {Number} height
     */
    function cloneCanvas(canvas, width = null, height = null) {
      const clone = document.createElement('canvas');
      const context = clone.getContext('2d');
      clone.width = width || canvas.width;
      clone.height = height || canvas.height;
      context.drawImage(canvas, 0, 0, clone.width, clone.height);
      return clone;
    }

    /** for unit testing only */
    this._setSession = function (_session) {
      session = _session;
    };

    this._setScene = function (_scene) {
      scene = _scene;
    };

    this._setView = function (_view) {
      view = _view;
    };

    this._setApp = function (_app) {
      app = _app;
    };

    this._setVRSession = function (_session) {
      vrSession = _session;
    };

    this._setCVApi = function (api) {
      cvApi = api;
    };

    return this;
  }

  /*********************************************************************************/

  twxWidgets.directive('twxDt3dView', ['$rootScope', '$timeout', '$window', 'widget3dUtils', twxDt3dView]);
  twxWidgets2.directive('twxDt3dView', twxDt3dView);

  function addTwxCallbacks() {
    if (window.twx) {
      /**
       * Calls the same event handler that is used by View so Preview will have same events and event data
       * @param {string} widgetId the widget's id such as 'model-1' or '3DImage-1'
       * @param {string} targetType the targetType expected by the native event handler (either 'twx-dt-model' or '3DImage')
       * @param {string} itemIdPath the clicked idPath for model widget such as '0/1/2', or undefined for 3DImage
       */
      window.twx.widgetClickCallback = function (widgetId, targetType, idPath) {
        if (widgetId) {
          var evtData = idPath ? JSON.stringify({ occurrence: idPath }) : undefined;
          VF_ANG.nativeEventHandler('userpick', widgetId, targetType, evtData);
        }
      };
    }
  }

  /**
   * Returns object of the form:
   * {
   *   project
   *   resource
   *   dir
   * }
   * @param str
   */
  function parseResourceStringForSmap(str) {
    let lessIndex = 1;
    if (str.endsWith('/')) {
      lessIndex = 2;
    }
    const splits = str.split('/');
    const res = splits[splits.length - lessIndex];
    return {
      project: splits[1],
      resource: res,
      dir: res.substring(0, res.lastIndexOf('.bin')),
    };
  }

  function twxDt3dView($rootScope, $timeout, $window, widget3dUtils) {
    var cvApi;

    var linker = function (scope, element, attrs) {
      var ctrl = scope.ctrl;
      element.data('ctrl', ctrl);
      $rootScope.$broadcast('start-load-spinner');

      var parent = element[0].parentElement;
      parent.setAttribute('style', 'position: absolute; width: 100%; height: 100vh; top: 0px; left: 0px;');

      var id = 'x-' + parent.getAttribute('widget-id') + '-controller';
      element.attr('id', id);
      element.attr('style', 'position: inherit; width: 100%; height: 100%;');

      if (cvApi) {
        ctrl.cvApiReady();
      } else {
        // the first argument is the relative path under studio/dist/client where the thingview library resides
        ThingView.init('extensions', function () {
          ThingView.SetPrintDeprecated();
          console.log('Renderer Version: ' + ThingView.GetFileVersion());
          cvApi = ThingView;
          ctrl.cvApiReady();
        });
      }

      function clickListener(event) {
        // deselect any current active widgets
        var canvasContents = element.closest('#canvas-contents');
        canvasContents.find('[twx-widget]').removeClass('active');

        event.stopPropagation();
      }
      //Redraw labels when the css changes
      function cssChangeListener(event) {
        var redrawFunction = function (el) {
          var ctrl = angular.element(el).data('_widgetController');
          if (ctrl && ctrl.$cvWidget) {
            GenerateMarkupImage(ctrl.$cvWidget, ctrl.designPropertyValues());
          }
        };
        var redrawFunction3dButton = function (el) {
          var ctrl = angular.element(el).data('_widgetController');
          if (ctrl && ctrl.$imageWidget) {
            GenerateMarkupImage(ctrl.$imageWidget, ctrl.designPropertyValues());
          }
        };
        document.querySelectorAll('twx-dt-label').forEach(redrawFunction);
        document.querySelectorAll('twx-dt-image').forEach(redrawFunction);
        document.querySelectorAll('twx-dt-3dbutton').forEach(redrawFunction3dButton);

        if (event.detail && event.detail.loadingDialog) {
          window.parent.document.dispatchEvent(new CustomEvent('imageMarkupRedrawn'));
        }
      }

      var docEl = angular.element(document.head);
      docEl.off('cssChanged', cssChangeListener);
      docEl.on('cssChanged', _.debounce(cssChangeListener, 50));
      element.off('click', clickListener);
      element.on('click', clickListener);

      scope.$on('$destroy', function () {
        element.off('click', clickListener);
      });

      if ($window.twx) {
        $window.twx.widgetSelectCallback = function (widgetId, resolve, reject) {
          if (widgetId) {
            resolve($('[widget-id="' + widgetId + '"]')[0]);
          } else {
            reject('No widget-id found');
          }
        };

        $window.twx.get3DWidgetIdAtPoint = function (x, y) {
          var selectPromise = new Promise(function (resolve, reject) {
            ctrl.myView.DoPickWithCallback(x, y, true /* invert */, true /* include markups */, function (pickResult) {
              let widgetId = '';
              let widget = ctrl.GetWidgetFromPickResult(pickResult);
              if (widget && widget.getWidgetTagName() !== 'twx-dt-target-model') {
                widgetId = widget.widgetId;
                if (widget.parent) {
                  widgetId = widget.parent.widgetId;
                }
              }
              $window.twx.widgetSelectCallback(widgetId, resolve, reject);
            });
          });
          return selectPromise;
        };

        /**
         * Set hover drag styling,
         * @param x mouse coordinate
         * @param y mouse coordinate
         * @param isDataBindHover:  Boolean:  true for databind drag, false for new widget drag
         */
        $window.twx.set3DDragHoverAt = function (x, y, isDataBindHover) {
          if (isDataBindHover) {
            ctrl.myView.DoPickWithCallback(x, y, true /* invert */, true /* include markups */, function (pickResult) {
              ctrl.myScene.DePreselectAll();
              const widget = ctrl.GetWidgetFromPickResult(pickResult);
              if (widget && widget.$cvWidget.Preselect && widget.getWidgetTagName() !== 'twx-dt-target-model') {
                widget.$cvWidget.Preselect();
              }
            });
          }
        };

        $window.twx.clear3DDragHover = function () {
          if (ctrl.myScene) {
            ctrl.myScene.DePreselectAll();
          }
        };

        $window.twx.onCanvasUndoRedoBegin = function () {
          window.twx.setAppState('cameraLocation', ctrl.mySession.GetViewLocation());
        };

        $window.twx.onCanvasUndoRedoEnd = function () {
          if (ctrl.myView) {
            const currentAppState = $window.twx.getCurrentAppState();
            if (currentAppState && typeof currentAppState.cameraLocation !== 'undefined') {
              ctrl.myView.SetViewLocation(currentAppState.cameraLocation);
            }
          }
        };
      }
    };

    return {
      scope: {},
      link: linker,
      controllerAs: 'ctrl',
      bindToController: true,
      controller: function ($scope, $element, $http) {
        var ctrl = this;
        ctrl.element = $element[0];
        ctrl.myWidgets = {};
        ctrl.mySession = undefined;
        ctrl.renderStat = undefined;
        ctrl.currentMode = 'authoring';
        ctrl.hiddenComponents = [];
        ctrl.reposMode = 'none';
        ctrl.floor = { size: 0, pos: { x: 0, y: 0 }, fillColor: 0x80808080, gridColor: 0x80808080 };
        ctrl.detachedModelItems = [];
        ctrl.detachedHiddenItems = [];

        ctrl.init = function () {};

        ctrl.getWidgetFactory = function (widgetTag) {
          var stdFactories = {
            'twx-dt-model': ctrl.addModel,
            'twx-dt-target': ctrl.addImageMarker,
            'twx-dt-target-image': ctrl.addImageMarker,
            'twx-dt-target-spatial': ctrl.addSpatialTarget,
            'twx-dt-target-user-defined': ctrl.addImageMarker,
            'twx-dt-target-model': ctrl.addModelTarget,
            'twx-dt-target-advanced-model': ctrl.addModelTarget,
            'twx-dt-target-area': ctrl.addModel,
            'twx-dt-image': ctrl.addImageMarker,
            'twx-dt-label': ctrl.addTextMarker,
            'twx-dt-sensor': ctrl.addComboMarker,
            'twx-dt-modelitem': ctrl.addModelItem,
            'twx-dt-spatial-map': ctrl.addSpatialMap,
            'twx-dt-3dbutton': ctrl.add3DButton,
            'twx-dt-3dpress-button': ctrl.add3DPressButton,
            'twx-dt-3dimage-button': ctrl.add3DImageButton,
            'twx-dt-3dtoggle-button': ctrl.add3DToggleButton,
            'twx-dt-3dcheckbox-button': ctrl.add3DToggleButton,
            'twx-dt-3dvideo': ctrl.add3DVideo,
            'twx-dt-3daudio': ctrl.add3DVideo,
            'twx-dt-3dpanel': ctrl.add3DPanel,
            'twx-dt-group': ctrl.addGroup,
          };
          var factory = stdFactories[widgetTag];
          if (!factory) {
            factory = ctrl.addCustomWidget;
          }
          return factory;
        };

        ctrl.createObject = function (ctrlWidget, originalDropOffset) {
          var tagName = ctrlWidget.getWidgetTagName();
          if (ctrl.getWidgetFactory(tagName) !== undefined) {
            ctrl.myWidgets[ctrlWidget.widgetId] = ctrlWidget;
            if (ctrl.myScene) {
              ctrl.myScene.DeselectAll();
              ctrlWidget.$cvWidget = ctrl.getWidgetFactory(tagName)(ctrlWidget, originalDropOffset);
            }
          }
        };

        ctrl.removeObject = function (ctrlWidget, removeOptions) {
          if (ctrlWidget && ctrl.myWidgets[ctrlWidget.widgetId]) {
            selectedWidget = ctrlWidget;
            if (ctrl.myScene) {
              ctrl.myScene.DeselectAll();
            }

            if (ctrlWidget.parent && ctrlWidget.parent.$cvWidget) {
              const index = ctrlWidget.parent.$cvWidget.children.indexOf(ctrlWidget);
              if (index !== -1) {
                ctrlWidget.parent.$cvWidget.children.splice(index, 1);
              }
            }

            if (ctrlWidget.$cvWidget && ctrlWidget.$cvWidget.isCustomWidget) {
              ctrlWidget.$cvWidget.children.forEach(function (child) {
                let tagName = child.getWidgetTagName();
                if (tagName === 'twx-dt-image' || tagName === 'twx-dt-label') {
                  ctrl.myScene.DeleteImageMarker(child.$cvWidget);
                } else if (tagName === 'twx-dt-model') {
                  ctrl.myScene.RemoveModel(child.$cvWidget);
                }
                child.mutationObserver.disconnect();
                child.$cvWidget.delete();
                child.$cvWidget = null;
              });
              return;
            }

            var tagName = ctrlWidget.getWidgetTagName();

            if (tagName === 'twx-dt-model') {
              if (ctrl.myScene && ctrlWidget.$cvWidget) {
                ctrl.myScene.RemoveModel(ctrlWidget.$cvWidget);
              }
              ctrl.removeHiddenParts(ctrlWidget);
              $scope.$applyAsync();
              if (ctrlWidget.$cvWidget) {
                // the remove options allow us to know when we are doing a "soft remove" (i.e. just cleaning up the canvas when switching views)
                // vs. an actual remove of the widget.  There could be listeners attached that are performing some cleanup
                // when a widget is removed so we need to pass these params into the remove() function on the widget
                var _removeOptions = Object.assign(
                  { notify: true, removePermanently: true },
                  typeof removeOptions === 'object' ? removeOptions : {}
                );
                var i = ctrlWidget.$cvWidget.modelItems.length - 1;
                for (; i >= 0; i--) {
                  ctrlWidget.$cvWidget.modelItems[i].ctrlWidget.remove(
                    _removeOptions.notify,
                    _removeOptions.removePermanently
                  );
                }

                // When a model is removed, remove corresponding model target also
                if (ctrlWidget.modelTarget) {
                  ctrlWidget.modelTarget.ctrlWidget.remove(_removeOptions.notify, _removeOptions.removePermanently);
                }
              }
            } else if (is3DButtonTag(tagName)) {
              if (ctrl.myScene) {
                if (ctrlWidget.$cvWidget.$imageWidget) {
                  ctrl.myScene.DeleteImageMarker(ctrlWidget.$cvWidget.$imageWidget);
                  if (ctrlWidget.$cvWidget.$imageWidget) {
                    ctrlWidget.$cvWidget.$imageWidget.delete();
                  }
                }
                if (ctrlWidget.$cvWidget) {
                  ctrl.myScene.RemoveModel(ctrlWidget.$cvWidget);
                }
              }
            } else if (is3DPanelTag(tagName)) {
              if (ctrl.myScene) {
                ctrlWidget.$cvWidget.DeleteButtons();
                if (ctrlWidget.$cvWidget) {
                  ctrl.myScene.RemoveModel(ctrlWidget.$cvWidget);
                }
              }
            } else if (tagName === 'twx-dt-modelitem') {
              if (ctrl.myScene && ctrlWidget.$cvWidget) {
                ctrl.myScene.RemoveModelItem(ctrlWidget.$cvWidget, true);
              }
              ctrl.removeHiddenParts(ctrlWidget);
              $scope.$applyAsync();
              var model = ctrl.myWidgets[ctrlWidget.designPropertyValues().model];
              if (model && model.$cvWidget) {
                var index = model.$cvWidget.modelItems.indexOf(ctrlWidget.$cvWidget);
                if (index !== -1) {
                  model.$cvWidget.modelItems.splice(index, 1);
                  if (model.designPropertyValues().showSequenceInCanvas) {
                    let props = { showSequenceInCanvas: true };
                    ctrl.updateObject(model, model.designPropertyValues(), props);
                  }
                }
              }
            } else if (tagName === 'twx-dt-3dpanel' || tagName === 'twx-dt-target-area') {
              if (ctrl.myScene && ctrlWidget.$cvWidget) {
                ctrl.myScene.RemoveModel(ctrlWidget.$cvWidget);
              }
            } else if (
              tagName === 'twx-dt-image' ||
              tagName === 'twx-dt-label' ||
              tagName === 'twx-dt-sensor' ||
              tagName === 'twx-dt-target' ||
              tagName === 'twx-dt-target-spatial' ||
              tagName === 'twx-dt-target-image' ||
              isModelTargetTag(tagName)
            ) {
              if (ctrl.myScene && ctrlWidget.$cvWidget) {
                ctrl.myScene.DeleteImageMarker(ctrlWidget.$cvWidget);
              }

              // I need to remove the pointer to the model target from a corresponding model. But there can be only one model target on the scene. So I can remove "all of them" and it'll be OK.
              if (isModelTargetTag(tagName)) {
                for (const widget of Object.values(ctrl.myWidgets)) {
                  if (widget.getWidgetTagName() === 'twx-dt-model') {
                    widget.modelTarget = undefined;
                  }
                }
              }
            }

            delete ctrl.myWidgets[ctrlWidget.widgetId];
            if (ctrlWidget.$cvWidget) {
              ctrlWidget.$cvWidget.delete();
            }
            ctrlWidget.$cvWidget = null;
            resizeFloorDebounce();
          }
        };

        var resizeFloorDebounce = _.debounce(function () {
          if (ctrl.myScene) {
            resizeFloor(ctrl.myScene, ctrl.floor, getFeatureToggle($rootScope, 'adaptiveFloorHeight'));
          }
        }, 100);

        ctrl.detachChildModelItems = function (ctrlWidget) {
          ctrlWidget.$cvWidget.modelItems.forEach(function (modelItem) {
            ctrl.detachedModelItems.push(modelItem.ctrlWidget);
            var hiddenItem = ctrl.hiddenComponents.find(function (item) {
              return modelItem.ctrlWidget.widgetId === item.ctrlWidget.widgetId;
            });
            if (hiddenItem) {
              ctrl.detachedHiddenItems.push(hiddenItem);
            }
            ctrl.removeObject(modelItem.ctrlWidget);
          });
        };

        ctrl.attachModelItems = function (ctrlWidget) {
          ctrl.detachedModelItems.forEach(function (item) {
            ctrl.createObject(item, false);
          });
          ctrl.detachedModelItems = [];
        };

        ctrl.removeHiddenParts = function (ctrlWidget) {
          ctrl.hiddenComponents = ctrl.hiddenComponents.filter(function (item) {
            return ctrlWidget.widgetId !== item.ctrlWidget.widgetId;
          });
        };

        ctrl.replaceSelectedWidget = function (oldWidget) {
          if (oldWidget) {
            selectedWidget = Object.values(ctrl.myWidgets).find(
              (ctrlWidget) =>
                ctrlWidget.widgetId !== oldWidget.widgetId && ctrlWidget.$cvWidget && ctrlWidget.$cvWidget.isSelected
            );
          }
          if (selectedWidget === oldWidget) {
            selectedWidget = null;
          }
        };

        ctrl.restoreMovementRestriction = function (ctrlWidget) {
          // Movement restrictions exists only in targets- since we can have only single one per scene
          // We can turn off the restriction for the multi selected widgets once they are deselected
          // In case another widget is deselected we restore its restriction to false
          if (ctrlWidget) {
            const tagName = ctrlWidget.getWidgetTagName();
            if (isModelTargetTag(tagName)) {
              if (selectedWidget) {
                selectedWidget.disableTransform = false;
              }
            } else if (tagName === 'twx-dt-target-spatial') {
              if (selectedWidget) {
                selectedWidget.limitDragger = false;
              }
            } else {
              transferMovementRestriction(selectedWidget, ctrlWidget); // Update selectedWidget to hold movement restriction data
              ctrlWidget.disableTransform = false;
              ctrlWidget.limitDragger = false;
            }
          }
        };

        ctrl.selectObject = function (ctrlWidget, isMultiSelect) {
          if (ctrlWidget) {
            if (ctrlWidget !== selectedWidget) {
              transferMovementRestriction(ctrlWidget, selectedWidget); // Update newly selected widget to hold movement restriction data
              selectedWidget = ctrlWidget;
              if (!isMultiSelect && ctrl.myScene) {
                ctrl.myScene.DeselectAll();
              }
              if (ctrlWidget.$cvWidget && !ctrlWidget.$cvWidget.isSelected) {
                ctrlWidget.$cvWidget.isSelected = true;
                ctrlWidget.$cvWidget.Select(true);
              }
              if (ctrlWidget.delegate && typeof ctrlWidget.delegate.widgetSelected === 'function') {
                // let the widget perform other operations (when it's required)
                ctrlWidget.delegate.widgetSelected(ctrlWidget, ctrl);
              }
            }
          }
        };

        ctrl.deselectObject = function (ctrlWidget) {
          if (ctrlWidget === selectedWidget) {
            ctrl.replaceSelectedWidget(ctrlWidget);
          }
          if (ctrlWidget.$cvWidget && ctrlWidget.$cvWidget.isSelected) {
            ctrl.restoreMovementRestriction(ctrlWidget);
            ctrlWidget.$cvWidget.Select(false);
            ctrlWidget.$cvWidget.isSelected = false;
          }
          if (ctrlWidget.delegate && typeof ctrlWidget.delegate.widgetDeselected === 'function') {
            // let the widget perform other operations (when it's required)
            ctrlWidget.delegate.widgetDeselected(ctrlWidget, ctrl);
          }
        };

        ctrl.deselectAll = () => {
          if (ctrl.myScene) {
            // Calling DeselectAll will cause TV to fire deselect3DObj for each deselected object.
            ctrl.myScene.DeselectAll();
          }
        };

        //***************************************************************
        // Widget Selection Event Handler
        //
        if (unRegSelect) {
          unRegSelect();
        }
        unRegSelect = $scope.$on('select3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;
          if (isAreaTargetTag(ctrlWidget)) {
            ctrlWidget = getAreaTargetCtrl(ctrlWidget); // TV selects the child model representing area target
          }

          if (ctrlWidget.parent) {
            if (ctrlWidget.parent.$cvWidget && ctrlWidget.parent.$cvWidget.isSelected) {
              return;
            } else if (ctrlWidget.parent.$cvWidget && !ctrlWidget.parent.$cvWidget.children) {
              ctrlWidget = ctrlWidget.parent;
            }
          }

          if (ctrl.getCompHideMode() && ctrl.tryHideComponent(ctrlWidget, args)) {
            // Do nothing - we were in hiding mode and successfully hid a component.
            // Interestingly when we're in hiding mode and we click on a component that cannot
            // be hidden it will still be selected, hence else if below.
          } else if (selectedWidget !== ctrlWidget && !ctrlWidget.$cvWidget.isSelected) {
            transferMovementRestriction(ctrlWidget, selectedWidget); // Update newly selected widget to hold movement restriction data
            selectedWidget = ctrlWidget;
            const multiSel = ctrl.hasMultiSelect();
            ctrlWidget.select(multiSel);
            ctrlWidget.$cvWidget.isSelected = true;
          }

          ctrl.setReposMode(ctrl.reposMode, false);

          if (ctrlWidget.$cvWidget.children) {
            ctrlWidget.$cvWidget.children.forEach(function (child) {
              child.$cvWidget.Select(ctrlWidget.$cvWidget.isSelected);
            });
          }
          $scope.$applyAsync();
        });

        ctrl.tryHideComponent = (ctrlWidget, args) => {
          const tagName = ctrlWidget.getWidgetTagName();
          let wasAbleToHide = true;
          if (tagName === 'twx-dt-model') {
            if (args.partId === '') {
              ctrlWidget.$cvWidget.SetVisibility(false);
            } else {
              ctrlWidget.$cvWidget.SetPartVisibility(
                args.partId,
                false,
                Module.ChildBehaviour.IGNORED,
                Module.InheritBehaviour.OVERRIDE
              );
            }
          } else if (tagName === 'twx-dt-modelitem') {
            ctrlWidget.$cvWidget.SetVisibility(false);
          } else {
            // We are only hiding specific types of components, if it's not on the list do nothing.
            wasAbleToHide = false;
          }

          if (wasAbleToHide) {
            ctrl.deselectAll();
            $scope.$applyAsync(ctrl.hiddenComponents.push({ ctrlWidget, partId: args.partId }));
          }

          return wasAbleToHide;
        };

        ctrl.updateNavMode = (areaTargetSelected) => {
          //If area target is selected turn explore mode on
          if (areaTargetSelected) {
            ctrl.myView.SetNavigationMode(Module.NavMode.EXPLORE);
          } else {
            ctrl.myView.SetNavigationMode(Module.NavMode.VUFORIA);
          }
        };

        //***************************************************************
        // Widget Deselection Event Handler
        //
        if (unRegDeselect) {
          unRegDeselect();
        }
        unRegDeselect = $scope.$on('deselect3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;
          if (isAreaTargetTag(ctrlWidget)) {
            ctrlWidget = getAreaTargetCtrl(ctrlWidget); // TV deselects the child model representing area target
          }
          if (ctrlWidget.parent) {
            if (ctrlWidget.parent.$cvWidget && ctrlWidget.parent.$cvWidget.isSelected) {
              ctrlWidget = ctrlWidget.parent;
            }
          }
          if (!ctrl.getCompHideMode()) {
            if (ctrlWidget.$cvWidget.isSelected) {
              if (ctrlWidget === selectedWidget) {
                ctrl.replaceSelectedWidget(ctrlWidget);
              }
              ctrlWidget.$cvWidget.isSelected = false;
              ctrl.restoreMovementRestriction(ctrlWidget);
              const multiDesel = ctrl.myScene.GetSelectionCount() > 0;
              ctrlWidget.deselect(multiDesel);
            }
          }
          ctrl.setReposMode(ctrl.reposMode, false);
          if (ctrlWidget.$cvWidget.children) {
            ctrlWidget.$cvWidget.Select(false);
            ctrlWidget.$cvWidget.wasJustDeselected = !ctrlWidget.$cvWidget.wasJustDeselected;
          }
          $scope.$applyAsync();
        });

        //***************************************************************
        // Widget Move Event Handler
        //
        if (unRegMove) {
          unRegMove();
        }

        const widgetTransformDebounces = {};
        unRegMove = $scope.$on('move3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;

          // Regular debounce is not enough, need to debounce per widgetId,
          // as different widgets can be moved at once.
          const widgetId = ctrlWidget.widgetId;
          if (widgetTransformDebounces[widgetId]) {
            clearTimeout(widgetTransformDebounces[widgetId]);
          }

          widgetTransformDebounces[widgetId] = setTimeout(() => {
            updateWidgetTransform(ctrlWidget, args);
            delete widgetTransformDebounces[widgetId];
          }, 150);
        });

        function updateWidgetTransform(ctrlWidget, args) {
          const parent = ctrlWidget.parent;
          const tagName = ctrlWidget.getWidgetTagName();
          if (parent) {
            if (parent.$cvWidget && parent.$cvWidget.children) {
              let dimensions;
              if (tagName === 'twx-dt-3dpanel') {
                dimensions = ctrlWidget.$cvWidget.getDimensions();
              }
              args.location = getRelativeLocation(parent, args.location, dimensions);
            } else {
              ctrlWidget = ctrlWidget.parent;
            }
          }
          if (ctrlWidget.$cvWidget.children) {
            ctrlWidget.$cvWidget.UpdateGroupElLocation();
          }

          // TODO: Not sure why we're checking for iframe here.
          if (ctrl.getParentActiveElement().tagName === 'IFRAME' || args.forcePropsUpdate) {
            ctrlWidget.setProps({
              x: args.location.position.x.toFixed(4),
              y: args.location.position.y.toFixed(4),
              z: args.location.position.z.toFixed(4),
              rx: args.location.orientation.x.toFixed(2),
              ry: args.location.orientation.y.toFixed(2),
              rz: args.location.orientation.z.toFixed(2),
              scale: getScalePropertyValue(args.location.scale, tagName),
            });
          }

          resizeFloor(ctrl.myScene, ctrl.floor, getFeatureToggle($rootScope, 'adaptiveFloorHeight'));
        }

        //***************************************************************
        // Widget Loaded Event Handler
        //
        if (unRegLoaded) {
          unRegLoaded();
        }
        unRegLoaded = $scope.$on('loaded3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;
          if (isAreaTargetTag(ctrlWidget)) {
            ctrlWidget = getAreaTargetCtrl(ctrlWidget); // TV loads the child model representing area target
          }
          if (ctrlWidget.$cvWidget) {
            // strip any properties that might cause a re-load
            var stripped_props = _.omit(ctrlWidget.designPropertyValues(), [
              'src',
              'url',
              'text',
              'textprops',
              'textattrs',
              'font',
              'fontsize',
              'textx',
              'texty',
              'imagex',
              'imagey',
              'canvasheight',
              'canvaswidth',
              'canvasgrowthoverride',
              'fontColor',
              'fontOutlineColor',
              'fontFamily',
            ]);

            var tagName = ctrlWidget.getWidgetTagName();

            ctrl.updateObject(ctrlWidget, ctrlWidget.designPropertyValues(), stripped_props, true);
            if (selectedWidget === ctrlWidget && ctrl.myScene) {
              ctrl.myScene.DeselectAll();
              ctrlWidget.$cvWidget.Select(true);
              ctrlWidget.$cvWidget.isSelected = true;
            }

            if (tagName === 'twx-dt-model') {
              ctrl.attachModelItems(ctrlWidget);
              if (ctrlWidget.modelTarget) {
                UpdateModelTargetLocation(ctrlWidget.modelTarget, true);
              }
            } else if (tagName === 'twx-dt-modelitem') {
              var hiddenItem = ctrl.detachedHiddenItems.find(function (item) {
                return ctrlWidget.widgetId === item.ctrlWidget.widgetId;
              });

              if (hiddenItem) {
                hiddenItem.ctrlWidget.$cvWidget.SetVisibility(false);
                ctrl.hiddenComponents.push(hiddenItem);
                ctrl.detachedHiddenItems = ctrl.detachedHiddenItems.filter(function (item) {
                  return hiddenItem.ctrlWidget.widgetId !== item.ctrlWidget.widgetId;
                });
              }
            } else if (tagName === 'twx-dt-image' || tagName === 'twx-dt-label' || tagName === 'twx-dt-sensor') {
              ctrlWidget.$cvWidget.ApplySize();
            } else if (isModelTargetTag(tagName)) {
              var props = ctrlWidget.designPropertyValues();
              if (props.model) {
                if (ctrl.myWidgets[props.model]) {
                  ctrlWidget.model = ctrl.myWidgets[props.model].$cvWidget;
                  UpdateModelTargetLocation(ctrlWidget.$cvWidget, true);
                }
              }
            } else if (is3DButtonTag(tagName) && ctrlWidget.$cvWidget.$imageWidget) {
              ctrlWidget.$cvWidget.$imageWidget.SetPickable(false);
            } else if (is3DPanelTag(tagName)) {
              ctrlWidget.$cvWidget.SetButtonsAppearance();
              ctrlWidget.$cvWidget.UpdateButtonsPosition(
                {
                  x: Number(ctrlWidget.getProp('x')),
                  y: Number(ctrlWidget.getProp('y')),
                  z: Number(ctrlWidget.getProp('z')),
                },
                {
                  x: Number(ctrlWidget.getProp('rx')),
                  y: Number(ctrlWidget.getProp('ry')),
                  z: Number(ctrlWidget.getProp('rz')),
                }
              );
            } else if (tagName === 'twx-dt-target-area') {
              ctrlWidget.$cvWidget.SetPickable(false);
            }

            if (ctrlWidget.$cvWidget.children) {
              ctrlWidget.$cvWidget.HideChildrenProps();
            }

            if (ctrlWidget.$cvWidget.dropCoords) {
              ctrl.doZoomSelectedIfNotInView();
            } else {
              ctrl.doZoomAll();
            }

            if (tagName === 'twx-dt-target' || tagName === 'twx-dt-target-image') {
              if (ctrl.reposMode !== 'mate') {
                ctrl.setReposMode('mate');
              }
            } else {
              if (ctrl.reposMode !== 'translate') {
                ctrl.setReposMode('translate');
              }
            }

            resizeFloor(ctrl.myScene, ctrl.floor, getFeatureToggle($rootScope, 'adaptiveFloorHeight'));
            ctrl.setReposMode(ctrl.reposMode, false);
          }
        });

        //***************************************************************
        // Widget Load Error Event Handler
        //
        if (unRegLoadErr) {
          unRegLoadErr();
        }
        unRegLoadErr = $scope.$on('loadError3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;
          ctrl.removeObject(ctrlWidget);
        });

        //***************************************************************
        // Widget Ready-for-zoom Event Handler
        //
        if (unRegReady) {
          unRegReady();
        }
        unRegReady = $scope.$on('readyForZoom3DObj', function (event, args) {
          var ctrlWidget = args.ctrlWidget;
          if (ctrlWidget.$cvWidget) {
            if (ctrlWidget.$cvWidget.dropCoords) {
              ctrl.doZoomSelectedIfNotInView();
            } else {
              ctrl.doZoomAll();
            }
          }
        });

        /**
         * @returns the parent window active "focused" element
         */
        ctrl.getParentActiveElement = function getParentActiveElement() {
          return parent.document.activeElement;
        };
        /**
         * Widget Property Updates
         *
         * @param {Object} childCtrlWidget
         * @param {Object} props - dictionary of all widget properties
         * @param {Object} changedProps - property dictionary of the changed properties
         * @param {Boolean} initializeWidget - true if the widget is being loaded/initialized and should apply all properties
         *   despite the activity in the parent window.
         */
        ctrl.updateObject = function (ctrlWidget, props, changedProps, initializeWidget) {
          var tagName = ctrlWidget.getWidgetTagName();
          var cvWidget = ctrlWidget.$cvWidget;

          // Prevent circular update of cvWidget and the widget properties on dragging.
          if (ctrl.getParentActiveElement().tagName === 'IFRAME' && initializeWidget !== true) {
            changedProps = _.omit(changedProps, ['x', 'y', 'z', 'rx', 'ry', 'rz', 'scale']);
          }

          if (ctrlWidget && cvWidget) {
            // Don't try and update Custom Widgets - they are just a container for other primitives.
            if (cvWidget.isCustomWidget) {
              return;
            }

            if ('idpath' in changedProps) {
              if (cvWidget.GetIdPath() !== props.idpath && cvWidget.GetIdPath()) {
                //Empty idpath for models not yet loaded
                var model = ctrl.myWidgets[props.model].$cvWidget;
                cvWidget.SetModelPtrAndIdPath(model, props.idpath);
                var location = cvWidget.GetLocation();
                var new_pos_props = {
                  x: location.position.x.toFixed(4),
                  y: location.position.y.toFixed(4),
                  z: location.position.z.toFixed(4),
                  rx: location.orientation.x.toFixed(2),
                  ry: location.orientation.y.toFixed(2),
                  rz: location.orientation.z.toFixed(2),
                  scale: getScalePropertyValue(location.scale, tagName),
                };
                var newProps = _.omit(props, ['idpath', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'scale']);
                ctrlWidget.setProps(new_pos_props);
                ctrl.updateObject(ctrlWidget, props, newProps);
                ctrl.myScene.SelectModelItem(cvWidget, true);
                return;
              }
            }
            if ('widgetId' in changedProps) {
              //reassign cached ctrl value
              ctrl.myWidgets[ctrlWidget.widgetId] = ctrlWidget;
            }
            if ('url' in changedProps) {
              // Model Targets should always display the default placeholder image
              if (cvWidget.GetSourceURL() !== props.url && !isModelTargetTag(tagName)) {
                handleDefaultImage(props, tagName);
                cvWidget.LoadFromURL(props.url);
              }
            }

            //ACC HACKING: if anchorsrc is changed, derive src and put it in changedPros so
            //  that the next conditional is met. The same goes for positional stuff
            if ('anchorsrc' in changedProps) {
              // - by default src = resource/Tester/src/phone/resources/
              // - generated pvz put in the following by server code:
              //    \Users\achopra\Documents\ThingWorxStudio\Projects\Tester\src\spatial_map_geom
              //    "resource/Tester/src/phone/resources/Uploaded/mesh_30-Jun-2017-01593129.bin"
              const anchorSrcObj = parseResourceStringForSmap(changedProps['anchorsrc']);
              if (anchorSrcObj.dir) {
                const src =
                  'resource/' +
                  anchorSrcObj.project +
                  '/src/spatial_map_geom/' +
                  anchorSrcObj.dir +
                  '/' +
                  anchorSrcObj.dir +
                  '.pvz';
                changedProps['src'] = src;
                props['src'] = src;
                // Read the json file for the anchor to set its position based on the transformation in it
                const anchorJsonUrl = src.substr(0, src.length - 4) + '.json';
                $http.get(anchorJsonUrl, { cache: true }).then(function (response) {
                  const anchor = response.data;
                  // transformToWorld property has each element of its 4X4 matrix as a separate property.
                  // Only translation (x, y, z) is needed.
                  ctrlWidget.setProps({
                    x: anchor.transformToWorld.m41,
                    y: anchor.transformToWorld.m42,
                    z: anchor.transformToWorld.m43,
                    anchorguid: anchor.spatialAnchorGuid,
                  });
                });
              } else {
                changedProps['src'] = changedProps['anchorsrc'];
                props['src'] = changedProps['anchorsrc'];
              }
            }
            if ('src' in changedProps) {
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-spatial-map' || tagName === 'twx-dt-target-area') {
                if (cvWidget.GetSourceURL() !== props.src) {
                  // DT-24257: there used to be a $timeout here, removed it as a part of a fix.
                  ctrl.detachChildModelItems(ctrlWidget);
                  ctrl.removeHiddenParts(ctrlWidget);
                  $scope.$applyAsync();
                  cvWidget.LoadModel(props.src);
                  if (tagName === 'twx-dt-model' && ctrlWidget.modelTarget) {
                    ctrlWidget.modelTarget.srcChanged = true;
                  }
                }
              } else if (tagName === 'twx-dt-sensor') {
                GenerateMarkupImage(cvWidget, props);
              } else if (is3DButtonTag(tagName)) {
                if (ctrlWidget.$cvWidget.$imageWidget) {
                  ctrlWidget.$cvWidget.GenerateButtonImage(props);
                }
              } else if (!is3DPanelTag(tagName)) {
                // TV is not able to load video src for now
                if (cvWidget.GetSourceURL() !== props.src) {
                  handleDefaultImage(props, tagName);
                  cvWidget.LoadFromURL(props.src);
                }
              }
            }
            if ('model' in changedProps) {
              if (isModelTargetTag(tagName)) {
                var modelWidget = ctrl.myWidgets[props.model];
                if (ctrlWidget.model) {
                  ctrlWidget.model.ctrlWidget.modelTarget = undefined;
                }
                ctrlWidget.model = modelWidget.$cvWidget;
                modelWidget.modelTarget = cvWidget;
                UpdateModelTargetLocation(cvWidget, true);
              }
            }

            if (!ctrlWidget.disableTransform) {
              if (
                'x' in changedProps ||
                'y' in changedProps ||
                'z' in changedProps ||
                'rx' in changedProps ||
                'ry' in changedProps ||
                'rz' in changedProps
              ) {
                if ('anchorsrc' in changedProps) {
                  // Make sure surrounding meshes of spatial anchors are rendered at origin
                  cvWidget.SetPosition(0, 0, 0);
                } else if (
                  !isNaN(Number(props.x)) &&
                  !isNaN(Number(props.y)) &&
                  !isNaN(Number(props.z)) &&
                  !isNaN(Number(props.rx)) &&
                  !isNaN(Number(props.ry)) &&
                  !isNaN(Number(props.rz))
                ) {
                  const transform = getGlobalTransform(ctrlWidget);
                  const pose = widget3dUtils.poseFromTransform(transform);
                  if (cvWidget.children) {
                    cvWidget.SetGroupLocation(transform);
                  } else {
                    setLocation(cvWidget, pose);
                  }
                }
              }
            }

            // Remove empty size attributes (DT-22789)
            var sizeProps = _.pick(changedProps, ['scale', 'width', 'height', 'sx', 'sy', 'sz']);
            sizeProps = _.pickBy(sizeProps, (val) => val !== null && val !== undefined && val !== '');

            if ('scale' in sizeProps || 'width' in sizeProps || 'height' in sizeProps) {
              const transform = getGlobalTransform(ctrlWidget);
              const pose = widget3dUtils.poseFromTransform(transform);
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                const scaleXYZ = props.scale.split(' ');
                if (scaleXYZ.length === 1) {
                  cvWidget.SetScale(pose.scale.x);
                } else if (scaleXYZ.length === 3) {
                  cvWidget.SetScaleXYZ(pose.scale.x, pose.scale.y, pose.scale.z);
                }
              } else if (is3DButtonTag(tagName)) {
                if ('height' in sizeProps || 'width' in sizeProps) {
                  ctrlWidget.$cvWidget.SetButtonDimensions(props.height, props.width);
                  ctrlWidget.$cvWidget.GenerateButtonImage(props);
                }
              } else if (is3DPanelTag(tagName)) {
                if ('height' in sizeProps || 'width' in sizeProps) {
                  ctrlWidget.$cvWidget.SetDimensions(props.height, props.width);
                }
                if (cvWidget.children) {
                  cvWidget.SetGroupLocation(transform);
                }
              } else if (cvWidget.children) {
                cvWidget.SetGroupLocation(transform);
              } else {
                if ('height' in sizeProps) {
                  ctrlWidget.totalHeight = undefined;
                }
                if ('width' in sizeProps) {
                  ctrlWidget.totalWidth = undefined;
                }
                SetHeightWidth(cvWidget, props);
              }
              setLocation(cvWidget, pose);
            } else if ('sx' in sizeProps || 'sy' in sizeProps || 'sz' in sizeProps) {
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                cvWidget.SetScale(Number(props.sx));
              } else {
                cvWidget.SetScaleWidth(Number(props.sx));
                cvWidget.SetScaleHeight(Number(props.sy));
              }
            }
            if ('color' in changedProps) {
              var color = changedProps.color;
              if (is3DButtonTag(tagName)) {
                if (cvWidget.$frontPlateWidget || cvWidget.$backPlateWidget) {
                  if (color === '') {
                    // if  Button color is 'unset', reset to default.
                    color = ctrlWidget.properties['color'].default;
                    ctrlWidget.setProp('color', color);
                  }
                  // For now different plates colors are not supported by UI
                  Set3DButtonPlateColors(cvWidget, color, color);
                }
              } else {
                if (color) {
                  let rgb = toRGB(color);
                  if (rgb) {
                    cvWidget.SetColor(rgb[0], rgb[1], rgb[2], 1.0);
                  }
                } else {
                  cvWidget.UnsetColor();
                }
              }
            }
            if ('panelColor' in changedProps) {
              if (ctrlWidget.$panelWidget && ctrlWidget.$cvWidget.loaded) {
                let panelColor = changedProps.panelColor;
                if (!panelColor) {
                  // if  Panel color is 'unset', reset to default.
                  panelColor = ctrlWidget.properties.panelColor.default;
                  ctrlWidget.setProp('panelColor', panelColor);
                }
                cvWidget.SetPanelColor(panelColor);
              }
            }
            if ('buttonColor' in changedProps) {
              if (is3DPanelTag(tagName) && ctrlWidget.$cvWidget.ButtonsLoaded()) {
                let buttonColor = changedProps.buttonColor;
                if (!buttonColor) {
                  // if  Button color is 'unset', reset to default.
                  buttonColor = ctrlWidget.properties.buttonColor.default;
                  ctrlWidget.setProp('buttonColor', buttonColor);
                }
                cvWidget.SetButtonsColor(buttonColor);
              }
            }
            if ('hideControls' in changedProps) {
              if (ctrlWidget.$cvWidget.ButtonsLoaded()) {
                cvWidget.SetButtonsVisibility(!changedProps.hideControls);
              }
            }
            if ('visible' in changedProps) {
              if (ctrlWidget.$cvWidget && ctrlWidget.$cvWidget.children) {
                ctrlWidget.$cvWidget.SetVisibility(parseBool(props.visible));
              }
            }
            let parent = ctrlWidget.parent; // For group widget apply group properties
            if ('decal' in changedProps) {
              if (parent && parent.$cvWidget && parent.$cvWidget.children) {
                parent.$cvWidget.SetGroupDecal(parseBool(props.decal), ctrlWidget);
              } else {
                if (cvWidget.children) {
                  cvWidget.SetGroupDecal(parseBool(props.decal));
                } else {
                  cvWidget.SetDecal(parseBool(props.decal));
                }
              }
            }
            if ('opacity' in changedProps || 'occlude' in changedProps) {
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                cvWidget.SetOccludeOpacity(parseBool(props.occlude), Number(props.opacity));
              } else {
                if ('opacity' in changedProps) {
                  if (parent && parent.$cvWidget && parent.$cvWidget.children) {
                    parent.$cvWidget.SetOpacity(Number(props.opacity), ctrlWidget);
                  } else {
                    cvWidget.SetOpacity(Number(props.opacity));
                  }
                }
                if ('occlude' in changedProps) {
                  if (parent && parent.$cvWidget && parent.$cvWidget.children) {
                    parent.$cvWidget.SetOccluding(parseBool(props.occlude), ctrlWidget);
                  } else {
                    cvWidget.SetOccluding(parseBool(props.occlude));
                  }
                }
              }
            }
            if ('billboard' in changedProps) {
              let drawtype = Module.DrawType.WORLD_SPACE;
              if (parseBool(props.billboard)) {
                drawtype = Module.DrawType.WORLD_SPACE_BILLBOARD;
              }
              if (cvWidget.SetDrawType) {
                cvWidget.SetDrawType(drawtype);
              } else {
                console.log(props.widgetId + " doesn't support SetDrawType");
              }
            }
            if ('tagalong' in changedProps) {
              if (ctrlWidget.buttons) {
                const pinButton = ctrlWidget.buttons.pin;
                if (pinButton && pinButton.$imageWidget) {
                  let btnProps = { props };
                  btnProps.src = widget3dUtils.getDesignTagalongIcon(changedProps['tagalong']);
                  GenerateMarkupImage(pinButton.$imageWidget, btnProps);
                }
              }
            }
            if (('text' in changedProps || 'fontColor' in changedProps) && is3DButtonTag(tagName)) {
              if (props['fontColor'] === '') {
                // if Button font color is 'unset', reset to default.
                props['fontColor'] = ctrlWidget.properties['fontColor'].default;
                ctrlWidget.setProp('fontColor', props['fontColor']);
              }
              if (
                (props['src'] === '' || !ctrlWidget.$cvWidget.imageOverridesText) &&
                ctrlWidget.$cvWidget.$imageWidget
              ) {
                props['fontOutlineColor'] = props['fontColor']; // Always set outline color for 3D Button as font color
                ctrlWidget.$cvWidget.GenerateButtonImage(props);
              }
            } else if (
              'text' in changedProps ||
              'textprops' in changedProps ||
              'textattrs' in changedProps ||
              'font' in changedProps ||
              'fontsize' in changedProps ||
              'textx' in changedProps ||
              'texty' in changedProps ||
              'imagex' in changedProps ||
              'imagey' in changedProps ||
              'canvasheight' in changedProps ||
              'canvaswidth' in changedProps ||
              'canvasgrowthoverride' in changedProps ||
              'fontColor' in changedProps ||
              'fontOutlineColor' in changedProps ||
              'fontFamily' in changedProps ||
              'class' in changedProps
            ) {
              GenerateMarkupImage(cvWidget, props);
            }
            if ('pivot' in changedProps) {
              var anchor = Module.AnchorType.MIDDLE_CENTER;
              // eslint-disable-next-line default-case
              switch (Number(props.pivot)) {
                case 1:
                  anchor = Module.AnchorType.TOP_LEFT;
                  break;
                case 2:
                  anchor = Module.AnchorType.TOP_CENTER;
                  break;
                case 3:
                  anchor = Module.AnchorType.TOP_RIGHT;
                  break;
                case 4:
                  anchor = Module.AnchorType.MIDDLE_LEFT;
                  break;
                case 5:
                  anchor = Module.AnchorType.MIDDLE_CENTER;
                  break;
                case 6:
                  anchor = Module.AnchorType.MIDDLE_RIGHT;
                  break;
                case 7:
                  anchor = Module.AnchorType.BOTTOM_LEFT;
                  break;
                case 8:
                  anchor = Module.AnchorType.BOTTOM_CENTER;
                  break;
                case 9:
                  anchor = Module.AnchorType.BOTTOM_RIGHT;
                  break;
              }
              cvWidget.SetAnchor(anchor);
            }
            if ('showSequenceInCanvas' in changedProps || 'sequence' in changedProps) {
              let seqLoaded = false;
              if (props.showSequenceInCanvas && props.sequence) {
                let sequenceName = GetSequenceNamefromUrl(props.sequence, cvWidget);
                if (sequenceName) {
                  seqLoaded = true;
                  cvWidget.LoadIllustrationWithCallback(sequenceName, cvWidget.IllustrationLoadedHandler);
                }
              }
              if (!seqLoaded) {
                cvWidget.LoadIllustrationWithCallback('', cvWidget.IllustrationLoadedHandler);
              }
            }

            resizeFloor(ctrl.myScene, ctrl.floor, getFeatureToggle($rootScope, 'adaptiveFloorHeight'));
          }
        };

        ctrl.beforeDestroy = function () {
          if (ctrl.mySession) {
            if (ctrl.renderStat) {
              ctrl.renderStat.removeRenderStat();
            }
            cvApi.DeleteSession(ctrl.mySession);
            delete ctrl.mySession;
            delete ctrl.myApp;
          }
        };

        ctrl.cvApiReady = function () {
          $rootScope.thingViewReady = true;
          $rootScope.$broadcast('stop-load-spinner');
          cvApi.SetDefaultSystemPreferences(Module.ApplicationType.THINGVIEW);

          let antialiasing = true;
          if ($rootScope.builderSettings.antiAliasingEnabled === false) {
            antialiasing = false;
          }

          cvApi.SetSystemPreferencesFromJson(getDefaultPrefs(antialiasing));
          ctrl.myApp = cvApi.CreateTVApplication(ctrl.element.id);
          ctrl.mySession = ctrl.myApp.GetSession();
          ctrl.mySession.EnableFileCache(5000);
          ctrl.myScene = ctrl.mySession.GetActiveTVShapeScene();
          ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRIMARYSELECTION);
          ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRESELECTION);

          ctrl.myView = ctrl.mySession.GetActiveShapeView();
          ctrl.myView.SetDragMode(Module.DragMode.NONE);
          ctrl.myView.SetDragSnap(false);
          ctrl.myView.EnableDraggerHotkeys(false);
          ctrl.myView.ShowGnomon(true);
          ctrl.myView.SetNavigationMode(Module.NavMode.VUFORIA);
          ctrl.myView.AllowCameraApplications(false);

          ctrl.myView.SetSelectionHighlightStyle(Module.SelectionList.PRIMARYSELECTION, Module.HighlightStyle.FILL);
          ctrl.myView.SetSelectionHighlightStyle(Module.SelectionList.PRESELECTION, Module.HighlightStyle.FILL);

          // Floor Colors
          if ($rootScope.builderSettings.canvasFloorColor) {
            ctrl.floor.fillColor = rgbaToInteger($rootScope.builderSettings.canvasFloorColor);
          }
          if ($rootScope.builderSettings.canvasGridColor) {
            ctrl.floor.gridColor = rgbaToInteger($rootScope.builderSettings.canvasGridColor);
          }
          resizeFloor(ctrl.myScene, ctrl.floor, getFeatureToggle($rootScope, 'adaptiveFloorHeight'));

          // View mode - orthographic / perspective
          if ($rootScope.builderSettings.viewMode === 'orthographic') {
            ctrl.myView.SetOrthographicProjection(1.0);
          } else {
            ctrl.myView.SetPerspectiveProjection(45);
          }

          // Selection highlighting style
          if ($rootScope.builderSettings.enable3dSelectionColorSettings) {
            let hoverBorderColor3d = rgbaToInteger($rootScope.builderSettings.HoverBorderColor3d);
            let hoverFillColor3d = rgbaToInteger($rootScope.builderSettings.HoverFillColor3d);
            if (hoverBorderColor3d !== -1 && hoverFillColor3d !== -1) {
              ctrl.myView.SetSelectionColor(Module.SelectionList.PRESELECTION, hoverFillColor3d, hoverBorderColor3d);
            }
            let selectionBorderColor3d = rgbaToInteger($rootScope.builderSettings.SelectionBorderColor3d);
            let selectionFillColor3d = rgbaToInteger($rootScope.builderSettings.SelectionFillColor3d);
            if (selectionBorderColor3d !== -1 && selectionFillColor3d !== -1) {
              ctrl.myView.SetSelectionColor(
                Module.SelectionList.PRIMARYSELECTION,
                selectionFillColor3d,
                selectionBorderColor3d
              );
            }
          }

          // Drop-shadow type
          let shadows = Module.ShadowMode.SOFT_DROP_SHADOW; // default
          if ($rootScope.builderSettings.designTimeDropShadows === 'OFF') {
            shadows = Module.ShadowMode.OFF;
          } else if ($rootScope.builderSettings.designTimeDropShadows === 'HARD') {
            shadows = Module.ShadowMode.SHARP_DROP_SHADOW;
          }
          ctrl.myScene.SetShadowMode(shadows, 0.5); // 0.5 = 50% intensity

          // Background color(s)
          setBackgroundColors(
            ctrl.myView,
            rgbaToInteger($rootScope.builderSettings.canvasBackgroundColor),
            rgbaToInteger($rootScope.builderSettings.canvasBackgroundColor2)
          );

          // Render stats
          if ($rootScope.builderSettings.enableDebugLogging) {
            ctrl.renderStat = addRenderStat(ctrl.myView, 'twx-dt-view');
          }

          ctrl.updateWidgetsOnStart();
        };

        /**
         * Reusable sort function for the widget collection, for _.sortBy
         * @param {*} widget
         */
        function widgetTypeModelFirstSorter(widget) {
          if (widget.getWidgetTagName() === 'twx-dt-model') {
            return 0;
          }
          return 1;
        }

        /**
         * Will update properties for all widgets found, but will gaurantee models are process first.
         */
        ctrl.updateWidgetsOnStart = function updateWidgetsOnStart() {
          //Sort by models to make sure model-items are processed after the models
          angular.forEach(_.sortBy(ctrl.myWidgets, widgetTypeModelFirstSorter), function (ctrlWidget, widgetId) {
            ctrlWidget.$cvWidget = ctrl.getWidgetFactory(ctrlWidget.getWidgetTagName())(ctrlWidget);
            ctrlWidget.$cvWidget.ctrlWidget = ctrlWidget;
            ctrl.updateObject(ctrlWidget, ctrlWidget.designPropertyValues(), ctrlWidget.designPropertyValues(), true);
          });
        };

        ctrl.hasSelectedObject = function () {
          if (!ctrl.mySession) {
            return false;
          }
          if (ctrl.myScene.GetSelectionCount() > 0) {
            return true;
          } else {
            return false;
          }
        };

        ctrl.hasMultiSelect = function () {
          return ctrl.myScene && ctrl.myScene.GetSelectionCount() > 1;
        };

        ctrl.canMate = function () {
          // Widgets specified in this "if condition" cannot be mated
          if (selectedWidget && !ctrl.hasMultiSelect()) {
            const tagName = selectedWidget.getWidgetTagName();
            return (
              tagName !== 'twx-dt-target-spatial' && !isModelTargetTag(tagName) && !isAreaTargetTag(selectedWidget)
            );
          }

          return false;
        };

        ctrl.canTranslate = function () {
          return selectedWidget && !selectedWidget.disableTransform && !ctrl.hasMultiSelect();
        };

        // Various functions to handle the Component Hide mode
        ctrl.hasHiddenComponents = function () {
          return ctrl.hiddenComponents.length > 0;
        };
        ctrl.getCompHideMode = function () {
          return ctrl.currentMode === 'compHide';
        };
        ctrl.toggleCompHideMode = function () {
          if (ctrl.getCompHideMode()) {
            ctrl.setAuthoringMode();
          } else {
            ctrl.setCompHideMode();
          }
        };
        ctrl.unhideAll = function () {
          ctrl.hiddenComponents.forEach(function (item) {
            if (item.partId === '') {
              item.ctrlWidget.$cvWidget.SetVisibility(true);
            } else {
              item.ctrlWidget.$cvWidget.SetPartVisibility(
                item.partId,
                true,
                Module.ChildBehaviour.IGNORED,
                Module.InheritBehaviour.OVERRIDE
              );
            }
          });
          ctrl.hiddenComponents = [];
        };
        ctrl.setAuthoringMode = function () {
          if (ctrl.myScene) {
            ctrl.myScene.DeselectAll();
            ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRIMARYSELECTION);
            ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.MODEL, Module.SelectionList.PRESELECTION);
          }
          ctrl.currentMode = 'authoring';
        };
        ctrl.setCompHideMode = function () {
          if (ctrl.myScene) {
            ctrl.myScene.DeselectAll();
            selectedWidget = null;
            ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.PART, Module.SelectionList.PRIMARYSELECTION);
            ctrl.myScene.SetSelectionFilter(Module.SelectionFilter.PART, Module.SelectionList.PRESELECTION);
          }
          ctrl.currentMode = 'compHide';
        };

        // Get the Dragger Mode
        ctrl.getDraggerMode = function () {
          return ctrl.reposMode;
        };

        // Set the Dragger Mode
        ctrl.setReposMode = function (mode, toggle = true) {
          if (selectedWidget && selectedWidget.disableTransform) {
            mode = 'none';
            ctrl.myView.SetDragDirections(0);
            ctrl.myView.SetDragMode(Module.DragMode.NONE);
            return;
          }

          if (toggle && ctrl.reposMode === mode) {
            mode = 'none';
          }
          if (selectedWidget && selectedWidget.$cvWidget && selectedWidget.$cvWidget.isCustomWidget) {
            if (mode === 'translate' || mode === 'rotate') {
              let props = selectedWidget.designPropertyValues();
              let directions = 0;
              if ('x' in props) {
                // jshint bitwise:false
                directions = directions | Number(Module.DragDirection.LINEAR_X.value);
              }
              if ('y' in props) {
                directions = directions | Number(Module.DragDirection.LINEAR_Y.value);
              }
              if ('z' in props) {
                directions = directions | Number(Module.DragDirection.LINEAR_Z.value);
              }
              if ('x' in props && 'y' in props) {
                directions = directions | Number(Module.DragDirection.PLANAR_XY.value);
              }
              if ('y' in props && 'z' in props) {
                directions = directions | Number(Module.DragDirection.PLANAR_YZ.value);
              }
              if ('z' in props && 'x' in props) {
                directions = directions | Number(Module.DragDirection.PLANAR_ZX.value);
              }
              if ('rx' in props) {
                directions = directions | Number(Module.DragDirection.ROTATE_X.value);
              }
              if ('ry' in props) {
                directions = directions | Number(Module.DragDirection.ROTATE_Y.value);
              }
              if ('rz' in props) {
                directions = directions | Number(Module.DragDirection.ROTATE_Z.value);
              }
              ctrl.myView.SetDragDirections(directions);
              ctrl.myView.SetDragCSYS(Module.DragCSYS.SELECTION);
              ctrl.myView.SetDragMode(Module.DragMode.DRAG);
            }
            // TODO: This is a bug, what if mode is none here?
            return;
          }

          if (mode === 'translate' || mode === 'rotate') {
            if (selectedWidget && selectedWidget.limitDragger) {
              ctrl.myView.SetDragCSYS(Module.DragCSYS.WORLD);
              ctrl.myView.SetDragDirections(
                Number(Module.DragDirection.LINEAR_Z.value) | // jshint bitwise:false
                  Number(Module.DragDirection.LINEAR_X.value) |
                  Number(Module.DragDirection.PLANAR_ZX.value)
              );
            } else {
              ctrl.myView.SetDragDirections(Number(Module.DragDirection.ALL.value));
              ctrl.myView.SetDragCSYS(Module.DragCSYS.SELECTION);
            }
            ctrl.myView.SetDragMode(Module.DragMode.DRAG);
          } else if (mode === 'mate') {
            if (selectedWidget && (selectedWidget.limitDragger || selectedWidget.disableTransform)) {
              ctrl.myView.SetDragMode(Module.DragMode.NONE);
            } else {
              ctrl.myView.SetDragMode(Module.DragMode.MATE);
            }
          } else {
            ctrl.myView.SetDragMode(Module.DragMode.NONE);
          }
          ctrl.reposMode = mode;
        };

        // Zoom All
        ctrl.doZoomAll = function () {
          if (ctrl.myView) {
            ctrl.myView.ZoomView(Module.ZoomMode.ZOOM_ALL, 0);
          }
        };

        // Zoom Selected
        ctrl.doZoomSelected = function () {
          ctrl.myView.ZoomView(Module.ZoomMode.ZOOM_SELECTED, 0);
        };

        // Zoom Selected if not already in the camera's view
        ctrl.doZoomSelectedIfNotInView = function () {
          ctrl.myView.ZoomView(Module.ZoomMode.ZOOM_INCLUDE_SELECTED, 0);
        };

        // Add a spatial map to the canvas *with a spatial anchor*
        ctrl.addSpatialMap = function (ctrlWidget, dropCoords) {
          let widget = addModelFn(ctrlWidget, false);
          widget.props = ctrlWidget.designPropertyValues();
          return widget;
        };

        ctrl.SetPanelColor = function (widget, color) {
          if (!widget.ctrlWidget || !widget.ctrlWidget.$panelWidget) {
            return;
          }
          let rgb = toRGB(color);
          if (rgb) {
            widget.ctrlWidget.$panelWidget.SetColor1(
              rgb[0],
              rgb[1],
              rgb[2],
              1.0,
              Module.ChildBehaviour.IGNORED,
              Module.InheritBehaviour.OVERRIDE,
              -1,
              true,
              true,
              Module.OLFaceAppearances.USE
            );
          } else {
            widget.ctrlWidget.$panelWidget.UnsetColor1(Module.ChildBehaviour.IGNORED, -1);
          }
        };

        // Add a Model to the Canvas
        ctrl.addModel = addModelFn;

        function addModelFn(ctrlWidget, dropCoords) {
          let widget = ctrl.myScene.MakeModel();
          widget.SetUserId(ctrlWidget.widgetId);
          widget.ctrlWidget = ctrlWidget;
          widget.dropCoords = Boolean(dropCoords);
          widget.applyOffset = Boolean(dropCoords);
          widget.originOffset = undefined;
          ctrlWidget.$cvWidget = widget;
          widget.modelItems = [];

          // Load Model function
          widget.LoadModel = function (src) {
            if (widget.originOffset) {
              var location = widget.GetLocation();
              var props = {
                x: location.position.x + widget.originOffset.x,
                y: location.position.y + widget.originOffset.y,
                z: location.position.z + widget.originOffset.z,
              };
              widget.AnimateTransitions(false);
              widget.SetPosition(props.x, props.y, props.z);
              widget.ctrlWidget.setProps(props);
            }
            widget.originOffset = undefined;

            if (!src || src === '' || src.slice(-1) === '/') {
              if (!widget.isPlaceHolder) {
                widget.isPlaceHolder = true;
                ctrl.myApp.LoadModelFromURLWithCallback(
                  widget,
                  'extensions/images/vse-3d-model.ol',
                  true,
                  false,
                  false,
                  widget.ModelLoadedHandler
                );
              }
            } else {
              widget.isPlaceHolder = false;
              ctrl.myApp.LoadModelFromURLWithCallback(widget, src, true, true, false, widget.ModelLoadedHandler);
            }
          };

          // Model Loaded Callback
          widget.ModelLoadedHandler = function (success, isStructure, errors) {
            if (success) {
              widget.loaded = true;
              $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
              if (!widget.isPlaceHolder) {
                widget.CalculateOffset();
              }

              if (isStructure) {
                // Add model items to this model in case they haven't been added already.
                _.forEach(ctrl.myWidgets, (modelItemCandidate) => {
                  if (modelItemCandidate.getWidgetTagName() === 'twx-dt-modelitem') {
                    let model = modelItemCandidate.getProp('model');
                    if (
                      widget.ctrlWidget.widgetId === model &&
                      !_.find(widget.modelItems, (item) => item.ctrlWidget.widgetId === modelItemCandidate.widgetId)
                    ) {
                      widget.modelItems.push(modelItemCandidate.$cvWidget);
                    }
                  }
                });

                var numItems = widget.modelItems.length;
                for (var i = 0; i < numItems; i++) {
                  let modelItem = widget.modelItems[i];
                  modelItem.ctrlWidget.$cvWidget = modelItem;
                  if (modelItem.SetModelPtrAndIdPath) {
                    // modelItem might actually be an instance of ImageMarker, which doesn't have this method.
                    var modelItemProps = modelItem.ctrlWidget.designPropertyValues();
                    modelItem.SetModelPtrAndIdPath(widget, modelItemProps.idpath);
                  }

                  $rootScope.$broadcast('loaded3DObj', { ctrlWidget: modelItem.ctrlWidget });
                }
              } else {
                $rootScope.$broadcast('readyForZoom3DObj', { ctrlWidget: widget.ctrlWidget });
                if (!widget.isPlaceHolder && getFeatureToggle($rootScope, 'shrinkwrapModels')) {
                  widget.ExtractSequencePartIdsWithCallback('', widget.SequencePartIdsHandler);
                }
              }
            }
          };

          // Sequence Part Ids Callback
          widget.SequencePartIdsHandler = function (success, name, partIds) {
            if (success) {
              var props = {};
              props.sequencePartIds = [];
              for (var i = 0; i < partIds.size(); i++) {
                props.sequencePartIds.push(partIds.get(i));
              }
              widget.ctrlWidget.setProps(props);
            }
          };

          // Illustration Loaded Callback
          widget.IllustrationLoadedHandler = function (success, name, TVstepInfoVec) {
            var numItems = widget.modelItems.length;
            for (var i = 0; i < numItems; i++) {
              $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.modelItems[i].ctrlWidget });
              widget.modelItems[i].SetVisibility(true); // Model Items are always visible in canvas
            }
          };

          // Return a ModelItem given its IdPath (if it exists)
          widget.GetModelItemFromIdPath = function (idPath) {
            var numItems = widget.modelItems.length;
            for (var i = 0; i < numItems; i++) {
              var modelItemProps = widget.modelItems[i].ctrlWidget.designPropertyValues();
              if (modelItemProps.idpath === idPath) {
                return widget.modelItems[i];
              }
            }
            return null;
          };

          // Select this Model
          widget.Select = function (sel) {
            widget.scene.SelectModel(widget, sel);
          };

          // Preselect this Model
          widget.Preselect = function (sel) {
            widget.scene.PreSelectModel(widget, true);
          };

          // Reposition the Model so it sits on the floor
          widget.CalculateOffset = function () {
            if (!this.originOffset) {
              var box = widget.CalculateBoundingBox(new Module.VectorString());
              if (box.valid) {
                var location = widget.GetLocation();
                widget.originOffset = {
                  x: (box.min.x + box.max.x) / 2 - location.position.x,
                  y: box.min.y - location.position.y,
                  z: (box.min.z + box.max.z) / 2 - location.position.z,
                };
                if (widget.applyOffset) {
                  var props = {
                    x: location.position.x - widget.originOffset.x,
                    y: location.position.y - widget.originOffset.y,
                    z: location.position.z - widget.originOffset.z,
                  };
                  widget.AnimateTransitions(false);
                  widget.SetPosition(props.x, props.y, props.z);
                  widget.AnimateTransitions(true);
                  widget.ctrlWidget.setProps(props);
                }
                widget.applyOffset = true;
              }
            }
          };

          // Handle Placement Picks
          widget.PlacementPickHandler = function (pickResult) {
            ModelPlacementPickHandler(widget, pickResult);
          };

          widget.SetOccludeOpacity = function (occludeProp, opacityProp) {
            let parent = widget.ctrlWidget.parent;
            if (parent && parent.$cvWidget && parent.$cvWidget.children) {
              // If this widget is part of a group, its parent updates occlude/opacity properties
              parent.$cvWidget.SetOccludeOpacity(occludeProp, opacityProp, widget.ctrlWidget);
            } else {
              SetOccludeOpacity(widget, occludeProp, opacityProp);
            }
          };

          widget.SetTVObservers = function () {
            let ModelObserverClass = Module.ModelObserver.extend('ModelObserver', {
              // Location Callback
              OnLocationChange: function (loc) {
                if (widget.ctrlWidget.modelTarget) {
                  UpdateModelTargetLocation(widget.ctrlWidget.modelTarget, false);
                  widget.ctrlWidget.modelTarget.srcChanged = false;
                }

                $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
              },
              // Selection Callback
              OnSelection: function (selected, selectType, type, instance, idPath) {
                if (selectType === Module.SelectionList.PRIMARYSELECTION) {
                  if (type === Module.SelectionCallbackType.SHAPEINSTANCE) {
                    if (selected && selectedWidget !== widget.ctrlWidget) {
                      $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    } else {
                      $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    }
                  } else if (type === Module.SelectionCallbackType.PART) {
                    if (selected) {
                      $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: idPath });
                    } else {
                      $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: idPath });
                    }
                  }
                }
              },
            });

            let observer = new ModelObserverClass();
            widget.AddObserver(observer);
          };

          widget.SetTVObservers();

          // If the model has been drag-n-dropped on the canvas, find out where to position it
          // Otherwise, just load it.
          widget.scene = ctrl.myScene;
          widget.view = ctrl.myView;
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
          } else {
            widget.LoadModel(ctrlWidget.designPropertyValues().src);
          }

          return widget;
        }

        // Add a Model Item to the Canvas
        ctrl.addModelItem = function (ctrlWidget, dropCoords) {
          let widget = ctrl.myScene.MakeModelItem();
          widget.SetUserId(ctrlWidget.widgetId);
          widget.ctrlWidget = ctrlWidget;
          widget.dropCoords = Boolean(dropCoords);
          ctrlWidget.$cvWidget = widget;
          widget.scene = ctrl.myScene;

          let ModelItemObserverClass = Module.ModelBaseObserver.extend('ModelBaseObserver', {
            // Location Callback
            OnLocationChange: function (loc) {
              $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
            },
            // Selection Callback
            OnSelection: function (selected, selectType, type, instance, idPath) {
              if (selectType === Module.SelectionList.PRIMARYSELECTION && type === Module.SelectionCallbackType.BASE) {
                if (selected && selectedWidget !== widget.ctrlWidget) {
                  $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                } else {
                  $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                }
              }
            },
          });

          let observer = new ModelItemObserverClass();
          widget.AddObserver(observer);

          // Handle Placement Picks
          widget.PlacementPickHandler = function (pickResult) {
            let done = false;
            if (pickResult.IsValid() && pickResult.GetModel()) {
              let ctrlWidget = ctrl.myWidgets[pickResult.GetModel().GetUserId()];
              let tagName = ctrlWidget.getWidgetTagName();
              if (is3DButtonTag(tagName) || is3DPanelTag(tagName)) {
                //Can't create a Model Item for 3dButton, 3dVideo, 3dAudio and 3dPanel widget
              } else if (ctrlWidget && !ctrlWidget.parent) {
                // Can't create a Model Item from a child of a custom widget
                let model = ctrlWidget.$cvWidget;
                if (model) {
                  done = true;
                  let idPath = pickResult.GetIdPath();
                  if (idPath === '') {
                    idPath = '/';
                  }
                  if (model.isPlaceHolder) {
                    // Can't create a Model Item from a placeholder
                    window.alert(
                      window.i18next.t('ves-ar-extension:Drop On Canvas Failed', {
                        widget: window.i18next.t('ves-ar-extension:Model Item'),
                      })
                    );
                    widget.scene.RemoveModelItem(widget, false);
                    widget.ctrlWidget.remove();
                    delete widget.ctrlWidget;
                  } else if (model.GetModelItemFromIdPath(idPath)) {
                    // Can't create a Model Item on a pre-exisiting Model Item
                    window.alert('A Model Item for this part already exists.');
                    widget.scene.RemoveModelItem(widget, false);
                    widget.ctrlWidget.remove();
                    delete widget.ctrlWidget;
                  } else {
                    // Go ahead and create the Model Item
                    model.modelItems.push(widget);
                    widget.SetModelPtrAndIdPath(model, idPath);
                    let location = widget.GetLocation();
                    let position = location.position;
                    let orientation = location.orientation;
                    let props = {
                      model: model.ctrlWidget.widgetId,
                      idpath: idPath,
                      x: position.x.toFixed(4),
                      y: position.y.toFixed(4),
                      z: position.z.toFixed(4),
                      rx: orientation.x.toFixed(2),
                      ry: orientation.y.toFixed(2),
                      rz: orientation.z.toFixed(2),
                      scale: getScalePropertyValue(location.scale, tagName),
                      visible: true,
                      occlude: false,
                      decal: false,
                      opacity: 1,
                    };
                    widget.ctrlWidget.setProps(props);

                    if (widget.ctrlWidget.delegate.widgetCreatedAndLoaded) {
                      widget.ctrlWidget.delegate.widgetCreatedAndLoaded(widget.ctrlWidget);
                    }

                    $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
                  }
                }
              }
            }
            if (!done) {
              window.alert(
                window.i18next.t('ves-ar-extension:Drop On Canvas Failed', {
                  widget: window.i18next.t('ves-ar-extension:Model Item'),
                })
              );
              $rootScope.$broadcast('loadError3DObj', { ctrlWidget: widget.ctrlWidget });
              widget.ctrlWidget.remove();
              delete widget.ctrlWidget;
            }
          };

          widget.Select = function (sel) {
            widget.scene.SelectModelItem(widget, sel);
          };

          widget.Preselect = function (sel) {
            widget.scene.PreSelectModelItem(widget, true);
          };

          widget.SetOccludeOpacity = function (occludeProp, opacityProp) {
            SetOccludeOpacity(widget, occludeProp, opacityProp);
          };

          if (dropCoords) {
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
          } else {
            var props = ctrlWidget.designPropertyValues();
            if (props.model) {
              if (ctrl.myWidgets[props.model]) {
                var cvModel = ctrl.myWidgets[props.model].$cvWidget;
                cvModel.modelItems.push(widget);
                if (ctrl.myWidgets[props.model].loaded) {
                  ctrlWidget.$cvWidget.SetModelPtrAndIdPath(cvModel, props.idpath);
                  $rootScope.$broadcast('loaded3DObj', { ctrlWidget: ctrlWidget });
                }
              }
            }
          }
          return widget;
        };

        var uuidv4 = function uuidv4() {
          return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
          ); // jshint ignore:line
        };

        // Add a Model Target to the Canvas
        ctrl.addModelTarget = function (ctrlWidget, dropCoords) {
          var widget = CreateImageMarker(ctrlWidget, dropCoords, ctrl.myScene);
          let ImageMarkerObserverClass = Module.ImageMarkerObserver.extend('ImageMarkerObserver', {
            // Location Callback
            OnLocationChange: function (loc) {},
          });

          let observer = new ImageMarkerObserverClass();
          widget.AddObserver(observer);

          // Handle Placement Picks
          widget.PlacementPickHandler = function (result) {
            let model;
            let modelPtr = result.GetModel();
            if (result.IsValid() && modelPtr) {
              let ctrlWidget = ctrl.myWidgets[modelPtr.GetUserId()];
              if (ctrlWidget) {
                model = ctrlWidget.$cvWidget;
              }
            }

            if (model) {
              let tagName = model.ctrlWidget.getWidgetTagName();
              if (tagName !== 'twx-dt-model') {
                widget.HandleModelTargetError();
                return;
              }
              widget.ctrlWidget.setProp('model', model.ctrlWidget.widgetId);
              model.ctrlWidget.modelTarget = widget;
              var props = widget.ctrlWidget.designPropertyValues();
              handleDefaultImage(props, widget.ctrlWidget.getWidgetTagName());
              widget.LoadFromURL(props.url || props.src);
            } else {
              widget.HandleModelTargetError();
            }
          };

          widget.HandleModelTargetError = function () {
            window.alert(
              window.i18next.t('ves-ar-extension:Drop On Canvas Failed', {
                widget: window.i18next.t('ves-ar-extension:Model Target'),
              })
            );
            $rootScope.$broadcast('loadError3DObj', { ctrlWidget: widget.ctrlWidget });
            widget.ctrlWidget.remove();
            delete widget.ctrlWidget;
          };

          if (dropCoords) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(false);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
            ctrlWidget.setProp('targetId', uuidv4());
          } else {
            var props = ctrlWidget.designPropertyValues();
            if (props.model) {
              if (ctrl.myWidgets[props.model]) {
                var modelWidget = ctrl.myWidgets[props.model];
                modelWidget.modelTarget = widget;
              }
            }
            handleDefaultImage(props, ctrlWidget.getWidgetTagName());
            widget.LoadFromURL(props.url || props.src);
            widget.size = { height: props.height, width: props.width, scale: props.scale };
          }
          return widget;
        };

        // Add an Image Marker to the Canvas
        ctrl.addImageMarker = function (ctrlWidget, dropCoords, disableMoveEvent = false) {
          var widget = CreateImageMarker(ctrlWidget, dropCoords, ctrl.myScene, disableMoveEvent);
          const tagName = ctrlWidget.getWidgetTagName();
          var isImageTarget = tagName === 'twx-dt-target-image';
          if (isImageTarget && !ctrlWidget.getProp('targetId')) {
            ctrlWidget.setProp('targetId', uuidv4());
          }

          if (
            dropCoords &&
            Object.keys(ctrl.myWidgets).length > 1 &&
            !is3DButtonTag(tagName) &&
            !is3DPanelTag(tagName)
          ) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, function (pickResult) {
              ImageMarkerPlacementPickHandler(widget, pickResult, ctrl.myView);
            });
          } else {
            var props = ctrlWidget.designPropertyValues();
            handleDefaultImage(props, tagName);
            widget.LoadFromURL(props.url || props.src);
            widget.size = { height: props.height, width: props.width, scale: props.scale, sx: props.sx, sy: props.sy };
          }
          return widget;
        };

        /**
         * Add a Spatial Target to the Canvas
         *
         * @param {Object} ctrlWidget The controller of the twxWidget being added
         * @param {Object} dropCoords The point at which the widget was dropped on the screen (if any).
         *                            Undefined if the system is adding the widget (e.g. when loading the project)
         */
        ctrl.addSpatialTarget = function (ctrlWidget, dropCoords) {
          // If this widget was just dropped onto the canvas by the user (i.e. dropCoords is defined),
          // automatically enable object drop shadows if not already set.
          if (dropCoords) {
            let viewController = ctrlWidget.element().closest('twx-dt-view').data('_widgetController');
            let dropshadowEnabled = viewController.getProp('dropshadow');

            if (!dropshadowEnabled) {
              viewController.setProp('dropshadow', true);

              viewController.showSnackbarMessage(
                window.i18next.t('ves-ar-extension:spatial-target-auto-enabled-drop-shadow-msg')
              );
            }
          }

          return ctrl.addImageMarker(ctrlWidget, dropCoords);
        };

        /**
         * Add a 3D Button to the Canvas
         *
         * @param {Object} ctrlWidget The controller of the twxWidget being added
         * @param {Object} dropCoords The point at which the widget was dropped on the screen (if any).
         *                            Undefined if the system is adding the widget (e.g. when loading the project)
         * @param {Object} params Parameter list for 3d Button including:
         *                        {String} imageSrc - Image source for button image, if not specified src prop is used instead
         *                        {Object} btnSrcProps - Button src file, id path for front plate, id path for back plate.
         *                                 If not specified HLBtn.pvz is used with its id paths
         *                        {Boolean} mageOverridesText - Should render image only, performed over full plate area
         *                        {Boolean} smallIcon - Should render small icon image
         *                        {Boolean} isMultilineText - Should render multiline text (otherwise trim text)
         *                        {Boolean} disableMoveEvent - Should 'move3DObj' event broadcast be disabled for this widget
         */
        ctrl.add3DButton = function (
          ctrlWidget,
          dropCoords,
          params = {
            imageSrc: undefined,
            btnSrcProps: undefined,
            imageOverridesText: true,
            smallIcon: true,
            isMultilineText: true,
            disableMoveEvent: false,
          }
        ) {
          // Add model part of the button
          var widget = ctrl.myScene.MakeModel();
          widget.SetUserId(ctrlWidget.widgetId);
          widget.ctrlWidget = ctrlWidget;
          widget.dropCoords = Boolean(dropCoords);
          widget.modelItems = [];
          ctrlWidget.$cvWidget = widget;
          widget.imageOverridesText = params.imageOverridesText;
          widget.smallIcon = params.smallIcon;
          widget.isMultilineText = params.isMultilineText;

          widget.LoadModel = function (src) {
            src = params && params.btnSrcProps ? params.btnSrcProps.src : 'extensions/images/HLBtn.pvz';
            ctrl.myApp.LoadModelFromURLWithCallback(widget, src, true, true, false, widget.ModelLoadedHandler);
          };

          widget.ModelLoadedHandler = function (success, isStructure, errors) {
            if (!isStructure && success) {
              widget.loaded = true;

              if (!widget.$imageWidget) {
                // Handle front and back plates as two independent Shape Instances
                let frontPlateProps = {};
                let backPlateProps = {};
                if (params && params.btnSrcProps) {
                  frontPlateProps.idpath = params.btnSrcProps.frontPlate;
                  backPlateProps.idpath = params.btnSrcProps.backPlate;
                } else {
                  Get3DButtonPlateProps(frontPlateProps, backPlateProps);
                }

                if (frontPlateProps.idpath) {
                  // Add front plate part of the button
                  widget.$frontPlateWidget = widget.GetShapeInstanceFromIdPath(frontPlateProps.idpath);
                }

                if (backPlateProps.idpath) {
                  // Add back plate part of the button
                  widget.$backPlateWidget = widget.GetShapeInstanceFromIdPath(backPlateProps.idpath);
                }

                // Add ImageMarker part of the button
                var imageWidget = ctrl.addImageMarker(widget.ctrlWidget, undefined, params.disableMoveEvent);
                widget.$imageWidget = imageWidget;

                if (!is3DPanelTag(widget.ctrlWidget.getWidgetTagName())) {
                  // Video, audio widget holds its panel model in $cvWidget
                  widget.ctrlWidget.$cvWidget = widget;
                }

                var props = widget.ctrlWidget.designPropertyValues();
                props.fontOutlineColor = props.fontColor;
                if (params && params.imageSrc) {
                  props.src = params.imageSrc;
                }
                widget.GenerateButtonImage(props);
                Update3DButtonLabelLocation(widget, widget.$imageWidget);
              }

              $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
              $rootScope.$broadcast('readyForZoom3DObj', { ctrlWidget: widget.ctrlWidget });
            }
          };

          widget.Select = function (sel) {
            widget.scene.SelectModel(widget, sel);
          };

          widget.Preselect = function (sel) {
            widget.scene.PreSelectModel(widget, true);
          };

          widget.PlacementPickHandler = function (pickResult) {
            ModelPlacementPickHandler(widget, pickResult);
          };

          widget.GenerateButtonImage = function (props) {
            if (!widget.$imageWidget) {
              return;
            }
            generateLabelAndIconImage(
              widget,
              props,
              widget.imageOverridesText,
              widget.smallIcon,
              widget.isMultilineText
            );
          };

          widget.SetButtonDimensions = function (height, width) {
            // Set front plate dimensions:
            let { front_plate_scale, back_plate_scale } = TransButtonWidgetHeightWidthToScale(
              Number(height),
              Number(width)
            );
            if (widget.$frontPlateWidget) {
              const front_plate_loc = {
                orientation: { x: 0, y: 0, z: 0 },
                position: { x: 0, y: 0, z: 0, valid: true },
                scale: front_plate_scale,
                valid: true,
              };
              widget.$frontPlateWidget.SetRelativeLocationAttribute1(front_plate_loc, 0);
            }
            if (widget.$backPlateWidget) {
              // Set back plate dimensions:
              let back_plate_loc = widget.$backPlateWidget.GetRelativeLocationAttribute1();
              back_plate_loc.scale = back_plate_scale;

              // Calculate offset between plates based on front plate depth: front plate depth + (front plate depth*1.75):
              back_plate_loc.position.z = -front_plate_scale.z * 0.0275;
              widget.$backPlateWidget.SetRelativeLocationAttribute1(back_plate_loc, 0);
            }
            if (widget.$imageWidget) {
              SetHeightWidth(widget.$imageWidget, { height: height, width: width });
            }
          };

          widget.SetTVObservers = function () {
            let ModelObserverClass = Module.ModelObserver.extend('ModelObserver', {
              // Location Callback
              OnLocationChange: function (loc) {
                if (widget.$imageWidget) {
                  Update3DButtonLabelLocation(widget, widget.$imageWidget);
                }
                if (!params.disableMoveEvent) {
                  $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
                }
              },
              // Selection Callback
              OnSelection: function (selected, selectType, type, instance, idPath) {
                if (selectType === Module.SelectionList.PRIMARYSELECTION) {
                  if (type === Module.SelectionCallbackType.SHAPEINSTANCE) {
                    if (selected && selectedWidget !== widget.ctrlWidget) {
                      $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    } else {
                      $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    }
                  }
                }
              },
            });

            let observer = new ModelObserverClass();
            widget.AddObserver(observer);
          };

          widget.SetTVObservers();

          // If the button has been drag-n-dropped on the canvas, find out where to position it
          // Otherwise, just load it.
          widget.scene = ctrl.myScene;
          widget.view = ctrl.myView;
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
          } else {
            widget.LoadModel(ctrlWidget.designPropertyValues().src);
          }

          return widget;
        };

        ctrl.add3DPressButton = function (
          ctrlWidget,
          dropCoords,
          params = {
            imageSrc: undefined,
            imageOverridesText: false,
            smallIcon: true,
            isMultilineText: true,
            disableMoveEvent: false,
          }
        ) {
          params.btnSrcProps = { src: 'extensions/images/hlbtn_plate.pvz', frontPlate: '/5', backPlate: undefined };
          return ctrl.add3DButton(ctrlWidget, dropCoords, params);
        };

        ctrl.add3DToggleButton = function (
          ctrlWidget,
          dropCoords,
          params = {
            imageSrc: undefined,
            imageOverridesText: false,
            smallIcon: true,
            isMultilineText: true,
            disableMoveEvent: false,
          }
        ) {
          params.btnSrcProps = { src: 'extensions/images/hlbtn_plate.pvz', frontPlate: '/5', backPlate: undefined };
          return ctrl.add3DButton(ctrlWidget, dropCoords, params);
        };

        ctrl.add3DImageButton = function (
          ctrlWidget,
          dropCoords,
          params = {
            imageSrc: undefined,
            imageOverridesText: false,
            smallIcon: false,
            isMultilineText: false,
            disableMoveEvent: false,
          }
        ) {
          params.btnSrcProps = { src: 'extensions/images/hlbtn_plate.pvz', frontPlate: '/5', backPlate: undefined };
          return ctrl.add3DButton(ctrlWidget, dropCoords, params);
        };

        ctrl.addGroup = function (ctrlWidget, dropCoords, src = 'extensions/images/group.pvz') {
          var widget = ctrl.myScene.MakeModel();
          widget.SetUserId(ctrlWidget.widgetId);
          widget.ctrlWidget = ctrlWidget;
          widget.dropCoords = Boolean(dropCoords);
          widget.modelItems = [];
          widget.children = [];
          widget.childCommonProps = ['decal', 'occlude', 'opacity', 'visible'];
          widget.wasJustDeselected = false; //handling group model deselection on 2nd click

          widget.LoadModel = function () {
            ctrl.myApp.LoadModelFromURLWithCallback(widget, src, true, true, false, widget.ModelLoadedHandler);
          };

          widget.ModelLoadedHandler = function (success, isStructure, errors) {
            if (!isStructure && success) {
              widget.loaded = true;
              if (widget.ctrlWidget.getWidgetTagName() === 'twx-dt-3dpanel') {
                widget.ctrlWidget.$panelWidget = widget.GetShapeInstanceFromIdPath('/');

                const pinBtnParams = {
                  imageSrc: widget3dUtils.getDesignTagalongIcon(widget.ctrlWidget.getProp('tagalong')),
                  btnSrcProps: undefined,
                  imageOverridesText: true,
                  smallIcon: true,
                  isMultilineText: true,
                  disableMoveEvent: true,
                };
                widget.ctrlWidget.buttons = {
                  pin: ctrl.add3DButton(widget.ctrlWidget, widget.dropCoords, pinBtnParams),
                };
              }
              widget.SetChildren();

              ctrlWidget.$cvWidget = widget;
              $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
              $rootScope.$broadcast('readyForZoom3DObj', { ctrlWidget: widget.ctrlWidget });
            }
          };

          widget.SetChildren = function () {
            widget.children = [];
            let element = ctrlWidget.element();
            var childWidgetEl = element.find('[twx-widget]');
            childWidgetEl.each(function () {
              var childCtrl = $(this).data('_widgetController');
              if (childCtrl && childCtrl.getWidgetTagName() !== 'twx-dt-modelitem') {
                childCtrl.parent = ctrlWidget;
                widget.children.push(childCtrl);
              }
            });
          };

          widget.Select = function (select) {
            // If parent is selected, select all children
            ctrl.myScene.SelectModel(widget, select);
            widget.children.forEach(function (child) {
              child.$cvWidget.Select(select);
            });
          };

          widget.HideChildProps = function (childCtrl) {
            if (childCtrl) {
              const commonProps = widget.childCommonProps;
              childCtrl.hiddenProps = commonProps;
              let childProps = childCtrl.properties;
              Object.keys(childProps).forEach(function (key) {
                let prop = childProps[key];
                if (commonProps.some((p) => p === prop.name)) {
                  prop.isVisible = false;
                  childCtrl.updateVisibility({ prop }, childCtrl.designPropertyValues());
                }
              });
            }
          };

          widget.HideChildrenProps = function () {
            widget.children.forEach(function (child) {
              widget.HideChildProps(child);
            });
          };

          widget.ShowChildProps = function (childCtrl) {
            if (childCtrl) {
              const hiddenProps = childCtrl.hiddenProps;
              let childProps = childCtrl.properties;
              Object.keys(childProps).forEach(function (key) {
                let prop = childProps[key];
                if (hiddenProps.some((p) => p === prop.name)) {
                  prop.isVisible = true;
                  childCtrl.updateVisibility({ prop }, childCtrl.designPropertyValues());
                }
              });
              delete childCtrl.hiddenProps;
            }
          };

          widget.ShowChildrenProps = function () {
            widget.children.forEach(function (child) {
              widget.ShowChildProps(child);
            });
          };

          widget.SetGroupLocation = function (transform) {
            const pose = widget3dUtils.poseFromTransform(transform);
            if (pose && pose.translation && pose.rotation && pose.scale) {
              widget.SetPosition(Number(pose.translation.x), Number(pose.translation.y), Number(pose.translation.z));
              widget.SetOrientation(Number(pose.rotation.x), Number(pose.rotation.y), Number(pose.rotation.z));
              if (widget.ctrlWidget.$panelWidget) {
                widget.SetScaleXYZ(
                  Number(pose.scale.x * widget.width),
                  Number(pose.scale.y * widget.height),
                  Number(pose.scale.z)
                );
              } else {
                widget.SetScaleXYZ(Number(pose.scale.x), Number(pose.scale.y), Number(pose.scale.z));
              }
            }

            widget.children.forEach(function (child) {
              const childTransform = getGlobalTransform(child);
              const childPose = widget3dUtils.poseFromTransform(childTransform);
              const tagName = child.getWidgetTagName();
              if (child.$cvWidget) {
                if (child.$cvWidget.SetGroupLocation) {
                  // Child is a group widget
                  child.$cvWidget.SetGroupLocation(childTransform);
                } else {
                  if (child.$cvWidget.SetPosition) {
                    child.$cvWidget.SetPosition(
                      childPose.translation.x,
                      childPose.translation.y,
                      childPose.translation.z
                    );
                  }
                  if (child.$cvWidget.SetOrientation) {
                    child.$cvWidget.SetOrientation(childPose.rotation.x, childPose.rotation.y, childPose.rotation.z);
                  }
                  let props = child.designPropertyValues();
                  if (tagName === 'twx-dt-image' || tagName === 'twx-dt-label' || tagName === 'twx-dt-sensor') {
                    props.scale = childPose.scale.x;
                    SetHeightWidth(child.$cvWidget, props);
                  } else if (is3DButtonTag(tagName)) {
                    if (props.height && props.width) {
                      const btnHeight = childPose.scale.x * props.height;
                      const btnWidth = childPose.scale.x * props.width;
                      child.$cvWidget.SetButtonDimensions(btnHeight, btnWidth);
                    }
                  } else if (child.$cvWidget.SetScale) {
                    child.$cvWidget.SetScale(childPose.scale.x);
                  }
                }
                widget.UpdateGroupElProps(child);
              }
            });
          };

          /**
           * @param {Object} childCtrl - child widget controller
           * @param {string} prop - child property to get its value
           * @returns {boolean} property value of the child widget, undefined if property does not exist for it
           */
          widget.GetChildPropValue = function (childCtrl, prop) {
            if (childCtrl) {
              const groupPropVal = widget.ctrlWidget.designPropertyValues()[prop];
              const childPropval = childCtrl.designPropertyValues()[prop];
              return groupPropVal !== undefined ? groupPropVal : childPropval;
            }
            return undefined;
          };

          widget.SetPropertyOnChildren = function (propName) {
            widget.children.forEach(function (child) {
              if (child && child.$cvWidget) {
                const value = widget.GetChildPropValue(child, propName);
                child.setProp(propName, value);
              }
            });
          };

          widget.SetGroupDecal = function (decal, childCtrl) {
            // Ignoring decal variable, getting the true value from the parent
            let decalVal;
            if (childCtrl && childCtrl.$cvWidget) {
              decalVal = widget.GetChildPropValue(childCtrl, 'decal');
              if (childCtrl.$cvWidget.SetDecal && decalVal !== undefined) {
                childCtrl.$cvWidget.SetDecal(parseBool(decalVal));
              }
            } else {
              widget.SetDecal(parseBool(decal));
              widget.SetPropertyOnChildren('decal');
            }
          };

          widget.SetVisibility = function (visible) {
            // Ignoring visibile variable, getting the true value from the parent
            widget.children.forEach(function (child) {
              const visibleVal = widget.GetChildPropValue(child, 'visible');
              if (visibleVal !== undefined) {
                child.setProp('visible', parseBool(visibleVal));
              }
            });
          };

          widget.SetOccluding = function (occlude, childCtrl) {
            // Ignoring occlude variable, getting the true value from the parent
            let opacityVal, occludeVal;
            if (childCtrl && childCtrl.$cvWidget) {
              opacityVal = widget.GetChildPropValue(childCtrl, 'opacity');
              occludeVal = widget.GetChildPropValue(childCtrl, 'occlude');
              const tagName = childCtrl.getWidgetTagName();
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                if (occludeVal !== undefined && opacityVal !== undefined) {
                  SetOccludeOpacity(childCtrl.$cvWidget, parseBool(occludeVal), Number(opacityVal));
                }
              } else if (childCtrl.$cvWidget.SetOccluding && occludeVal !== undefined) {
                childCtrl.$cvWidget.SetOccluding(parseBool(occludeVal));
              }
            } else {
              SetOccludeOpacity(widget, parseBool(occlude), Number(widget.ctrlWidget.getProp('opacity')));
              widget.SetPropertyOnChildren('occlude');
            }
          };

          widget.SetOpacity = function (opacity, childCtrl) {
            // Ignoring opacity variable, getting the true value from the parent
            let opacityVal, occludeVal;
            if (childCtrl && childCtrl.$cvWidget) {
              opacityVal = widget.GetChildPropValue(childCtrl, 'opacity');
              occludeVal = widget.GetChildPropValue(childCtrl, 'occlude');
              const tagName = childCtrl.getWidgetTagName();
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                if (occludeVal !== undefined && opacityVal !== undefined) {
                  SetOccludeOpacity(childCtrl.$cvWidget, parseBool(occludeVal), Number(opacityVal));
                }
              } else if (childCtrl.$cvWidget.SetOpacity && opacityVal !== undefined) {
                childCtrl.$cvWidget.SetOpacity(Number(opacityVal));
              }
            } else {
              SetOccludeOpacity(widget, parseBool(widget.ctrlWidget.getProp('occlude')), Number(opacity));
              widget.SetPropertyOnChildren('opacity');
            }
          };

          widget.SetOccludeOpacity = function (occlude, opacity, childCtrl) {
            if (childCtrl && childCtrl.$cvWidget) {
              const tagName = childCtrl.getWidgetTagName();
              if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
                const opacityVal = widget.GetChildPropValue(childCtrl, 'opacity');
                const occludeVal = widget.GetChildPropValue(childCtrl, 'occlude');
                if (occludeVal !== undefined && opacityVal !== undefined) {
                  SetOccludeOpacity(childCtrl.$cvWidget, parseBool(occludeVal), Number(opacityVal));
                }
              }
            } else {
              SetOccludeOpacity(widget, parseBool(occlude), Number(opacity));
              widget.SetPropertyOnChildren('occlude');
              widget.SetPropertyOnChildren('opacity');
            }
          };

          widget.UpdateGroupElLocation = function (groupElCtrl) {
            if (!groupElCtrl) {
              // update all children
              widget.children.forEach(function (child) {
                if (child.$cvWidget) {
                  const location = child.$cvWidget.GetLocation();
                  $rootScope.$broadcast('move3DObj', {
                    ctrlWidget: child,
                    location: location,
                    forcePropsUpdate: true,
                  });
                }
              });
            } else if (groupElCtrl.$cvWidget) {
              const location = groupElCtrl.$cvWidget.GetLocation();
              $rootScope.$broadcast('move3DObj', {
                ctrlWidget: groupElCtrl,
                location: location,
                forcePropsUpdate: true,
              });
            }
          };

          widget.UpdateGroupProps = function (groupElCtrl) {
            widget.UpdateGroupElLocation(groupElCtrl);
            if (widget.ctrlWidget) {
              const props = widget.ctrlWidget.designPropertyValues();
              const commonProps = _.pick(props, widget.childCommonProps);
              groupElCtrl.setProps(commonProps);
            }
          };

          widget.UpdateGroupElProps = function (groupElCtrl) {
            widget.UpdateGroupElLocation(groupElCtrl);
            if (groupElCtrl.$cvWidget) {
              const props = groupElCtrl.designPropertyValues();
              const commonProps = _.pick(props, widget.childCommonProps);
              ctrl.updateObject(groupElCtrl, props, commonProps, true);
            }
          };

          widget.PlacementPickHandler = function (pickResult) {
            ModelPlacementPickHandler(widget, pickResult);
          };

          widget.SetTVObservers = function () {
            let ModelObserverClass = Module.ModelObserver.extend('ModelObserver', {
              // Location Callback
              OnLocationChange: function (loc) {
                if (widget.ctrlWidget.getWidgetTagName() === 'twx-dt-3dpanel') {
                  widget.UpdateButtonsPosition(loc.position, loc.orientation);
                }
                $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
              },
              // Selection Callback
              OnSelection: function (selected, selectType, type, instance, idPath) {
                if (
                  selectType === Module.SelectionList.PRIMARYSELECTION &&
                  type === Module.SelectionCallbackType.SHAPEINSTANCE
                ) {
                  if (selected && selectedWidget !== widget.ctrlWidget) {
                    if (widget.wasJustDeselected) {
                      ctrl.myScene.SelectModel(widget, false);
                      widget.wasJustDeselected = false;
                      return;
                    }
                    $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                  } else {
                    $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                  }
                }
              },
            });

            let observer = new ModelObserverClass();
            widget.AddObserver(observer);
          };

          widget.SetTVObservers();

          widget.scene = ctrl.myScene;
          widget.view = ctrl.myView;
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
          } else {
            widget.LoadModel();
          }

          return widget;
        };

        ctrl.add3DPanel = function (ctrlWidget, dropCoords) {
          const widget = ctrl.addGroup(ctrlWidget, dropCoords, 'extensions/images/holoPlate.pvz');

          widget.SetPanelColor = function (color) {
            ctrl.SetPanelColor(widget, color);
          };

          widget.UpdateButtonsPosition = function (position, orientation) {
            // Update buttons position according to panel position

            if (!widget.ButtonsLoaded()) {
              return;
            }

            const { height, width } = widget.getDimensions();
            const pinBtnSizeAndPosition = widget3dUtils.getPanelPinButtonAbsolutePositionAndSize(
              position.x,
              position.y,
              position.z,
              orientation.x,
              orientation.y,
              orientation.z,
              width,
              height
            );
            widget.ctrlWidget.buttons.pin.SetPosition(
              pinBtnSizeAndPosition.x,
              pinBtnSizeAndPosition.y,
              pinBtnSizeAndPosition.z
            );
            widget.ctrlWidget.buttons.pin.SetOrientation(orientation.x, orientation.y, orientation.z);
          };

          widget.SetDimensions = function (h, w) {
            if (!widget.ctrlWidget.buttons) {
              return;
            }
            //TODO: handle scale in case we add it in the future (SetScaleXYZ(scale.x * h, scale.y * w, scale.z))
            widget.height = Number(h) || widget.height || widget3dUtils.PanelDefaultSize; // set existing or default
            widget.width = Number(w) || widget.width || widget3dUtils.PanelDefaultSize; // set existing or default
            if (!h || !w) {
              ctrlWidget.setProps({ height: widget.height, width: widget.width });
            }
            widget.SetScaleXYZ(widget.width, widget.height, 1);

            const pinBtnSize = widget3dUtils.getPanelPinButtonSize(widget.width, widget.height);

            widget.ctrlWidget.buttons.pin.SetButtonDimensions(pinBtnSize, pinBtnSize);
            if (widget.ctrlWidget.buttons.pin.$imageWidget) {
              SetHeightWidth(widget.ctrlWidget.buttons.pin.$imageWidget, {
                height: pinBtnSize / 2,
                width: pinBtnSize / 2,
              });
            }
          };

          widget.getDimensions = function () {
            let h = widget.height ? widget.height : widget3dUtils.PanelDefaultSize;
            let w = widget.width ? widget.width : widget3dUtils.PanelDefaultSize;
            return { width: Number(w), height: Number(h) };
          };

          widget.SetButtonsColor = function (color) {
            if (!widget.ButtonsLoaded()) {
              return;
            }
            let rgb = toRGB(color);
            if (rgb) {
              widget.ctrlWidget.buttons.pin.$frontPlateWidget.SetColor1(
                rgb[0],
                rgb[1],
                rgb[2],
                1,
                Module.ChildBehaviour.IGNORED,
                Module.InheritBehaviour.OVERRIDE,
                -1,
                true,
                true,
                Module.OLFaceAppearances.USE
              );
            } else {
              widget.ctrlWidget.buttons.pin.$frontPlateWidget.UnsetColor1(Module.ChildBehaviour.IGNORED, -1);
            }
          };

          widget.SetButtonsVisibility = function (vis) {
            if (!widget.ButtonsLoaded()) {
              return;
            }

            let buttonsVis = vis === true || vis === 'true';

            ctrlWidget.buttons.pin.SetVisibility(buttonsVis);
            ctrlWidget.buttons.pin.$imageWidget.SetVisibility(buttonsVis);
          };

          widget.IsBtnLoaded = function (btnWidget) {
            return btnWidget && btnWidget.loaded && btnWidget.$frontPlateWidget && btnWidget.$imageWidget;
          };

          widget.ButtonsLoaded = function () {
            if (!widget.ctrlWidget.buttons) {
              return false;
            }
            return widget.IsBtnLoaded(widget.ctrlWidget.buttons.pin);
          };

          widget.SetButtonAppearance = function (btnWidget, backPlateWidget, imageWidget) {
            if (!btnWidget || !imageWidget) {
              return;
            }

            if (backPlateWidget) {
              backPlateWidget.SetVisibility1(
                false,
                Module.ChildBehaviour.IGNORED,
                Module.InheritBehaviour.OVERRIDE,
                -1
              );
            }
            btnWidget.SetPickable(false);
            imageWidget.SetPickable(false);
          };

          widget.SetButtonsAppearance = function () {
            if (!widget.ButtonsLoaded()) {
              return;
            }
            widget.SetButtonAppearance(
              ctrlWidget.buttons.pin,
              ctrlWidget.buttons.pin.$backPlateWidget,
              ctrlWidget.buttons.pin.$imageWidget
            );
          };

          widget.DeleteButtons = function () {
            let ctrlWidget = widget.ctrlWidget;

            if (ctrlWidget.buttons.pin && ctrlWidget.buttons.pin.$imageWidget) {
              ctrl.myScene.DeleteImageMarker(ctrlWidget.buttons.pin.$imageWidget);
              if (ctrlWidget.buttons.pin.$imageWidget) {
                ctrlWidget.buttons.pin.$imageWidget.delete();
              }
            }
            if (ctrlWidget.buttons.pin) {
              ctrl.myScene.RemoveModel(ctrlWidget.buttons.pin);
            }
          };

          widget.Preselect = function (sel) {
            widget.scene.PreSelectModel(widget, true);
          };

          return widget;
        };

        /**
         * Add a 3D Video to the Canvas
         *
         * @param {Object} ctrlWidget The controller of the twxWidget being added
         * @param {Object} dropCoords The point at which the widget was dropped on the screen (if any).
         *                            Undefined if the system is adding the widget (e.g. when loading the project)
         */
        ctrl.add3DVideo = function (ctrlWidget, dropCoords) {
          // Add model part of the button
          var widget = ctrl.myScene.MakeModel();
          widget.SetUserId(ctrlWidget.widgetId);
          widget.ctrlWidget = ctrlWidget;
          widget.dropCoords = Boolean(dropCoords);
          widget.modelItems = [];
          ctrlWidget.$cvWidget = widget;

          widget.minHeight = 0.186;
          widget.minWidth = 0.22;

          // Load Model function
          widget.LoadModel = function (src) {
            src = 'extensions/images/holoPlate.pvz';
            ctrl.myApp.LoadModelFromURLWithCallback(widget, src, true, true, false, widget.ModelLoadedHandler);
          };

          // Model Loaded Callback
          widget.ModelLoadedHandler = function (success, isStructure, errors) {
            if (!isStructure && success) {
              widget.loaded = true;

              widget.ctrlWidget.$panelWidget = widget.GetShapeInstanceFromIdPath('/');

              // AddButtons

              let params = {
                btnSrcProps: undefined,
                imageOverridesText: true,
                smallIcon: true,
                isMultilineText: true,
                disableMoveEvent: true,
              };

              widget.ctrlWidget.buttons = {
                skipB: ctrl.add3DPressButton(
                  widget.ctrlWidget,
                  widget.dropCoords,
                  Object.assign({ imageSrc: 'extensions/images/3D_Video_Skip_Back.png' }, params)
                ),
                skipA: ctrl.add3DPressButton(
                  widget.ctrlWidget,
                  widget.dropCoords,
                  Object.assign({ imageSrc: 'extensions/images/3D_Video_Skip_Ahead.png' }, params)
                ),
                play: ctrl.add3DToggleButton(
                  widget.ctrlWidget,
                  widget.dropCoords,
                  Object.assign({ imageSrc: 'extensions/images/3D_Video_Play.png' }, params)
                ),
                stop: ctrl.add3DPressButton(
                  widget.ctrlWidget,
                  widget.dropCoords,
                  Object.assign({ imageSrc: 'extensions/images/3D_Video_Stop.png' }, params)
                ),

                pin: ctrl.add3DToggleButton(
                  widget.ctrlWidget,
                  widget.dropCoords,
                  Object.assign(
                    { imageSrc: widget3dUtils.getDesignTagalongIcon(widget.ctrlWidget.getProp('tagalong')) },
                    params
                  )
                ),
              };

              widget.ctrlWidget.$cvWidget = widget;

              $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
              $rootScope.$broadcast('readyForZoom3DObj', { ctrlWidget: widget.ctrlWidget });
            }
          };

          widget.UpdateButtonsPosition = function (position, orientation) {
            // Update buttons position according to panel position

            if (!widget.ButtonsLoaded()) {
              return;
            }

            const height = Number(ctrlWidget.getProp('height')) || widget.minHeight;
            const width = Number(ctrlWidget.getProp('width')) || widget.minWidth;

            const pinBtnLocSize = widget3dUtils.getPanelPinButtonAbsolutePositionAndSize(
              position.x,
              position.y,
              position.z,
              orientation.x,
              orientation.y,
              orientation.z,
              width,
              height
            );
            const mediaBtnsLocSize = widget3dUtils.getPanelMediaControlButtonsAbsolutePositionsAndSize(
              position.x,
              position.y,
              position.z,
              orientation.x,
              orientation.y,
              orientation.z,
              width,
              height
            );

            for (const btnKey in ctrlWidget.buttons) {
              if (mediaBtnsLocSize[btnKey]) {
                ctrlWidget.buttons[btnKey].SetPosition(
                  mediaBtnsLocSize[btnKey].x,
                  mediaBtnsLocSize[btnKey].y,
                  mediaBtnsLocSize[btnKey].z
                );
                ctrlWidget.buttons[btnKey].SetOrientation(orientation.x, orientation.y, orientation.z);
              }
            }

            ctrlWidget.buttons.pin.SetPosition(pinBtnLocSize.x, pinBtnLocSize.y, pinBtnLocSize.z);
            ctrlWidget.buttons.pin.SetOrientation(orientation.x, orientation.y, orientation.z);
          };

          widget.SetDimensions = function (height, width) {
            if (!ctrlWidget.buttons) {
              return;
            }

            const vidHeight = Number(height) || widget.minHeight;
            const vidWidth = Number(width) || widget.minWidth;

            widget.SetScaleXYZ(vidWidth, vidHeight, 1);

            const pinBtnSize = widget3dUtils.getPanelPinButtonSize(width);
            const mediaBtnsSize = widget3dUtils.getPanelMediaControlButtonsSize(width);
            // Set button image width and height half of the button
            const props = { height: mediaBtnsSize / 2, width: mediaBtnsSize / 2 };

            for (const btnKey in ctrlWidget.buttons) {
              if (btnKey !== 'pin') {
                ctrlWidget.buttons[btnKey].SetButtonDimensions(mediaBtnsSize, mediaBtnsSize);
                if (ctrlWidget.buttons[btnKey].$imageWidget) {
                  SetHeightWidth(ctrlWidget.buttons[btnKey].$imageWidget, props);
                }
              }
            }

            ctrlWidget.buttons.pin.SetButtonDimensions(pinBtnSize, pinBtnSize);
            if (ctrlWidget.buttons.pin.$imageWidget) {
              SetHeightWidth(ctrlWidget.buttons.pin.$imageWidget, {
                height: pinBtnSize / 2,
                width: pinBtnSize / 2,
              });
            }
          };

          widget.SetPanelColor = function (color) {
            ctrl.SetPanelColor(widget, color);
          };

          widget.SetButtonsColor = function (color) {
            if (!widget.ButtonsLoaded()) {
              return;
            }
            let rgb = toRGB(color);
            if (rgb) {
              for (const btnKey in ctrlWidget.buttons) {
                ctrlWidget.buttons[btnKey].$frontPlateWidget.SetColor1(
                  rgb[0],
                  rgb[1],
                  rgb[2],
                  1.0,
                  Module.ChildBehaviour.IGNORED,
                  Module.InheritBehaviour.OVERRIDE,
                  -1,
                  true,
                  true,
                  Module.OLFaceAppearances.USE
                );
              }
            } else {
              for (const btnKey in ctrlWidget.buttons) {
                ctrlWidget.buttons[btnKey].$frontPlateWidget.UnsetColor1(Module.ChildBehaviour.IGNORED, -1);
              }
            }
          };

          widget.SetButtonsVisibility = function (vis) {
            if (!widget.ButtonsLoaded()) {
              return;
            }

            let buttonsVis = vis === true || vis === 'true';
            for (const btnKey in ctrlWidget.buttons) {
              ctrlWidget.buttons[btnKey].SetVisibility(buttonsVis);
              ctrlWidget.buttons[btnKey].$imageWidget.SetVisibility(buttonsVis);
            }
          };

          widget.IsBtnLoaded = function (btnWidget) {
            return btnWidget && btnWidget.loaded && btnWidget.$frontPlateWidget && btnWidget.$imageWidget;
          };

          widget.ButtonsLoaded = function () {
            if (!widget.ctrlWidget.buttons) {
              return false;
            }
            for (const btnKey in ctrlWidget.buttons) {
              if (!widget.IsBtnLoaded(ctrlWidget.buttons[btnKey])) {
                return false;
              }
            }
            return true;
          };

          widget.SetButtonAppearance = function (btnWidget, backPlateWidget, imageWidget) {
            if (!btnWidget || !imageWidget) {
              return;
            }

            if (backPlateWidget) {
              backPlateWidget.SetVisibility1(
                false,
                Module.ChildBehaviour.IGNORED,
                Module.InheritBehaviour.OVERRIDE,
                -1
              );
            }
            btnWidget.SetPickable(false);
            imageWidget.SetPickable(false);
          };

          widget.SetButtonsAppearance = function () {
            if (!widget.ButtonsLoaded()) {
              return;
            }

            for (const btnKey in ctrlWidget.buttons) {
              if (btnKey === 'play' || btnKey === 'pin') {
                //toggles
                widget.SetButtonAppearance(
                  ctrlWidget.buttons[btnKey],
                  undefined,
                  ctrlWidget.buttons[btnKey].$imageWidget
                );
              } else {
                //presses
                widget.SetButtonAppearance(
                  ctrlWidget.buttons[btnKey],
                  undefined,
                  ctrlWidget.buttons[btnKey].$imageWidget
                );
              }
            }
          };

          // Select this Model
          widget.Select = function (sel) {
            widget.scene.SelectModel(widget, sel);
          };

          // Preselect this Model
          widget.Preselect = function (sel) {
            widget.scene.PreSelectModel(widget, true);
          };

          // Handle Placement Picks
          widget.PlacementPickHandler = function (pickResult) {
            ModelPlacementPickHandler(widget, pickResult);
          };

          widget.DeleteButtons = function () {
            let ctrlWidget = widget.ctrlWidget;
            for (const btnKey in ctrlWidget.buttons) {
              if (ctrlWidget.buttons[btnKey] && ctrlWidget.buttons[btnKey].$imageWidget) {
                ctrl.myScene.DeleteImageMarker(ctrlWidget.buttons[btnKey].$imageWidget);
                if (ctrlWidget.buttons[btnKey].$imageWidget) {
                  ctrlWidget.buttons[btnKey].$imageWidget.delete();
                }
              }
              if (ctrlWidget.buttons[btnKey]) {
                ctrl.myScene.RemoveModel(ctrlWidget.buttons[btnKey]);
              }
            }
          };

          widget.SetTVObservers = function () {
            let ModelObserverClass = Module.ModelObserver.extend('ModelObserver', {
              // Location Callback
              OnLocationChange: function (loc) {
                widget.UpdateButtonsPosition(loc.position, loc.orientation);
                $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
              },
              // Selection Callback
              OnSelection: function (selected, selectType, type, instance, idPath) {
                if (selectType === Module.SelectionList.PRIMARYSELECTION) {
                  if (type === Module.SelectionCallbackType.SHAPEINSTANCE) {
                    if (selected && selectedWidget !== widget.ctrlWidget) {
                      $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    } else {
                      $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget, partId: '' });
                    }
                  }
                }
              },
            });

            let observer = new ModelObserverClass();
            widget.AddObserver(observer);
          };

          widget.SetTVObservers();

          // If the model has been drag-n-dropped on the canvas, find out where to position it
          // Otherwise, just load it.
          widget.scene = ctrl.myScene;
          widget.view = ctrl.myView;
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, widget.PlacementPickHandler);
          } else {
            widget.LoadModel(ctrlWidget.designPropertyValues().src);
          }

          return widget;
        };

        // Add a Text Marker to the Canvas
        ctrl.addTextMarker = function (ctrlWidget, dropCoords) {
          var widget = CreateImageMarker(ctrlWidget, dropCoords, ctrl.myScene);
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, function (pickResult) {
              ImageMarkerPlacementPickHandler(widget, pickResult, ctrl.myView);
            });
          } else {
            var props = ctrlWidget.designPropertyValues();
            GenerateMarkupImage(widget, props);
          }
          return widget;
        };

        // Add a Combo Marker to the Canvas
        ctrl.addComboMarker = function (ctrlWidget, dropCoords) {
          var widget = CreateImageMarker(ctrlWidget, dropCoords, ctrl.myScene);
          if (dropCoords && Object.keys(ctrl.myWidgets).length > 1) {
            widget.dropCoords = dropCoords;
            ctrl.myScene.SetFloorPickable(true);
            ctrl.myView.DoPickWithCallback(dropCoords.x, dropCoords.y, true, false, function (pickResult) {
              ImageMarkerPlacementPickHandler(widget, pickResult, ctrl.myView);
            });
          } else {
            var props = ctrlWidget.designPropertyValues();
            GenerateMarkupImage(widget, props);
          }
          return widget;
        };

        // Add a Custom Widget to the Canvas
        ctrl.addCustomWidget = function (ctrlWidget, dropCoords) {
          var widget = {
            children: [],
            isCustomWidget: true,
          };
          let childElements = ctrlWidget.element().find('twx-widget-design-content').children();
          let childCount = childElements.length > 0 ? 1 : 0; // for now, only support one child, due to selection issues

          function AddChild(childElement, id) {
            let childTagName = childElement.tagName.toLowerCase();
            if (childTagName === 'twx-dt-image' || childTagName === 'twx-dt-model') {
              const childCtrlWidget = {
                // The next 30 lines are attempting to fake all the code that is in twxWidget.js.
                // Mark this like this so it's easier to find when some method is missing next time...
                __fakeChildWidgetController: 'Some methods/properties might be missing on this Child Widget Controller',
                me: {},
              };

              for (let j = 0; j < childElement.attributes.length; j++) {
                let attributeName = childElement.attributes[j].name;
                let attributeValue = childElement.attributes[j].value;
                childCtrlWidget.me[attributeName] = attributeValue;
              }
              childCtrlWidget.widgetId = id;
              childCtrlWidget.parent = ctrlWidget;
              childCtrlWidget.getWidgetTagName = function () {
                return childTagName;
              };
              childCtrlWidget.element = function () {
                return angular.element(childElement);
              };
              childCtrlWidget.designPropertyValues = function () {
                return childCtrlWidget.me;
              };

              childCtrlWidget.setProps = (props) => {
                Object.keys(props).forEach((name) => (childCtrlWidget.me[name] = props[name]));
              };

              widget.children.push(childCtrlWidget);
              let childWidgetFactory = ctrl.getWidgetFactory(childElement.tagName.toLowerCase());
              childCtrlWidget.$cvWidget = childWidgetFactory(childCtrlWidget, undefined);
              childCtrlWidget.mutationCallback = function (mutationRecords) {
                let changedProps = {};
                mutationRecords.forEach(function (mutation) {
                  let name = mutation.attributeName;
                  let value = mutation.target.getAttribute(name);
                  changedProps[name] = value;
                  childCtrlWidget.me[name] = value;
                });
                ctrl.updateObject(childCtrlWidget, childCtrlWidget.me, changedProps);
              };

              ctrl.myWidgets[childCtrlWidget.widgetId] = childCtrlWidget;

              childCtrlWidget.mutationObserver = new MutationObserver(childCtrlWidget.mutationCallback);
              childCtrlWidget.mutationObserver.observe(childElement, { attributes: true });
            }
          }

          for (let i = 0; i < childCount; i++) {
            AddChild(childElements[i], ctrlWidget.widgetId + '-child' + i);
          }

          widget.Select = function (select) {
            // if parent is selected, select all children
            widget.children.forEach(function (child) {
              let tagName = child.getWidgetTagName();
              if (tagName === 'twx-dt-model') {
                ctrl.myScene.SelectModel(child.$cvWidget, select);
              } else if (tagName === 'twx-dt-image') {
                ctrl.myScene.SelectMarker(child.$cvWidget, select);
              }
            });
          };
          return widget;
        };

        ctrl.GetWidgetFromPickResult = function (pickResult) {
          let widget;
          let cvWidget;
          if (pickResult.IsValid()) {
            cvWidget = pickResult.GetImageMarker();
            if (cvWidget) {
              let id = cvWidget.GetUserId();
              cvWidget.delete(); // must free-up the object returned to us in the PickResult
              return ctrl.myWidgets[id];
            }
            cvWidget = pickResult.GetModel();
            if (cvWidget) {
              widget = ctrl.myWidgets[cvWidget.GetUserId()];
              cvWidget.delete(); // must free-up the object returned to us in the PickResult
              cvWidget = widget.$cvWidget;
              let longestMatchingPath = 1;
              let targetPath = pickResult.GetIdPath().split('/');
              cvWidget.modelItems.forEach(function (cvModelItem) {
                let testPath = cvModelItem.ctrlWidget.designPropertyValues().idpath.split('/');
                if (testPath.length > longestMatchingPath && testPath.length <= targetPath.length) {
                  let match = true;
                  for (let i = 1; i < testPath.length; i++) {
                    if (testPath[i] !== targetPath[i]) {
                      match = false;
                      break;
                    }
                  }
                  if (match) {
                    widget = cvModelItem.ctrlWidget;
                    longestMatchingPath = testPath.length;
                  }
                }
              });
            }
          }
          return widget;
        };
      },
    };

    /**
     * Draws an Image and a label and returns that as a data url encoded image
     * If ignoreText is true and image exists does not create text plceholder for rendering. else, render text.
     * @param {Object} cvWidget
     * @param {Object} props
     * @param {Boolean} ignoreText
     * @param {Boolean} smallIcon
     */
    function generateLabelAndIconImage(cvWidget, props, ignoreText = false, smallIcon = true, isMultilineText = true) {
      if (!props.src) {
        if (props.text !== undefined) {
          // Render text only
          GenerateMarkupImage(cvWidget.$imageWidget, props);
        }
        return;
      }

      if (ignoreText) {
        // Render Image only (in full widget size)
        props.text = '';
        GenerateMarkupImage(cvWidget.$imageWidget, props);
        return;
      }

      // Render text and  image combine
      const background = new Image();
      background.src = props.src;
      background.onload = () => {
        props.src = smallIcon
          ? widget3dUtils.generateLabelAndSmallIconImage(background, props, props.text, isMultilineText)
          : widget3dUtils.generateLabelAndLargeIconImage(background, props, props.text, isMultilineText);
        props.text = '';
        GenerateMarkupImage(cvWidget.$imageWidget, props);
      };
    }

    /**
     * Creates a ImageMarker widget
     * @param {object} cvWidget - the ThingView widget
     * @param {object} occludeProp - boolean occlude property
     * @param {object} opacityProp - boolean opacity property
     */
    function SetOccludeOpacity(cvWidget, occludeProp, opacityProp) {
      if (cvWidget && cvWidget.SetRenderMode) {
        if (occludeProp) {
          cvWidget.SetRenderMode(Module.RenderMode.OCCLUDING, 0);
        } else if (cvWidget.isPlaceHolder) {
          cvWidget.SetRenderMode(Module.RenderMode.PHANTOM, 0.2);
        } else {
          let opacity = opacityProp;
          if (opacity < 1.0) {
            if (opacity < 0.01) {
              opacity = 0.01;
            }
            cvWidget.SetRenderMode(Module.RenderMode.PHANTOM, opacity);
          } else {
            cvWidget.SetRenderMode(Module.RenderMode.SHADED, 0);
          }
        }
      }
    }

    /**
     * Creates a ImageMarker widget
     * @param {object} ctrlWidget - the controller for this widget
     * @param {object} dropCoords - the point at which the widget was dropped on the screen (if any)
     * @param {object} scene - the scene to which the widget should be added
     */
    function CreateImageMarker(ctrlWidget, dropCoords, scene, disableMoveEvent = false) {
      let widget = scene.MakeImageMarker();
      widget.SetUserId(ctrlWidget.widgetId);
      var tagName = ctrlWidget.getWidgetTagName();
      if (!is3DPanelTag(tagName)) {
        ctrlWidget.$cvWidget = widget;
      }
      widget.ctrlWidget = ctrlWidget;
      widget.firstload = true;
      widget.dropCoords = Boolean(dropCoords);
      widget.scene = scene;

      let ImageMarkerObserverClass = Module.ImageMarkerObserver.extend('ImageMarkerObserver', {
        OnLocationChange: function () {
          if (!disableMoveEvent) {
            // OnLocationChange's location parameter is somehow wrong and causes misalignment
            // issues for 3d panel: DT-31505 and DT-31484
            const loc = widget.ctrlWidget.$cvWidget.GetLocation();
            loc.scale.z = loc.scale.x; // z scale isn't relevant in ImageMarker (DT-21705)
            $rootScope.$broadcast('move3DObj', { ctrlWidget: widget.ctrlWidget, location: loc });
          }
        },
        OnSelection: function (selected, selectType) {
          if (selectType === Module.SelectionList.PRIMARYSELECTION) {
            if (selected) {
              $rootScope.$broadcast('select3DObj', { ctrlWidget: widget.ctrlWidget });
            } else {
              $rootScope.$broadcast('deselect3DObj', { ctrlWidget: widget.ctrlWidget });
            }
          }
        },
      });

      let observer = new ImageMarkerObserverClass();
      widget.AddObserver(observer);

      // Select function
      widget.Select = function (sel) {
        widget.scene.SelectMarker(widget, sel);
      };

      // Select function
      widget.Preselect = function (sel) {
        widget.scene.PreSelectMarker(widget, true);
      };

      // ImageMarker Loaded Callback
      widget.ImageMarkerLoaded = function (bool) {
        const tagName = widget.ctrlWidget.getWidgetTagName();
        if (widget.firstload) {
          widget.LockAspectRatio(true);
          widget.firstload = false;
          if (!is3DButtonTag(tagName)) {
            $rootScope.$broadcast('loaded3DObj', { ctrlWidget: widget.ctrlWidget });
          }
        } else {
          const props = widget.ctrlWidget.designPropertyValues();
          if (is3DPanelTag(tagName)) {
            widget.ctrlWidget.$cvWidget.SetDimensions(props.height, props.width);
          } else {
            SetHeightWidth(widget, props);
          }
          if (is3DButtonTag(tagName)) {
            widget.SetPickable(false);
          }
        }
      };

      // LoadFromURL function
      widget.LoadFromURL = function (url) {
        if (url) {
          if (isSVG(url) || widget.ctrlWidget.designPropertyValues().class) {
            GenerateMarkupImage(widget, { src: url });
          } else {
            widget.LoadFromURLWithCallback(url, widget.ImageMarkerLoaded);
          }
        }
      };

      // ApplySize function
      widget.ApplySize = function () {
        if (widget.size) {
          SetHeightWidth(widget, widget.size);
        }
      };

      return widget;
    }

    /**
     * Handles the pick result when a Image, Text or Combo Marker has been dropped onto the canvas
     * @param {object} widget - the Image, Text or Combo Marker
     * @param {object} result - the pick result object
     * @param {object} view - the view that the pick was made from
     */
    function ImageMarkerPlacementPickHandler(widget, result, view) {
      widget.scene.SetFloorPickable(false);
      var position = { x: 0, y: 0, z: 0 };
      var orientation = { x: 0, y: 0, z: 0 };
      var model = result.GetModel();

      if (result.IsValid()) {
        // If the pick hit an object, use it to generate the position & orientation from it.
        let loc = result.GetLocation();
        position = loc.position;
        orientation = widget.GetOrientationFromNormal(loc.orientation);

        if (model) {
          // hack - push marker forward a fraction to avoid z-fighting
          const offset = 0.0002;
          position.x += loc.orientation.x * offset;
          position.y += loc.orientation.y * offset;
          position.z += loc.orientation.z * offset;
        }

        const floorSnap = 0.002;
        if (position.y < floorSnap && position.y > -floorSnap) {
          position.y = 0;
        }
      } else {
        // If to object was hit, try to use the axis planes to generate the position & orientation.
        let loc = view.DoPickAxisPlanes(widget.dropCoords.x, widget.dropCoords.y, true);
        if (loc.valid) {
          position = loc.position;
          orientation = widget.GetOrientationFromNormal(loc.orientation);
        }
      }

      // Set the new positional properties
      var tagName = widget.ctrlWidget.getWidgetTagName();
      var newProps = {
        x: position.x.toFixed(4),
        y: position.y.toFixed(4),
        z: position.z.toFixed(4),
        rx: orientation.x.toFixed(2),
        ry: orientation.y.toFixed(2),
        rz: orientation.z.toFixed(2),
      };
      if (model) {
        newProps.billboard = false;
      }
      if (tagName === 'twx-dt-target-spatial') {
        newProps.y = newProps.ry = newProps.rz = 0;
        newProps.rx = -90;
      }
      widget.ctrlWidget.setProps(newProps);

      // Load the image
      var props = widget.ctrlWidget.designPropertyValues();
      if (
        tagName === 'twx-dt-image' ||
        tagName === 'twx-dt-target' ||
        tagName === 'twx-dt-target-image' ||
        tagName === 'twx-dt-target-spatial' ||
        isModelTargetTag(tagName)
      ) {
        handleDefaultImage(props, tagName);
        widget.LoadFromURL(props.url || props.src);
      } else {
        GenerateMarkupImage(widget, props);
      }
    }

    /* Move a ModelTarget to be correctly positioned wrt the Model it is attached to
     * @param {object} widget - the ModelTarget
     * @param {bool} recalculateOffset - Flag to say whether the offset from the model should be recalculated.
     */
    function UpdateModelTargetLocation(widget, recalculateOffset) {
      if (
        !isModelTargetTag(widget.ctrlWidget.getWidgetTagName()) ||
        // This fixes an issue that when switching between views that have model targets,
        // model would be null causing this function to blow up, which in turn would cause
        // the whole canvas not to work properly.
        !widget.ctrlWidget.model
      ) {
        return;
      }

      var model_loc = widget.ctrlWidget.model.GetLocation();

      var recalculate =
        recalculateOffset ||
        widget.srcChanged ||
        !widget.existing_loc ||
        !_.isEqual(model_loc.orientation, widget.existing_loc.orientation) ||
        !_.isEqual(model_loc.scale, widget.existing_loc.scale);

      if (recalculate) {
        var box = widget.ctrlWidget.model.CalculateBoundingBox(getListOfParts());
        if (box.valid) {
          setModelTargetExistingLocation(widget, model_loc, box);
          setModelTargetWidth(widget, box);
        }
      }

      setModelTargetLocation(widget, model_loc);

      var locationDebounce = _.debounce(function (location) {
        widget.ctrlWidget.setProps({
          x: location.position.x,
          y: location.position.y,
          z: location.position.z,
          rx: location.orientation.x,
          ry: location.orientation.y,
          rz: location.orientation.z,
        });
      }, 150);

      locationDebounce(model_loc);
    }
  }

  /* Move a 3D Widget Button properly so that the text/image will be correctly positioned wrt the Model it is attached to
   * @param {object} modelWidget - the model part of the 3D Widget Button
   * @param {object} imageWidget - the Image Marker part of the 3D Widget Button
   */
  function Update3DButtonLabelLocation(modelWidget, imageWidget) {
    var box = modelWidget.CalculateBoundingBox(getListOfParts());
    if (box.valid) {
      var location = modelWidget.GetLocation();
      if (location) {
        var x_pos = location.position.x;
        var y_pos = location.position.y;
        var z_pos = location.position.z;

        // Translate the model offset to Global coords
        var offset = { x: 0.0, y: 0.0, z: 0.0001 };

        var x_rot = (location.orientation.x * Math.PI) / 180;
        var y_rot = (location.orientation.y * Math.PI) / 180;
        var z_rot = (location.orientation.z * Math.PI) / 180;

        var rx_offset = {};
        rx_offset.x = offset.x;
        rx_offset.y = offset.y * Math.cos(x_rot) - offset.z * Math.sin(x_rot);
        rx_offset.z = offset.y * Math.sin(x_rot) + offset.z * Math.cos(x_rot);

        var ry_offset = {};
        ry_offset.x = rx_offset.x * Math.cos(y_rot) + rx_offset.z * Math.sin(y_rot);
        ry_offset.y = rx_offset.y;
        ry_offset.z = -rx_offset.x * Math.sin(y_rot) + rx_offset.z * Math.cos(y_rot);

        var rz_offset = {};
        rz_offset.x = ry_offset.x * Math.cos(z_rot) - ry_offset.y * Math.sin(z_rot);
        rz_offset.y = ry_offset.x * Math.sin(z_rot) + ry_offset.y * Math.cos(z_rot);
        rz_offset.z = ry_offset.z;

        // Add the offset to the center of the model
        x_pos += rz_offset.x;
        y_pos += rz_offset.y;
        z_pos += rz_offset.z;

        imageWidget.SetPosition(x_pos, y_pos, z_pos);
        imageWidget.SetOrientation(location.orientation.x, location.orientation.y, location.orientation.z);
      }
    }
  }

  /**
   * Handle Placement Picks of Model Based class
   * @param {string} colorStr - rgba string in the form of: "rgba(r, g, b, a);", output of prop panel 'color' datatype
   */
  function toRGB(colorStr) {
    if (!colorStr) {
      return undefined;
    }

    if (colorStr instanceof Array) {
      return colorStr;
    }

    let rgb = colorStr.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  }

  /**
   * Handle Placement Picks of Model Based class
   * @param {object} widget - TV widget
   * @param {object} pickResult - TV pick result
   */
  function ModelPlacementPickHandler(widget, pickResult) {
    widget.scene.SetFloorPickable(false);
    let position = { x: 0, y: 0, z: 0 };
    if (pickResult.IsValid()) {
      // pick is on 3d object or floor
      position = pickResult.GetLocation().position;
      if (position.y < 0.002 && position.y > -0.002) {
        position.y = 0; // snap to floor
      }
    } else {
      // pick is in empty space
      let location = widget.view.DoPickAxisPlanes(widget.dropCoords.x, widget.dropCoords.y, true);
      if (location.valid) {
        position = location.position;
      }
    }
    let props = { x: position.x.toFixed(4), y: position.y.toFixed(4), z: position.z.toFixed(4) };
    widget.ctrlWidget.setProps(props);
    widget.LoadModel(widget.ctrlWidget.designPropertyValues().src);
  }

  /**
   * Get the 3D Widget Button plates idpaths which are hardcoded in the .pvz model file
   * @param {float} frontPlateProps - the Button Widget front plate uniqe props for creating shape instance
   * @param {float} backPlateProps - the Button Widget back plate uniqe props for creating shape instance
   */
  function Get3DButtonPlateProps(frontPlateProps, backPlateProps) {
    frontPlateProps.idpath = '/40';
    backPlateProps.idpath = '/42';
  }

  /**
   * Set the 3D Widget Button different plates colors
   * @param {float} frontColor - the Button Widget front rgba color
   * @param {float} backColor - the Button Widget back rgba color
   * @param {float} widget - the Button Widget controller
   */
  function Set3DButtonPlateColors(widget, frontColor, backColor) {
    if (frontColor) {
      let rgb = toRGB(frontColor);
      if (rgb) {
        widget.$frontPlateWidget.SetColor1(
          rgb[0],
          rgb[1],
          rgb[2],
          1.0,
          Module.ChildBehaviour.IGNORED,
          Module.InheritBehaviour.OVERRIDE,
          -1,
          true,
          true,
          Module.OLFaceAppearances.USE
        );
      } else {
        widget.$frontPlateWidget.UnsetColor1(Module.ChildBehaviour.IGNORED, -1);
      }
    }
    if (backColor && widget.$backPlateWidget) {
      let rgb = toRGB(backColor);
      if (rgb) {
        widget.$backPlateWidget.SetColor1(
          rgb[0],
          rgb[1],
          rgb[2],
          1.0,
          Module.ChildBehaviour.IGNORED,
          Module.InheritBehaviour.OVERRIDE,
          -1,
          true,
          true,
          Module.OLFaceAppearances.USE
        );
      } else {
        widget.$backPlateWidget.UnsetColor1(Module.ChildBehaviour.IGNORED, -1);
      }
    }
  }

  /**
   * Translate from specified height/width into scale for Button Widget
   * @param {float} widget - the Button Widget's height
   * @param {float} height - the Button Widget's width
   * @param {object} result - front and back plate non-uniform scales to create the relevant height/width and calculated depth
   */
  function TransButtonWidgetHeightWidthToScale(height, width) {
    // Calculate front plate depth based on height and width:
    var smallestDimension = Math.min(height, width);
    var frontPlateDepth = smallestDimension * 0.125;
    if (smallestDimension > 0.11) {
      var logGT10 = 3.0 * (Math.log((smallestDimension - 0.1) * 100.0) / 100.0);
      frontPlateDepth = (0.11 + logGT10) * 0.125;
    }

    // Set fixed back plate depth as 5mm:
    var backPlateDepth = 0.005;

    // Calculate front plate dimentions:
    var front_s_x = Number(width) * 100;
    var front_s_y = Number(height) * 100;
    var front_s_z = frontPlateDepth * 100;

    // Calculate back plate dimentions:
    var margin = smallestDimension / 3;
    var back_s_x = Number(width + margin) * 100;
    var back_s_y = Number(height + margin) * 100;
    var back_s_z = backPlateDepth * 100;

    return {
      front_plate_scale: { x: front_s_x, y: front_s_y, z: front_s_z },
      back_plate_scale: { x: back_s_x, y: back_s_y, z: back_s_z },
    };
  }

  /**
   * Extracts local transformation matrix of a widget
   * @param {object} ctrlWidget - widget
   */
  function getLocalTransform(ctrlWidget) {
    let pose = {
      translation: { x: Number(ctrlWidget.me.x), y: Number(ctrlWidget.me.y), z: Number(ctrlWidget.me.z) },
      rotation: { x: Number(ctrlWidget.me.rx), y: Number(ctrlWidget.me.ry), z: Number(ctrlWidget.me.rz) },
      scale: {},
    };

    let scale = ctrlWidget.me.scale;
    if (scale) {
      scale = scale.split(' ');
      if (scale.length === 1) {
        pose.scale.x = pose.scale.y = pose.scale.z = Number(scale);
      } else if (scale.length === 3) {
        pose.scale.x = Number(scale[0]);
        pose.scale.y = Number(scale[1]);
        pose.scale.z = Number(scale[2]);
      }
    } else {
      pose.scale.x = Number(ctrlWidget.me.sx);
      pose.scale.y = Number(ctrlWidget.me.sy);
      pose.scale.z = Number(ctrlWidget.me.sz);
    }

    const local = widget3dUtils.transformFromPose(pose);
    return local;
  }

  /**
   * Extracts global transformation matrix of a widget, with respect to its parent, representing its absolute location
   * @param {object} ctrlWidget - widget
   */
  function getGlobalTransform(ctrlWidget) {
    const local = getLocalTransform(ctrlWidget);
    if (ctrlWidget.parent && ctrlWidget.parent.$cvWidget && ctrlWidget.parent.$cvWidget.children) {
      return getGlobalTransform(ctrlWidget.parent).multiply(local);
    } else {
      return local;
    }
  }

  /**
   * Sets location for widget including translation and orientation, according to pose
   * @param {object} cvWidget - widget
   */
  function setLocation(cvWidget, pose) {
    if (pose && pose.translation && pose.rotation) {
      cvWidget.SetPosition(Number(pose.translation.x), Number(pose.translation.y), Number(pose.translation.z));
      cvWidget.SetOrientation(Number(pose.rotation.x), Number(pose.rotation.y), Number(pose.rotation.z));
    }
  }

  /**
   * Gets relative location for widget according to its parent and absolute location
   * @param {object} parent - parent controller
   * @param {object} absLocation - child absolute location
   * @param {object} dimensions - the panel child dimensions (width,height), undefined for other kinds of widgets
   */
  function getRelativeLocation(parent, absLocation, dimensions) {
    if (parent.$cvWidget && absLocation) {
      // Get parent absolute location:
      const parentLocation = parent.$cvWidget.GetLocation();
      let parentDimensions;
      if (parent.getWidgetTagName() === 'twx-dt-3dpanel') {
        parentDimensions = parent.$cvWidget.getDimensions();
      }
      const parentTransform = getTransformFromTVLocation(parentLocation, parentDimensions);
      const childTransform = getTransformFromTVLocation(absLocation, dimensions);
      const parentTransformInverse = new THREE.Matrix4().getInverse(parentTransform);
      const transform = parentTransformInverse.multiply(childTransform);
      const pose = widget3dUtils.poseFromTransform(transform);
      return {
        position: pose.translation,
        orientation: pose.rotation,
        scale: pose.scale,
      };
    }
  }

  function getTransformFromTVLocation(absLocation, dimensions) {
    let scale = absLocation.scale;
    if (dimensions) {
      scale.x = scale.x / dimensions.width;
      scale.y = scale.y / dimensions.height;
    }
    return widget3dUtils.transformFromPose({
      translation: absLocation.position,
      rotation: absLocation.orientation,
      scale: scale,
    });
  }

  /**
   * @param {string} url
   * @returns {boolean} true if given url ends in .svg, false otherwise
   */
  function isSVG(url) {
    return url && url.match(/.*\.svg$/i) ? true : false;
  }

  /**
   * Sets the url property if its not set or ends with /
   * @param props
   * @param widgetTag
   */
  function handleDefaultImage(props, widgetTag) {
    if (props.placeholder_img) {
      // 3D Images will have src property, but ThingMark, Image Target, and Spatial Target have url prop
      const name = widgetTag === 'twx-dt-image' || widgetTag === 'twx-dt-sensor' ? 'src' : 'url';
      //Model targets should always use the placeholder in the canvas, the guide-view image may not be appropriate
      if (!props[name] || props[name].slice(-1) === '/' || isModelTargetTag(widgetTag)) {
        props[name] = props.placeholder_img;
      }
    }
  }

  function GetTextStyle(textAttrs) {
    var fallbackTextAttrs = {
      font: '36px Arial',
      fill: 'rgba(120, 255, 200 , 1)',
      stroke: 'rgba(0, 0, 255, 1)',
    };

    var textStyle = {};

    if (textAttrs === undefined) {
      textStyle = fallbackTextAttrs;
    } else {
      var tmp = textAttrs.split(';');
      for (var i = 0; i < tmp.length; i++) {
        if (tmp[i]) {
          var inds = tmp[i].split(':');
          textStyle[inds[0].toLowerCase().trim()] = inds[1].trim();
        }
      }
    }

    if (textStyle.linewidth) {
      textStyle.lineWidth = textStyle.linewidth; //Backwards compatible for mis-spelled property
    }
    if (!textStyle.lineWidth) {
      textStyle.lineWidth = 1;
    }

    return textStyle;
  }

  function SetHeightWidth(widget, props) {
    let tagName = widget.ctrlWidget.getWidgetTagName();
    if (tagName === 'twx-dt-label') {
      if (!props.height && !props.textprops) {
        props.height = 0.05;
      }
    }
    if (tagName === 'twx-dt-label' || tagName === 'twx-dt-image') {
      if (props.height) {
        if (props.height !== widget.ctrlWidget.previousHeight) {
          GenerateMarkupImage(widget, props);
          return;
        } else {
          props.height = widget.ctrlWidget.totalHeight;
          if (widget.ctrlWidget.totalWidth) {
            props.width = widget.ctrlWidget.totalWidth;
          }
        }
      } else if (props.width) {
        if (props.width !== widget.ctrlWidget.previousWidth) {
          GenerateMarkupImage(widget, props);
          return;
        } else {
          props.width = widget.ctrlWidget.totalWidth;
          if (widget.ctrlWidget.totalHeight) {
            props.height = widget.ctrlWidget.totalHeight;
          }
        }
      }
    }

    //Keep original w/h values to maintain the proper button size after undo/redo DT-24660
    var sizeProps = _.pick(props, ['width', 'height']);

    if (is3DButtonTag(tagName)) {
      if (props['src'] !== '' || props['text'] !== '') {
        var nativeHeight = Number(widget.GetNativeHeight());
        var nativeWidth = Number(widget.GetNativeWidth());

        var buttonAspect = props.height / props.width;
        var imageAspect = nativeHeight / nativeWidth;

        if (buttonAspect > imageAspect) {
          props.height = 0;
        } else {
          props.width = 0;
        }
      }
    }

    if (Number(props.width) > 0 && Number(props.height) > 0) {
      widget.LockAspectRatio(false);
      widget.SetWidth(Number(props.width));
      widget.SetHeight(Number(props.height));
    } else if (Number(props.width) > 0) {
      widget.LockAspectRatio(true);
      widget.SetWidth(Number(props.width));
    } else if (Number(props.height) > 0) {
      widget.LockAspectRatio(true);
      widget.SetHeight(Number(props.height));
    } else {
      widget.LockAspectRatio(true);
      widget.SetHeight(Number(widget.GetNativeHeight()));
    }
    const transform = getGlobalTransform(widget.ctrlWidget);
    const pose = widget3dUtils.poseFromTransform(transform);
    if (Number(props.scale) > 0) {
      widget.SetScaleWidth(pose.scale.x);
      widget.SetScaleHeight(pose.scale.x);
    } else if (Number(props.sx) > 0 && Number(props.sy) > 0) {
      widget.SetScaleWidth(pose.scale.x);
      widget.SetScaleHeight(pose.scale.y);
    } else {
      widget.SetScaleWidth(1.0);
      widget.SetScaleHeight(1.0);
    }

    Object.assign(props, sizeProps);
  }

  function GenerateMarkupImage(widget, props) {
    handleDefaultImage(props, widget.ctrlWidget.getWidgetTagName());

    if (props.fontColor) {
      props.fontColor = removeTrailingSemicolon(props.fontColor);
    }
    if (props.fontOutlineColor) {
      props.fontOutlineColor = removeTrailingSemicolon(props.fontOutlineColor);
    }

    syncClassAttribute(widget.ctrlWidget, props.class);

    if (!props.src || props.src.slice(-1) === '/') {
      // Label or no image Gauge
      RenderImageAndText(widget, props, null);
    } else {
      var image = new Image();
      image.onerror = function (e) {
        console.error('Could not load image.', e, props.src);
      };
      image.onload = function () {
        RenderImageAndText(widget, props, image);
      };
      if (props.src && props.src.startsWith('http')) {
        image.crossOrigin = 'Anonymous';
      }
      image.src = props.src;
    }
  }

  /**
   * Removes non custom classes, jquery drag/drop adds multiple ui- classes
   *
   * Only acts if the class attribute is not undefined as it doesn't exist on the widget
   *  or has never been defined.
   *
   * Adds the new class if its not in classlist
   * @param {Object} ctrlWidget - widget controller
   * @param {String} cls - current class property value
   */
  function syncClassAttribute(ctrlWidget, cls) {
    if (typeof cls !== 'undefined') {
      var element = ctrlWidget.element();
      var cl = element[0].classList;
      cl.forEach(function (nextCls) {
        if (!nextCls.startsWith('ui-') && nextCls !== cls) {
          cl.remove(nextCls);
        }
      });

      if (cls && !cl.contains(cls)) {
        element.addClass(cls); //jqlite handles multiple classes space separated
      }
    }
  }

  function RenderImageAndText(widget, props, image) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    widget.ctrlWidget.previousHeight = props.height;
    widget.ctrlWidget.previousWidth = props.width;
    if (image) {
      constructImageAndTextInfo(props, image, canvas, context, widget.ctrlWidget.element(), widget);
      SetHeightWidth(widget, props);
    } else {
      var properties = _.clone(props);
      const tagName = widget.ctrlWidget.getWidgetTagName();
      if (is3DButtonTag(tagName) || tagName === 'twx-dt-label' || is3DPanelTag(tagName)) {
        //Pass in default height when its non-upgraded label to match vf_ang behavior
        var height = properties.height;
        if (!height || height === 'NaN') {
          if (!properties.textattrs && !properties.textprops) {
            //No textattrs means its a 8.0.2 version compatible label
            properties.height = 0.05;
          }
        }
      }
      VF_ANG.drawTextToCanvas(canvas, widget.ctrlWidget.element(), properties);
      widget.ctrlWidget.totalHeight = properties.height;
    }

    // Grab the imageData from the canvas
    const imageData =
      canvas.width === 0 || canvas.height === 0
        ? new ImageData(1, 1)
        : context.getImageData(0, 0, canvas.width, canvas.height);

    // Send the imageData to the App
    var nDataBytes = imageData.data.length * imageData.data.BYTES_PER_ELEMENT;
    var dataPtr = Module._malloc(nDataBytes);
    var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
    dataHeap.set(new Uint8Array(imageData.data.buffer));
    widget.SetImage(dataHeap.byteOffset, imageData.width, imageData.height);

    // Free the imageData memory
    Module._free(dataHeap.byteOffset);

    // Notify the system that the image is loaded
    widget.ImageMarkerLoaded(true);
  }

  /**
   * Sets appropriate CSS and DOM properties on canvas context for text and image rendering
   * *Note this method should continue to be replaced with functions in vuforia-angular.js
   *
   * @param props Widget properties
   * @param image Optional image object to be drawn into the canvas
   * @param canvas dom element
   * @param context  canvas context element
   */
  function constructImageAndTextInfo(props, image, canvas, context, element, widget) {
    var textStyle;

    if ('textprops' in props) {
      textStyle = GetTextStyle(props.textprops);
    } else {
      textStyle = GetTextStyle(props.textattrs);

      if ('fontsize' in props && 'font' in props) {
        textStyle.font = props.fontsize + ' ' + props.font;
      }
    }

    // Set widget specific properties
    var textx = 0,
      texty = 0;
    var imagex = 0,
      imagey = 0;
    var computedStyle = window.getComputedStyle(element[0]);
    var calculatedSizes = VF_ANG.calculateCssSizes(element, image, computedStyle, props.height, props.width);

    if (image && props.text && !is3DButtonTag(widget.ctrlWidget.getWidgetTagName())) {
      //Gauge
      context.textBaseline = textStyle.textbaseline;
      context.textAlign = textStyle.textalign;
      adjustCanvasSize(props, canvas, context, image);
      textx = Number(props.textx);
      texty = Number(props.texty);
      imagex = Number(props.imagex);
      imagey = Number(props.imagey);
    } else if (image) {
      //Image
      var extraSize = 2 * (calculatedSizes.padding + calculatedSizes.borderWidth);
      //Calculated sizes won't work to size the image when both height and width are set and are not the same ratio
      //The image can get cut off.
      canvas.width = image.width + extraSize;
      canvas.height = image.height + extraSize;
      //console.log('image size', image.height, image.width, canvas.width, canvas.height,  calculatedSizes.height + extraSize,  calculatedSizes.width + extraSize, calculatedSizes.imagePhysicalWidth, calculatedSizes.imagePhysicalHeight)
      widget.ctrlWidget.totalHeight = calculatedSizes.imagePhysicalHeight;
      widget.ctrlWidget.totalWidth = calculatedSizes.imagePhysicalWidth;
      imagey = imagex = calculatedSizes.padding + calculatedSizes.borderWidth;
    }

    // Draw image on canvas
    if (image) {
      if (element[0].tagName === 'TWX-DT-IMAGE') {
        // No gauge for now
        VF_ANG.drawTextBorder(context, computedStyle, canvas.width, canvas.height, calculatedSizes.borderWidth);
      }
      context.drawImage(image, imagex, imagey);
    }

    // Draw text on canvas
    if (props.text) {
      if (textStyle.font) {
        context.font = textStyle.font;
      }

      context.textAlign = textStyle.textalign;
      context.textBaseline = textStyle.textbaseline;

      if (textStyle.fill !== undefined) {
        context.fillStyle = textStyle.fill;
        context.fillText(props.text, textx, texty);
      }
      if (textStyle.stroke !== undefined) {
        context.strokeStyle = textStyle.stroke;
        context.lineWidth = textStyle.lineWidth;
        context.strokeText(props.text, textx, texty);
      }
    }
  }

  function adjustCanvasSize(props, canvas, context, image) {
    var width = 0;
    var height = 0;

    function adjustToImage() {
      var imagex = Number(props.imagex);
      if (width < image.width + imagex) {
        width = image.width + imagex;
      }
      var imagey = Number(props.imagey);
      if (height < image.height + imagey) {
        height = image.height + imagey;
      }
    }

    function adjustToText() {
      context.font = props.fontsize + ' ' + props.font;
      var textBasedWidth = Number(props.textx) + context.measureText(props.text).width + 3;
      if (width < textBasedWidth) {
        width = textBasedWidth;
      }

      var textBasedHeight = Number(props.texty) + context.measureText('MI').width;
      if (height < textBasedHeight) {
        height = textBasedHeight;
      }
    }

    switch (props.canvasgrowthoverride) {
      case 'canvas': {
        width = props.canvaswidth;
        height = props.canvasheight;
        break;
      }
      case 'image': {
        adjustToImage();
        break;
      }
      case 'text': {
        adjustToText();
        break;
      }
      case 'image+text': {
        adjustToImage();
        adjustToText();
        break;
      }
      default:
        break;
    }

    props.canvaswidth = width;
    props.canvasheight = height;

    canvas.height = height;
    canvas.width = width;
  }

  /**
   * Gets a feature toggle setting from the passed scope.builderSettings
   *
   * @param {*} scope
   * @param {*} key
   */
  function getFeatureToggle(scope, key) {
    return scope && scope.builderSettings && scope.builderSettings[key];
  }

  /**
   * Sets the background colors in the specified view
   * If both the supplied topColor and bottomColor are valid, the background is
   * shown as a gradient fill varying between these two colors.
   * If only topColor is valid, this is this solid color is shown as the background
   *
   * @param {object} view the view to which the colors are to be applied
   * @param {int} topColor the color to be used at the top of the background
   * @param {int} bottomColor the color to be used at the bottom of the background
   */
  function setBackgroundColors(view, topColor, bottomColor) {
    if (!isNaN(topColor) && topColor >= 0 && topColor <= 0xffffffff) {
      if (!isNaN(bottomColor) && bottomColor >= 0 && bottomColor <= 0xffffffff) {
        view.SetTopBottomBackgroundColor(topColor, bottomColor);
      } else {
        view.SetBackgroundColor(topColor);
      }
    }
  }

  function resizeFloor(scene, floor, moveHeight) {
    if (scene && floor) {
      var size = 1.0;
      var pos = { x: 0, y: -0.0001, z: 0 };
      var bbPos = pos;
      var bounds = scene.GetWorldBoundingBox();
      if (bounds.valid) {
        var x = bounds.max.x - bounds.min.x;
        var y = bounds.max.y - bounds.min.y;
        var z = bounds.max.z - bounds.min.z;

        bbPos.x = bounds.min.x + x / 2;
        bbPos.y = bounds.min.y + y / 2;
        bbPos.z = bounds.min.z + z / 2;

        var margin = Math.sqrt(x * x + y * y + z * z) * 4;
        size = Math.sqrt(bbPos.x * bbPos.x + bbPos.y * bbPos.y + bbPos.z * bbPos.z) * 2 + margin;

        if (moveHeight) {
          pos.y = bounds.min.y - 0.0001;
        } else {
          pos.y = -0.0001;
        }

        // set a minimum floor size
        if (size < 1.0) {
          size = 1.0;
        }
      }

      var floor_resized = false;
      if (Math.abs(size - floor.size) > floor.size / 4.0) {
        floor_resized = true;
        floor.size = size;
      }

      var floor_moved = false;
      if (
        Math.abs(pos.x - floor.pos.x) > floor.size / 4.0 ||
        Math.abs(pos.z - floor.pos.z) > floor.size / 4.0 ||
        pos.y !== floor.pos.y
      ) {
        floor_moved = true;
        floor.pos = pos;
      }

      if (floor_moved || floor_resized) {
        scene.ShowFloorWithSize(true, floor.size, floor.size, floor.pos, floor.gridColor, floor.fillColor);
      }
    }
  }

  function getDefaultPrefs(isAntialiasing, loadMarkups = false) {
    const antialiasingMode = isAntialiasing ? '2' : '0';
    var defaultPrefs = {
      ParseNode: {
        Type: 'root',
        Name: '',
        Value: '',
        Locked: false,
        Children: [
          {
            Type: 'category',
            Name: 'Startup',
            Value: '',
            Locked: false,
            Children: [
              {
                Type: 'preference',
                Name: 'Enable markups',
                Value: String(loadMarkups),
                Locked: false,
              },
            ],
          },
          {
            Type: 'category',
            Name: 'Shape Scene',
            Value: '',
            Locked: false,
            Children: [
              {
                Type: 'preference',
                Name: 'Transition override inherit behaviour',
                Value: 'true',
                Locked: false,
              },
              {
                Type: 'preference',
                Name: 'Zoom on load',
                Value: 'false',
                Locked: false,
              },
            ],
          },
          {
            Type: 'category',
            Name: 'Shape View',
            Value: '',
            Locked: false,
            Children: [
              {
                Type: 'preference_list',
                Name: 'Default background color',
                Locked: false,
                Children: [
                  {
                    Type: 'preference_item',
                    Children: [
                      {
                        Type: 'preference',
                        Name: 'Top',
                        Value: '15658734',
                        Locked: false,
                      },
                    ],
                  },
                ],
              },
              {
                Type: 'preference',
                Name: 'Antialiasing quality',
                Value: antialiasingMode,
                Locked: false,
              },
            ],
          },
        ],
      },
    };

    return JSON.stringify(defaultPrefs);
  }

  function addRenderStat(tv_view, viewName) {
    var renderStat = {};

    // Adding renderer statistics:
    var views = document.querySelectorAll(viewName);
    if (views && views.length) {
      var view = views[views.length - 1];
      var canvas = document.createElement('canvas');
      view.appendChild(canvas);
      var timerId = setInterval(function () {
        tv_view.GetRenderStats(function (rs) {
          let text = 'Scene polygon count: ' + rs.triangleCount;
          renderStat.updateRenderStat(canvas, text, '16px Georgia', 20);
        });
      }, 1000);
    }

    // Changing renderer statistics appearance:
    renderStat.updateRenderStat = function (canvas, text, font, height) {
      var context = canvas.getContext('2d');
      canvas.style.cssText = 'position:absolute;bottom:0;right:0;';
      context.font = font;
      canvas.width = context.measureText(text).width + 10;
      context.font = font;
      canvas.height = height;
      context.textAlign = 'start';
      context.textBaseline = 'top';
      context.font = font;
      context.fillStyle = '#020';
      context.fillText(text, 0, 0);
      renderStat.canvas = canvas;
    };

    // Removing renderer statistics:
    renderStat.removeRenderStat = function () {
      // Remove canvas element:
      if (renderStat.canvas) {
        renderStat.canvas.parentElement.removeChild(renderStat.canvas);
        renderStat.canvas = null;
      }
      // Remove interval:
      if (timerId) {
        clearInterval(timerId);
      }
    };

    return renderStat;
  }

  /**
   * Decode UTF8 strings into unicode.  Strings passed from ThingView are utf8
   *
   * @param {string} s the utf8 encoded string
   * @returns {string} the string as unicode
   */
  function decodeUtf8(s) {
    // jshint ignore:line
    return decodeURIComponent(escape(s));
  }

  /**
   * Removes a trailing semicolon character from a string
   *
   * @param {string} s the input string
   * @returns {string} the string with the semicolon (if any) removed;
   */
  function removeTrailingSemicolon(s) {
    return s.endsWith(';') ? s.slice(0, -1) : s;
  }

  /**
   * Parses a string of the form: 'rgba(R, G, B, A)' to an integer representation of the color
   * The color components R G B must be integers in the range 0 - 255.
   * The alpha component must be a float in the range 0 - 1.0.
   *
   * @param {string} color the string representing the color
   * @returns {string} the rgba color as an integer, or -1 on failure
   */
  function rgbaToInteger(color) {
    var int = -1;
    if (typeof color === 'string') {
      var rgba = color.match(
        /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d*\.?\d*)[\s+]?/i
      );
      if (rgba) {
        int = Number(rgba[1]) * 0x1000000;
        int += Number(rgba[2]) * 0x0010000;
        int += Number(rgba[3]) * 0x0000100;
        if (Number(rgba[4]) <= 1.0) {
          int += Math.round(Number(rgba[4]) * 255);
        } else {
          // legacy support for
          int += Math.round(Number(rgba[4]));
        }
      }
      if (int < 0 || int > 0xffffffff) {
        int = -1;
      }
    }
    return int;
  }

  /**
   * Parse boolean values expressed as a string
   *
   * @param {string or bool} the supplied value, as a string or boolean
   * @returns {bool} the boolean result
   */
  function parseBool(b) {
    let result = false;
    if (typeof b === 'string') {
      if (b.toLowerCase() === 'true') {
        result = true;
      }
    } else if (b) {
      result = true;
    }

    return result;
  }

  /**
   * Get the name of the ThingView Model's sequence, given its URL
   *
   * @param {string} url the url of the sequence
   * @param {object} The ThingView Model containing the sequence
   * @returns {string} the name of the sequence
   */
  function GetSequenceNamefromUrl(url, model) {
    let name = '';
    let loadSource = model.GetStructureLoadSource();
    if (loadSource) {
      let seqURL = decodeURI(url);
      seqURL = seqURL.slice(seqURL.lastIndexOf('/') + 1);
      let illustrations = loadSource.GetIllustrations();
      for (let i = 0; i < illustrations.size(); i++) {
        var illustration = illustrations.get(i);
        if (decodeUtf8(illustration.filename) === seqURL) {
          name = illustration.name;
          break;
        }
      }
    }

    return name;
  }

  /**
   * Create an error message to send to another part of the system
   *
   * @param {string} errorCode the machine-readable error code
   * @param {string} errorString the human-readable error string
   * @returns {string} the formatted error message
   */
  function createErrorMessage(errorCode, errorString) {
    let message = '{ "errorCode" : "' + errorCode + '", "message" : "' + errorString + '" }';

    return message;
  }

  /**
   * setting width of Model Target
   * @param modelTarget - The model target widget
   * @param boundingBox - The model's bounding box
   */
  function setModelTargetWidth(modelTarget, boundingBox) {
    // Make the model target slightly wider than the smallest horizontal dimension of the bounding box
    modelTarget.SetWidth(1.1 * Math.min(boundingBox.max.x - boundingBox.min.x, boundingBox.max.z - boundingBox.min.z));
  }

  /**
   * setting existing location of Model Target
   * @param modelTarget - The model target widget
   * @param modelLocation
   * @param boundingBox - The model's bounding box
   */
  function setModelTargetExistingLocation(modelTarget, modelLocation, boundingBox) {
    modelTarget.existing_loc = {
      orientation: modelLocation.orientation,
      scale: modelLocation.scale,
      // Find the offset from the model's position to the center of the bottom of the bounding box
      offset: {
        x: (boundingBox.min.x + boundingBox.max.x) / 2 - modelLocation.position.x,
        y: boundingBox.min.y - modelLocation.position.y,
        z: (boundingBox.min.z + boundingBox.max.z) / 2 - modelLocation.position.z,
      },
    };
  }

  /**
   * Getting lists of parts
   * @returns {Module.VectorString}
   */
  function getListOfParts() {
    let parts = new Module.VectorString();
    parts.push_back('/'); // Add the model root node to the (empty) list of parts to be measured
    return parts;
  }

  /**
   * setting position and orientation of Model Target for design and runtime
   */
  function setModelTargetLocation(modelTargetWidget, modelLocation) {
    if (modelTargetWidget.existing_loc) {
      modelTargetWidget.SetPosition(
        modelLocation.position.x + modelTargetWidget.existing_loc.offset.x,
        modelLocation.position.y + modelTargetWidget.existing_loc.offset.y,
        modelLocation.position.z + modelTargetWidget.existing_loc.offset.z
      );
      modelTargetWidget.SetOrientation(-90, 0, 0);
    }
  }

  /**
   * Checking if marker is of Image type
   * @param markerType
   * @returns {boolean}
   */
  function isImageMarker(markerType) {
    return ['ThingMark', 'Spatial Target', 'Model Target', 'Image Target', 'Image', '3D Button'].includes(markerType);
  }

  /**
   * applying properties to ThingMark widget
   * @param widget
   * @param vrSession
   */
  function applyThingMarkProperties(widget, vrSession) {
    const thingMarkImage = vrSession[widget.name + '-image'];
    if (thingMarkImage && thingMarkImage.properties !== undefined) {
      if (thingMarkImage.properties.decal !== undefined) {
        widget.SetDecal(parseBool(thingMarkImage.properties.decal));
      }
    }
  }

  /**
   * getting value of widget scale property
   * @param locationScale
   * @returns {string}
   */
  function getScalePropertyValue(locationScale, tagName) {
    var scale = locationScale.x.toFixed(4);

    if (tagName === 'twx-dt-model' || tagName === 'twx-dt-modelitem') {
      var scale_x = locationScale.x.toFixed(4);
      var scale_y = locationScale.y.toFixed(4);
      var scale_z = locationScale.z.toFixed(4);
      if (scale_x === scale_y && scale_x === scale_z) {
        scale = scale_x;
      } else {
        scale = '' + scale_x + ' ' + scale_y + ' ' + scale_z;
      }
    }

    return scale;
  }

  /**
   * setting scale of widget
   * @param widget
   * @param scaleObj
   */
  function applyScaleToWidget(widget, scaleObj) {
    if (scaleObj.sx === scaleObj.sy && scaleObj.sx === scaleObj.sz) {
      widget.SetScale(Number(scaleObj.sx));
    } else {
      widget.SetScaleXYZ(Number(scaleObj.sx), Number(scaleObj.sy), Number(scaleObj.sz));
    }
  }

  /**
   * transfer movement restriction from old selected/deselected widget to newly selected/deselected widget
   * @param targetWidget
   * @param srcWidget
   */
  function transferMovementRestriction(targetWidget, srcWidget) {
    if (targetWidget && srcWidget) {
      targetWidget.disableTransform = targetWidget.disableTransform || srcWidget.disableTransform;
      targetWidget.limitDragger = targetWidget.limitDragger || srcWidget.limitDragger;
    }
  }

  twxWidgets.getFeatureToggle = getFeatureToggle;
  twxWidgets.adjustCanvasSize = adjustCanvasSize;
  twxWidgets.handleDefaultImage = handleDefaultImage;
  twxWidgets.isSVG = isSVG;
  twxWidgets.rgbaToInteger = rgbaToInteger;
  twxWidgets.setBackgroundColors = setBackgroundColors;
  twxWidgets.isImageMarker = isImageMarker;
  twxWidgets.setModelTargetLocation = setModelTargetLocation;
  twxWidgets.setModelTargetExistingLocation = setModelTargetExistingLocation;
  twxWidgets.setModelTargetWidth = setModelTargetWidth;
  twxWidgets.applyThingMarkProperties = applyThingMarkProperties;
  twxWidgets.getScalePropertyValue = getScalePropertyValue;
  twxWidgets.applyScaleToWidget = applyScaleToWidget;
})();
