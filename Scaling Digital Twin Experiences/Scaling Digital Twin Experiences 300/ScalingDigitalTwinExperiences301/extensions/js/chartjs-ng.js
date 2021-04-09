/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'chartjs-ng';
}

(function () {
  'use strict';

  function cjsChart() {
    var setConfigData = function (rows, labelsField, valuesField) {
      var data = {};
      data.labels = [];
      data.datasets = [];

      var dataset1 = {};
      dataset1.data = [];

      dataset1.label = valuesField;

      var nRows = rows.length;
      for (var i = 0; i < nRows; i += 1) {
        data.labels.push(rows[i][labelsField]);
        dataset1.data.push(rows[i][valuesField]);
      }

      data.datasets.push(dataset1);

      this.data = data;
    };

    var newChartConfig = function(chartType) {
      var config;
      if (chartType === 'timeseries') {
        config = {
          type: 'line',
          data: {},
          options: {
            responsive: true,
            scales: {
              xAxes: [{
                type: "time",
                display: true,
                time: {
                  format: 'MM/DD/YYYY HH:mm'
                  //, round: 'day'
                },
                scaleLabel: {
                  show: true,
                  labelString: 'Date'
                }
              }],
              yAxes: [{
                display: true,
                scaleLabel: {
                  show: true,
                  labelString: 'value'
                }
              }]
            }
          },
          setData: setConfigData
        };
      } else if (chartType === 'bar') {
        config = {
          type: 'bar',
          data: {},
          options: {
            responsive: true,
            hover: {
              mode: "label"
            },
            scales: {
              xAxes: [{
                type: "category",

                // Specific to Bar Controller
                categoryPercentage: 0.8,
                barPercentage: 0.9,

                // grid line settings
                gridLines: {
                  offsetGridLines: true,
                }
              }],
              yAxes: [{
                type: "linear"
              }]
            }
          },
          setData: setConfigData
        };
      }
      return config;
    };

    return {
      restrict: 'EA',
      scope: {
        chartType: '@',
        data: '=',
        labelsField: '@',
        valuesField: '@',
        options: '=',
        autoUpdate: '@',
        delegate: '='
      },
      template: '<canvas style="width:100%;height:100%"></canvas>',
      link: function (scope, element, attr) {
        var canvas = scope._canvas = element.find('canvas')[0];
        var ctx = canvas.getContext('2d');
        scope._chartConfig = newChartConfig(attr.chartType);

        scope.services = {};
        scope.services.updateChart = _.debounce(function(){
          var data = scope.data;
          if (data && data.length && scope.labelsField && scope.valuesField) {
            scope._chartConfig = newChartConfig(scope.chartType);
            if (scope.chartType === 'bar') {
              scope._chartConfig.options.scales.xAxes[0].gridLines.display = (scope.options.scales.xAxes[0].gridLines.display === true);
              scope._chartConfig.options = Object.assign(scope.options, scope._chartConfig.options);
            }
            // force ticks display (for fixing a bug were some X labels disappear)
            scope._chartConfig.options.scales.xAxes[0].ticks = {autoSkip: false};
            // fixing X labels cut off issue. This is a bug in charts.js implementation.
            // 15 was found as the "magic number" to fix this issue regardless of the lable's length.
            scope._chartConfig.options.layout = { padding: { bottom: 15 } };
            scope._chartConfig.setData(data, scope.labelsField, scope.valuesField);
            scope._chart = new Chart(ctx, scope._chartConfig);
          }
        }, 100);

        var group = ['labelsField','valuesField'];
        if (scope.autoUpdate === 'true') {
          group.push('data.lastUpdated');
        }
        scope.$watchGroup(group, scope.services.updateChart);

        scope.$watch('delegate', function (delegate) {
          if (delegate) {
            delegate.updateChart = scope.services.updateChart;
          }
        });

        scope.$on('serviceInvoke', function (event, data) {
          const name = data.serviceName;
          if (scope.services[name]) {
            scope.services[name](data.params);
          }
        });
      }
    };
  }

  var cjsModule = angular.module('chartjs-ng', []);
  cjsModule.directive('cjsChart', ['$timeout', cjsChart]);
}());
