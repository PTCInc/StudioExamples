/* eslint-disable-next-line no-unused-vars */
var widget3dUtils = (function () {
  'use strict';

  const widget3dUtils = {
    /**
     * Converts css rgb color strings to hex color strings
     *
     * @param {string} rgb string such as rgb(255, 255, 255, 0)
     */
    rgb2hex: (rgb) => {
      rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
      return rgb && rgb.length === 4
        ? '#' +
            ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2)
        : '';
    },

    /**
     * @param {String} text
     * @param {Number} tx
     * @param {Number} ty
     * @param {Number} maxWidth
     * @param {Number} lineHeight
     * @param {CanvasRenderingContext2D} context
     * @param {Boolean} isMultilineText
     */
    fillText: (text, tx, ty, maxWidth, lineHeight, context, isMultilineText) => {
      const words = text.split(' ');
      let line = '';
      const lines = [];

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          if (!isMultilineText) {
            line = line + '...';
            break;
          }
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const lc = lines.length;
      let sy = ty - (lc * lineHeight) / 2;
      lines.forEach((line) => {
        context.fillText(line, tx, sy);
        sy += lineHeight;
      });
    },

    /**
     * Draws a small Image and a label and returns that as a data url encoded image
     * @param {Object} background
     * @param {Object} widget
     * @param {String} itext
     * @param {Object} params
     * @returns {Object}
     */
    generateLabelAndSmallIconImage: (background, widget, itext, isMultilineText) => {
      const canvas = document.createElement('canvas');
      const aspectLimit = 1.5;

      // work out size/dims of the canvas
      const scaleH = widget.height / 0.04;
      const imageWidth = scaleH * 172;
      const aspect = widget.width / widget.height;
      canvas.width = 512 * scaleH * aspect;
      canvas.height = 512 * scaleH;

      const xImageMargin = 96 * scaleH; // scaled x margin for image
      const yImageMargin = 170 * scaleH; // scaled y margin for image
      const xTextOffset = 220 * scaleH; // scaled y offset for text
      const yTextOffset = 40 * scaleH; // scaled y offset for text
      const xTextMarginOffset = 24 * scaleH; // scaled x margin offset for text

      const ctx = canvas.getContext('2d');
      const ix = aspect > aspectLimit ? xImageMargin : canvas.width / 2 - imageWidth / 2; // if the button is wide, draw the image to the left, otherwise center it
      const iy = yImageMargin;
      ctx.drawImage(background, ix, iy, imageWidth, imageWidth);

      ctx.textAlign = aspect > aspectLimit ? 'left' : 'center';
      // Preview can only use HEX in cavas so we convert here to get same results
      ctx.fillStyle = widget3dUtils.rgb2hex(widget.fontColor); //pass in font color prop

      ctx.font = 'bold 70px Arial'; // Segoe only works with some tricky stuff see Styles for more information
      const tx = aspect > aspectLimit ? ix + xTextOffset : canvas.width / 2; // if the button is square, center the text, otherwise draw to the right of the image
      const ty = aspect > aspectLimit ? canvas.height / 2 + 55 : canvas.height - yTextOffset; // if centered, draw below the image

      // we may need to adjust y to take multi-line into account e..g if there are 2 lines, we need to move y(start) up
      const maxWidth = aspect > aspectLimit ? canvas.width - tx - 12 : canvas.width - xTextMarginOffset;
      widget3dUtils.fillText(itext, tx, ty, maxWidth, 70, ctx, isMultilineText);

      const imageData = canvas.toDataURL() + '#edge=clamp';
      return imageData;
    },

    /**
     * Draws a large Image and a label and returns that as a data url encoded image
     * @param {Object} background
     * @param {Object} widget
     * @param {String} itext
     * @returns {Object}
     */
    generateLabelAndLargeIconImage: (background, widget, itext, isMultilineText) => {
      let canvas = document.createElement('canvas');

      // work out size/dims of the canvas
      const scaleH = widget.height / 0.04;
      var aspect = widget.width / widget.height;
      canvas.width = 512 * scaleH * aspect;
      canvas.height = 512 * scaleH;
      const imageWidth = canvas.width - 96;
      const imageHeight = canvas.height - 96;
      const yTextOffset = 40 * scaleH; // scaled y offset for text

      let ctx = canvas.getContext('2d');

      // we need to center this image, so lets see what shape it is
      const iBase = imageWidth / imageHeight;
      const bBase = background.width / background.height;

      // if the image aspect is wider than the button, need to adjust by width; otherwise fit by height
      const iAspect = iBase > 1 && bBase < iBase ? imageHeight / background.height : imageWidth / background.width;

      const scaled = { width: background.width * iAspect, height: background.height * iAspect }; // use largest dim to work out actual scale

      // adjust and center image
      const ix = canvas.width / 2 - scaled.width / 2;
      const iy = canvas.height / 2 - scaled.height / 2;
      ctx.drawImage(background, ix, iy, scaled.width, scaled.height);

      if (itext) {
        ctx.textAlign = 'center';
        ctx.fillStyle = widget3dUtils.rgb2hex(widget.fontColor);
        ctx.font = 'bold 70px Arial';
        const tx = canvas.width / 2; // if the button is square, center the text, otherwise draw to the right of the image
        const ty = canvas.height - yTextOffset; // if centered, draw below the image
        widget3dUtils.fillText(itext, tx, ty, canvas.width - 48, 70, ctx, isMultilineText);
      }
      const imageData = canvas.toDataURL() + '#edge=clamp';
      return imageData;
    },

    /**
     * Draws an Image and a label and returns that as a data url encoded image
     * @param {Object} widget
     * @param {String} isrc
     * @param {String} itext
     * @param {Object} params
     * @param {Boolean} smallIcon
     * @returns {Promise}
     */
    generateLabelAndIconImage: (widget, isrc, itext, smallIcon = true, isMultilineText = true) => {
      return new Promise((resolve) => {
        // Add new property to check if the function is only called once. If we don't do it we loop the image!
        if (isrc === undefined || isrc === null || isrc === '') {
          if (itext) {
            // Render text only
            let element = document.getElementById(widget.id);
            const imageData = VF_ANG.textToImage([element], Object.assign({}, widget, itext));
            resolve(imageData);
          }
          return;
        }

        // Render text and image combine
        const background = new Image();
        background.src = isrc;
        background.onload = () => {
          const imageData = smallIcon
            ? widget3dUtils.generateLabelAndSmallIconImage(background, widget, itext, isMultilineText)
            : widget3dUtils.generateLabelAndLargeIconImage(background, widget, itext, isMultilineText);
          resolve(imageData);
        };
      });
    },

    transformFromPose: function (pose) {
      let translation = pose.translation || { x: 0, y: 0, z: 0 };
      translation.x = translation.x || 0;
      translation.y = translation.y || 0;
      translation.z = translation.z || 0;

      let rotation = pose.rotation || { x: 0, y: 0, z: 0 };
      rotation.x = rotation.x || 0;
      rotation.y = rotation.y || 0;
      rotation.z = rotation.z || 0;

      let scale = pose.scale || { x: 1, y: 1, z: 1 };
      scale.x = scale.x || 1;
      scale.y = scale.y || 1;
      scale.z = scale.z || 1;

      let scaleMat = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
      let rotMat = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(
          THREE.Math.degToRad(rotation.x),
          THREE.Math.degToRad(rotation.y),
          THREE.Math.degToRad(rotation.z),
          'ZYX'
        )
      );
      let posMat = new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z);

      return posMat.multiply(rotMat.multiply(scaleMat));
    },

    /**
     * Decompose transformation matrix into translation, rotation and scale
     * @param {object} transform - transformation matrix
     */
    poseFromTransform: function (transform) {
      var translation = new THREE.Vector3(),
        quaternion = new THREE.Quaternion(),
        rotation = new THREE.Euler(),
        scale = new THREE.Vector3();
      transform.decompose(translation, quaternion, scale);
      rotation.setFromQuaternion(quaternion, 'ZYX');
      return {
        translation: translation,
        rotation: {
          x: THREE.Math.radToDeg(rotation._x),
          y: THREE.Math.radToDeg(rotation._y),
          z: THREE.Math.radToDeg(rotation._z),
        },
        scale: scale,
      };
    },

    /**
     * Calculates widget part location after rotating the panel it is placed over.
     * Used for widgets containing objects placed over a panel model.
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {Number} rx
     * @param {Number} ry
     * @param {Number} rz
     * @param {Number} xOffset
     * @param {Number} yOffset
     * @param {Number} zOffset
     * @returns updated position of object after container rotation
     */
    updatePositionAccordingToRotation: function (x, y, z, rx, ry, rz, xOffset, yOffset, zOffset) {
      let panelGlobal = widget3dUtils.transformFromPose({
        translation: { x: x, y: y, z: z },
        rotation: { x: rx, y: ry, z: rz },
      });
      let buttonLocal = widget3dUtils.transformFromPose({
        translation: { x: xOffset, y: yOffset, z: zOffset },
      });

      let buttonGlobal = panelGlobal.multiply(buttonLocal);
      let pose = widget3dUtils.poseFromTransform(buttonGlobal);

      return pose.translation;
    },

    //panel design constants
    PanelChildWidgetsMinMargin: 0.008,
    PanelEdgeMinMargin: 0.015,
    PanelDefaultSize: 0.3,

    getPanelPinButtonSize: function (panelWidth) {
      return panelWidth / 6.5 > 0.04 ? panelWidth / 6.5 : 0.04; // minimum size of a button is 0.04, (panelWidth / 6.5) is visually appealing
    },

    getPanelPinButtonRelativePositionAndSize: function (panelWidth, panelHeight) {
      const size = widget3dUtils.getPanelPinButtonSize(panelWidth);
      return {
        size: size,
        x: panelWidth / 2 - size / 2,
        y: panelHeight / 2 + widget3dUtils.PanelEdgeMinMargin + size / 2,
        z: -0.008,
      };
    },

    getPanelPinButtonAbsolutePositionAndSize: function (x, y, z, rx, ry, rz, panelWidth, panelHeight) {
      const sizeAndPosition = widget3dUtils.getPanelPinButtonRelativePositionAndSize(panelWidth, panelHeight);
      let position = widget3dUtils.updatePositionAccordingToRotation(
        x,
        y,
        z,
        rx,
        ry,
        rz,
        sizeAndPosition.x,
        sizeAndPosition.y,
        sizeAndPosition.z
      );
      position.size = sizeAndPosition.size;
      return position;
    },

    getPanelMediaControlButtonsSize: function (panelWidth) {
      const totalXGaps = widget3dUtils.PanelEdgeMinMargin * 2 + widget3dUtils.PanelChildWidgetsMinMargin * 3;
      return (panelWidth - totalXGaps) / 4;
    },

    getPanelMediaControlButtonsRelativePositionsAndSize: function (panelWidth, panelHeight) {
      const size = widget3dUtils.getPanelMediaControlButtonsSize(panelWidth);
      const xLocSkipBack = -(panelWidth / 2 - widget3dUtils.PanelEdgeMinMargin - size / 2);
      return {
        size: size,
        y: -(panelHeight / 2 - widget3dUtils.PanelEdgeMinMargin - size / 2),
        z: 0,
        xSkipB: xLocSkipBack,
        xPlay: xLocSkipBack + size + widget3dUtils.PanelChildWidgetsMinMargin,
        xStop: xLocSkipBack + 2 * size + 2 * widget3dUtils.PanelChildWidgetsMinMargin,
        xSkipA: xLocSkipBack + 3 * size + 3 * widget3dUtils.PanelChildWidgetsMinMargin,
      };
    },

    getPanelMediaControlButtonsAbsolutePositionsAndSize: function (x, y, z, rx, ry, rz, panelWidth, panelHeight) {
      const buttonsRelativePosAndSize = widget3dUtils.getPanelMediaControlButtonsRelativePositionsAndSize(
        panelWidth,
        panelHeight
      );
      return {
        size: buttonsRelativePosAndSize.size,
        skipB: widget3dUtils.updatePositionAccordingToRotation(
          x,
          y,
          z,
          rx,
          ry,
          rz,
          buttonsRelativePosAndSize.xSkipB,
          buttonsRelativePosAndSize.y,
          buttonsRelativePosAndSize.z
        ),
        skipA: widget3dUtils.updatePositionAccordingToRotation(
          x,
          y,
          z,
          rx,
          ry,
          rz,
          buttonsRelativePosAndSize.xSkipA,
          buttonsRelativePosAndSize.y,
          buttonsRelativePosAndSize.z
        ),
        stop: widget3dUtils.updatePositionAccordingToRotation(
          x,
          y,
          z,
          rx,
          ry,
          rz,
          buttonsRelativePosAndSize.xStop,
          buttonsRelativePosAndSize.y,
          buttonsRelativePosAndSize.z
        ),
        play: widget3dUtils.updatePositionAccordingToRotation(
          x,
          y,
          z,
          rx,
          ry,
          rz,
          buttonsRelativePosAndSize.xPlay,
          buttonsRelativePosAndSize.y,
          buttonsRelativePosAndSize.z
        ),
      };
    },

    getDesignTagalongIcon: function (tagalong) {
      return tagalong ? 'extensions/images/3D_Panel_Pin.png' : 'extensions/images/3D_Panel_Unpin.png';
    },

    getRuntimeTagalongIcon: function (tagalong) {
      return tagalong ? 'app/resources/Default/3D_Panel_Pin.png' : 'app/resources/Default/3D_Panel_Unpin.png';
    },

    BoxPrimitiveTemplate: JSON.stringify({ type: 'box', height: 1, width: 1, depth: 0.01 }),

    isSameOriginUrl: (url) => {
      const anchor = document.createElement('a');
      anchor.href = url;
      return anchor.host === window.location.host;
    },

    /**
     * Externalizes the url through local studio server proxy, so that same origin policy can be
     * bypassed.
     * @param {String} url
     */
    externalizeUrl: (url) => {
      return widget3dUtils.isSameOriginUrl(url) ? url : '/api/external?url=' + encodeURIComponent(url);
    },
  };

  if (typeof angular !== 'undefined') {
    angular.module('ngWidget3dUtils', []).service('widget3dUtils', [
      function () {
        return widget3dUtils;
      },
    ]);
  }

  return widget3dUtils;
})();
