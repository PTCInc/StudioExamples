/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
(function () {
  'use strict';

  // twxRange directive is created for overcomming the issue with input[type=range] html element. The issue looks like when setting the max/min dynamically the initial and last positions are not always set correctly.
  // See https://github.com/ionic-team/ionic/issues/1948
  function twxRange() {
    var linker = function (scope, element, attrs, controllers) {
      var ngModelController = controllers[0];

      attrs.$observe('minvalue', function (value) {
        element.attr('min', value);
        ngModelController.$render();
      });

      attrs.$observe('maxvalue', function (value) {
        element.attr('max', value);
        ngModelController.$render();
      });

      attrs.$observe('stepvalue', function (value) {
        element.attr('step', value);
        ngModelController.$render();
      });
    };

    return {
      restrict: 'A',
      require: ['ngModel'],
      link: linker
    };
  }

  function twxPopupService() {
    return {
      restrict: 'A',
      link: function (scope) {
        scope.hidepopup = function() {
          scope.me.visible = false;
          scope.$applyAsync();
        };
        scope.showpopup = function() {
          scope.me.visible = true;
          scope.$applyAsync();
        };
        scope.$on('serviceInvoke', function(evt, data) {
          var name = data.serviceName;
          if (scope[name]) {
            scope[name](data.params); // Invoke the method if its found
          }
        });
      }
    };
  }

  function twxTabs(){

    var linker = function(scope, element, attrs){
      //element.html(getTemplate(element));
      //$compile(element.contents())(scope);
      scope.stripclass = attrs.stripclass;
    };


    return {
      restrict: 'E',
      link: linker,
      template: function (elem) {
        return '<div class="button-bar bar-light tabs-strip"></div><div class="tab-content">' + elem.html() + '</div>';
      },
      controller: ['$scope', '$element', '$parse', function ($scope, $element, $parse) {
        let element = $element[0];
        $scope._tabElements = [];

        this.registerTab = function (tabElement) {
          $scope._tabElements.push(tabElement);
          var tabEl = document.createElement('div');
          tabEl.className = 'button tab-strip-item ' + $element.attr('stripclass');
          var tabStripEl = element.querySelector('.tabs-strip');
          tabStripEl.appendChild(tabEl);
          //select the first tab when loaded
          if($scope._tabElements.length > 0){
            angular.element(element.querySelector('.tab-strip-item')).addClass('active');
          }

          tabEl.addEventListener('click', function(event){
            angular.element(element.querySelectorAll('.tab-strip-item')).removeClass('active');
            angular.forEach($scope._tabElements, function(tab){
              tab.css('display', 'none');
            });
            tabElement.css('display', 'block');
            angular.element(tabEl).addClass('active');
            try {
              var fn = $parse($element.attr('clicktab'), /* interceptorFn */ null, /* expensiveChecks */ true);
              fn($scope, {$event: event});
            } catch(err) {
              console.log(err);
            }
          });
          if ($scope._tabElements.length > 1) {
            tabElement.css('display', 'none');
          }
          return tabEl;
        };
      }]
    };
  }

  function twxTab() {
    var linker = function (scope, element, attrs, controllers) {

      element.tabsController = controllers[0];
      element.tabItemEl = element.tabsController.registerTab(element);

      attrs.$observe('title', function (value) {
        element.tabItemEl.textContent = value;
      });
    };

    return {
      restrict: 'E',
      require: ["^twxTabs"],
      link: linker
    };
  }

  function twxLink($window) {
    return {
      restrict: 'EA',
      link: function(scope) {
        if ($window.inf) {
          scope.$watch('me.url', function(newVal) {
            if (newVal) {
              if (!newVal.startsWith('http')) {
                var a = document.createElement('a');
                a.href = newVal;
                newVal = a.href; //Fully qualified now
              }
              // DT-28239 block bad default protocol-only urls (http:// and https://)
              if (!/https?:\/?\/?$/i.test(newVal)) {
                $window.inf.allowIntent(newVal);
                //ios Wants the URL without %20 for spaces for some reason for relative urls
                //Registering both intents to be more fully protected against other OS flavors and future versions
                $window.inf.allowIntent(decodeURI(newVal));
              }
            }
          });
        }
      }

    };
  }

  var twxMobileModule = angular.module('common-html-widgets-ng', [])
    .directive('twxTabs', [twxTabs])
    .directive('twxTab', [twxTab])
    .directive('twxPopupService', twxPopupService)
    .directive('twxRange', [twxRange]);

  twxMobileModule.directive('twxLink', twxLink);
}());
