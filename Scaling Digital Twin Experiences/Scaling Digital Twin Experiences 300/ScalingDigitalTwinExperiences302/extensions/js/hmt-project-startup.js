/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
(function (window, document, angular) {
  /**
   * Invoke the click on the element that was voice activated
   * @param {Array[String]} commands - Possible commands entered, find the first match
   */
  var voiceCommandCallBack = function (commands) {
    try {
      commands.some(function (command) {
        var sel = '[data-wml-speech-command="' + command + '"]';
        //Button overlays are being invoked by accident instead of the real target
        var el = document.querySelector(sel);

        if (el) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.focus();
          }
          var event = new MouseEvent('click', { bubbles: true });
          el.dispatchEvent(event);
          return true; //Stops the iterator
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Create a div of buttons for all the voice commands.
   * The div is styled to be visible, but small/clear.
   * This works arounds wearML library behavior which only works well with buttons.
   * Make all voice commands a button which onclick acts like a voiceCommandCallback
   *
   * @param {Array[String]} newVoiceCommands
   */
  function updateTempButtons(newVoiceCommands) {
    if (window.wearML) {
      var voiceDiv = document.querySelector('#ptcVoiceCommands');
      //jshint multistr:true
      var statichtml = `<style>           \
        .nativeSpeechRightAligned{        \
            --overlay_anchor_hv:"50,50";  \
            --overlay_orientation: "top"; \
            --overlay_show_number:${window.enableBubbles}; \
        } </style>`;
      if (!voiceDiv) {
        voiceDiv = document.createElement('div');
        voiceDiv.id = 'ptcVoiceCommands';
        voiceDiv.onclick = function (ev) {
          voiceCommandCallBack([ev.target.getAttribute('ptc-voice-command')]);
        };
        document.body.appendChild(voiceDiv);
        voiceDiv.innerHTML = statichtml;
      } else {
        voiceDiv.innerHTML = statichtml;
      }

      var i = newVoiceCommands.length;
      while (i--) {
        var buttonEl = document.createElement('button');
        var nvc = newVoiceCommands[i];
        buttonEl.setAttribute('ptc-voice-command', nvc);
        buttonEl.textContent = nvc;
        voiceDiv.appendChild(buttonEl);

        //Move the balloon a bit to the right and down, to keep from being hidden by screen if at left: 0 or top:0
        var sel = '[data-wml-speech-command="' + nvc + '"]';
        var el = document.querySelector(sel);
        if (el && !el.getAttribute('data-wml-style')) {
          el.setAttribute('data-wml-style', '.nativeSpeechRightAligned');
        }
      }
      if (window.wearML.getCommands) {
        window.wearML.getCommands(); //Update the xml passed back to native
      }
    }
  }

  //Setup voice command callbacks and listeners with native
  angular.module('app').run(function ($rootScope, tml3dRenderer) {
    var lastVoiceCommands = [];
    var setVoiceCommands = _.debounce(function () {
      if (Object.keys(window.autoRefreshingServices || {}).length > 0) {
        // DT-21854 - prevent the RealWare help/hint bubbles from being re-displayed for each request to a TWX service that is configured to autoRefresh
        return;
      }

      var newVoiceCommands = [];
      var els = document.querySelectorAll('[data-wml-speech-command]');
      els.forEach(function (item) {
        newVoiceCommands.push(item.getAttribute('data-wml-speech-command'));
      });
      newVoiceCommands = newVoiceCommands.sort();
      newVoiceCommands = _.uniq(newVoiceCommands);

      updateTempButtons(newVoiceCommands);
      if (!_.isEqual(newVoiceCommands, lastVoiceCommands)) {
        lastVoiceCommands = newVoiceCommands;
        if (tml3dRenderer.updateVoiceCommands) {
          //Advise on all the voice commands found
          tml3dRenderer.updateVoiceCommands({ commandsToAdd: newVoiceCommands });
        }
      }
      if (tml3dRenderer.forceRealWearRescan) {
        tml3dRenderer.forceRealWearRescan();
      }
    }, 100);

    //check the global enabledBubbles property occasionally, as it may change from the in experience settings menu
    //It may also be set late into the experience after startup, so need to notice it changing from outside
    var lastEnabledBubbles;
    setInterval(function () {
      var bubblesChanged = lastEnabledBubbles !== window.enableBubbles;
      lastEnabledBubbles = window.enableBubbles;
      if (bubblesChanged) {
        setVoiceCommands(); //Redraws the style to show bubbles, and will make sure commands are latest
      }
    }, 5000);

    $rootScope.$watch(setVoiceCommands);
    //window.refreshVoice = function() {tml3dRenderer.forceRealWearRescan();};
    //window.setVoiceCommands = setVoiceCommands;
    //Setup a callback for recognized speech commands.
    if (tml3dRenderer.setupSpeechRecognitionCallback) {
      tml3dRenderer.setupSpeechRecognitionCallback(
        {},
        function (guesses) {
          if (!Array.isArray(guesses)) {
            //console.log("Successfully setup speech recognition command callback");
          } else {
            //Voice Command!
            voiceCommandCallBack(guesses);
            //console.log("Received voice recognition data: ", guesses);
          }
        },
        function (error) {
          console.log('Failed to setup speech recognition command; error=', error);
        }
      );
    }
  });
})(window, document, angular);
