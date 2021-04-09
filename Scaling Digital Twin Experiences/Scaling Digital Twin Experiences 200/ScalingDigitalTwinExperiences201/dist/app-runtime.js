/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
(function () {
  // determine if this is the very first page to be loaded
  var isFirstPage;
  if (history.state && history.state.isFirstPage) {
    isFirstPage = history.state.isFirstPage;
  } else {
    isFirstPage = window.history.length <= 1;
    if (typeof history.replaceState === 'function') {
      // should be present in all our browsers, but not necessarily tests
      if (history.state) {
        history.state.isFirstPage = isFirstPage;
        history.replaceState(history.state, document.title);
      } else {
        history.replaceState({ isFirstPage: isFirstPage }, document.title);
      }
    }
  }

  function backButtonHandler(e, $ionicHistory, ionicPlatform) {
    e.preventDefault();
    if ($ionicHistory.backView()) {
      $ionicHistory.goBack(); // there is an Ionic back view, go to it; as per Ionic default behavior
    } else if (!isFirstPage && vuforia && typeof vuforia.goBack === 'function') {
      // vuforia from vuforia.js
      vuforia.goBack(); // delegate to Vuforia Cordova plugin
    } else {
      ionicPlatform.exitApp(); // exit the overall browser app (which is Ionic default behavior)
    }
  }

  var app = angular
    .module('twxRuntime', [
      'ionic',
      'ngCordova',
      'com.thingworx.declarative',
      'ngCordova.plugins.network',
      'twxViewControllers',
      'com.thingworx.services',
    ])
    .run(function ($ionicPlatform, $ionicHistory) {
      $ionicPlatform.ready(function () {
        $ionicPlatform.registerBackButtonAction(function (e) {
          backButtonHandler(e, $ionicHistory, ionic.Platform); // Note: ionic.Platform !=== $ionicPlatform
        }, 100);
      });
    });

  function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);

    if (!results) {
      return null;
    }
    if (!results[2]) {
      return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  //Add preview reload capability
  if (getParameterByName('preview', location.search) === 'true') {
    var head = document.head || document.getElementsByTagName('head')[0],
      script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '../../../../js/lib/socket.io.slim.min.js';
    head.appendChild(script);
    script.onload = function () {
      var previewSocket = window.io();
      previewSocket.emit('watch-project', { name: getParameterByName('project', location.search) });
      previewSocket.on('reload', function () {
        location.reload();
      });
    };
  }

  var twx = window.twx || {};
  window.twx = twx;
  var styleCount = 0;
  var autoWidgetCount = 0;
  var snackbarMessages = [];

  twx.device = twx.device || {
    fn: {},
    mdl: {
      CurrentDevice: {},
    },
    evt: {},
  };

  twx.app = twx.app || {
    fn: {},
    mdl: {
      custom: {},
    },
    evt: {},
    params: {},
  };

  twx.app.getScope = function getScope(el) {
    var scope;
    while (el && !scope) {
      scope = angular.element(el).data('scope');
      el = el.parentNode;
      if (el === document.body) {
        return {};
      }
    }
    return scope;
  };

  twx.app.buildTagsFromTagDescriptionWithSemicolons = function (description) {
    var tags = [];

    var tagStrings = description.split(';');

    for (var i = 0; i < tagStrings.length; i++) {
      var tagString = tagStrings[i].trim();
      if (tagString.length > 0) {
        var tagPortions = tagString.split(':');
        tags.push({ vocabulary: tagPortions[0], vocabularyTerm: tagPortions[1] });
      }
    }
    return tags;
  };

  twx.app.convertStringPropertyToBasetype = function (stringValue, baseType) {
    var convertedValue = stringValue;
    if (baseType !== undefined) {
      // eslint-disable-next-line default-case
      switch (baseType.toLowerCase()) {
        case 'boolean':
          if (stringValue === undefined || stringValue.length === 0) {
            convertedValue = undefined;
          } else {
            stringValue = stringValue.toLowerCase();
            switch (stringValue) {
              case '1':
              case 'true':
                convertedValue = true;
                break;
              default:
                convertedValue = false;
            }
          }
          break;

        case 'number':
        case 'integer':
        case 'long':
          if (stringValue === undefined || stringValue.length === 0) {
            convertedValue = undefined;
          } else {
            try {
              if (baseType === 'number') {
                convertedValue = parseFloat(stringValue);
              } else {
                convertedValue = parseInt(stringValue);
              }
            } catch (err) {
              console.log(
                'runtime conversion exception converting "' + stringValue + '" from STRING to ' + baseType,
                err
              );
            }
          }
          break;

        case 'datetime':
          if (stringValue === undefined || stringValue.length === 0) {
            convertedValue = undefined;
          } else {
            try {
              convertedValue = new Date(stringValue);
            } catch (err) {
              console.log('runtime conversion exception converting "' + stringValue + '" from STRING to DATETIME', err);
            }
          }
          break;

        case 'tags':
          if (stringValue === undefined || stringValue.length === 0) {
            convertedValue = undefined;
          } else {
            try {
              convertedValue = twx.app.buildTagsFromTagDescriptionWithSemicolons(stringValue);
            } catch (err) {
              console.log('runtime conversion exception converting "' + stringValue + '" from STRING to TAGS', err);
            }
          }
          break;

        case 'infotable':
          if (stringValue === undefined || stringValue.length === 0) {
            convertedValue = undefined;
          } else {
            try {
              convertedValue = JSON.parse(stringValue);
            } catch (err) {
              console.log('runtime conversion exception converting "' + stringValue + '" from STRING to TAGS', err);
            }
          }
          break;
      }
    }
    return convertedValue;
  };

  // determines if the app is being viewed in the preview page or not
  twx.app.isPreview = function () {
    if ('URL' in window && typeof window.URL === 'function') {
      var url = new URL(window.parent ? window.parent.location.href : window.location.href);
      return url.pathname.endsWith('preview.html') || getParameterByName('preview', url.href) === 'true';
    } else {
      //IE11 runtime support, preview used for voice commands and AR handling, could potentially return false from here?
      //This is weaker support than the above, but not sure preview needs to work in IE11
      return (
        getParameterByName('preview', window.parent ? window.parent.location.href : window.location.href) === 'true'
      );
    }
  };
  // Retrieves the App Events that are bound as an event binding or contains a JavaScript expression
  twx.app.getAppEventsWithHandlers = function () {
    var appEvents = [];
    _.each(document.querySelectorAll('twx-app-event'), function (appEventEl) {
      var appEvent = angular.element(appEventEl);
      if (
        appEvent.attr('expression') ||
        document.querySelector('twx-eventbind[source-event="' + appEvent.attr('name') + '"][source-type="event"]')
      ) {
        appEvents.push({ name: appEvent.attr('name'), voiceAlias: appEvent.attr('voicealias') });
      }
    });
    return appEvents.sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  };

  app.directive('twxView', function ($log) {
    return {
      restrict: 'A',
      link: function ($scope, elem, attrs) {
        if ($scope.app.speech) {
          var viewName = attrs.twxView;
          var params = {
            grammarURL: 'app/components/' + viewName + '-grammar.xml',
            grammarTag: 'ExperienceGrammar',
          };

          $log.debug('initializing speech service', params);
          $scope.app.speech.addGrammar(params, null, null);
        }
      },
      controllerAs: 'twxViewCtrl',
      controller: '@',
      name: 'ctrlName',
    };
  });

  app.directive('twxDatabind', function () {
    return {
      require: ['?^twxWidget', '?^twxModel', '?^twxUserModel', '?^twxAppParam'],
      link: function ($scope, elem, attrs, controllers) {
        var controller = controllers[0] || controllers[1] || controllers[2] || controllers[3];
        controller.addDataBinding(attrs.fromExpression, attrs.toProperty, elem);
      },
      controller: ['$scope', function ($scope) {}],
    };
  });

  app.directive('twxUserModel', function () {
    return {
      restrict: 'E',
      link: function ($scope, elem, attrs, viewCtrl) {},
      controller: function ($scope, $element, $attrs, $rootScope, filterService) {
        var modelName = '';

        this.init = function (element) {
          modelName = element.attr('name');
        };

        this.addDataBinding = function (fromExpression, toProperty, element) {
          if (fromExpression && toProperty) {
            $scope.$watch(fromExpression, function (newValue, oldValue) {
              //console.log('Binding update fromExpression:"' + fromExpression + '", result is ' + newValue + ', was ' + oldValue);
              twx.app.mdl.custom[modelName] = filterService.filterValue(newValue, element);
            });
          }
        };

        this.init($element);
      },
    };
  });

  app.directive('twxWidget', function () {
    return {
      require: '?^twxView',
      restrict: 'E',
      scope: true,
      link: function ($scope, elem, attrs, viewCtrl) {
        var twxViewCtrl;
        var viewScope = $scope;
        while (twxViewCtrl === undefined) {
          viewScope = viewScope.$parent;
          twxViewCtrl = viewScope.twxViewCtrl;
        }
        twxViewCtrl.addWidget($scope, elem, attrs);
        elem.data('scope', $scope);
      },
      controller: function ($scope, $element, $attrs, $rootScope, $timeout, $filter, DataConnector, filterService) {
        var widgetId,
          props,
          delegate = {};

        this.defaultValues = {};

        this.init = function (element) {
          widgetId = $attrs.widgetId;
          if (!widgetId) {
            widgetId = 'auto-' + Date.now() + autoWidgetCount++;
            $element.attr('widget-id', widgetId);
            $attrs.widgetId = widgetId;
          }
          props = {};
          $scope[widgetId] = props;
          $scope.me = props;
          $scope.delegate = delegate;
          $scope.widgetId = widgetId;
          if ($attrs.twxAutoAssignItem !== undefined) {
            $scope[widgetId].item = $scope.item;
          }
        };

        this.addProperty = function (name, value, isBound, valueExpression, elem, datatype) {
          if (name) {
            if (datatype === 'json') {
              $scope[widgetId][name] = JSON.parse(value);
              if (isBound === undefined) {
                this.defaultValues[name] = JSON.parse(value);
              }
              if (valueExpression) {
                $scope.$watch(valueExpression, function (newValue, oldValue) {
                  $scope[widgetId][name] = newValue;
                });
              }
            } else {
              $scope[widgetId][name] = value;
              if (isBound === undefined) {
                this.defaultValues[name] = value;
              }
              if (valueExpression) {
                $scope.$watch(valueExpression, function (newValue, oldValue) {
                  $scope[widgetId][name] = newValue;
                });
              }
              if (name === 'stateFormatValue' && value) {
                if ($element[0].querySelector('twx-widget-property[name="enableStateFormatting"][value="true"]')) {
                  //console.log("stateformat", name, value, valueExpression);
                  $scope.$watch(
                    function () {
                      return $scope[widgetId].stateFormatValue;
                    },
                    function (newValue, oldValue) {
                      if ($scope[widgetId]._stateFormatUnregister) {
                        $scope[widgetId]._stateFormatUnregister();
                      }
                      $scope[widgetId]._stateFormatUnregister = $scope.$watch(
                        function () {
                          if (newValue && newValue.startsWith('item.') && !$scope[widgetId].item) {
                            return _.get($scope, newValue);
                          }
                          return _.get($scope[widgetId], newValue);
                        },
                        function (val) {
                          twx.app.fn.applyStateFormat($element, val, $scope[widgetId].stateFormat, DataConnector);
                        }
                      );
                    }
                  );
                }
              }
            }
          }
        };

        /**
         * Add listeners for the given service
         * @param name the name of a service (e.g. 'play', 'rewind')
         * @param elem a jqLite wrapped element that may or may not currently be in the DOM
         */
        this.addService = function (name, elem) {
          if (!name) {
            console.log('Widget service name is undefined!');
            return;
          }

          var serviceHandler = function (evt, data) {
            if (delegate[name]) {
              delegate[name]();
            } else {
              // ensure we call service on intended dom el in case widget contains N dom els with twx-service-handler
              var svcHandler =
                $element[0].querySelector('[twx-service-handler~="' + name + '"]') ||
                $element[0].querySelector('[twx-service-handler]');
              if (svcHandler && typeof svcHandler[name] === 'function') {
                svcHandler[name](data);
              }
              //Notify child (widget) scope to invoke its service
              $scope.$broadcast('serviceInvoke', { serviceName: name, params: data });
            }
          };

          // find the viewName to construct an event name (as of 1.10)
          var viewName = '',
            e = elem;
          while (e && !viewName) {
            viewName = e.attr('twx-view');
            e = e.parent();
          }
          if (viewName) {
            $scope.$on('app.view["' + viewName + '"].wdg["' + widgetId + '"].svc.' + name, serviceHandler);
          } else {
            console.error('Unable to determine view name. Service handler not added.', name, widgetId);
          }
          //backwards compatible (pre 1.10 event name should not be needed?)
          $scope.$on('app.view["' + widgetId + '"].svc.' + name, serviceHandler);
        };

        this.setViewProperty = function (prop, value) {
          $scope.view.wdg[widgetId][prop] = value;
        };

        this.addDataBinding = function (fromExpression, toProperty, element) {
          var isStateFormat = element.attr('binding-type') === 'stateFormat';
          if (fromExpression && (toProperty || isStateFormat)) {
            var first = true;
            var assignValue = function (newValue, oldValue) {
              //console.log('Binding update fromExpression:"' + fromExpression + '", result is ' + newValue + ', was ' + oldValue);
              var finalValue = filterService.filterValue(newValue, element);
              if (toProperty && toProperty.indexOf('app.params') !== 0) {
                if (!first || newValue !== undefined) {
                  //On startup, don't set undefined over a preset
                  if (
                    finalValue !== undefined &&
                    finalValue.primitiveValue &&
                    typeof $scope[widgetId][toProperty] !== 'object'
                  ) {
                    //Convert complex object to a primitive value
                    finalValue = finalValue.primitiveValue();
                  }
                  $scope[widgetId][toProperty] = finalValue;
                }
              } else {
                if (finalValue !== undefined && finalValue !== '' && finalValue !== oldValue) {
                  $scope.$eval(toProperty + '= "' + finalValue + '"');
                }
              }
              first = false;
            };

            $scope.$watch(fromExpression, assignValue);
            var value = $scope.$eval(fromExpression);
            if (value !== undefined) {
              //DT-12266 Do not assign undefined on startup which may overwrite widget default properties
              assignValue(value, undefined);
            }
          }
        };

        /**
         * Emits an event on the current scope
         * @param {string} name the name of the event to emit (e.g. 'click', 'change', 'pressed')
         * @param {?} data optional data (e.g. object, string, undefined)
         */
        $scope.fireEvent = function (name, data) {
          $scope.$emit(name, data);
        };

        const isElWithTwxNativeEvents = $element[0].querySelector('[twx-native-events]');
        // Handle widgets that opted into automagic event listeners via the twx-native-events tag
        if (isElWithTwxNativeEvents) {
          var alreadyAttachedListener = {};
          var attachListener = function (name) {
            if (!alreadyAttachedListener[name]) {
              // ensure we listen on intended dom el in case widget contains N dom elements which may fire event of same name (e.g. click)
              var el =
                $element[0].querySelector('[twx-native-events~="' + name + '"]') ||
                $element[0].querySelector('[twx-native-events=""]');
              // do not setup a listener if no el found, its possible not all events opted into the automagic
              if (el) {
                el.addEventListener(name, function (event) {
                  // for now avoid exposing unintentional values as 'data', for example left click MouseEvent has detail=1
                  var data = event instanceof CustomEvent ? event.detail : undefined;
                  $scope.fireEvent(name, data);
                });
              }
              alreadyAttachedListener[name] = true;
            }
          };

          var attachListenerToElement = function () {
            // If widget's event has javascript, fireEvent so javascript gets called
            // MS Edge does not yet support query selector like scope: >, so using a widget-id selector and broader search instead
            var idSelector = widgetId || $element[0].getAttribute('widget-id');
            var widgetSelector = '[widget-id="' + idSelector + '"] ';
            var eventEls = document.querySelectorAll(widgetSelector + ' > twx-widget-event[name]');
            _.forEach(eventEls, function (eventEl) {
              attachListener(eventEl.getAttribute('name'));
            });
            // If widget's event is bound to a service, fireEvent so service is triggered
            var eventbindEls = document.querySelectorAll(widgetSelector + ' > twx-eventbind[source-event]');
            _.forEach(eventbindEls, function (eventbindEl) {
              attachListener(eventbindEl.getAttribute('source-event'));
            });
          };

          // DT-18461 - controller starts attaching listeners before ion-modal-view is shown
          // therefore we have to inform controller that ion-modal-view is shown and invoke
          // attaching listeners method.
          // To avoid adding this listeners for every view, we check modalIsActive.
          if ($scope.modalIsActive) {
            $scope.$on('show-modal', () => {
              if (isElWithTwxNativeEvents) {
                attachListenerToElement();
              }
            });
          } else {
            attachListenerToElement();
          }
        }

        this.init($element);
      },
    };
  });

  /**
   * Apply filters to new value when bound data changes.
   */
  app.service('filterService', function ($filter) {
    var filtersCache = [];
    /**
     * Gets filters for the given element and store them in a cache for later use
     * @param element a databind element
     */
    function getFilters(element) {
      var id = element.attr('databind-id');
      var filters = filtersCache[id];
      if (!filters) {
        filters = [];
        var filterEls = element.children('twx-data-filter');
        angular.forEach(filterEls, function (el) {
          filters.push(new Function('value', '$filter', el.attributes['filter-body'].value));
        });
        filtersCache[id] = filters;
      }
      return filters;
    }
    return {
      /**
       * @param newValue
       * @param element a twx-databind element
       * @returns resulting value after sending given newValue through all filters on given data binding,
       *          or newValue itself if there are no filters
       */
      filterValue: function (newValue, element) {
        var filteredValue = newValue;
        var filters = getFilters(element);
        filters.forEach(function (filter) {
          filteredValue = filter.call({}, filteredValue, $filter);
        });
        return filteredValue;
      },
    };
  });

  app.directive('twxRepeaterContent', function () {
    return {
      require: '^twxWidget',

      link: function ($scope, elem, attrs, widgetCtrl) {
        //console.log('twxRepeaterContent - in link');
      },
      controller: [
        '$scope',
        '$element',
        '$attrs',
        function ($scope, $element, $attrs) {
          this.item = $scope['item'];
        },
      ],
    };
  });

  app.directive('twxEventbind', function () {
    return {
      link: function ($scope, elem, attrs, controller) {
        controller.addEventBinding(attrs, elem);
      },
      controller: function ($scope, $element, $attrs, $rootScope) {
        this.addEventBinding = function (attrs, eventBindingElem) {
          var eventName = attrs.sourceEvent;
          var handlerPath = attrs.handlerPath;

          /**
           * @param {jQueryEl} eventBindingElem the twx-eventbind element
           * @param {?} currentData an object from twxEventEmitted event, or might be string, boolean, number, etc. from other events
           *                          currently, data that is not an object is irrelevant to downstream listeners so is discarded
           * @returns {object} relevent event data to broadcast with the event
           */
          function addEventData(eventBindingElem, currentData) {
            var data = currentData && typeof currentData === 'object' ? _.cloneDeep(currentData) : {};
            _.each(eventBindingElem.find('twx-event-data'), function (dataEl) {
              dataEl = angular.element(dataEl);
              // twx-event-data attributes on the element in <view>.json are "data-name" but the event bindings in Data.json are just plain "name"
              data[dataEl.attr('data-name') || dataEl.attr('name')] = twx.app.convertStringPropertyToBasetype(
                dataEl.attr('data-value') || dataEl.attr('value'),
                dataEl.attr('base-type')
              );
            });
            return data;
          }

          var eventSourceType = attrs.sourceType;
          if (eventSourceType === 'event') {
            // it's a TWX entity event or an App event

            // add an event listener to the twx-eventbind element itself, this will get fired when the twx event or app event occurs
            angular.element(eventBindingElem).on('twxEventEmitted', function (event) {
              $rootScope.$broadcast(handlerPath, addEventData(eventBindingElem, event.detail));
            });
          } else {
            // otherwise, it must be a widget or service event, add a listener to the element that the twx-eventbinding is defined on
            $scope.$on(eventName, function (event, data) {
              twx.app.fn._handleEventPropagation(event, eventName);
              $rootScope.$broadcast(handlerPath, addEventData(eventBindingElem, data));
            });
          }
        };
      },
    };
  });

  /**
   * Applies the state format CSS classes to the element that this directive is applied to.
   */
  app.directive('twxStateFormat', function () {
    return {
      restrict: 'A',
      controllerAs: 'ctrl',
      bindToController: true,
      link: function ($scope, elem, attrs) {},
      controller: function ($scope, $element, $attrs, DataConnector) {
        var ctrl = this;

        $attrs.$observe('stateFormatValue', function (newValue, oldValue) {
          if (newValue && $attrs.twxStateFormat) {
            if (ctrl._stateFormatUnregister) {
              ctrl._stateFormatUnregister();
            }
            ctrl._stateFormatUnregister = $scope.$watch(newValue, function (val) {
              twx.app.fn.applyStateFormat($element, val, $attrs.twxStateFormat, DataConnector);
            });
          }
        });
      },
    };
  });

  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i,
        el = this;
      do {
        i = matches.length;
        // eslint-disable-next-line no-empty
        while (--i >= 0 && matches.item(i) !== el) {}
      } while (i < 0 && (el = el.parentElement));
      return el;
    };
  }

  app.directive('twxWidgetContent', function () {
    return {
      require: '^twxWidget',
      scope: true,
      link: function ($scope, elem, attrs, widgetCtrl) {
        var closestRepeaterElem = elem[0].closest('twx-repeater-content');
        if (closestRepeaterElem) {
          closestRepeaterElem = angular.element(closestRepeaterElem);
          var repeaterCtrl = closestRepeaterElem.controller('twxRepeaterContent');
          if (repeaterCtrl !== undefined) {
            var item = repeaterCtrl.item;
            $scope['item'] = item;
          }
        }

        if (attrs['twxInline'] !== undefined) {
          elem[0].childNodes[0].style.display = 'inline-block';
          elem[0].childNodes[0].style.float = 'left';
        }

        if (attrs['twxFloat'] !== undefined) {
          elem[0].childNodes[0].style.float = attrs['twxFloat'];
        }
        if (attrs['twxDisplay'] !== undefined) {
          elem[0].childNodes[0].style.display = attrs['twxDisplay'];
        }
        if (attrs['twxMinHeight'] !== undefined) {
          elem[0].childNodes[0].style.minHeight = attrs['twxMinHeight'];
        }
        if (attrs['twxMaxHeight'] !== undefined) {
          elem[0].childNodes[0].style.maxHeight = attrs['twxMaxHeight'];
        }
        if (attrs['twxMinWidth'] !== undefined) {
          elem[0].childNodes[0].style.minWidth = attrs['twxMinWidth'];
        }
        if (attrs['twxBorderStyle'] !== undefined) {
          elem[0].childNodes[0].style.borderStyle = attrs['twxBorderStyle'];
        }
        if (attrs['twxBorderWidth'] !== undefined) {
          elem[0].childNodes[0].style.borderWidth = attrs['twxBorderWidth'];
        }
        if (attrs['twxMarginRight'] !== undefined) {
          elem[0].childNodes[0].style.marginRight = attrs['twxMarginRight'];
        }
        if (attrs['twxMarginBottom'] !== undefined) {
          elem[0].childNodes[0].style.marginBottom = attrs['twxMarginBottom'];
        }
      },
      template: function (elem, attrs) {
        return elem.html();
      },
    };
  });

  app.directive('twxWidgetProperty', function () {
    return {
      require: '^twxWidget',
      compile: function compile(tElem, tAttrs, transclude) {
        return {
          pre: function preLink(scope, elem, attrs, widgetCtrl) {
            var value = attrs.value;
            if (attrs.datatype === 'boolean' && typeof value === 'string') {
              value = value === 'true';
            } else if (attrs.datatype === 'integer' && typeof value === 'string') {
              value = parseInt(value, 10);
            } else if (attrs.datatype === 'number' && typeof value === 'string') {
              value = parseFloat(value);
            }
            widgetCtrl.addProperty(attrs.name, value, attrs.twxBound, attrs.valueExpression, elem, attrs.datatype);
          },
          post: function postLink(scope, iElement, iAttrs, controller) {},
        };
      },

      controller: ['$scope', '$attrs', function ($scope, $attrs) {}],
    };
  });

  app.directive('twxWidgetService', function () {
    return {
      require: '^twxWidget',
      link: function ($scope, elem, attrs, widgetCtrl) {
        widgetCtrl.addService(attrs.name, elem);
      },
      controller: ['$scope', '$attrs', function ($scope, $attrs) {}],
    };
  });

  app.directive('twxWidgetEvent', function () {
    return {
      require: '^twxWidget',
      link: function ($scope, elem, attrs, widgetCtrl) {
        /**
         * @param {string} expression the JS defined for a widget's event
         */
        var createEventHandler = function ($scope, expression) {
          /**
           * Handles evaluating JS for widget's event such as click, change, pressed etc.
           * @param {event} event angular event that was emitted on widget scope
           *                      see https://docs.angularjs.org/api/ng/type/$rootScope.Scope#$on
           * @param {?} data optional data (e.g. object, string, undefined)
           */
          return function (event, data) {
            twx.app.fn._handleEventPropagation(event, attrs.name);
            // angular event has been on scope for ages, not clear if anyone relies on it
            // unlike data which is only available inside the expression,
            // event on scope also makes it available as this.event inside funcs called from the expression
            $scope.event = event;
            try {
              $scope.$eval(expression, { data: data });
              if (!$scope.$$phase) {
                $scope.$applyAsync();
              }
            } catch (e) {
              console.error('Error evaluating', $scope.widgetId, event.name, 'JS:', expression);
              throw e;
            } finally {
              delete $scope.event;
            }
          };
        };
        // Bind to the twx-widget's scope so that fireEvent emitting from a child of twx-widget.
        $scope.$on(attrs.name, createEventHandler($scope, attrs.value));
      },
      controller: ['$scope', '$attrs', function ($scope, $attrs) {}],
    };
  });

  var STYLE_CACHE = {};
  var STATE_DEF_CACHE = {};

  /**
   * Adds a style block to the head
   * @param id
   * @param css  content of the new block
   */
  function addStyleToHead(id, css, element) {
    var head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');

    style.type = 'text/css';
    style.id = id;
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
  }

  /**
   *
   * @param classname - css class name to create
   * @param styleDef - Object with all defined style options from twx
   * @returns {string} - CSS block of variable to define
   */
  function createCSSFromStyleDefinition(classname, styleDef, element) {
    var css = '.' + classname + ' {\n';

    if (!styleDef.lineColor) {
      var lineProperties = ['lineStyle', 'lineColor', 'lineThickness'];
      _.each(lineProperties, function (prop) {
        _.unset(styleDef, prop);
      });
    }

    Object.keys(styleDef).forEach(function (key) {
      var val = styleDef[key];
      if (key === 'image' && val) {
        element.addClass('hasImage');
      }
      if (key === 'secondaryBackgroundColor') {
        css += '  --' + key + 'NoDefault: ' + val + ';\n';
        if (!val) {
          val = styleDef.backgroundColor;
        }
      }
      if (val !== undefined && val !== '' && !key.startsWith('_')) {
        if (key === 'fontEmphasisBold') {
          val = val ? 'bold' : 'normal';
        } else if (key === 'fontEmphasisUnderline') {
          val = val ? 'underline' : 'none';
        } else if (key === 'fontEmphasisItalic') {
          val = val ? 'italic' : 'normal';
        } else if (key === 'lineThickness') {
          val = val + 'px';
        } else if (key === 'image') {
          val = 'url(' + location.origin + '/Thingworx/MediaEntities/' + encodeURI(val) + ')';
        } else if (key === 'textSize') {
          switch (val) {
            case 'xsmall':
              val = '9px';
              break;
            case 'small':
              val = '10px';
              break;
            case 'normal':
              val = '11px';
              break;
            case 'large':
              val = '12px';
              break;
            case 'xl':
              val = '14px';
              break;
            case 'xxl':
              val = '16px';
              break;
            case '2xl':
              val = '18px';
              break;
            default:
            // val = val;
          }
        }
        css += '  --' + key + ': ' + val + ';\n';
      }
    });
    css += '}';
    return css;
  }

  /**
   *
   * @param styleDef - Object with all defined style options from twx
   * @param element - dom el to add the class
   */
  function _addImageClass(styleDef, element) {
    Object.keys(styleDef).forEach(function (key) {
      var val = styleDef[key];
      if (key === 'image' && val) {
        element.addClass('hasImage');
      }
    });
  }

  /**
   * Removes bad chars from the passed String,
   *   removes leading numbers, replace other chars with -
   */
  function cleanClassName(name) {
    if (name) {
      //remove bad chars, prepend N if there is a leading number
      return name.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^(\d)/, 'N$1');
    }
  }

  function _addStateStyles(name, styles, resolve, reject, element) {
    var classname = cleanClassName(name);
    var css = createCSSFromStyleDefinition(classname, styles, element);

    if (!document.querySelector('style#' + classname)) {
      twx.app.fn.addStyleToHead(classname, css, element);
    }
    resolve(styles);
  }

  /**
   * Will download the style defined by the state and create a new style tag in the head if necessary
   * @param element - DOM el of the binding
   * @param stateDef - Object that has the twx meta data about the state definition to apply
   * @param $http
   */
  function createStateStyles(element, stateDef, DataConnector) {
    var existingClass;
    var name = stateDef.defaultStyleDefinition;
    var styleDef;

    if (typeof name === 'object') {
      styleDef = name;
      if (!styleDef._customCSSName) {
        styleDef._customCSSName = 'custom-styles-' + Date.now() + '-' + styleCount++;
      }
      name = styleDef._customCSSName;
      if (!STYLE_CACHE[name]) {
        STYLE_CACHE[name] = new Promise(function (resolve, reject) {
          _addStateStyles(name, styleDef, resolve, reject, element);
        });
      } else {
        _addImageClass(styleDef, element);
        element[0].dispatchEvent(new CustomEvent('styleReady'));
      }
    } else if (!name) {
      //No new style found, remove old styles
      existingClass = element.data('stateFormatClass');
      if (existingClass) {
        element.removeClass(existingClass);
        element[0].dispatchEvent(new CustomEvent('styleReady'));
      }
      return;
    } else if (typeof name === 'string') {
      if (!STYLE_CACHE[name]) {
        STYLE_CACHE[name] = new Promise(function (resolve, reject) {
          DataConnector.executeService('ThingworxConnector', {
            entityType: 'StyleDefinitions',
            entity: name,
            method: 'GET',
            requestType: 'json',
          }).then(
            function successCallback(data) {
              _addStateStyles(name, data.content, resolve, reject, element);
              element[0].dispatchEvent(new CustomEvent('styleReady'));
            },
            function errorCallback(response) {
              reject();
              console.error('could not get the styles', response);
            }
          );
        });
      } else {
        STYLE_CACHE[name].then(function (styles) {
          _addImageClass(styles, element);
          element[0].dispatchEvent(new CustomEvent('styleReady'));
        });
      }
    }
    // ADD class name immediately
    var classname = cleanClassName(name);
    var stateDefName = '';
    if (stateDef.name) {
      stateDefName = cleanClassName(stateDef.name);
    }
    existingClass = element.data('stateFormatClass');
    if (existingClass) {
      element.removeClass(existingClass);
      element.removeClass('hasImage');
    }
    if (styleDef) {
      _addImageClass(styleDef, element);
    }
    var newClasses = 'has-statedef-styles ' + classname + ' ' + stateDefName;
    element.addClass(newClasses);
    element.data('stateFormatClass', newClasses);
    element[0].dispatchEvent(new CustomEvent('styleReady'));

    return STYLE_CACHE[name];
  }

  /**
   * Downloads the state definition from twx
   * @param name - Name of the stateDefinition in twx
   * @param $http
   * @returns {*}
   */
  function getStateDefinition(name, DataConnector) {
    if (!STATE_DEF_CACHE[name]) {
      STATE_DEF_CACHE[name] = new Promise(function (resolve, reject) {
        DataConnector.executeService('ThingworxConnector', {
          entityType: 'StateDefinitions',
          entity: name,
          method: 'GET',
          requestType: 'json',
        }).then(
          function successCallback(data) {
            resolve(data);
            //console.log('statedefs', response.data);
          },
          function errorCallback(response) {
            console.error('Could not download the state definitions for ', name, response);
            reject();
          }
        );
      });
    }
    return STATE_DEF_CACHE[name];
  }

  /**
   * Returns the selected stateDefinition entity is selected based on the value and rules
   * @param stateDefEntity - Object from thingworx with all the state definitions and metadata
   * @param value - String or Number that will be used to evaluate against the rules
   * @returns {*}
   */
  function getSelectedStateStyle(stateDefEntity, value) {
    if (stateDefEntity && stateDefEntity.content && !(value === undefined || value === null)) {
      var stateDefs = stateDefEntity.content.stateDefinitions;
      var i,
        val,
        l = stateDefs.length;
      if (stateDefEntity.content.stateType === 'string') {
        // value could be boolean, number, object, etc. - convert the value so we can compare to the state value
        val = typeof value !== 'string' ? value.toString() : value;
        for (i = 0; i < l; i++) {
          if (stateDefs[i].defaultValue === val || i === l - 1) {
            //Last one is default setting
            return stateDefs[i];
          }
        }
      }
      if (stateDefEntity.content.stateType === 'numeric') {
        val = typeof value !== 'number' ? Number(value) : value;
        var startingIndex = isNaN(val) ? l - 1 : 0; // if the value is not a number, return the last one (the default)
        for (i = startingIndex; i < l; i++) {
          if (
            i === l - 1 ||
            val < stateDefs[i].defaultValue ||
            (val === stateDefs[i].defaultValue && stateDefs[i].comparator === '<=')
          ) {
            //Last one is default setting
            return stateDefs[i];
          }
        }
      }
    }
    return '';
  }

  /**
   * Find the stateDefinition that matches the value and add the style if needed
   * @param element - DOM element with state-format properties
   * @param finalValue - Value (String or Number) to use in evaluation
   * @param DataConnector
   */
  function applyStateFormat(element, finalValue, stateDefName, DataConnector) {
    //console.log("twx-state-format", finalValue);
    getStateDefinition(stateDefName, DataConnector).then(function (stateDefs) {
      var selectedStateStyle = getSelectedStateStyle(stateDefs, finalValue);
      if (selectedStateStyle) {
        createStateStyles(element, selectedStateStyle, DataConnector);
      }
    });
  }

  /**
   * Loads a JS file into the page.
   * @param {string} jsPath - Path to the Javascript file to include, relative paths should be relative to the project's root dir
   */
  function loadScript(jsPath) {
    if (jsPath) {
      var head = document.head || document.getElementsByTagName('head')[0],
        script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = jsPath;
      head.appendChild(script);
    }
  }

  /**
   * Loads a JS file that was uploaded as a resource in the project.
   * @param {string} resourcePath - Relative path, from app/resources, to the Javascript file to include, i.e. 'Uploaded/my-custom-file.js'
   */
  function loadResourceScript(resourcePath) {
    loadScript('app/resources/' + resourcePath);
  }

  twx.app.fn._setStyleCount = function (n) {
    styleCount = n;
  };
  twx.app.fn.applyStateFormat = applyStateFormat;
  twx.app.fn.getSelectedStateStyle = getSelectedStateStyle;
  twx.app.fn.cleanClassName = cleanClassName;
  twx.app.fn.createCSSFromStyleDefinition = createCSSFromStyleDefinition;
  twx.app.fn.createStateStyles = createStateStyles;
  twx.app.fn.addStyleToHead = addStyleToHead;
  twx.app.fn.getParameterByName = getParameterByName;
  twx.app.fn.loadResourceScript = loadResourceScript;

  // dynamically build textattrs attribute from it's component parts that can be changed live
  twx.app.fn.buildTextAttrs = function (textx, texty, font, fontsize, textattrs) {
    var result = textattrs;
    if (textx) {
      result = 'x:' + textx + ';' + result;
    }

    if (texty) {
      result = 'y:' + texty + ';' + result;
    }

    if (font && fontsize) {
      result = 'font:' + fontsize + ' ' + font + ';' + result;
    }
    return result;
  };

  // dynamically build imageattrs attribute from it's component parts that can be changed live
  twx.app.fn.buildImageAttrs = function (imagex, imagey, imageattrs) {
    var result = imageattrs;

    if (imagex) {
      result = 'x:' + imagex + ';' + result;
    }

    if (imagey) {
      result = 'y:' + imagey + ';' + result;
    }
    return result;
  };

  twx.app.fn.isTrue = function (value) {
    if (typeof value === 'string' && value.toLowerCase() === 'false') {
      return false;
    }
    return !!value;
  };

  /**
   * Removes ; if it's present from a css rgb color definition, such as 'rgb(155, 255, 0);'.
   * @param {String} color
   */
  twx.app.fn.sanitizeRgbColor = (color = '') => {
    return color.endsWith(';') ? color.slice(0, -1) : color;
  };

  twx.app.fn.navigate = function (target) {
    if (window.location.hash.indexOf('#/tab/') >= 0) {
      window.location.hash = '#/tab/' + target;
    } else {
      window.location.hash = '#/' + target;
    }
  };

  /**
   * Returns the location.href to the scan mode app. The url should be white-listed
   * by the view app, no need for window.inf.allowNavigation
   */
  twx.app.fn.navigateToScanMode = function () {
    location.href = 'thingworxview://ptc.com/command/open-scan-mode';
  };

  /**
   * Triggers a twx service.
   * For example, fires event 'app.mdl.Car1.svc.GetPropertyValues' to trigger Car1 model's GetPropertyValues service.
   * The model and service are assumed to be external data available in the experience.
   *
   * @param {string} modelId such as 'Car1'
   * @param {string} serviceName such as 'GetPropertyValues'
   * @param {object} data optional data expected by the service
   */
  twx.app.fn.triggerDataService = function (modelId, serviceName, data) {
    twx.app.fn.triggerAppEvent('app.mdl.' + modelId + '.svc.' + serviceName, data);
  };

  /**
   * Triggers a widget's service.
   * For example, fires event 'app.view["Home"].wdg["audio-1"].svc.play' to trigger audio widget's play service.
   *
   * @param {string} widgetId such as 'audio-1', assumed to be in the currently active view
   * @param {string} serviceName such as 'play'
   */
  twx.app.fn.triggerWidgetService = function (widgetId, serviceName) {
    var viewName = document.querySelector('[twx-view]').getAttribute('twx-view');
    var target = document.querySelector('[widget-id="' + widgetId + '"]');
    twx.app.fn._triggerStudioEvent(target, 'app.view["' + viewName + '"].wdg["' + widgetId + '"].svc.' + serviceName);
  };

  /**
   * Fires a widget's event so any Studio bindings are triggered.
   * Use in widget definition runtime template for custom events e.g. <div onclick="twx.app.fn.triggerStudioEvent(event, 'pressed')">
   * Use in custom js to fire event (e.g. twx.app.fn.triggerStudioEvent(document.querySelector('[widget-id="model-1"]', 'click')
   *
   * NOTE: There is a caveat when using this API from custom js,
   * since this API does not dispatch any browser event it may result in unexpected state in the widget.
   * For example, toggle button widget manages pressed/notpressed properties on itself when clicked by the user, but is not
   * able to manage those pressed/notpressed properties if this API is used. This API would only trigger bindings of the click event.
   *
   * @param {DOMElement|Event} target - the target dom element used to lookup the scope to trigger the event on,
   *                                    or a browser event whose target should be used for the scope lookup
   * @param {string} eventName name of the event
   * @param {?} data optional data to pass along on event could be anything (string, object, boolean),
   *                  For customizations, best practice would be to avoid sending data via this API,
   *                  instead use combination of CustomEvent and twx-native-events with data passed as detail on CustomEvent
   * @see twx.app.fn.triggerWidgetService to trigger widget service
   */
  twx.app.fn.triggerStudioEvent = function (target, eventName) {
    twx.app.fn._triggerStudioEvent.apply(this, arguments);
  };

  /**
   * Fire's a widget's event.
   *
   * @param {DOMElement|Event} target - the target dom element used to lookup the scope to trigger the event on,
   *                                    or a browser event whose target should be used for the scope lookup
   * @param {string} eventName name of the event
   * @param {?} data optional data to pass along on event could be anything (string, object, boolean),
   *                  For customizations, best practice would be to avoid sending data via this API,
   *                  instead use combination of CustomEvent and twx-native-events with data passed as detail on CustomEvent
   * @param {string} expr an optional expression to evaluate in widget scope.
   *                  For customizations, best practice would be to avoid using expressions, it may be difficult to ensure they
   *                  constinue to work as intended if we move off angular framework.
   * @internal
   */
  twx.app.fn._triggerStudioEvent = function (target, eventName, data, expr) {
    target = target instanceof Event ? target.target : target;
    var $scope = twx.app.getScope(target);
    $scope.fireEvent(eventName, data);
    if (expr) {
      $scope.$eval(expr);
    }
    $scope.$applyAsync();
  };

  /**
   * Emits the notification which will trigger the services/expressions bound to the given app event name
   * @param eventName The name of the app event to emit
   * @param data [optional] JSON object that will be passed along on the message to the services/expression handlers
   */
  twx.app.fn.triggerAppEvent = function (eventName, data) {
    var $scope = twx.app.getScope(document.querySelector('twx-widget[original-widget="twx-view"]'));
    if ($scope) {
      var $rootScope = $scope.$root;
      $rootScope.$broadcast(eventName, data);
      if (!$rootScope.$$phase) {
        $rootScope.$applyAsync();
      }
    }
  };

  var selectedRowsName = 'selectedRows';
  var currentName = 'current';

  twx.app.fn._setCurrentAndNavigate = function (items, selectedItem, target) {
    items[currentName] = selectedItem;
    angular.forEach(items, function (item) {
      item._isSelected = false;
    });
    selectedItem._isSelected = true;

    twx.app.fn.navigate(target);
  };

  function updateCurrentAndSelectedRowsAfterUnselectInMultiSelect(list) {
    if (list === undefined) {
      console.log('clickItemInRepeater not passing in list');
      return;
    }
    var current;
    var selectedRows = [];

    for (var i = 0; i < list.length; i++) {
      if (list[i]._isSelected === true) {
        if (current === undefined) {
          current = list[i];
        }
        selectedRows.push(list[i]);
      }
    }

    list[currentName] = current;
    list[selectedRowsName] = selectedRows;
  }

  twx.app.fn.clickItemInRepeater = function (item, list, isMultiSelect) {
    // clean up if anything wrong with list
    if (list) {
      if (list[selectedRowsName] === undefined) {
        list[selectedRowsName] = [];
      }
    }

    if (isMultiSelect === true || isMultiSelect === 'true') {
      // multi-select
      if (item) {
        if (item._isSelected) {
          item._isSelected = false;
        } else {
          item._isSelected = true;
        }
      } else {
        console.log('clickItemInRepeater not passing in item');
      }
      updateCurrentAndSelectedRowsAfterUnselectInMultiSelect(list);
    } else {
      // single-select
      if (item) {
        // don't bother if it's already selected
        if (item._isSelected === undefined || !item._isSelected) {
          // clear old selected item
          if (list[currentName]) {
            list[currentName]._isSelected = false;
          }

          item._isSelected = true;
          list[currentName] = item;
          list[selectedRowsName] = [];
          list[selectedRowsName].push(item);
        } else {
          //Toggle off
          item._isSelected = false;
          if (list[currentName]) {
            list[currentName] = null;
            list[selectedRowsName] = [];
          }
        }
      } else {
        console.log('clickItemInRepeater not passing in item');
      }
    }
  };

  twx.app.fn.clickItemInSelect = function (list, isMultiSelect, value, valueField) {
    var item;
    _.each(list, function (listItem) {
      if (listItem[valueField] === value) {
        item = listItem;
      }
    });

    return twx.app.fn.clickItemInRepeater(item, list, isMultiSelect);
  };

  twx.app.fn.isItemSelected = function (item) {
    return item._isSelected;
  };

  // displays the next message in the stack, it will automatically hide the snackbar after 4 seconds
  function showSnackbar() {
    var snackbar = document.querySelector('#snackbar');
    if (snackbar && !angular.element(snackbar).hasClass('hide')) {
      // currently showing a message in the snackbar, try again later to get the next message
      setTimeout(showSnackbar, 200);
    } else {
      var nextMessage = snackbarMessages.shift();
      if (nextMessage) {
        if (!snackbar) {
          // create the snackbar DOM on the fly if doesn't already exist
          var html = '<div id="snackbar" class="hide">' + '  <span class="content"></span>' + '</div>';
          angular.element(document.querySelector('ion-view')).append(html);
          snackbar = document.querySelector('#snackbar');
        }

        // update the message in the snackbar
        var content = angular.element(document.querySelector('#snackbar .content'));
        content.text(nextMessage.text);

        // show/hide the icon if the message contains an icon or not
        var classesToRemove = _.filter(content.attr('class').split(' '), function (className) {
          return className !== 'content'; // remove all previous classes except 'content', we want to preserve that one
        });
        content.removeClass(classesToRemove.join(' '));
        if (nextMessage.iconClassname) {
          content.addClass('icon ' + nextMessage.iconClassname);
        }

        angular.element(snackbar).removeClass('hide');

        setTimeout(hideSnackbar, 4000);
      }
    }
  }

  // hides the snackbar, it will call showSnackbar to display the next message in the stack (if any)
  function hideSnackbar() {
    var snackbar = document.querySelector('#snackbar');
    if (snackbar) {
      angular.element(snackbar).addClass('hide');
      setTimeout(showSnackbar, 10);
    }
  }

  /**
   * Displays the given message in a snack bar (bar at the bottom of the view that will appear for 4 seconds then fade away)
   * @param message The message to display
   * @param iconClassname [optional] CSS classname that will be added message, it will be used to add an image to the message
   */
  twx.app.fn.addSnackbarMessage = function (message, iconClassname) {
    if (message) {
      snackbarMessages.push({ text: message, iconClassname: iconClassname });
      showSnackbar();
    }
  };

  twx.app.view = {};

  document.addEventListener('userpick', function (e) {
    var threedview = e.target.closest('twx-dt-view');
    if (threedview) {
      var widget = e.target.closest('twx-widget');
      if (widget) {
        window.twx.app.fn.triggerStudioEvent(widget, 'click', { originalEvent: e });
      }
    }
  });

  twx.app.fn._propertyChangedListener = function (e) {
    var widget = angular.element(e.target.closest('twx-widget'));
    if (widget && widget.data && widget.data('scope')) {
      var eventData = e ? e.detail || {} : {}; //make sure non-null for code below
      var s = widget.data('scope');
      s[s._widgetId][eventData.name] = eventData.value;
      s.$applyAsync();
      //console.log('webcomponent properyChanged', eventData);
    }
  };
  //Bridge web component property change to angular scope widget properties to help with bindings
  document.addEventListener('propertyChanged', twx.app.fn._propertyChangedListener);

  /**
   * Stop the event if the event is one that can be on parent Widgets (currently only click)
   *  In the future, if more events need to be stopped, consider adding event metadata to the widget files
   *  to declare which ones should be stopped.
   * @param {Object} event
   * @param {String} name
   */
  twx.app.fn._handleEventPropagation = function (event, name) {
    // Stop bubbling because we don't want the same event to be handled twice on different widgets. This is separate from HTML events.
    if (event.stopPropagation && name === 'click') {
      event.stopPropagation();
    }
  };

  /**
   * Adds a metatag to the head to define the offline url that will successfully target this loaded experience
   * with vumark and thing params removed.
   * @param {Object window.location} loc
   * @param {DOMElement} el element parent of the new meta tag (expect document.head)
   */
  twx.app.fn.appendOfflineUrlMetaTag = function (loc, el) {
    /**
     * Removes the substituted params (vumark, thing, and template) from the given URL
     * @param {string} url - URL to parse the params from
     */
    function getParams(url) {
      var params;
      if (url && url.indexOf('?') > -1) {
        params = new URLSearchParams(url.substring(url.indexOf('?')));
        params.delete('vumark');
        params.delete('thing');
        params.delete('template');
      } else {
        // no query string on the url
        params = new URLSearchParams();
      }
      return params;
    }

    if (loc && el) {
      var urlbasePath = '/index.html';
      var offlineURL = loc.href;
      var params;

      //Using the full url when its not expected may not be perfect, but unknown what else to do as of yet.
      if (offlineURL && offlineURL.indexOf(urlbasePath)) {
        offlineURL = offlineURL.substring(offlineURL.indexOf(urlbasePath) + 1);
      }

      if (loc.hash) {
        // remove vumark, thing, template from hash paramaters
        params = getParams(loc.hash);
        if (offlineURL.indexOf('#/') > -1) {
          //In case of bookmarks, remove default view name and hash params
          offlineURL = offlineURL.substring(0, offlineURL.indexOf('#/'));
        } else {
          offlineURL = offlineURL.substring(0, offlineURL.lastIndexOf('?'));
        }

        if (params.toString()) {
          // add parameters from hash params after removing vumark, thing and template to offlineURL
          offlineURL += '&' + params.toString();
        }
      }

      if (offlineURL) {
        // remove vumark, thing, template from url paramater
        params = getParams(offlineURL);
        if (offlineURL.indexOf('?') > -1) {
          //  Remove the parameters from url
          offlineURL = offlineURL.substring(0, offlineURL.indexOf('?'));
          // add parameters again after removing vumark, thing and template
          offlineURL += '?' + params.toString();
        }
      }

      if (offlineURL) {
        var offlineMetaTag = document.createElement('meta');
        offlineMetaTag.name = 'ptc-thingx-entry-point';
        offlineMetaTag.content = offlineURL;
        el.appendChild(offlineMetaTag);
      }
    }
  };

  twx.app.fn.appendOfflineUrlMetaTag(location, document.head);

  /**
   * Forwards the application to the initial view by setting the location.hash if the url has the Experience ID set.
   * The viewName should not be located in the hash this case, but other params should be preserved.
   * Setting location.hash as page loads could potentially crash View on Windows devices. See issue DT-16762.
   * @param exps {Object[]} List of configured experiences
   * @param loc {Object} window.location reference
   */
  twx.app.fn.handleVanityURL = function (exps, loc) {
    if (exps && loc) {
      var params = new URLSearchParams(loc.search);
      var hashViewRE = /#\/\w+\??/; //Match #/Home  but not #/?thing=1
      if (params.has('expId') && !hashViewRE.test(loc.hash)) {
        var startExp = exps.findExperienceById(parseFloat(params.get('expId')));
        if (startExp) {
          var originalHash = loc.hash;
          var newHash = '#/' + startExp.viewName;
          if (originalHash) {
            // handles originalHash like #/?thing=%7B%7Bthingworx:thing%7D%7D&vumark=4%3A3
            var orig =
              originalHash.indexOf('?') > -1
                ? originalHash.substring(originalHash.indexOf('?'), originalHash.length)
                : '';
            newHash += orig;
          }
          loc.hash = newHash;
        }
      }
    }
  };

  /**
   * @param {[string]} trackedObjects array of target strings such as ['5:1', '5:2']
   * @param {jQueryObject} targets - all twx-dt-target dom elements from the experience
   * @returns {Boolean} true if any of the tracked objects match a target within the experience,
   * otherwise false is returned - indicating the tracked objects don't match any of the targets
   * within the experience.
   */
  twx.app.fn.isCompatibleObjectsTracked = function (trackedObjects, targets) {
    if (!trackedObjects || !targets) {
      return false;
    }
    if (trackedObjects.length === 0) {
      return false;
    }
    for (var i = 0, l = targets.length; i < l; i++) {
      var src = targets[i].getAttribute('src');
      if (!src) {
        console.log('No src found on target ', targets[i]);
        continue;
      }
      if (src.startsWith('vuforia-')) {
        var targetName = twx.app.fn.getParameterByName('id', src);
        if (targetName === '' || trackedObjects.indexOf(targetName) >= 0) {
          return true;
        }
      }
    }
    return false;
  };

  /**
   * Determines if the target guide image should be displayed
   * @param trackedObjects [Elements]
   * @param targets [Elements]
   * @param modelLoadedCount {Number} current number of loaded models
   * @param modelCount {Number} current number of expected models to display
   * @returns {Boolean} true if the target guide should be hidden
   */
  twx.app.fn.computeHideTargetGuide = function (trackedObjects, targets, modelLoadedCount, modelCount) {
    // don't show the target guide while the "model loading" spinner is displayed
    var hideTargetGuide = modelLoadedCount < modelCount;

    if (!hideTargetGuide) {
      // all the models have been loaded so now verify at least one of the tracked objects is valid
      // within the experience, if so hide the target guide, if not show the target guide
      hideTargetGuide = twx.app.fn.isCompatibleObjectsTracked(trackedObjects, targets);
    }

    return hideTargetGuide;
  };

  /**
   * List of experience configuration allows for getting the configured title, initial view, and description
   *
   * @param {Object} - json configuration of the experiences
   */
  twx.app.ExperienceInfo = function ExperienceInfo(metadata) {
    this.metadata = metadata || { experiences: [] };

    // returns the index of the experience from the metadata.experiences list, returns -1 if it can't find the experience with the given name
    this.findExperienceIndex = function (experienceName) {
      return _.findIndex(this.metadata.experiences || [], function (exp) {
        return exp.viewName === experienceName;
      });
    };

    this.findExperienceById = function (id) {
      return _.find(this.metadata.experiences || [], { id: id });
    };

    this.getTitle = function (exp) {
      var title = '';
      if (exp && exp.title) {
        title = exp.title.en;
      }
      return title;
    };

    // returns the title object for the experience at the given index, if the index is out of range empty string is returned
    this.getTitleByIndex = function (experienceIndex) {
      var title = '';
      if (experienceIndex >= 0 && experienceIndex < this.metadata.experiences.length) {
        title = this.getTitle(this.metadata.experiences[experienceIndex]);
      }
      return title;
    };

    // returns the description object for the experience at the given index, if the index is out of range undefined is returned
    this.getDescription = function (experienceIndex) {
      var description;
      if (experienceIndex >= 0 && experienceIndex < this.metadata.experiences.length) {
        description = this.metadata.experiences[experienceIndex].description;
      }
      return description;
    };
  };

  /**
   * Hides all the 3d widgets, setting the visible to false, and forceHidden to true
   *   Saves original values under initVisible and initForceHidden
   * @returns {Array<WidgetScope>} Array of widgets scope objects
   */
  twx.app.fn.hideAll3DWidgets = function () {
    const all3DElements = document.querySelectorAll('[original-widget="twx-dt-view"] twx-widget');
    var hiddenWidgets = [];

    all3DElements.forEach(function (element) {
      let originalWidget = element.querySelector(element.getAttribute('original-widget'));
      let originalWidgetScope = angular.element(originalWidget).scope();

      if (originalWidgetScope) {
        originalWidgetScope.me.initForceHidden = originalWidgetScope.me.forceHidden || false;
        originalWidgetScope.me.initVisible = originalWidgetScope.me.visible || true;
        originalWidgetScope.me.forceHidden = true;
        originalWidgetScope.me.visible = false;
        originalWidgetScope.$apply();
        hiddenWidgets.push(originalWidgetScope);
      }
    });
    return hiddenWidgets;
  };

  /**
   * unhides all the given 3d widgets, setting the visible & forceHidden to their original values saved  under
   *    initVisible and initForceHidden
   * @param {Array<WidgetScope>} hiddenWidgets - Array of widgets scope objects as returned by the
   *   hideAll3DWidgets function
   */
  twx.app.fn.unhideAll3DWidgets = function (hiddenWidgets) {
    hiddenWidgets.forEach(function (elem) {
      elem.me.forceHidden = elem.me.initForceHidden;
      elem.me.visible = elem.me.initVisible;
      elem.$apply();
    });
  };
})(window, document, angular);
