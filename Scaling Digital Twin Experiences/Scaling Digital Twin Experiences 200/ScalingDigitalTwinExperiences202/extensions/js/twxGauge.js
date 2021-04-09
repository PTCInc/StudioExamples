/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
/* globals JustGage, humanFriendlyNumber, setDy, formatNumber */

if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'ngJustGage';
}

(function () {
  'use strict';

  function justGage($timeout) {
    return {
      restrict: 'EA',
      scope: {
        id: '@',
        class: '@',
        min: '=',
        max: '=',
        title: '@',
        titleposition: '=',
        label: '@',
        value: '@',
        options: '=',
        width: '@',
        height: '@',
        donut: '=',
        valuefontcolor: '=',
        titlefontcolor: '=',
        hideinnershadow: '=',
        donutstartangle: '=',
        backgroundcolor: '=',
        valuecolor: '=',
      },
      template: '<div id="{{id}}-justgage" class="{{class}}" style="width: {{width}}; height: {{height}};"></div>',
      link: function (scope, element, attrs) {
        function guid() {
          function _p8(s) {
            var p = (Math.random().toString(16) + '000000000').substr(2, 8);
            return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p;
          }

          return _p8() + _p8(true) + _p8(true) + _p8();
        }
        var newId = element[0].id + guid();
        element[0].id = newId;

        var donutMode = false;
        var defaultLevelColor = ['#a9d70b', '#f9c802', '#ff0000'];

        $timeout(function () {
          if (scope.donut === 360) {
            donutMode = true;
          }
          if (scope.valuecolor !== undefined && scope.valuecolor !== '') {
            defaultLevelColor = [scope.valuecolor];
          }

          var options = {
            id: newId,
            min: scope.min || 0,
            max: scope.max || 100,
            title: scope.title,
            label: scope.label || '',
            value: scope.value,
            relativeGaugeSize: true,
            donut: donutMode,
            titlePosition: scope.titleposition,
            valueFontColor: scope.valuefontcolor,
            titleFontColor: scope.titlefontcolor,
            hideInnerShadow: scope.hideinnershadow,
            donutStartAngle: scope.donutstartangle,
            gaugeColor: scope.backgroundcolor,
            levelColors: defaultLevelColor,
          };

          scope.id = newId;

          if (scope.options) {
            Object.keys(scope.options).forEach(function (key) {
              options[key] = scope.options[key];
            });
          }

          var graph = new JustGage(options);
          // extending justGage with a minimum value refresh function
          graph.refreshMin = function (val, min) {
            var obj = this;

            // set new min
            if (min !== null) {
              obj.config.min = min;
              // TODO: update customSectors

              obj.txtMinimum = obj.config.min;
              if (obj.config.minTxt) {
                obj.txtMinimum = obj.config.minTxt;
              } else if (obj.config.humanFriendly) {
                obj.txtMinimum = humanFriendlyNumber(obj.config.min, obj.config.humanFriendlyDecimal);
              } else if (obj.config.formatNumber) {
                obj.txtMinimum = formatNumber(obj.config.min);
              }
              if (!obj.config.reverse) {
                obj.txtMin.attr({
                  text: obj.txtMinimum,
                });
                setDy(obj.txtMin, obj.params.minFontSize, obj.params.minY);
              } else {
                obj.txtMin.attr({
                  text: obj.txtMinimum,
                });
                obj.txtMin.attr({
                  text: obj.txtMinimum,
                });
                setDy(obj.txtMin, obj.params.minFontSize, obj.params.minY);
                setDy(obj.txtMin, obj.params.minFontSize, obj.params.minY);
              }
            }
            this.refresh(val, false);
          };

          element[0].closest('twx-widget').addEventListener(
            'styleReady',
            function (e) {
              var backgroundColor = window.getComputedStyle(element[0]).getPropertyValue('--backgroundColor');
              var secondaryBackgroundColor = window
                .getComputedStyle(element[0])
                .getPropertyValue('--secondaryBackgroundColor');
              var foregroundColor = window.getComputedStyle(element[0]).getPropertyValue('--foregroundColor');
              var fontSize = window.getComputedStyle(element[0]).getPropertyValue('--textSize');
              fontSize = fontSize.slice(0, -2);

              var newOptions = {
                id: newId,
                min: scope.min || 0,
                max: scope.max || 100,
                title: scope.title,
                label: scope.label || '',
                value: scope.value,
                gaugeColor: secondaryBackgroundColor,
                levelColors: [backgroundColor],
                titleFontColor: foregroundColor,
                valueFontColor: foregroundColor,
                valueMinFontSize: fontSize,
                relativeGaugeSize: true,
                donut: donutMode,
                titlePosition: scope.titleposition,
                hideInnerShadow: scope.hideinnershadow,
                donutStartAngle: scope.donutstartangle,
              };

              if (graph) {
                graph.destroy();
              }
              graph = new JustGage(newOptions);
            },
            false
          );

          scope.$watch(
            'max',
            function (updatedMax) {
              if (updatedMax !== undefined) {
                graph.refresh(scope.value, updatedMax);
              }
            },
            true
          );

          scope.$watch(
            'min',
            function (updatedMin) {
              if (updatedMin !== undefined) {
                graph.refreshMin(scope.value, updatedMin);
              }
            },
            true
          );

          scope.$watch(
            'value',
            function (updatedValue) {
              if (updatedValue !== undefined) {
                graph.refresh(updatedValue);
              }
            },
            true
          );
        });
      },
    };
  }
  var justGageModule = angular.module('ngJustGage', []);
  justGageModule.directive('justGage', ['$timeout', justGage]);
})();
