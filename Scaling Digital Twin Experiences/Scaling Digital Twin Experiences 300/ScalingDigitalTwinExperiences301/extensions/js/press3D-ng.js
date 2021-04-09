if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'press3D-ng';
}

(function () {
  'use strict';

  function ngPress3D($window, $injector, widget3dUtils) {
    return {
      restrict: 'EA',
      scope: {
        isholoField: '@',
        widthField: '@',
        heightField: '@',
        fontField: '@',
        idField: '@',
        disabledField: '@',
        textField: '@',
        srcField: '@',
        visibleField: '@',
      },
      link: function (scope, element, attr) {
        scope.data = {
          width: 0.04,
          height: 0.04,
          fontColor: '#ffffff',
          disabled: false,
          text: '',
          src: '',
        };

        scope.buttonWidget = element[0].children.namedItem(scope.idField);

        /**
         * Draws an Image and a label on a 3D Press Button
         * @param {*} widget
         * @param {*} src
         * @param {*} text
         * @param {*} pressed
         */
        function drawIconAndLabel(widget, src, text) {
          widget.id = scope.idField;
          return widget3dUtils.generateLabelAndIconImage(widget, src, text).then((imageData) => {
            scope.buttonWidget.setAttribute('src', imageData || '');
          });
        }

        const updateTexture = function () {
          drawIconAndLabel(scope.data, scope.data.src, scope.data.text);
        };

        function toBool(v) {
          return v === 'true' || v === true;
        }

        scope.$root.$on('userpick', function (evt, src) {
          if (scope.idField === src && !scope.data.disabled) {
            updateTexture();
            scope.$parent.fireEvent('pressed', scope.idField);
          }
        });

        // these wont change often
        scope.$watch('disabledField', function () {
          const disabled = toBool(scope.disabledField);
          // if this has changed, we update the shader
          if (scope.data.disabled !== disabled) {
            scope.data.disabled = disabled;

            // ideally we would toggle the shader here, but whilst we can toggle between the prototype octo shaders, we
            // cannot untoggle and return to the built-inshader, wich actually shaders the button differently
            // the switch makes this inconsistent, so disabling it for now.

            const isHolo = toBool(scope.isholoField);
            if (isHolo && !twx.app.isPreview()) {
              scope.buttonWidget.setAttribute('shader', disabled ? 'ButtonEdge' : 'ButtonFullEffects');
            }
          }
        });

        scope.$watchGroup(['widthField', 'heightField', 'fontField', 'textField', 'srcField'], function () {
          scope.data.width = scope.widthField !== undefined ? Number(scope.widthField) : 0.04;
          scope.data.height = scope.heightField !== undefined ? Number(scope.heightField) : 0.04;
          scope.data.fontColor = scope.fontField || '#ffffff';
          scope.data.text = scope.textField || '';
          scope.data.src = scope.srcField || '';

          updateTexture();
        });
      },
    };
  }

  const press3DModule = angular.module('press3D-ng', ['ngWidget3dUtils']);
  press3DModule.directive('ngPress3d', ['$window', '$injector', 'widget3dUtils', ngPress3D]);
})();
