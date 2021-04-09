(function(angular) {
  'use strict';

  var app = angular.module('com.thingworx.declarative.controller', ['com.thingworx.services']);

  /**
   * This controller is meant for private use by directive tags and not meant to be used directly.
   */
  app.controller('twxConnectorCtrl', function($scope, $rootScope, DataConnector, $timeout, $log, filterService) {

    var dataProvider = 'ThingworxConnector'; // Make this not hard coded later
    // global map used to store the model/services that are configured to auto refresh. As the service is being
    // invoked, an entry is added to the map, the entry is removed when the request has completed or failed.
    // This map is used by HMT/2D Eyewear projects to prevent the help bubbles from being dispalyed for each request to the auto refreshed service
    window.autoRefreshingServices = {};

    this.getDataProvider = function() {
      return dataProvider;
    };
    var controller = this;
    this.addDataBinding = function(fromExpression, toProperty, elementToUpdate, sourceName) {
      if (fromExpression && toProperty) {
        var watchScope = $scope;
        var sourceEl = document.querySelectorAll("[widget-id='" + sourceName + "']");
        if (sourceEl.length === 1) {
          //Use the source element to watch, as it may not be visible from here
          watchScope = twx.app.getScope(sourceEl[0]);
        }

        watchScope.$watch(fromExpression, function(newValue, oldValue) {
          var element = angular.element(elementToUpdate);

          newValue = filterService.filterValue(newValue, element);
          element.attr(toProperty, newValue);

          if (toProperty === 'twx-entity-name') {
            //Only proceed if the new value is not empty, or if the oldValue is not empty
            //Avoiding the case where on preview, no Thing is passed in.
            if (newValue || oldValue) {
              var entity = {
                modelName: element.attr('name'),
                entityName: element.attr('twx-entity-name'),
                entityType: element.attr('twx-entity-type') || 'Things'
              };

              $timeout(function() {
                angular.forEach(element.parent().children(), function(child) {
                  angular.element(child).data('twx-entity', entity);
                });
                $scope.$emit('twx-entity');
              }, 100);
            }
          } else {
            // updating a parameter
            var serviceName = element.attr('id');
            if (!serviceName) {
              serviceName = element.attr('name');
            }
            var entityEl = element.parent();
            var entityName = entityEl.attr('twx-entity-name');
            if (!entityName && !serviceName) {
              serviceName = entityEl.attr('id');
              if (!serviceName) {
                serviceName = entityEl.attr('name');
              }
              entityName = entityEl.parent().attr('twx-entity-name');
            }
            var logicalName = serviceName; //ID is unique

            var svcParams = controller.getServiceParams(logicalName);
            svcParams[toProperty] = newValue;
          }
        });
      }
    };

    this.getServiceParams = function(serviceName, defaultParams) {
      if (!defaultParams) {
        defaultParams = {};
        var service = this.getRegisteredService(serviceName);
        if (service) {
          defaultParams = service.serviceDef.defaultParams;
        }
      }
      if (!$scope[serviceName]) {
        if (!defaultParams) {
          defaultParams = {};
        }
        $scope[serviceName] = defaultParams;
      }
      else {
        Object.keys($scope[serviceName]).forEach(function(key) {
          if ($scope[serviceName][key] === undefined || $scope[serviceName][key] === '') {
            delete $scope[serviceName][key];
          }
        });
        $scope[serviceName] = angular.extend({}, defaultParams, $scope[serviceName]);
      }
      return $scope[serviceName];
    };

    /**
     * Create a default service definition object, defaulting to a Thing Service
     *
     * @param {String} entity
     * @param {String} service
     * @returns {Object}
     */
    this.newServiceDef = function(entity, service, id) {
      var serviceDef = {
        entityType: 'Things',
        entity: entity,
        serviceType: 'Services',
        id: id,
        service: service,
        method: 'POST',
        requestType: 'json'
      };
      return serviceDef;
    };

    // Registered services which can be executed via events or on demand
    var registeredServices = {};

    /**
     * Register a service to be executed later
     *
     * @param {Object} serviceDef - the definition for the service
     * @param {String} logicalServiceName - the logical service name - must be unique for each registered service
     * @param {String} twxModel - model for service data on the scope
     * @param {Object} twxParms - optional service parameters
     */
    this.registerService = function(serviceDef, logicalServiceName, twxModel, twxParms) {
      registeredServices[logicalServiceName] = {
        serviceDef: serviceDef,
        twxModel: twxModel,
        twxParms: twxParms
      };
    };

    /**
     * Get a registered service
     *
     * @param {String} logicalServiceName - the logical name of a previously registered service
     * @returns {Object} a registered service definition, if found. Otherwise null.
     */
    this.getRegisteredService = function(logicalServiceName) {
      return registeredServices[logicalServiceName];
    };

    /**
     * Execute a registered service
     *
     * @param {Object} logicalServiceName - the logical name of a previously registered service
     * @param {Object} serviceParams - optional service parameters which will be combined with any registered parameters
     * @returns {Object} a promise that, when resolved, executes a function with a parameter that is an array of
     * result data (see executeService)
     */
    this.executeRegisteredService = function(logicalServiceName, serviceParams) {
      var logicalServiceDef = registeredServices[logicalServiceName];
      if (logicalServiceDef !== undefined) {
        var txParms = {};
        if (logicalServiceDef.twxParms !== undefined) {
          txParms = angular.extend(txParms, logicalServiceDef.twxParms);
        }
        if (serviceParams !== undefined) {
          txParms = angular.extend(txParms, serviceParams);
        }
        return DataConnector.executeService(dataProvider, logicalServiceDef.serviceDef, txParms);
      } else {
        var deferred = $q.defer();
        deferred.reject('No logical service definition');
        return deferred.promise;
      }
    };
  });

})(angular);

