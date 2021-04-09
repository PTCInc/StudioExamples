(function () {
  'use strict';

  /**
   * Service with function that are used by widgets that need to display camera feed
   * in 2D experiences, that normally do not have an AR view.
   */
  function cameraUtils(renderer) {
    return {
      getViewOverlay() {
        return document.querySelector('.twx-view-overlay');
      },

      get2dOverlay() {
        return document.querySelector('.twx-2d-overlay');
      },

      /**
       * Is widget displayed on a 2d view, such as the one in 2d eyewear.
       *
       * @param {HTMLElement} el
       */
      is2dView(el) {
        const viewElementsList = Array.from(document.querySelectorAll('ion-view'));
        const viewElements = viewElementsList.filter((view) => view.contains(el[0]));
        const viewElementTypeAttribute = viewElements.length > 0 ? viewElements[0].getAttribute('view-type') : '';
        // Wasn't mobile-2D deprecated? Still maybe keep it just in case.
        return viewElementTypeAttribute === 'mobile-2D' || viewElementTypeAttribute === 'hmt-2D';
      },

      /**
       * @param {HTMLElement} el
       */
      prepare2dViewForCameraFeed(el) {
        el[0].parentNode.classList.add('is2DWidgetContent');

        //The view-overlay hides the "camera" bg that the twx-dt-view is adding the screen.
        //The dt-view is needed to show the camera feed through while scanning
        //But after turning off the scan and hiding the dt-view, it still show through.
        //Will need a fix in vuforia-angular or View to get this workaround removed to an api call
        if (this.getViewOverlay()) {
          //Apply the user custom color to the overlay div
          const origView = el[0]
            .closest('ion-view')
            .querySelector('[original-widget="twx-view"] > twx-widget-content > twx-container-content');
          let computedStyle = window.getComputedStyle(origView);

          //For the theme, its background-color is not being inherited, so look it up.
          if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || computedStyle.backgroundColor === 'transparent') {
            computedStyle = window.getComputedStyle(el[0].closest('ion-view'));
          }
          this.getViewOverlay().style.backgroundColor = computedStyle.backgroundColor;
        }

        // stop the camera for 2D project at start
        if (renderer.pauseAR) {
          renderer.pauseAR();
        }
      },

      /**
       * Shows the camera feed at the same time hiding 2D widgets.
       *
       * @param {Object} scope
       * @param {String} widgetToSkipHiding skip hiding widget whith this tag name
       */
      showCameraFeed(scope, widgetToSkipHiding) {
        // hide 2D and 3D/AR widgets/augmentations
        if (renderer.resumeAR) {
          renderer.resumeAR();
        }

        // hide the 2D project white overlay over the device camera image
        this.getViewOverlay().style.display = 'none';

        // hide the 2D project widgets
        if (!scope.me.hiddenWidgets) {
          const widgetElements = document
            .querySelector('twx-widget[original-widget="twx-view"]')
            .querySelectorAll('twx-widget:not([original-widget="' + widgetToSkipHiding + '"])');

          scope.me.hiddenWidgets = [];

          widgetElements.forEach((elem) => {
            scope.me.hiddenWidgets.push(elem);
            elem.hidden = true;
          });
        } else {
          scope.me.hiddenWidgets.forEach((elem) => {
            elem.hidden = true;
          });
        }
      },

      /**
       * Hides the header of multi-view project preview.
       *
       * @returns {Boolean} whether the header was originally present or not
       */
      hideHeader() {
        const ionContentElement = document.querySelector('ion-content');
        const hasHeader = ionContentElement ? ionContentElement.classList.contains('has-header') : false;
        if (hasHeader) {
          ionContentElement.classList.remove('has-header');
          document.querySelector('ion-nav-bar').style.display = 'none';
        }

        return hasHeader;
      },

      /**
       * Disables camera feed.
       *
       * @param {Object} scope
       * @param {Boolean} hasHeader
       * @param {Boolean} is2D
       */
      hideCameraFeed(scope, hasHeader, is2D) {
        const ionContentElement = document.querySelector('ion-content');
        const twx2dOverlay = this.get2dOverlay();

        // show the headder of multi-view project preview
        if (hasHeader) {
          ionContentElement.classList.add('has-header');
          document.querySelector('ion-nav-bar').style.display = 'inline';
        }

        // show the 3D/AR project 2D widgets overlay
        if (twx2dOverlay) {
          twx2dOverlay.style.display = 'block';
        }

        // show the 2D project white overlay over the device camera image
        if (is2D) {
          this.getViewOverlay().style.display = 'block';
          if (renderer.pauseAR) {
            renderer.pauseAR();
          }
        }

        // show the 2D and 3D/AR widgets/augs back
        if (scope.me.hiddenWidgets) {
          scope.me.hiddenWidgets.forEach((elem) => {
            if (is2D) {
              elem.hidden = false;
            } else {
              elem.me.forceHidden = elem.me.initForceHidden;
              elem.me.visible = elem.me.initVisible;
            }
          });

          delete scope.me.hiddenWidgets;
        }
      },
    };
  }

  angular.module('ngCameraUtils', ['vuforia-angular']).service('cameraUtils', ['tml3dRenderer', cameraUtils]);
})();
