(function () {
  'use strict';

  /**
   * Service for taking screenshots.
   */
  function twxPictureService($compile, tml3dRenderer, cameraUtils) {
    const template = `
      <div class="twx-picture-service-layer">
        <div class="camera-reticle-container" ng-show="reticleShown">
          <div class="camera-reticle">
            <div class="bracket-top-left"></div>
            <div class="bracket-top-right"></div>
            <div class="bracket-bottom-right"></div>
            <div class="bracket-bottom-left"></div>
            <div class="camera-reticle-text">{{countdown}}</div>
          </div>
        </div>

        <div class="camera-confirmation-overlay" ng-show="confirmationShown">
          <div class="preview-image-container">
            <img ng-src="{{previewImageUrl}}"></img>
          </div>
          <div class="button-overlay">
            <div>
              <button class="--reject" ng-click="rejectImage()" data-wml-speech-command="{{me.cancelLabel}}">
                {{me.cancelLabel}}
              </button>
              <button class="--retake" ng-click="retakeImage()" data-wml-speech-command="{{me.retakeLabel}}">
                {{me.retakeLabel}}
              </button>
              <button class="--accept" ng-click="acceptImage()" data-wml-speech-command="{{me.acceptLabel}}">
                {{me.acceptLabel}}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    return {
      restrict: 'E',
      link: (scope, el) => {
        let hasHeader;
        const is2D = cameraUtils.is2dView(el);
        if (is2D) {
          cameraUtils.prepare2dViewForCameraFeed(el);
        }

        // Add an element for flashing efect used when taking pictures.
        const flashEl = document.createElement('div');
        flashEl.classList.add('take-screenshot-flash', 'take-screenshot-flash-fade');
        document.body.appendChild(flashEl);

        scope.enableReticleCountdown = el.attr('data-enable-reticle-countdown') === 'true';
        scope.enableConfirmationOverlay = el.attr('data-enable-confirmation-overlay') === 'true';

        // This makes sure the flash appears in preview for all platforms but not actually when run on HL.
        const isPreview = twx.app.isPreview();
        scope.shouldFlash = isPreview || scope.enableReticleCountdown;

        scope.reticleShown = false;
        scope.confirmationShown = false;
        scope.takingPicture = false;

        scope.$on('serviceInvoke', function (event, data) {
          const name = data.serviceName;
          if (scope.services[name]) {
            scope.services[name](data.params);
          }
        });

        scope.services = {
          /**
           * Takes screenshot of current view.
           */
          takePicture: function () {
            if (!tml3dRenderer.takeScreenshot) {
              console.error('takePicture: tml3dRenderer.takeScreenshot not available');
              return;
            }

            if (scope.takingPicture) {
              // Do not start taking another picture while one call is in progress.
              return;
            }

            scope.takingPicture = true;
            if (scope.enableReticleCountdown) {
              scope.takePictureAfterCountdown();
            } else {
              scope.takePictureNow();
            }
          },
        };

        function flash() {
          if (!scope.shouldFlash) {
            return;
          }

          // Class change triggers css transition.
          flashEl.classList.remove('take-screenshot-flash-fade');
          setTimeout(() => {
            flashEl.classList.add('take-screenshot-flash-fade');
          });
        }

        /**
         * Calls tickCallback every seconds for specified number of seconds. At the end calls endCallback.
         *
         * @param {Number} seconds
         * @param {Function} tickCallback
         * @param {Function} endCallback
         */
        function doCountdown(seconds, tickCallback, endCallback) {
          function tick(remaining) {
            if (remaining) {
              tickCallback(remaining);
              setTimeout(() => tick(remaining - 1), 1000);
            } else {
              endCallback();
            }
          }

          tick(seconds);
        }

        scope.takePictureAfterCountdown = () => {
          console.log('takePicture: showing a reticle and doing a countdown...');

          showCameraFeed();

          const seconds = 3;
          scope.countdown = seconds;

          scope.reticleShown = true;
          scope.$apply();

          // Show 3, 2, 1 countdown in the reticle, only after that take the picture.
          doCountdown(
            seconds,
            (seconds) => {
              scope.countdown = seconds;
              scope.$apply();
            },
            () => {
              scope.reticleShown = false;
              scope.$apply();
              scope.takePictureNow();
            }
          );
        };

        /**
         * Shows camera feed if we're running in a 2D experience without AR view.
         */
        function showCameraFeed() {
          if (is2D) {
            hasHeader = cameraUtils.hideHeader();
            cameraUtils.showCameraFeed(scope, 'twx-dt-picture');
          }
        }

        /**
         * Hides camera feed if we're running in a 2D experience without AR view.
         */
        function hideCameraFeed() {
          if (is2D) {
            cameraUtils.hideCameraFeed(scope, hasHeader, true);
          }
        }

        scope.takePictureNow = () => {
          console.log('takePicture: calling tml3dRenderer.takeScreenshot...');

          const imgFormat = 'JPEG';
          const config = {
            withAugmentation: !scope.me.isAugmentationsHidden,
            imgFormat: imgFormat,
          };

          tml3dRenderer.takeScreenshot(
            config,
            function success(data, params) {
              console.log('takePicture: tml3dRenderer.takeScreenshot succeeded');

              // Once we take the picutre play a flash animation and either apply picutre
              // data right away or first display a confirmation overlay so that user
              // can review the picture first.
              flash();
              if (scope.enableConfirmationOverlay) {
                scope.showConfirmationOverlay(data, params, imgFormat);
              } else {
                scope.applyPictureData(data, params, imgFormat);
              }

              hideCameraFeed();
              scope.$apply();
            },
            function failure(error) {
              hideCameraFeed();
              // User clicked the cancel/close icon, do not take the picture.
              scope.takingPicture = false;
              // Passing error even though it's not really specified, but in case some device sends something,
              // it could be potentialy useful.
              scope.$emit('userCanceled', error);
              scope.$apply();
              console.log('takePicture: tml3dRenderer.takeScreenshot cancelled', error);
            }
          );
        };

        /**
         * Set picture data to all bound variables and emit appropriate events to let
         * the consumers know that new data has arrived.
         *
         * @param {Object} data
         * @param {Object} params
         * @param {String} imgFormat
         */
        scope.applyPictureData = (data, params, imgFormat) => {
          scope.me.image = data;
          scope.me.imageUrl = toDataUrl(data, imgFormat);
          scope.takingPicture = false;

          scope.$emit('pictureTaken', { params: params, retryFlag: true });
          console.log('takePicture: picture data applied');
        };

        scope.showConfirmationOverlay = (data, params, imgFormat) => {
          scope.confirmationShown = true;
          scope.previewImageData = data;
          scope.previewImageUrl = toDataUrl(data, imgFormat);
          scope.params = params;
          scope.imgFormat = imgFormat;
        };

        function toDataUrl(base64, format) {
          return 'data:image/' + format.toLowerCase() + ';base64,' + base64;
        }

        scope.clearPreviewData = () => {
          scope.confirmationShown = false;
          scope.previewImageUrl = null;
          scope.previewImageData = null;
          scope.takingPicture = false;
        };

        scope.acceptImage = () => {
          scope.applyPictureData(scope.previewImageData, scope.params, scope.imgFormat);
          scope.clearPreviewData();
        };

        scope.retakeImage = () => {
          console.log('takePicture: retaking picture');
          scope.clearPreviewData();
          setTimeout(() => scope.services.takePicture());
        };

        scope.rejectImage = () => {
          console.log('takePicture: picture rejected');
          scope.clearPreviewData();
          scope.$emit('userCanceled');
        };

        // Template needs to be added at the very top of DOM to avoid getting hidden along
        // with other components when camera view is displayed.
        const templateEl = $compile(template)(scope)[0];
        document.body.appendChild(templateEl);

        scope.$on('$destroy', () => {
          // In case component gets destroyed make sure to remove elements it was using.
          // This is mainly for unit tests.
          templateEl.remove();
          flashEl.remove();
        });
      },
    };
  }

  angular
    .module('ngPictureService', ['vuforia-angular', 'ngCameraUtils'])
    .directive('twxPictureService', ['$compile', 'tml3dRenderer', 'cameraUtils', twxPictureService]);
})();