(function(angular) {
  'use strict';

  angular.module('com.thingworx.declarative',
    ['com.thingworx.declarative.controller',
      'com.thingworx.declarative.models']);

})(angular);

(function(angular) {
  'use strict';

  /**
   * escape quote and backslash to work in query selector value search
   * @param {String} str
   */
  function escapeForQuerySelectorValue(str = '') {
    return str.replace(/["\\]/g, '\\$&');
  }

  var app = angular.module('com.thingworx.declarative.models', ['com.thingworx.services',
    'com.thingworx.declarative.controller']);

  // Expose for testing.
  app.value('escapeForQuerySelectorValue', escapeForQuerySelectorValue);

  /**
   * Directives for ThingWorx entities. These set the twx-model attribute to the results of getting the
   * thing, template or shape. Automatically update when twx-auto-update is present. Automatically refresh from the
   * ThingWorx server when twx-auto-refresh is present, with a refresh rate in seconds.
   */

  /**
   * Parent directive for accessing ThingWorx entities. Sets the entity-name and entity-type, and establishes
   * the controller for child directives.
   */
  app.directive('twxModel', function($log, $timeout) {
    return {
      restrict: 'AE',
      controller: 'twxConnectorCtrl',
      link: function(scope, element, attrs, twxConnectorCtrl) {
        var twxEntityName = attrs.twxEntityName;
        var twxEntityType = attrs.twxEntityType;
        if (!twxEntityName) {
          $log.warn('twx-model: missing name');
        }
        var entity = {
          modelName: attrs.name,
          entityName: twxEntityName,
          entityType: twxEntityType || 'Things'
        };
        var updateEvent = function() {
          // Tell the children the entity name and type
          $timeout(function() {
            angular.forEach(element.children(), function(child) {
              angular.element(child).data('twx-entity', entity);
            });
            scope.$emit('twx-entity');
          }, 100);
        };
        if (entity.entityName) {
          updateEvent();
        }
        var updateOnChange = function(prop, parm) {
          scope.$watch(
            function() {
              return attrs[prop];
            },
            function(newValue, oldValue) {
              if (newValue && (newValue !== entity[parm])) {
                // New entity name, tell the children
                entity[parm] = newValue;
                updateEvent();
              }
            }
          );
        };
        updateOnChange("twxEntityName", 'entityName');
        updateOnChange("twxEntityType", 'entityType');

      }
    };
  });

  /**
   * Directive to get the property of an entity and add the property to on object on the scope.
   * The properties can auto update to the server or auto refresh from the server.
   */
  app.directive('twxModelProperty', function(DataConnector, $log, $interval, $parse, $rootScope) {
    return {
      restrict: 'AE',
      require: '^twxModel',
      link: function(scope, element, attrs, twxConnectorCtrl) {
        var propertyName = attrs.name;
        if (!propertyName) {
          $log.warn('twx-property: No property name');
          return;
        }
        if (!attrs.twxModel) {
          $log.warn('twx-property: No model');
          return;
        }
        var entityNameInModel;
        var removeSocketListerFunc;
        var updateProps = function(event, data) {
          // Wait for the surrounding entity to be set
          var entity = element.data('twx-entity');
          if (entity === undefined || (entity.entityType && (entity.entityType !== 'Things'))) {
            $log.warn('twx-property: not a thing');
            return;
          }

          if (entityNameInModel !== entity.entityName) {
            // entity has been updated ... need to clear out data
            // clear out old data so we're not showing anything  DT-2185
            $parse(attrs.twxModel + '=data')(scope, {data: undefined});
          }

          if (entity.entityName) { //Don't try to get properties for null entity
            entityNameInModel = entity.entityName;
            DataConnector.getProperty(twxConnectorCtrl.getDataProvider(), entity.entityName, propertyName).then(function(data) {
              $parse(attrs.twxModel + '=data')(scope, {data: data});
              if (angular.isDefined(attrs.twxAutoUpdate)) {
                scope.$watch(function() {
                  return $parse(attrs.twxModel)(scope);
                }, function(newValue, oldValue) {
                  if (newValue !== oldValue) {
                    var updateValue = newValue;
                    if (angular.isDefined(updateValue)) {
                      DataConnector.updateProperty(twxConnectorCtrl.getDataProvider(), entity.entityName, propertyName, updateValue)
                        .then(function(data) {
                          // noop
                        }, function(reason) {
                          $log.warn('twx-property updateProperty:', reason);
                        });
                    }
                  }
                });
              }
              if (attrs.twxAutoRefresh && DataConnector.hasSubscribe(twxConnectorCtrl.getDataProvider())) {
                if (removeSocketListerFunc) {
                  removeSocketListerFunc();
                }
                removeSocketListerFunc = DataConnector.subscribe(twxConnectorCtrl.getDataProvider(), entity.entityName, entity.entityType, 'DataChange', propertyName, function(data) {
                  if (data) {
                    var newValue = data.eventData[0].newValue[0].value;
                    $parse(attrs.twxModel + '=data')(scope, {data: newValue});
                    scope.$digest();
                  }
                });
              }
            }, function(reason) {
              $log.warn('twx-property getProperty:', reason);
            });
          }
        };
        var debounceUpdate = _.debounce(updateProps, 100);
        scope.$on('twx-entity', function(event, data) {
          debounceUpdate();
        });
      }
    };
  });

  /**
   * Directive to define a service that can be executed. Can be executed on-app-load or on-event.
   */
  app.directive('twxModelService', function($log, $parse, $timeout, $interval, $rootScope) {
    return {
      restrict: 'AE',
      require: '^twxModel',
      link: function(scope, element, attrs, twxConnectorCtrl) {

        var serviceName = attrs.id;
        var serviceActualName = attrs.name;
        if (!serviceName) {
          console.log('old service with no id');
          serviceName = attrs.name;
        }
        if (!serviceName) {
          $log.warn('twx-model-service: no service name');
          return;
        }
        var initialized = false;
        var entity,
          serviceDef,
          logicalName,
          params,
          eventListener,
          haveDataBackAlready = false,
          priorData;

        var svcModelName = element.parent().attr('name');

        var svcModel = 'app.mdl.' + svcModelName + '.svc.' + serviceName;

        // "app.mdl['AcmeTractor.Antwerp'].svc['GetPropertyValues'].data"
        var svcModelData = 'app.mdl[\'' + svcModelName + '\'].svc[\'' + serviceName + '\'].data';

        var setUpdating = function(updating) {
          // for now, presume it's an INFOTABLE
          //if ((attrs.baseType) && (attrs.baseType.toUpperCase() === 'INFOTABLE')) {
          var updatingModel = {
            isUpdating: updating
          };
          if (!updating) {
            updatingModel.lastUpdated = new Date();
            updatingModel.lastUpdatedString = updatingModel.lastUpdated.toString();
          }
          if (twx.app.mdl[svcModelName] === undefined) {
            twx.app.mdl[svcModelName] = {
              svc: {},
              properties: {}
            };
          }
          if (twx.app.mdl[svcModelName].svc === undefined) {
            twx.app.mdl[svcModelName].svc = {};
          }
          if (twx.app.mdl[svcModelName].svc[serviceName] === undefined) {
            twx.app.mdl[svcModelName].svc[serviceName] = {data: []};
          }
          twx.app.mdl[svcModelName].svc[serviceName].data.isUpdating = updatingModel.isUpdating;
          twx.app.mdl[svcModelName].svc[serviceName].data.lastUpdated = updatingModel.lastUpdated;
          twx.app.mdl[svcModelName].svc[serviceName].data.lastUpdatedString = updatingModel.lastUpdatedString;
        };
        var handleSuccess = scope._successHandler = function(logicalName, data) {
          try {
            var modelData = data;
            var baseType = attrs.baseType;
            if (!baseType) {
              baseType = 'INFOTABLE';
            }
            if (!modelData) {
              modelData = {};
            }

            if (baseType.toUpperCase() === 'INFOTABLE') {
              modelData.current = undefined;
              modelData.selectedRows = [];
              if ((data && data.length > 0) && !angular.isDefined(attrs.twxNoAutoSelect)) {
                modelData.current = data[0];
                modelData.selectedRows.push(data[0]);
                data[0]._isSelected = true;
              }
              modelData.isUpdating = false;
              modelData.lastUpdated = new Date();
              modelData.lastUpdatedString = modelData.lastUpdated.toString();

              if (!haveDataBackAlready) {
                haveDataBackAlready = true;
                priorData = modelData;
              } else if (priorData && priorData.dataShape) {
                try {
                  // find the primary keys in the data shape
                  var primaryKeyFields = [];
                  var fieldDefs = priorData.dataShape.fieldDefinitions;
                  angular.forEach(fieldDefs, function(value, key) {
                    if (value.aspects && value.aspects.isPrimaryKey === true) {
                      primaryKeyFields.push(key);
                    }
                  });

                  // function to find the key values for this row
                  var findKeysOfThisRow = function(row, primaryKeyFields) {
                    var keyValues = {};
                    for (var f = 0; f < primaryKeyFields.length; f++) {
                      keyValues[primaryKeyFields[f]] = row[primaryKeyFields[f]];
                    }
                    return keyValues;
                  };

                  // function to find the key values for this row
                  var findKeysOfTheseRows = function(rows, primaryKeyFields) {
                    var keysOfRows = [];
                    for (var r = 0; r < rows.length; r++) {
                      keysOfRows.push(findKeysOfThisRow(rows[r], primaryKeyFields));
                    }
                    return keysOfRows;
                  };

                  var doesThisRowMatchKeys = function(row, keyValues, primaryKeyFields) {
                    var match = false;
                    for (var k = 0; !match && k < keyValues.length; k++) {
                      var kv = keyValues[k];
                      var rowMatch = true;
                      for (var pkf = 0; rowMatch && pkf < primaryKeyFields.length; pkf++) {
                        var primaryKeyName = primaryKeyFields[pkf];
                        if (row[primaryKeyName] !== kv[primaryKeyName]) {
                          rowMatch = false;
                        }
                      }
                      if (rowMatch) {
                        match = true;
                      }

                    }
                    return match;
                  };

                  // see what rows were selected previously
                  if (priorData.current !== undefined || priorData.selectedRows.length > 0) {
                    var keysOfCurrent = findKeysOfThisRow(priorData.current, primaryKeyFields);
                    var keysOfSelectedRows = findKeysOfTheseRows(priorData.selectedRows, primaryKeyFields);
                    for (var r = 0; r < data.length; r++) {
                      if (doesThisRowMatchKeys(data[r], [keysOfCurrent], primaryKeyFields)) {
                        modelData.current = data[r];
                      }
                      if (doesThisRowMatchKeys(data[r], keysOfSelectedRows, primaryKeyFields)) {
                        modelData.selectedRows.push(data[r]);
                      }
                    }

                  }
                } catch (err) {
                  console.log("error trying to restore selected rows: " + err);
                }

                priorData = modelData;
              }
            } else {
              modelData = data[0].result;
            }
          }
          catch (e) {
            console.error('Error setting data from twx', e);
          }
          $parse(svcModelData + '=data')(scope, {data: modelData, entity: entity});
          scope.$emit(logicalName + '-complete', {data: modelData, online: true, entity: entity});
        };
        var handleFailure = function(logicalName, reason, serviceParams) {
          setUpdating(false);
          scope.$emit(logicalName + '-failed', {service: logicalName, params: serviceParams, reason: reason, entity: entity});
        };
        var removeServiceFromAutoRefreshingMap = function () {
          if(window.autoRefreshingServices && window.autoRefreshingServices[entity.modelName]) {
              // delay the removal the of the model/service from the map just a bit to allow the angular digest cycle to complete
              setTimeout(function () {
                const ignoreServices = window.autoRefreshingServices[entity.modelName];
                delete ignoreServices[logicalName];
                if(Object.keys(ignoreServices).length < 1) {
                  delete window.autoRefreshingServices[entity.modelName];
                }
              }, 300);
          }
        }
        var executeService = function(logicalName, eventParams) {
          var isUpdatingNow = false;
          try {
            isUpdatingNow = twx.app.mdl[svcModelName].svc[serviceName].data.isUpdating;
          } catch (err) {
          }
          if (isUpdatingNow) {
            console.log('already updating - ignore executeService for "' + svcModelName + '" "' + serviceName + '"');
            return;
          }

          setUpdating(true);
          scope.$emit(logicalName + '-begin');
          twxConnectorCtrl.executeRegisteredService(logicalName, eventParams).then(function(data) {
            handleSuccess(logicalName, data);
            scope.$emit(logicalName + '-end');
            $rootScope.$broadcast(logicalName + '.serviceInvokeComplete');
            removeServiceFromAutoRefreshingMap();
          }, function(reason) {
            if(eventParams.retryFlag) {
              resendRequestFor406(logicalName, eventParams);
            }
            handleFailure(logicalName, reason, eventParams);
            $rootScope.$broadcast(logicalName + '.serviceFailure', {message: reason});
            $rootScope.$broadcast('serviceFailure', {message: reason, service: logicalName, entity: entity});
            scope.$emit(logicalName + '-end');
            removeServiceFromAutoRefreshingMap();
          });
        };

        function resendRequestFor406(logicalName, eventParams) {
          const resizedWidth = eventParams.params.width/3;
          const resizedHeight = eventParams.params.height/3;
          // In preview imgFormat is not passed in params, but from view app it is
          const imageFormat = eventParams.params.imgFormat || 'JPEG';
          const image = new Image();
          image.onload = () => {
            const resizedData = resizeImage(image, resizedWidth, resizedHeight, imageFormat);
            eventParams.content = resizedData;
            eventParams.retryFlag = false;
            eventParams.params.width = resizedWidth;
            eventParams.params.height = resizedHeight;
            setUpdating(false);
            executeService(logicalName, eventParams);
          };
          image.src = 'data:image/' + imageFormat.toLowerCase() + ';base64,' + eventParams.content;
        }

        function resizeImage(img, width, height, imgFormat) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/' + imgFormat.toLowerCase()).split(';base64,')[1];
      }

        var setEventListener = function() {
          if (eventListener) {
            eventListener();
          }

          var serviceEventName = svcModel; // + '.svc.' + serviceName;

          //serviceEventName = "app.mdl['DeliveryHelper'].svc['GetOutstandingDeliveries']";
          //serviceEventName = "app.mdl.DeliveryHelper.GetOutstandingDeliveries";

          eventListener = scope.$on(serviceEventName, function(event, eventData) {
            $timeout(function() { // Timeout to allow any scope parameters to be resolved
              var svcParams = twxConnectorCtrl.getServiceParams(logicalName);
              if (!svcParams) {
                svcParams = {};
              }
              if (eventData) {
                Object.keys(eventData).forEach(function(key) {
                  if (eventData[key] === undefined) {
                    //Don't let undefined params hide the defaults
                    delete eventData[key];
                  }
                });
                svcParams = angular.extend(svcParams, eventData);
              }
              executeService(logicalName, svcParams);
            }, 0);
          });
        };

        var init = function() {
          entity = element.data('twx-entity');
          serviceDef = twxConnectorCtrl.newServiceDef(entity.entityName, serviceActualName, serviceName);
          serviceDef.entityType = entity.entityType;
          var defaultParams = {};
          logicalName = attrs.logicalName ? attrs.logicalName : serviceName;
          // Tell the children the service name
          angular.forEach(element.children(), function(child) {
            if (child.tagName === 'TWX-SERVICE-PARAMETER-VALUE') {
              var $child = angular.element(child);
              var val = $child.attr('value');
              if (val !== '') {
                defaultParams[$child.attr('name')] = val;
              }
            }
            angular.element(child).data('twx-service-name', logicalName);
          });
          scope.$emit('twx-service-name');
          serviceDef.defaultParams = defaultParams;
          params = twxConnectorCtrl.getServiceParams(logicalName, defaultParams);
          if (!params) {
            params = {};
          }
          twxConnectorCtrl.registerService(serviceDef, logicalName, svcModel, params); // params?
          if (angular.isDefined(attrs.onAppLoad) || angular.isDefined(attrs.onEntityChange)) {
            $timeout(function() {  //wait 1 digest loop, let the dynamic entity be initialized
              executeService(logicalName, twxConnectorCtrl.getServiceParams(logicalName));
            }, 10);
          }
          //if (angular.isDefined(attrs.onEvent)) {
          setEventListener();
          //}

          if (attrs.autoRefresh) {
            var refreshRate = attrs.autoRefresh * 1000;
            if (refreshRate) {
              $interval(function() {
                // DT-21854 - for HMT projects, we'll ignore the root scope digest cycles when a service is auto refreshing
                // add the service definition to the global property until the request for the service is complete
                let serviceCallsForModel = window.autoRefreshingServices[entity.modelName] || {};
                serviceCallsForModel[logicalName] = true;
                window.autoRefreshingServices[entity.modelName] = serviceCallsForModel;

                // execute the service
                executeService(logicalName, twxConnectorCtrl.getServiceParams(logicalName));
              }, refreshRate);
            }
          }
        };
        var updateService = function(theLogicalName) {
          var newLogicalName;
          entity = element.data('twx-entity');
          if (!attrs.logicalName) {
            newLogicalName = serviceName;
          }
          if (!theLogicalName) {
            theLogicalName = logicalName;
          }
          serviceDef = twxConnectorCtrl.getRegisteredService(theLogicalName).serviceDef;
          serviceDef.entity = entity.entityName;
          if (newLogicalName && (newLogicalName !== logicalName)) {
            // The logical name changed, due to an entity name change
            params = twxConnectorCtrl.getServiceParams(logicalName);
            var newParams = twxConnectorCtrl.getServiceParams(newLogicalName);
            angular.copy(params, newParams);
            theLogicalName = newLogicalName;
            logicalName = newLogicalName;

            // clear out old data so we're not showing anything  DT-2185
            if (twx.app.mdl[svcModelName] === undefined) {
              twx.app.mdl[svcModelName] = {
                svc: {},
                properties: {}
              };
            }
            if (twx.app.mdl[svcModelName].svc === undefined) {
              twx.app.mdl[svcModelName].svc = {};
            }
            if (twx.app.mdl[svcModelName].svc[serviceName] === undefined) {
              twx.app.mdl[svcModelName].svc[serviceName] = {data: {}};
            }
            twx.app.mdl[svcModelName].svc[serviceName].data = [];
          }
          twxConnectorCtrl.registerService(serviceDef, theLogicalName, svcModel, params);
          if (angular.isDefined(attrs.onEntityChange)) {
            executeService(logicalName);
          }
          if (angular.isDefined(attrs.onEvent)) {
            setEventListener();
          }
        };
        scope.$on('twx-entity', function(event, data) {
          if (!initialized) {
            if (element.data('twx-entity') !== undefined) {
              // The surrounding entity name has been set
              init();
              initialized = true;
            } else {
              console.log('twx-entity sent but no data for twx-entity has been set yet');
            }
          } else {
            // The surrounding entity name has been updated
            updateService();
          }
        });
        scope.$on('twx-service-input', function(event, data) {
          params[data.name] = data.value;
          updateService(data.serviceName);
        });
      }
    };
  });

  /**
   * Directive which will set an input parameter for an enclosing twx-service.
   */
  app.directive('twxServiceInput', function($parse, $log, $timeout) {
    return {
      restrict: 'AE',
      controller: 'twxConnectorCtrl',
      link: function(scope, element, attrs, twxConnectorCtrl) {
        var onEvent = scope.$on('twx-service-name', function(event, data) {
          // Wait for the surrounding service name to be set
          var serviceName = element.data('twx-service-name');
          if (serviceName && attrs.name) {
            onEvent();
            var serviceParams = twxConnectorCtrl.getServiceParams(serviceName);
            serviceParams[attrs.name] = attrs.value;
            scope.$watch(
              function() {
                return attrs.value;
              },
              function(newValue, oldValue) {
                if (newValue !== oldValue) {
                  serviceParams[attrs.name] = newValue;
                }
              }
            );
          }
        });
      }
    };
  });

  app.directive('twxModelEvent', function($log, $rootScope, DataConnector) {
    return {
      restrict: 'E',
      require: '^twxModel',
      link: function(scope, element, attrs, twxConnectorCtrl) {
        var eventName = attrs.name;
        var eventId = attrs.id;

        if (!eventName || !eventId) {
          $log.warn("twx-model-event is missing the name or id attribute, both are required", attrs);
          return;
        }

        var twxEventHandler = scope._twxEventHandler = function (data) {
          $log.debug('received event', eventId, ', with data', data);
          var modelName = data.source || element.parent().attr('name');

          // find all the twx-eventbind objects that match the TWX event name and source entity
          modelName = escapeForQuerySelectorValue(modelName);
          var eventBindings = document.querySelectorAll('twx-eventbind[source-name="' + modelName + '"][source-event="' + eventId + '"]');
          var twxEvent = new CustomEvent('twxEventEmitted', {'detail': data, bubbles: true});

          // notify each handler of the TWX event, passing in the data from the original TWX Event
          _.each(eventBindings, function(eventBinding) {
            eventBinding.dispatchEvent(twxEvent);
          });
          element[0].dispatchEvent(twxEvent);

          // set the data on the model so any data bindings will be updated
          if (twx.app.mdl[modelName] === undefined) {
            twx.app.mdl[modelName] = {
              events: {}
            };
          }
          if (twx.app.mdl[modelName].events === undefined) {
            twx.app.mdl[modelName].events = {};
          }
          if (twx.app.mdl[modelName].events[eventId] === undefined) {
            twx.app.mdl[modelName].events[eventId] = {};
          }
          twx.app.mdl[modelName].events[eventId] = data;
          $rootScope.$digest();
        };

        var removeSocketListenerFunction;
        var initEvent = function(event, data) {
          var entity = element.data('twx-entity');
          if (DataConnector.hasSubscribe(twxConnectorCtrl.getDataProvider())) {
            if (removeSocketListenerFunction) {
              removeSocketListenerFunction();
            }

            $log.debug('subscribing to the', eventId, 'event on', entity.entityName);
            removeSocketListenerFunction = DataConnector.subscribe(twxConnectorCtrl.getDataProvider(), entity.entityName, entity.entityType, eventName, attrs.sourceproperty, twxEventHandler);
          } else {
            $log.warn(twxConnectorCtrl.getDataProvider(), 'does not have a subscribe() function defined, not able to register listeners for the', eventName, 'event');
          }
        };

        var debounceUpdate = _.debounce(initEvent, 100);
        scope.$on('twx-entity', function(event, data) {
          debounceUpdate();
        });
      }
    };
  });

  app.directive('twxAppParam', function() {
    return {
      restrict: 'E',
      controller: function ($scope, filterService) {
        /**
         * Handles data binding for twx-app-param
         * @param fromExpression for example "app.mdl['Car1'].properties['EngineTemp']"
         * @param toProperty for example "app.params['engineParam']"
         * @param element a twx-databind element
         */
        this.addDataBinding = function(fromExpression, toProperty, element) {
          if (fromExpression && toProperty) {
            $scope.$watch(fromExpression, function(newValue, oldValue) {
              var filteredValue = filterService.filterValue(newValue, element);
              if(filteredValue !== oldValue) {
                if (filteredValue === undefined) {
                  $scope.$eval('delete ' + toProperty);
                } else {
                  $scope.$eval(toProperty + '= "' + filteredValue + '"');
                }
              }
            });
          }
        };
      }
    };
  });

  app.directive('twxAppEvent', function($log) {
    return {
      restrict: 'E',
      link: function (scope, element, attrs) {
        var eventName = attrs.name;

        if (!eventName) {
          $log.warn('twx-app-event: No event name');
          return;
        }

        /**
         * Creates a handler that will get called on the given scope object when the app event is emitted.
         *
         * @param $scope The object to eval the expression against
         * @param expression
         * @return {Function}
         */
        var createEventHandler = function($scope, expression){
          return function(event){
            $log.debug('invoking expression for the app event', eventName, expression);

            var locals = {viewCtrl: angular.element(document.querySelector('ion-view')).scope()};
            $scope.$eval(expression, locals);
            $scope.$applyAsync();
          };
        };

        if(attrs.expression) {
          // add a event handler if there is an expression defined on this app event
          $log.debug('registering a custom listener for the app event', eventName);
          scope.$on(eventName, createEventHandler(scope, attrs.expression));
        }

        $log.debug('voice response', attrs.voiceresponse);
        if(attrs.voiceresponse) {
          // register a handler for the 'voice response' when the app event is emitted
          scope.$on(eventName, createEventHandler(scope, 'app.speech.synthesizeSpeech({ text: "' + attrs.voiceresponse + '" });'));
        }

        $log.debug('registering listeners for the app event', eventName);
        scope.$on(eventName, function(event, data) {
          // if there are any event bindings bound to this event, notify the handler via a CustomEvent
          eventName = escapeForQuerySelectorValue(eventName);
          var eventBindings = document.querySelectorAll('twx-eventbind[source-event="' + eventName + '"][source-name="app"]');
          var twxEvent = new CustomEvent('twxEventEmitted', {'detail': data, bubbles: true});
          $log.debug('invoking listener for the app event', eventName, 'with data', data);

          // notify each handler of the TWX event
          _.each(eventBindings, function(eventBinding) {
            eventBinding.dispatchEvent(twxEvent);
          });
          element[0].dispatchEvent(twxEvent);
        });
      }
    };
  });
})(angular);
