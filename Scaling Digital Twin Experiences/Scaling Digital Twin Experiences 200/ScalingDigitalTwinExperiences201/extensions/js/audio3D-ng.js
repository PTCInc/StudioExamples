if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'audio3D-ng';
}

(function () {
  'use strict';

  function ngAudio3D($timeout, $http, $window, $injector, $sce, widget3dUtils) {
    return {
      restrict: 'EA',
      scope: {
        isholoField: '@',
        srcField: '@',
        widthField: '@',
        heightField: '@',
        showcontrolsField: '@',
        idField: '@',
        visibleField: '@',
        playingField: '=',
        tagalongField: '@',
        delegateField: '=',
      },

      link: function (scope, element, attr) {
        console.log('audio3D-ng loaded');
        scope.data = {
          width: 0.04,
          height: 0.04,
          showControls: true,
          src: '',
        };

        scope.renderer = $window.cordova ? vuforia : $injector.get('threeJsTmlRenderer');

        function prevBtnId() {
          return scope.idField + '-prev';
        }
        function nextBtnId() {
          return scope.idField + '-next';
        }
        function stopBtnId() {
          return scope.idField + '-stop';
        }
        function playBtnId() {
          return scope.idField + '-play';
        }
        function playbackId() {
          return scope.idField + '-audioplayback';
        }
        function pinBtnId() {
          return scope.idField + '-pin';
        }
        function panelId() {
          return scope.idField + '-panel';
        }

        scope.groupWidget = element[0].children.namedItem(scope.idField);
        scope.panelWidget = scope.groupWidget.children.namedItem(panelId());
        scope.playbackWidget = scope.groupWidget.children.namedItem(playbackId());
        scope.prevBtnWidget = scope.groupWidget.children.namedItem(prevBtnId()).children.namedItem(prevBtnId());
        scope.nextBtnWidget = scope.groupWidget.children.namedItem(nextBtnId()).children.namedItem(nextBtnId());
        scope.stopBtnWidget = scope.groupWidget.children.namedItem(stopBtnId()).children.namedItem(stopBtnId());
        scope.playBtnWidget = scope.groupWidget.children.namedItem(playBtnId()).children.namedItem(playBtnId());
        scope.pinBtnWidget = scope.groupWidget.children.namedItem(pinBtnId()).children.namedItem(pinBtnId());

        let relocateWidgetElements = function (width, height, showControlsFlag) {
          // Calculate new position for buttons:
          const pinBtnPosSize = widget3dUtils.getPanelPinButtonRelativePositionAndSize(width, height);
          const mediaBtnsPosSize = widget3dUtils.getPanelMediaControlButtonsRelativePositionsAndSize(width, height);

          // Calculate new position for image:
          let playbackHeight = height - widget3dUtils.PanelEdgeMinMargin * 2;
          if (showControlsFlag) {
            playbackHeight -= widget3dUtils.PanelChildWidgetsMinMargin + mediaBtnsPosSize.size;
          }

          let yLocPlayback = height / 2 - widget3dUtils.PanelEdgeMinMargin - playbackHeight / 2;

          if (twx.app.isPreview()) {
            scope.renderer.setDimention(panelId(), width, height);

            scope.playbackWidget.setAttribute('x', 0);
            scope.playbackWidget.setAttribute('y', yLocPlayback);
            scope.playbackWidget.setAttribute('z', 0);

            if (showControlsFlag) {
              scope.renderer.setDimention(prevBtnId(), mediaBtnsPosSize.size, mediaBtnsPosSize.size);
              scope.prevBtnWidget.setAttribute('x', mediaBtnsPosSize.xSkipB);
              scope.prevBtnWidget.setAttribute('y', mediaBtnsPosSize.y);
              scope.prevBtnWidget.setAttribute('z', 0);

              scope.renderer.setDimention(nextBtnId(), mediaBtnsPosSize.size, mediaBtnsPosSize.size);
              scope.nextBtnWidget.setAttribute('x', mediaBtnsPosSize.xSkipA);
              scope.nextBtnWidget.setAttribute('y', mediaBtnsPosSize.y);
              scope.nextBtnWidget.setAttribute('z', 0);

              scope.renderer.setDimention(stopBtnId(), mediaBtnsPosSize.size, mediaBtnsPosSize.size);
              scope.stopBtnWidget.setAttribute('x', mediaBtnsPosSize.xStop);
              scope.stopBtnWidget.setAttribute('y', mediaBtnsPosSize.y);
              scope.stopBtnWidget.setAttribute('z', 0);

              scope.renderer.setDimention(playBtnId(), mediaBtnsPosSize.size, mediaBtnsPosSize.size);
              scope.playBtnWidget.setAttribute('x', mediaBtnsPosSize.xPlay);
              scope.playBtnWidget.setAttribute('y', mediaBtnsPosSize.y);
              scope.playBtnWidget.setAttribute('z', 0);
            }

            scope.renderer.setDimention(pinBtnId(), pinBtnPosSize.size, pinBtnPosSize.size);
            scope.pinBtnWidget.setAttribute('x', pinBtnPosSize.x);
            scope.pinBtnWidget.setAttribute('y', pinBtnPosSize.y);
            scope.pinBtnWidget.setAttribute('z', pinBtnPosSize.z);
          }
        };

        function playAudio() {
          scope.playingField = true;
          console.log('play ' + scope.idField);
          scope.$parent.fireEvent('playstarted');
          if (scope.renderer.playAudio) {
            scope.renderer.playAudio(playbackId());
          }
        }

        function pauseAudio() {
          scope.playingField = false;
          console.log('pause ' + scope.idField);
          scope.$parent.fireEvent('playpaused');
          if (scope.renderer.pauseAudio) {
            scope.renderer.pauseAudio(playbackId());
          }
        }

        function stopAudio() {
          scope.playingField = false;
          console.log('stop ' + scope.idField);
          scope.$parent.fireEvent('playended');
          if (scope.renderer.stopAudio) {
            scope.renderer.stopAudio(playbackId());
          }
        }

        function skipAheadAudio() {
          console.log('skip ahead ' + scope.idField);
          if (scope.renderer.skipAheadAudio) {
            scope.renderer.skipAheadAudio(playbackId());
          }
        }

        function skipBackAudio() {
          console.log('skip back ' + scope.idField);
          if (scope.renderer.skipBackAudio) {
            scope.renderer.skipBackAudio(playbackId());
          }
        }

        function isBool(v) {
          return v === 'true' || v === true;
        }

        scope.$root.$on('pressed', function (evt, src) {
          if (nextBtnId() === src) {
            // User tapped the skip ahead button
            console.log(scope.idField + ' userpick next button');
            skipAheadAudio();
          } else if (prevBtnId() === src) {
            // User tapped the skip back button
            console.log(scope.idField + ' userpick prev button');
            skipBackAudio();
          } else if (stopBtnId() === src) {
            // User tapped the stop button
            console.log(scope.idField + ' userpick stop button');
            stopAudio();
          } else if (playBtnId() === src) {
            // User tapped the play button
            console.log(scope.idField + ' userpick play button');
            playAudio();
          } else if (pinBtnId() === src) {
            // User tapped the pin button
            console.log(scope.idField + ' userpick pin button');
            scope.tagalongField = true;
          }
        });

        // User tapped the pause button
        scope.$root.$on('unpressed', function (evt, src) {
          if (playBtnId() === src) {
            console.log(scope.idField + ' userpick play button');
            pauseAudio();
          } else if (pinBtnId() === src) {
            console.log(scope.idField + ' userpick pin button');
            scope.tagalongField = false;
          }
        });

        // Recieved play ended from View
        scope.$root.$on('playended', function (evt, elementID, elementTagName, jsonData) {
          if (elementID === playbackId()) {
            $timeout(function () {
              scope.playingField = false;
            }, 1);
          }
        });

        scope.$watchGroup(['showcontrolsField'], function () {
          const showcontrols = isBool(scope.showcontrolsField);
          if (scope.data.showControls !== showcontrols) {
            scope.data.showControls = showcontrols;
            const hidden = !(scope.data.showControls && isBool(scope.visibleField));
            scope.prevBtnWidget.setAttribute('hidden', hidden);
            scope.nextBtnWidget.setAttribute('hidden', hidden);
            scope.stopBtnWidget.setAttribute('hidden', hidden);
            scope.playBtnWidget.setAttribute('hidden', hidden);
            relocateWidgetElements(scope.data.width, scope.data.height, isBool(scope.data.showControls));
          }
        });

        scope.$watchGroup(['widthField', 'heightField'], function () {
          scope.data.width = scope.widthField !== undefined ? scope.widthField : 0.18;
          scope.data.height = scope.heightField !== undefined ? scope.heightField : 0.06;
          relocateWidgetElements(scope.data.width, scope.data.height, isBool(scope.data.showControls));
        });

        scope.$watch('tagalongField', function () {
          scope.groupWidget.setAttribute('tagalong', scope.tagalongField);
        });

        // Handle external events (service calls)
        scope.$watch('delegateField', function (delegate) {
          if (delegate) {
            delegate.play = playAudio;
            delegate.pause = pauseAudio;
            delegate.stop = stopAudio;
            delegate.skipahead = skipAheadAudio;
            delegate.skipback = skipBackAudio;
          }
        });
      },
    };
  }

  var Audio3DModule = angular.module('audio3D-ng', ['ngWidget3dUtils']);
  Audio3DModule.directive('ngAudio3d', [
    '$timeout',
    '$http',
    '$window',
    '$injector',
    '$sce',
    'widget3dUtils',
    ngAudio3D,
  ]);
})();
