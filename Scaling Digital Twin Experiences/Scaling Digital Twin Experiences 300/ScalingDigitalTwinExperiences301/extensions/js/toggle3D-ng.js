if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
  module.exports = 'toggle3D-ng';
}

(function () {
  'use strict';

  function ngToggle3D($window, $injector, widget3dUtils) {
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
        textnotpressedField: '@',
        srcField: '@',
        srcnotpressedField: '@',
        smalliconField: '@',
        multilinetextField: '@',
        pressedField: '=',
        delegateField: '=',
      },
      link: function (scope, element, attr) {
        scope.data = {
          width: 0.04,
          height: 0.04,
          fontColor: '#ffffff',
          pressed: false,
          disabled: undefined,
          text: '',
          textNotPressed: '',
          src: '',
          srcNotPressed: '',
          smallIcon: true,
          multilineText: true,
          pressedTexture: undefined,
          unpressedTexture: undefined,
        };
        scope.buttonWidget = element[0].children.namedItem(scope.idField);

        // Draws an Image and a label on a 3D Toggle Button
        function drawIconAndLabel(widget, src, text) {
          widget.id = scope.idField;
          return widget3dUtils.generateLabelAndIconImage(
            widget,
            src,
            text,
            scope.data.smallIcon,
            scope.data.multilineText
          );
        }

        const updateTextures = () => {
          const defaultSrc = 'app/resources/Default/toggleMissing.png';
          drawIconAndLabel(
            scope.data,
            scope.data.src || scope.data.srcNotPressed || defaultSrc,
            scope.data.text || scope.data.textNotPressed
          ).then((imageData) => {
            scope.data.pressedTexture = imageData;
          });

          drawIconAndLabel(
            scope.data,
            scope.data.srcNotPressed || scope.data.src || defaultSrc,
            scope.data.textNotPressed || scope.data.text
          ).then((imageData) => {
            scope.data.unpressedTexture = imageData;
          });
        };

        const setPressed = (value) => {
          if (!scope.data.disabled) {
            scope.pressedField = value;
          }
        };

        function toBool(v) {
          return v === 'true' || v === true;
        }

        // User tapped the button
        scope.$root.$on('userpick', function (evt, src) {
          if (scope.idField === src) {
            setPressed(!scope.data.pressed);
          }
        });

        scope.$watch('disabledField', function () {
          const disabled = toBool(scope.disabledField);
          // is this has changed, we update the shader
          if (scope.data.disabled !== disabled) {
            scope.data.disabled = disabled;

            // ideally we would toggle the shader here, but whilst we can toggle between the prototype octo shaders, we
            // cannot untoggle and return to the built-in shader, wich actually shaders the button differently
            // the switch makes this inconsistent, so disabling it for now.

            if (toBool(scope.isholoField) && !twx.app.isPreview()) {
              scope.buttonWidget.setAttribute('shader', disabled ? 'ButtonEdge' : 'ButtonFullEffects');
            }
          }
        });

        scope.$watchGroup(
          [
            'textnotpressedField',
            'srcnotpressedField',
            'textField',
            'srcField',
            'smalliconField',
            'multilinetextField',
            'fontField',
            'widthField',
            'heightField',
          ],
          function () {
            scope.data.text = scope.textField || '';
            scope.data.src = scope.srcField || '';
            scope.data.textNotPressed = scope.textnotpressedField || '';
            scope.data.srcNotPressed = scope.srcnotpressedField || '';
            scope.data.smallIcon = scope.smalliconField !== undefined ? toBool(scope.smalliconField) : true;
            scope.data.multilineText = scope.multilinetextField !== undefined ? toBool(scope.multilinetextField) : true;
            scope.data.fontColor = scope.fontField || '#ffffff';
            scope.data.width = scope.widthField !== undefined ? scope.widthField : 0.04;
            scope.data.height = scope.heightField !== undefined ? scope.heightField : 0.04;

            updateTextures();
          }
        );

        scope.$watch('pressedField', () => {
          scope.data.pressed = toBool(scope.pressedField);
          if (scope.data.pressed) {
            if (scope.data.pressedTexture) {
              setSrc(scope.data.pressedTexture);
            }
            scope.$parent.fireEvent('pressed', scope.idField);
          } else {
            if (scope.data.unpressedTexture) {
              setSrc(scope.data.unpressedTexture);
            }
            scope.$parent.fireEvent('unpressed', scope.idField);
          }
        });

        scope.$watch('data.pressedTexture', () => {
          if (scope.data.pressed) {
            setSrc(scope.data.pressedTexture);
          }
        });

        scope.$watch('data.unpressedTexture', () => {
          if (!scope.data.pressed) {
            setSrc(scope.data.unpressedTexture);
          }
        });

        function setSrc(src) {
          // Setting undefined to the attribute will result in it being set to 'undefined' string.
          scope.buttonWidget.setAttribute('src', src || '');
        }

        // Handle external events (service calls)
        scope.$watch('delegateField', (delegate) => {
          if (delegate) {
            delegate.set = () => setPressed(true);
            delegate.reset = () => setPressed(false);
          }
        });
      },
    };
  }

  const Toggle3DModule = angular.module('toggle3D-ng', ['ngWidget3dUtils']);
  Toggle3DModule.directive('ngToggle3d', ['$window', '$injector', 'widget3dUtils', ngToggle3D]);
})();
