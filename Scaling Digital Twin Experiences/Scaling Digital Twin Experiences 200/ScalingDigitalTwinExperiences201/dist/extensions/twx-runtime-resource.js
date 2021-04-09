(function(angular) {
    'use strict';

    var app = angular.module('twxRuntime');

    app.service('ThingworxConnector', function($http, $q, $window, $log){
        var urlRoot = "/Thingworx";

        this.config = function(configuration) {
            urlRoot = configuration.urlRoot;
        };

        var getUrlRoot = function() {
            return urlRoot;
        };

        var deferred;

        var getAppKey = function(callback) {
            var URL = getUrlRoot() + "/Resources/EntityServices/Services/GetClientApplicationKey";
            var headers = {
                'Accept': "application/json"
            };
            var appName = 'SubscriptionManager_' + Math.floor(Math.random() * 1000);
            var appKeyParams = {
                appKeyName: appName + 'key',
                clientName: appName
            };
            $http.post(URL, appKeyParams, {
                headers: headers
            }).then(function(data) {
                if (data && data.data) {
                    callback(data.data.rows[0].result);
                }
            }, function(status) {
                $log.error("Could not get Application key for subscriptions", status);
            });
        };
        /** @internal */
        this._getAppKey = getAppKey;

        var getTW = function() {
            if (!window.TW) {
                setTimeout(getTW, 30);
                return;
            } else {
                var TW = window.TW;
                var parser = document.createElement('a');
                parser.href = getUrlRoot();

                var config = {
                    host: parser.hostname,
                    port: Number(parser.port),
                    ssl: parser.protocol === 'https:',
                    authTokenFunction: getAppKey
                };
                if ($window.___browserSync___ && config.port === 4000) {
                    //browser-sync workaround, use the non-sync port until its fixed
                    //Related issue: https://github.com/BrowserSync/browser-sync/issues/780
                    config.port = 4001;
                }
                if (config.port === 0 && !parser.port && parser.protocol === 'https:') {
                    //Fixing the default port for android chrome
                    config.port = 443;
                }
                else if (config.port === 0 && !parser.port && parser.protocol === 'http:') {
                    //Fixing the default port for android chrome
                    config.port = 80;
                }
                if (TW.SubscriptionManager) {
                    var subscriptionManager = new TW.SubscriptionManager(config);
                    deferred.resolve(subscriptionManager);
                } else {
                    deferred.reject("SubscriptionManager not found.");
                }
            }
        };

        var getSubscriptionManager = function() {
            if (deferred === undefined) {
                deferred = $q.defer();
                getTW();
            }

            return deferred.promise;
        };

        /*
         * Cache of data shape definitions
         */
        var dataShapes = {};
        var addDataShape = function(name, dataShape) {
            dataShapes[name] = dataShape;
        };
        var getDataShape = function(name) {
            return dataShapes[name];
        };
        this.addDataShape = addDataShape;
        this.getDataShape = getDataShape;

        /**
         * Convert data in the result array from ThingWorx. Currently only dates are converted to Date objects Recurse
         * on info table fields
         */
        var thingWorxExtractor = function(data, dataShapeName) {
            if (!data.rows || !data.dataShape || !data.dataShape.fieldDefinitions) {
                return data;
            }
            if (dataShapeName) {
                addDataShape(dataShapeName, data.dataShape);
            }
            var newRows = data.rows;
            var i, row;
            for (var key in data.dataShape.fieldDefinitions) {
                var baseType = data.dataShape.fieldDefinitions[key].baseType;
                if (baseType === "DATETIME") {
                    i = newRows.length;
                    while (i--) {
                        row = newRows[i];
                        if (row[key]) {
                            row[key] = new Date(row[key]);
                        }
                    }
                } else if (baseType === "INFOTABLE") {
                    i = newRows.length;
                    while (i--) {
                        row = newRows[i];
                        if (row[key]) {
                            row[key] = thingWorxExtractor(row[key], data.dataShape.fieldDefinitions[key].aspects.dataShape);
                        }
                        if (row[key] && row[key].length) {
                            var aspects = data.dataShape.fieldDefinitions[key].aspects;
                            if (aspects && aspects.isMultiRow !== undefined) {
                                var isMultiRow = aspects.isMultiRow;
                                if (angular.isString(isMultiRow)) {
                                    isMultiRow = (aspects.isMultiRow === "true");
                                }
                                if (!isMultiRow) {
                                    row[key] = row[key][0];
                                }
                            }
                        }
                    }
                }
                else if (baseType === "THINGCODE") {
                    i = newRows.length;
                    while (i--) {
                        row = newRows[i];
                        if (row[key]) {
                            row[key].primitiveValue = THINGCODE_PRIMIVITE_VALUE;
                        }
                    }
                }
            }
            newRows.dataShape = data.dataShape;
            return newRows;
        };

        /**
         * Get the request headers. The Accept header defaults to application/json
         */
        var getHeaders = function(requestType) {
            var headers = {
                'Accept': "application/json",
                'Content-Type': 'application/json'
            };
            if (requestType === "xml") {
                headers.Accept = "text/xml";
                headers['Content-Type'] = "text/plain"; // for some reason TWX doesn't like text/xml
            } else if (requestType === "csv") {
                headers.Accept = "text/csv";
                headers['Content-Type'] = "text/csv";
            } else if (requestType === "html") {
                headers.Accept = "text/html";
                headers['Content-Type'] = "text/html";
            }
            return headers;
        };

        var newServiceDef = function(entity, service, id) {
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

        /**
         * Execute a service on a ThingWorx instance
         *
         * @param {Object} serviceDef - Definition of the service to be executed. Object fields are:
         * <ul>
         * <li>entityType: (required) The entity collection, e.g. 'Things'</li>
         * <li>entity: The entity or thing instance, e.g. 'TractorAnalysisQueries'</li>
         * <li>serviceType: The type of service, e.g. 'Services' or 'Properties'</li>
         * <li>service: The service name, e.g. 'GetDataForTractor'</li>
         * <li>requestType: The format of the response, values are: "json", "xml", "csv" or "html"</li>
         * </ul>
         * The URL sent to the ThingWorx server has the form: urlRoot/entityType/entity/serviceType/service or
         * Thingworx/Things/TractorAnalysisQueries/Services/GetDataForTractor
         *
         * @param {Object} postData - Input parameters to the service
         * @param {boolean} rawData - whether to return the raw data output or extract the data (assuming requestType is extractable)
         * @returns {Object} a promise that, when resolved, executes a function with a parameter that is an array of
         * result data
         */
        this.executeService = function(serviceDef, postData, rawData) {
            // TODO: Validate the service def
            var requestType = serviceDef.requestType.toLowerCase();
            var headers = getHeaders(requestType);

            var deferred = $q.defer();
            if (!serviceDef.entityType) {
                deferred.reject("entityType is required");
            }
            var URL = getUrlRoot() + "/" + serviceDef.entityType;
            if (serviceDef.entity) {
                URL = URL + "/" + serviceDef.entity;
                if (serviceDef.serviceType) {
                    URL = URL + "/" + serviceDef.serviceType;
                    if (serviceDef.service) {
                        URL = URL + "/" + serviceDef.service;
                    }
                }
            }
            var processResult = function(result) {
                var data = result.data;
                var returnData;
                if (data && !rawData && (requestType === "json")) {
                    returnData = thingWorxExtractor(data, serviceDef.dataShape);
                } else {
                    returnData = data;
                }
                deferred.resolve(returnData);
            };
            if (serviceDef.method === "GET") {
                $http.get(encodeURI(URL), {
                    headers: headers
                }).then(processResult, deferred.reject);
            } else if (serviceDef.method === "PUT") {
                $http.put(encodeURI(URL), postData, {
                    headers: headers
                }).then(function() {
                    deferred.resolve({});
                }, deferred.reject);
            } else {
                $http.post(encodeURI(URL), postData, {
                    headers: headers
                }).then(processResult, deferred.reject);
            }
            return deferred.promise;
        };

        /**
         * Get a property value from a thing
         *
         * @param {String} thingName
         * @param {String} propertyName
         * @returns {Object} a promise that, when resolved, executes a function with a parameter that is the value of the property
         */
        this.getProperty = function(thingName, propertyName) {
            var deferred = $q.defer();
            var serviceDef = newServiceDef(thingName, propertyName, 'prop' + Date.now());
            serviceDef.serviceType = 'Properties';
            serviceDef.method = 'GET';
            this.executeService(serviceDef).then(function(data) {
                if (data) {
                    deferred.resolve(data[0][propertyName]);
                }
            }, function(reason) {
                deferred.reject(reason);
            });
            return deferred.promise;
        };

        /**
         * Update a property value for a thing
         *
         * @param {String} thingName
         * @param {String} propertyName
         * @param {Object} propertyValue - new value of the property
         * @returns {Object} a promise that, when resolved, executes a function with an empty object
         */
        this.updateProperty = function(thingName, propertyName, propertyValue) {
            var serviceDef = newServiceDef(thingName, propertyName, 'prop' + Date.now());
            serviceDef.serviceType = 'Properties';
            serviceDef.method = 'PUT';
            var twxParams = {};
            twxParams[propertyName] = propertyValue;
            return this.executeService(serviceDef, twxParams);
        };


        /**
         * Create a dynamic subscription to a Thing event
         *
         * @param {String} entityName
         * @param {String} entityType
         * @param {String} eventName
         * @param {String} propertyName
         * @param {Function} handler
         * @return {Function} unsubscribe function
         */
        this.subscribe = function(entityName, entityType, eventName, propertyName, handler) {

            // Event handler for the remote subscriptions. This could be any platform event
            // HandleSubscribedEvent manages forwarding the event to this handler
            var wrappedHandler = function(payload) {
                payload.eventData = thingWorxExtractor(payload.eventData);
                handler(payload);
            };

            var unsubscribe = function() {
                getSubscriptionManager().then(function(subMgr) {

                    subMgr.unsubscribe({
                            sourceType: entityType,
                            source: entityName,
                            sourceProperty: propertyName,
                            eventName: eventName
                        },
                        wrappedHandler,
                        function() {
                            //success
                        },
                        function(err) {
                            $log.error(err);
                        }
                    );
                });
            };

            // subscriptionPromise tacked onto unsubscribe for unit tests
            unsubscribe.subscriptionPromise = new Promise(function(resolve, reject) {
                getSubscriptionManager().then(function(subMgr) {

                    subMgr.subscribe({
                            sourceType: entityType,
                            source: entityName,
                            sourceProperty: propertyName,
                            eventName: eventName
                        },
                        wrappedHandler,
                        function() {
                            resolve();
                        },
                        function(err) {
                            $log.error(err);
                            reject(err);
                        }
                    );
                });
            });

            return unsubscribe;
        };

        this.hasSubscribe = function() {
            return true;
        };

        return this;

    });
})(angular);