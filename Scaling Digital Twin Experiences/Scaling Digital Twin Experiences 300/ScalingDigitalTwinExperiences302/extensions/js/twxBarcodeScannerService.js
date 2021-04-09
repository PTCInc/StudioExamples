(function () {
  'use strict';

  const SCAN_HISTORY_ITEM_LIMIT = 15;

  function twxBarcodeScannerService($rootScope, $compile, renderer, cameraUtils) {
    return {
      restrict: 'A',
      link: function (scope, el) {
        const is2D = cameraUtils.is2dView(el);

        let controlPanelScope;
        const containerParentElement =
          parent && parent.document ? angular.element(parent.document.getElementById('scan-controls-container')) : null;
        let hasHeader;

        if (is2D) {
          cameraUtils.prepare2dViewForCameraFeed(el);
        }

        /**
         * Opens up the Scan Widget
         * It shows the scanner overlay,
         * hides the 2D widgets and (if the 'Hide AR Augmentations' property is set to true) 3D models/augmentations of 3D/AR project
         * and shows the Studio Preview Scan control panel if in Studio Preview screen.
         */
        scope.startScan = () => {
          if (scope.me.visible) {
            return;
          }

          scope.me.visible = true;
          $rootScope.barcodeScannerActive = true;
          hasHeader = cameraUtils.hideHeader();
          const twx2dOverlay = cameraUtils.get2dOverlay();

          // hide 2D and 3D/AR widgets/augmentations
          if (is2D) {
            cameraUtils.showCameraFeed(scope, 'twx-barcode-scanner');
          } else {
            // hide 2D layer of 3D/AR View
            if (twx2dOverlay) {
              twx2dOverlay.style.display = 'none';
            }

            //hide augmentations if the 'Hide AR Augmentations' property is enabled
            if (scope.me.isAugmentationsHidden) {
              if (!scope.me.hiddenWidgets) {
                scope.me.hiddenWidgets = twx.app.fn.hideAll3DWidgets();
              } else {
                twx.app.fn.hideAll3DWidgets(scope.me.hiddenWidgets);
              }
            }
          }

          if (renderer.scanForNextBarCode) {
            renderer.scanForNextBarCode(
              (scannedValue) => {
                scope.me.scannedValue = scannedValue;
                scope.stopScan();
                scope.$emit('valueacquired', scannedValue);
              },
              function (e) {
                //Hololens will call this error callback if the user manually cancels the scan
                scope.stopScan();
                console.log('scanForNextBarCode was manually cancelled or had an error', e);
              }
            );
          }

          scope.$applyAsync();

          // open Studio Preview Scan control panel
          if (controlPanelScope) {
            controlPanelScope.showControls = true;
          }
        };

        /**
         * Closes the Scan Widget
         * It hides the scanner overlay,
         * shows back the 2D widgets and (if the 'Hide AR Augmentations' property is set to true) 3D models/augmentations of 3D/AR project
         * and hides the Studio Preview Scan control panel if in Studio Preview screen.
         */
        scope.stopScan = () => {
          if (!scope.me.visible) {
            return;
          }

          scope.me.visible = false;
          $rootScope.barcodeScannerActive = false;

          if (renderer.stopBarCodeScanning) {
            renderer.stopBarCodeScanning();
          }

          cameraUtils.hideCameraFeed(scope, hasHeader, is2D);

          // TODO: Why is usercanceled fired when value is acquired?
          scope.$emit('usercanceled');

          scope.$applyAsync();

          // hide Studio Preview Scan control panel
          if (controlPanelScope) {
            controlPanelScope.showControls = false;
          }
        };

        scope.$on('serviceInvoke', function (evt, data) {
          if (is2D) {
            return;
          }

          const name = data.serviceName;
          if (scope[name]) {
            scope[name](data.params); // Invoke the method if its found
          }
        });

        /**
         * Setting up the Scanner Control Panel to simulate barcode scan on the Studio Preview page
         */
        // check if it's Studio Preview page
        if (containerParentElement.length < 1) {
          return;
        }

        function updateScanHistory(scannedValue) {
          // remove from list if duplicated
          const existingItemIndex = controlPanelScope.scanHistory.indexOf(scannedValue);
          if (existingItemIndex > -1) {
            controlPanelScope.scanHistory.splice(existingItemIndex, 1);
          }

          controlPanelScope.scanHistory.unshift(scannedValue);
          controlPanelScope.scanHistory = controlPanelScope.scanHistory.slice(0, SCAN_HISTORY_ITEM_LIMIT);

          localStorage.setItem('scanHistory', JSON.stringify(controlPanelScope.scanHistory));
        }
        // create a new scope for Scanner Control Panel
        controlPanelScope = $rootScope.$new();

        controlPanelScope.showControls = false;
        controlPanelScope.scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];
        controlPanelScope.submitScan = (scannedValue) => {
          scope.me.scannedValue = scannedValue;
          scope.$emit('valueacquired', scannedValue);

          updateScanHistory(scannedValue);
          scope.stopScan();
        };
        controlPanelScope.selectHistoryItem = (item) => {
          controlPanelScope.scanValue = item;
          controlPanelScope.showDropdown = false;
        };

        controlPanelScope.openDropdown = () => {
          controlPanelScope.showDropdown = true;
          controlPanelScope.scanValue = '';
        };

        // use iframe's parent i18next
        const i18n = parent.window.i18next;
        // Scanner Control Panel template
        const controlPanelTemplate = `
          <div class="scan-controls twxTree" ng-class="{'hidden': !showControls}">
            <div class="scan-controls__label header">
              <span>${i18n.t('ves-ar-extension:Scan')}</span>
            </div>

            <div class="twxWidgetPropsSection">
              <div class="twxTreeRow twxTreeSectionHeader scan-controls__label">
                <span>${i18n.t('Properties')}</span>
              </div>
              <form name="scanCtrlForm${
                controlPanelScope.$id
              }" class="scan-controls__input padded" autocomplete="off" novalidate>
                <label>${i18n.t('ves-ar-extension:barcode-scanned-value')}</label>
                <div class="twxSelect dropdown-selectsize">
                  <input ng-model="scanValue" name="${
                    scope.me.widgetName
                  }-input" ng-click="openDropdown()" ng-blur="showDropdown = false"
                    required />

                  <div class="scan-controls__input item-list" data-selectable ng-if="showDropdown">
                    <div class="scan-controls__input item" ng-repeat="element in scanHistory | filter:scanValue track by $index"
                      ng-mousedown="selectHistoryItem(element)">
                      {{ element }}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div class="twxWidgetPropsSection">
              <div class="twxTreeRow twxTreeSectionHeader scan-controls__label">
                <span>${i18n.t('Events')}</span>
              </div>
              <div class="scan-controls__button padded" ng-class="{disabled: scanCtrlForm${
                controlPanelScope.$id
              }.$invalid}">
               <span class="scan-play"  ng-click="scanCtrlForm${
                 controlPanelScope.$id
               }.$valid? submitScan(scanValue): null">
                 <span class="iconSmall iconPlay"></span>
                 <button class="twxButton">
                   ${i18n.t('ves-ar-extension:barcode-value-acquired')}
                 </button>
               </span>
              </div>
            </div>
          </div>`;

        // Append the Scanner Control Panel to the Preview DOM
        const controlPanelElement = $compile(controlPanelTemplate)(controlPanelScope);
        containerParentElement.append(controlPanelElement);
      },
    };
  }

  angular
    .module('ngBarcodeScannerService', ['vuforia-angular', 'ngCameraUtils'])
    .directive('twxBarcodeScannerService', [
      '$rootScope',
      '$compile',
      'tml3dRenderer',
      'cameraUtils',
      twxBarcodeScannerService,
    ]);
})();
