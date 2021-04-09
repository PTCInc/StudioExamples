if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'video3D-ng';
}

(function () {
  'use strict';
  const minWidth = 0.22;
  const minHeight = 0.186;

  function ngVideo3D($timeout, $http, $window, $injector, $sce, widget3dUtils) {
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
        buttonsSizeField: '@',
        delegateField: '=',
        videoImageField: '=',
      },

      link: function (scope, element, attr) {
        scope.data = {
          width: 0.04,
          height: 0.04,
          showControls: true,
          src: '',
          videoWidth: 1,
          videoHeight: 1,
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
        function imageId() {
          return scope.idField + '-image';
        }
        function pinBtnId() {
          return scope.idField + '-pin';
        }
        function panelId() {
          return scope.idField + '-panel';
        }
        scope.groupWidget = element[0].children.namedItem(scope.idField);
        scope.panelWidget = scope.groupWidget.children.namedItem(panelId());
        scope.imageWidget = scope.groupWidget.children.namedItem(imageId());
        scope.prevBtnWidget = scope.groupWidget.children.namedItem(prevBtnId()).children.namedItem(prevBtnId());
        scope.nextBtnWidget = scope.groupWidget.children.namedItem(nextBtnId()).children.namedItem(nextBtnId());
        scope.stopBtnWidget = scope.groupWidget.children.namedItem(stopBtnId()).children.namedItem(stopBtnId());
        scope.playBtnWidget = scope.groupWidget.children.namedItem(playBtnId()).children.namedItem(playBtnId());
        scope.pinBtnWidget = scope.groupWidget.children.namedItem(pinBtnId()).children.namedItem(pinBtnId());

        // Draws an Image and a label on a 3D Press Button
        const relocateWidgetElements = function (width, height, showControlsFlag) {
          // Calculate new position for buttons:
          const pinBtnPosSize = widget3dUtils.getPanelPinButtonRelativePositionAndSize(width, height);
          const mediaBtnsPosSize = widget3dUtils.getPanelMediaControlButtonsRelativePositionsAndSize(width, height);

          // Calculate new position for image:
          const imageWidth = width - widget3dUtils.PanelEdgeMinMargin * 2;
          let imageHeight = height - widget3dUtils.PanelEdgeMinMargin * 2;
          if (showControlsFlag) {
            imageHeight -= widget3dUtils.PanelChildWidgetsMinMargin + mediaBtnsPosSize.size;
          }

          const yLocImage = height / 2 - widget3dUtils.PanelEdgeMinMargin - imageHeight / 2;

          if (twx.app.isPreview()) {
            scope.renderer.setDimention(panelId(), width, height);

            scope.renderer.setDimention(imageId(), imageWidth, imageHeight);
            scope.imageWidget.setAttribute('x', 0);
            scope.imageWidget.setAttribute('y', yLocImage);
            scope.imageWidget.setAttribute('z', 0);

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

        const updateElements = function (scope, source) {
          if (scope.data.width < minWidth) {
            scope.data.width = minWidth;
          }
          if (scope.data.height < minHeight) {
            scope.data.height = minHeight;
          }

          relocateWidgetElements(scope.data.width, scope.data.height, isBool(scope.data.showControls));
        };

        var playVideo = function () {
          $timeout(function () {
            scope.playingField = true;
            console.log('play ' + scope.idField);
            scope.$parent.fireEvent('playstarted');
            if (scope.renderer.playVideo) {
              scope.renderer.playVideo(imageId());
            }
          }, 1);
        };

        const pauseVideo = function () {
          $timeout(function () {
            scope.playingField = false;
            console.log('pause ' + scope.idField);
            scope.$parent.fireEvent('playpaused');
            if (scope.renderer.pauseVideo) {
              scope.renderer.pauseVideo(imageId());
            }
          }, 1);
        };

        const stopVideo = function () {
          $timeout(function () {
            scope.playingField = false;
            console.log('stop ' + scope.idField);
            scope.$parent.fireEvent('playended');
            if (scope.renderer.stopVideo) {
              scope.renderer.stopVideo(imageId());
            }
          }, 1);
        };

        const skipAheadVideo = function () {
          $timeout(function () {
            console.log('skip ahead ' + scope.idField);
            if (scope.renderer.skipAheadVideo) {
              scope.renderer.skipAheadVideo(imageId());
            }
          }, 1);
        };

        const skipBackVideo = function () {
          $timeout(function () {
            console.log('skip back ' + scope.idField);
            if (scope.renderer.skipBackVideo) {
              scope.renderer.skipBackVideo(imageId());
            }
          }, 1);
        };

        function isBool(v) {
          return v === 'true' || v === true;
        }

        scope.$root.$on('pressed', function (evt, src) {
          if (nextBtnId() === src) {
            // User tapped the skip ahead button
            console.log(scope.idField + ' userpick next button');
            skipAheadVideo();
          } else if (prevBtnId() === src) {
            // User tapped the skip back button
            console.log(scope.idField + ' userpick prev button');
            skipBackVideo();
          } else if (stopBtnId() === src) {
            // User tapped the stop button
            console.log(scope.idField + ' userpick stop button');
            stopVideo();
          } else if (playBtnId() === src) {
            // User tapped the play button
            console.log(scope.idField + ' userpick play button');
            playVideo();
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
            pauseVideo();
          } else if (pinBtnId() === src) {
            console.log(scope.idField + ' userpick pin button');
            scope.tagalongField = false;
          }
        });

        // Recieved play ended from View
        scope.$root.$on('playended', function (evt, elementID, elementTagName, jsonData) {
          if (imageId() === elementID) {
            $timeout(function () {
              scope.playingField = false;
            }, 1);
          }
        });

        scope.$root.$on('loaded3DObj', (event, args) => {
          // Need to check inited flag as setTexture actually fires loaded3DObj event,
          // so we would end up in an endless loop.
          if (imageId() === args.name) {
            updateVideoFrame();
          }
        });

        function updateVideoFrame() {
          if (!twx.app.isPreview()) {
            return;
          }

          if (scope.currentFrameSrc !== scope.srcField) {
            // Source changed, will need to get new frame data.
            scope.currentFrameInfo = undefined;
            scope.currentFrameSrc = scope.srcField;
          } else if (!scope.currentFrameInfo) {
            // New frame data was already requested, but it's not yet ready.
            // Don't request it again.
            return;
          }

          if (scope.currentFrameInfo) {
            // We already have frame and the soruce hasn't changed - just apply it.
            applyVideoFrame();
            return;
          }

          extractVideoFrame(scope.srcField).then(
            (args) => {
              scope.currentFrameInfo = args;
              applyVideoFrame();
              scope.$apply();
            },
            () => {
              updateElements(scope);
              scope.$apply();
            }
          );
        }

        function applyVideoFrame() {
          updateWidgetSize(scope.currentFrameInfo);
          scope.imageWidget.setAttribute('src', scope.currentFrameInfo.dataUrl || '');
          updateElements(scope);
        }

        function updateWidgetSize(args) {
          scope.data.videoWidth = args.width;
          scope.data.videoHeight = args.height;
          if (!scope.data.width || scope.data.width < minWidth) {
            scope.data.width = minWidth;
          }
          let ratio = scope.data.videoHeight / scope.data.videoWidth;
          scope.data.height =
            (scope.data.width - widget3dUtils.PanelEdgeMinMargin * 2) * ratio + widget3dUtils.PanelEdgeMinMargin * 2;

          if (scope.data.showControls) {
            scope.data.height += widget3dUtils.PanelChildWidgetsMinMargin + Number(scope.buttonsSizeField);
          }

          if (scope.data.height < minHeight) {
            scope.data.height = minHeight;
            let videoHeight = scope.data.height - widget3dUtils.PanelEdgeMinMargin * 2;
            if (scope.data.showControls) {
              videoHeight -= widget3dUtils.PanelChildWidgetsMinMargin + Number(scope.buttonsSizeField);
            }
            scope.data.width = videoHeight / ratio + widget3dUtils.PanelEdgeMinMargin * 2;
            scope.buttonsSizeField = widget3dUtils.getPanelMediaControlButtonsSize(scope.data.width);
          }
          scope.heightField = scope.data.height;
          scope.widthField = scope.data.width;
        }

        scope.$watchGroup(['srcField'], function () {
          if (twx.app.isPreview()) {
            updateVideoFrame();
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
            if (scope.data.width && scope.data.height && scope.data.showControls !== undefined) {
              updateElements(scope);
            }
          }
        });

        scope.$watchGroup(['widthField'], function () {
          scope.data.width = Number(scope.widthField);
          if (scope.data.width && scope.data.height && scope.data.showControls !== undefined) {
            updateElements(scope);
          }
        });

        scope.$watchGroup(['heightField'], function () {
          scope.data.height = Number(scope.heightField);
          if (scope.data.width && scope.data.height && scope.data.showControls !== undefined) {
            updateElements(scope);
          }
        });

        scope.$watch('tagalongField', function () {
          scope.groupWidget.setAttribute('tagalong', scope.tagalongField);
        });

        // Handle external events (service calls)
        scope.$watch('delegateField', function (delegate) {
          if (delegate) {
            delegate.play = function () {
              playVideo();
            };
            delegate.pause = function () {
              pauseVideo();
            };
            delegate.stop = function () {
              stopVideo();
            };
            delegate.skipahead = function () {
              skipAheadVideo();
            };
            delegate.skipback = function () {
              skipBackVideo();
            };
          }
        });

        function extractVideoFrame(src) {
          return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = widget3dUtils.externalizeUrl(src);
            video.currentTime = 0.33; // Approximately 10th frame, don't use the first one.
            video.onerror = function () {
              console.warn('Video extracting error: ', video.error.message);
              reject();
            };
            video.load();

            video.addEventListener('canplay', () => {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const context = canvas.getContext('2d');
              context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              resolve({
                // jpeg doesn't seem to work with setTexture.
                dataUrl: canvas.toDataURL('image/png'),
                width: video.videoWidth,
                height: video.videoHeight,
              });
            });
          });
        }
      },
    };
  }

  var Video3DModule = angular.module('video3D-ng', ['ngWidget3dUtils']);
  Video3DModule.directive('ngVideo3d', [
    '$timeout',
    '$http',
    '$window',
    '$injector',
    '$sce',
    'widget3dUtils',
    ngVideo3D,
  ]);
})();
