(function(angular) {
    'use strict';

    var app = angular.module('com.thingworx.services', ['twxRuntime']);

    /**
     * Configuration provider for the ThingWorx Connector. Currently only root to the ThingWorx instance is
     * configurable.
     */
    app.provider('DataConnectorConfig', function() {
        var dataProviders = {};

        this.addDataProvider = function(providerConfig) {
            dataProviders[providerConfig.name] = providerConfig;
        };

        this.$get = function() {
            return {
                addDataProvider: this.addDataProvider,
                getDataProviders: function() {
                    return dataProviders;
                }
            };
        };
    });

    app.factory('DataConnector', function(DataConnectorConfig, $injector) {

        var dataProviderImpl = {};

        angular.forEach(DataConnectorConfig.getDataProviders(), function(value, key) {
            dataProviderImpl[key] = $injector.get(key);
            dataProviderImpl[key].config(value);
        });

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
         * The URL sent to the ThingWorx server has the form: twxRoot/entityType/entity/serviceType/service or
         * Thingworx/Things/TractorAnalysisQueries/Services/GetDataForTractor
         *
         * @param {Object} postData - Input parameters to the service
         * @returns {Object} a promise that, when resolved, executes a function with a parameter that is an array of
         * result data
         */
        this.executeService = function(dataProvider, serviceDef, postData) {
            return dataProviderImpl[dataProvider].executeService(serviceDef, postData);
        };

        /**
         * Get a property value from a thing
         *
         * @param {String} entityName
         * @param {String} propertyName
         * @returns {Object} a promise that, when resolved, executes a function with a parameter that is the value of the property
         */
        this.getProperty = function(dataProvider, entityName, propertyName) {
            return dataProviderImpl[dataProvider].getProperty(entityName, propertyName);
        };

        /**
         * Update a property value for a thing
         *
         * @param {String} entityName
         * @param {String} propertyName
         * @param {Object} propertyValue - new value of the property
         * @returns {Object} a promise that, when resolved, executes a function with an empty object
         */
        this.updateProperty = function(dataProvider, entityName, propertyName, propertyValue) {
            return dataProviderImpl[dataProvider].updateProperty(entityName, propertyName, propertyValue);
        };

        /**
         * Create a dynamic subscription to a Thing event
         *
         * @param {String} entityName
         * @param {String} entityType
         * @param {String} eventName
         * @param {String} propertyName
         * @param {Function} handler
         */
        this.subscribe = function(dataProvider, entityName, entityType, eventName, propertyName, handler) {
            dataProviderImpl[dataProvider].subscribe(entityName, entityType, eventName, propertyName, handler);
        };

        this.hasSubscribe = function(dataProvider) {
            return dataProviderImpl[dataProvider].hasSubscribe();
        };

        return this;
    });

})(angular);
