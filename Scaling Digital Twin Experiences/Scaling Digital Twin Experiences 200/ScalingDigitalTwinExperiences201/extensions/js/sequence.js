/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
/* globals PTC console THREE */
PTC.SequencePlayer = function (aModelID, aEventEmitter, aRenderer) {
    "use strict";
    var event_callback = null;
    var event_type = null;
    var sequenceAdapter = null;
    var SPEED = 1;
    var TOTALSTEPS = 0;
    var STEPS = [];
    var CURRENT_STEP = 1;
    var AUDIO_PLAYER;
    var PLAYER;
    var ENABLE_AUDIO = false;
    var DEBUG = false;
    var SEQUENCE_LOADED = false;
    var INITIAL_STATE_DATA;
    var modelID = aModelID;
    var eventEmitterFunc = aEventEmitter;
    var renderer = aRenderer;

    function setSequenceAdapter(adapter) {
        sequenceAdapter = adapter;
    }

    function getSequenceAdapter() {
        return sequenceAdapter;
    }

    function setCurrentStep(stepnumber) {
        // Reset state to start of this step

        CURRENT_STEP = stepnumber;
    }

    function emitEventAsync(eventName, eventData) {
        var localData = eventData;

        if (typeof(eventData) !== "string") {
            localData = JSON.stringify(eventData);
        }

        setTimeout(function() {
            aEventEmitter(eventName, modelID, "twx-dt-model", localData);
        }, 0);
    }

    function invokeCallbackAsync(callback) {
        if (typeof(callback) === "function") {
            setTimeout(callback, 0);
        }
    }

    function playSequence(callback) {
        emitEventAsync("stepstarted", {
            stepNumber: CURRENT_STEP,
            stepName: STEPS[CURRENT_STEP].name,
            totalSteps: (TOTALSTEPS - 1) // don't include step 0 as a step when reporting the total number of steps
        });

        STEPS[CURRENT_STEP].play( function (object, result) {
            var next = CURRENT_STEP + 1;
            if ( next >= TOTALSTEPS ) {
                next = -1;
            }

            var eventAndCallbackData = {
                stepNumber: CURRENT_STEP,
                stepName: STEPS[CURRENT_STEP].name,
                acknowledge: STEPS[CURRENT_STEP].acknowledge,
                acknowledgeMessage: "You have reached the end of the step: " + STEPS[CURRENT_STEP].name,
                nextStep: next,
                totalSteps: (TOTALSTEPS - 1) // don't include step 0 as a step when reporting the total number of steps
            };

            if ( callback !== undefined ) {
                try {
                    callback(this, eventAndCallbackData);
                } catch(e) {
                    console.error ("Playsequence callback threw: ", e);
                }
            }

            emitEventAsync("stepcompleted", eventAndCallbackData);

            CURRENT_STEP++;
        });
    }

    // rewind to the beginning of the previous step.
    function previousSequence(callback) {
        if (CURRENT_STEP <= 0) {
            console.log("ignoring attempt to back up beyond step 1");
            return;
        }

        var wrappedCallback = function() {
            emitEventAsync("stepcompleted", {
                stepNumber: CURRENT_STEP,
                stepName: STEPS[CURRENT_STEP].name,
                nextStep: CURRENT_STEP, // yes, nextStep is CURRENT_STEP as CURRENT_STEP is what should be played when "play" is pressed.
                totalSteps: (TOTALSTEPS - 1)
            });
            invokeCallbackAsync(callback);
        };

        CURRENT_STEP--;
        STEPS[CURRENT_STEP].previous(wrappedCallback);
    }

    // forward to the beginning of the next step.
    function nextSequence(callback) {
        if (CURRENT_STEP >= TOTALSTEPS) {
            console.log("ignoring attempt to next beyond last step");
            return;
        }

        var wrappedCallback = function() {

            var next = CURRENT_STEP + 1;
            if (next >= TOTALSTEPS ) {
                next = -1;
            }

            emitEventAsync("stepcompleted", {
                stepNumber: CURRENT_STEP,
                stepName: STEPS[CURRENT_STEP].name,
                nextStep: next,
                totalSteps: (TOTALSTEPS - 1)
            });

            invokeCallbackAsync(callback);

            CURRENT_STEP++;
        };

        STEPS[CURRENT_STEP].next(wrappedCallback);
    }

    function parseSequence(obj, data, callback) {
        // Now the file retrieved  is not liked by the DOMParser as it says it is not valid so lets correct
        // Note this would have likely fixed the issue when reading animations
        var req = data.replace(/<galaxy_3di:figure>|<galaxy_schematic:figure>/gm, function(tag) {
            // Ensure that xml namespaces are declared for galaxy_3di and galaxy_schematic
            // The url chosen is arbitrary and does not matter for sequence parsing purposes
            var elem = tag.substring(1,tag.lastIndexOf(":figure>"));
            var ns = " xmlns:galaxy_3di=\"http://www.ptc.com\"";
            if (elem === "galaxy_schematic") {
                ns += " xmlns:galaxy_schematic=\"http://www.ptc.com/illustrate_schematic\"";
            }
            return "<" + elem + ":figure" + ns + ">";
        });

        //var pvidoc  = (new DOMParser()).parseFromString(request.responseText,"text/xml");
        var pvidoc  = (new DOMParser()).parseFromString(req, "text/xml");

        SEQUENCE_LOADED = true;
        INITIAL_STATE_DATA = getComponentsInitialStates(pvidoc);
        applyInitialStates();
        var sequence = getSequence(pvidoc);
        if (sequence === null) {
            console.log("No sequence found in pvi.");
            console.log("pvidoc is...");
            console.log((new XMLSerializer()).serializeToString(pvidoc));

            throw new Error("No sequence found in pvi.");
        }

        if ( sequence !== null ) {
            for ( var i=0; i < sequence.childNodes.length; i++ ) {
                var property = new Property(sequence.childNodes[i]);
                if ( property.name !== undefined ) {
                    if ( property.name === "stepcount" ) {
                        if ( DEBUG ) console.log("Number of steps : " + property.value);
                        TOTALSTEPS = parseInt(property.value);
                    }
                }
                else {
                    var step = new SequenceStep(sequence.childNodes[i]);
                    if ( step.name !== undefined ) {
                        if ( DEBUG ) step.print();
                        STEPS.push(step);
                    }
                }
            }

            if ( STEPS.length > 0 ) {
                if ( callback !== undefined ) {
                    var result = {
                        total: STEPS.length,
                        name: STEPS[0].name
                    };
                    callback(obj, result);
                }
            }
            else {
                throw new Error("No steps in the sequence.");
            }
        }
    }

    function loadSequence(url, speed, successCallback, failureCallback) {
        // reset the scene graphs to as-loaded + tml values before loading the new animation.
        VF_ANG.resetSceneGraphsToAsLoaded(modelID, renderer);

        if ( ENABLE_AUDIO ) {
            var ind = url.indexOf("/CV");
            var audio_url = url.substr(0,ind) + "/audio/";
            AUDIO_PLAYER = new PTC.AudioPlayer(audio_url);
        }
        setSpeed(parseInt(speed));
        // jshint -W040
        // (`this` really is valid in the line below)
        var self = this;
        // jshint +W040

        if (url.startsWith("data:text/xml;base64,")) {
            // de-base64 encode
            var data = window.atob(url.substring("data:text/xml;base64,".length));

            setTimeout(function() {
                try {
                    parseSequence(self, data, successCallback);
                } catch (e) {
                    console.log("js animation engine - parse sequence failed: ");
                    console.log(e);
                    console.log(e.stack);
                    if (typeof(failureCallback) === "function") {
                        failureCallback(e);
                    }
                }
            }, 0);
            return;
        }

        var request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader('Content-Type',  'text/xml');
        request.send();
        request.onreadystatechange = function() {
            if (request.readyState === 4) {
                if ( request.status === 200 || request.status === 0 ) {
                    try {
                        parseSequence(self, request.responseText, successCallback);
                    } catch (e) {
                        console.log("js animation engine - parse sequence failed: ");
                        console.log(e);
                        console.log(e.stack);
                        if (typeof(failureCallback) === "function") {
                            failureCallback(e);
                        }
                    }
                } else {
                    console.log("js animation engine - xhr for sequence data failed: [" + request.status + "] for url [" + url + "]");
                    if (typeof(failureCallback) === "function") {
                        failureCallback(new Error("js animation engine - xhr for sequence data failed: [" + request.status + "] for url [" + url + "]"));
                    }
                }
            }
        };
    }

    function unloadSequence(callback) {
        // reset the scene graphs to as-loaded.
        VF_ANG.resetSceneGraphsToAsLoaded(modelID, renderer);
        setTimeout(callback, 0);
    }

    function getStepName(number) {
        return STEPS[number].name;
    }

    function getStepDuration(number) {
        return STEPS[number].duration * SPEED * 1000;
    }

    // getCurrentStep may exceed TOTALSTEPS by one to represent having finished playing the last step.
    function getCurrentStep() {
        return CURRENT_STEP;
    }

    function getPreviousStep() {
        return CURRENT_STEP-1;
    }

    // return the total number of steps, not including the 0-step.
    function getTotalSteps() {
        return TOTALSTEPS - 1;
    }

    function setSpeed(speed) {
        SPEED = speed;
    }

    function stopAnimation(callback) {
        if (PLAYER) {
            PLAYER.stopAnimation(callback);
        } else {
            // This happens when there is no valid sequence loaded.
            // reset() calls stopAnimation; so this block gets hit when changing the empty sequence to a valid sequence.
            // It also gets hit on first page load if no sequence is set.
            invokeCallbackAsync(callback);
        }
    }

    function setEnableAudio(enableAudio) {
        ENABLE_AUDIO = enableAudio;
    }

    function getEnableAudio() {
        return ENABLE_AUDIO;
    }

    function registerEvent(type, callback) {
        event_type = type;
        event_callback = callback;
    }

    function getSequence(pvi) {
        for ( var i=0; i < pvi.childNodes.length; i++ ) {
            if ( pvi.childNodes[i].nodeName === "galaxy_schematic:figure" || pvi.childNodes[i].nodeName === "galaxy_3di:figure") {
                for ( var j=0; j < pvi.childNodes[i].childNodes.length; j++ ) {
                    if ( pvi.childNodes[i].childNodes[j].nodeName === "galaxy_3di:sequence" ) {
                        return pvi.childNodes[i].childNodes[j];
                    }
                }
            }
        }
        return null;
    }

    function getAssemblyInitialStates(values, object) {
        if ( getSequenceAdapter().isPart(object) ) {
            values.push(new ShapeInstanceInitial(object.name));
        }
        for ( var i = 0; i < object.children.length; i++ ) {
            if ( getSequenceAdapter().isPart(object.children[i]) ) {
                getAssemblyInitialStates(values, object.children[i]);
            }
        }
    }

    function getComponentsInitialStates(doc) {
        var values = [];
        // First for all assembly nodes reset the values as they are not in the pvi
        //getAssemblyInitialStates(values, getSequenceAdapter().getScene().getRoot());
        for (var j = 0; j < doc.childNodes.length; j++)
        {
            var anode = doc.childNodes[j];
            if (anode.nodeName == "galaxy_3di:figure")
            {
                for (var k = 0; k < anode.childNodes.length; k++)
                {
                    var bnode = anode.childNodes[k];
                    if (bnode.nodeName == "galaxy_3di:content")
                    {
                        for (var ii = 0; ii < bnode.childNodes.length; ii++)
                        {
                            var cnode = bnode.childNodes[ii];
                            var ic;
                            if (cnode.nodeName == "galaxy_3di:component")
                            {
                                var impacted_components = [];
                                for (var ij = 0; ij < cnode.childNodes.length; ij++)
                                {
                                    var property = new Property(cnode.childNodes[ij]);
                                    if (property.name !== null)
                                    {
                                        if (property.name == "sbom_instance_idpath")
                                        {
                                            impacted_components.push(new ShapeInstanceInitial(property.value));
                                        }
                                        else if (property.name == "visible")
                                        {
                                            if (property.value == "false")
                                            {
                                                for (ic = 0; ic < impacted_components.length; ic++)
                                                {
                                                    impacted_components[ic].setVisible(false);
                                                }
                                            }
                                        }
                                        else if (property.name == "color")
                                        {
                                            var color = convertColor(property.value);
                                            for (ic = 0; ic < impacted_components.length; ic++)
                                            {
                                                impacted_components[ic].setColor(color);
                                            }
                                        }
                                        else if (property.name == "transparency")
                                        {
                                            var transparency = parseFloat(property.value);
                                            for (ic = 0; ic < impacted_components.length; ic++)
                                            {
                                                impacted_components[ic].setTransparency(transparency);
                                            }
                                        }
                                        else if (property.name == "location")
                                        {
                                            var location = toLocationFromMatrix(property.value);
                                            location.global = false;
                                            for (ic = 0; ic < impacted_components.length; ic++)
                                            {
                                                impacted_components[ic].setLocation(location);
                                            }
                                        }
                                    }
                                }
                                for (ic = 0; ic < impacted_components.length; ic++)
                                {
                                    values.push(impacted_components[ic]);
                                }
                            }
                        }
                    }
                }
            }
        }
        return values;
    }

    function applyInitialStates() {
        var states = INITIAL_STATE_DATA;
        if (states === undefined) {
            // no sequence loaded.
            return;
        }

        for ( var i=0; i < states.length; i++ ) {
            var state = states[i];
            var object = getSequenceAdapter().getSelectedObject(state.idpath);
            if (object === null || object === undefined) {
                console.log("js animation engine - pvi step 0 - skipping idpath [" + state.idpath + "] for which there is no object in the scene.");
                continue;
            }

            var objs = [object];
            var value = {object: objs, visibility: state.visible, transparency: state.transparency};
            getSequenceAdapter().transparencyInitialization(value);
            if ( state.location !== null ) {
                var loc_value = {object: object, location: state.location};
                getSequenceAdapter().locationInitialization(loc_value);
            }
            // If color is set, apply to all meshes
            if ( state.color !== null ) {
                var color_value = {object: objs, color: state.color};
                getSequenceAdapter().colorInitialization(color_value);
            }
        }
    }

    // Reset the animation back to step 1.
    function reset(callback) {
        // first, tell the animation engine to immediately stop what it is doing.
        stopAnimation(function() {
            // use our cached as-loaded model data to reset both the javascript and native scene graph
            VF_ANG.resetSceneGraphsToAsLoaded(modelID, renderer);

            // reapply animation sequence step 0 state
            applyInitialStates();

            // set the current step to 1.
            CURRENT_STEP = 1;

            if (typeof(callback) === "function") {
                setTimeout(callback, 0);
            }
        });
    }

    function goToStep(targetStepNumber, callback) {
        if (targetStepNumber < 1 || targetStepNumber >= TOTALSTEPS) {
            // invalid step number, ignore.
            return;
        }

        console.log("now on step ["+ CURRENT_STEP + "] targetting [" + targetStepNumber + "]");

        if (targetStepNumber === CURRENT_STEP) {
            // We're now on the correct step.
            emitEventAsync("stepcompleted", {
                stepNumber: CURRENT_STEP,
                stepName: STEPS[CURRENT_STEP].name,
                nextStep: CURRENT_STEP,
                totalSteps: (TOTALSTEPS - 1)
            });

            if (typeof(callback) === "function") {
                setTimeout(callback, 0);
            }

            return;
        }

        var recurseCallback = function() {
            goToStep(targetStepNumber, callback);
        };

        if (targetStepNumber < CURRENT_STEP) {
            console.log("going to the previous step.");
            CURRENT_STEP--;
            STEPS[CURRENT_STEP].previous(recurseCallback);
        } else {
            console.log("going to the next step.");
            STEPS[CURRENT_STEP].next(recurseCallback);
            CURRENT_STEP++;
        }
    }

    function SequenceStep(step) {
        if ( step.nodeName !== "galaxy_3di:sequence_step" ) return;
        this.name = "";
        this.duration = 0.0;
        this.acknowledge  = false;
        this.description = "";
        this.animations = [];
        this.UNDO_TWEENS = [];
        for ( var i=0; i < step.childNodes.length; i++ ) {
            if (step.childNodes[i].nodeName === "galaxy_3di:animation::Timeline") {
                throw new Error("Timeline sequences are not supported by the javascript animation engine.");
            }
            var property = new Property(step.childNodes[i]);
            if ( property.name !== undefined ) {
                if ( property.name === "step_name" ) {
                    this.name = property.value;
                }
                else if ( property.name === "step_duration" ) {
                    this.duration = parseFloat(property.value);
                }
                else if ( property.name === "step_acknowledge" ) {
                    this.acknowledge = toBoolean(property.value);
                }
                else if ( property.name === "step_description" ) {
                    this.description = property.value;
                }
            }
            else {
                var animation =  new ShapeInstanceAnimation(step.childNodes[i]);
                if ( animation.animation_type !== undefined ) {
                    this.animations.push(animation);
                }
            }
        }
    }

    SequenceStep.prototype.print = function() {
        if ( DEBUG ) {
            console.log("STEP ");
            console.log("Name : " + this.name);
            console.log("Description : " + this.description);
            console.log("Acknowledge : " + this.acknowledge);
            console.log("Duration : " + this.duration);
        }
        for ( var i=0; i < this.animations.length; i++ ) {
            this.animations[i].print();
        }
    };

    SequenceStep.prototype.next = function(callback) {
        this.playForward(0.01, callback);
    };

    SequenceStep.prototype.previous = function(callback) {
        this.playReverse(callback);
    };

    SequenceStep.prototype.play = function(callback) {
        this.playForward(this.duration, callback);
    };

    SequenceStep.prototype.playForward = function( duration_step, callback ) {

        if ( ENABLE_AUDIO ) {
            AUDIO_PLAYER.setStep(CURRENT_STEP);
        }
        PLAYER = new PTC.AnimationPlayer();
        TWEEN.removeAll();
        PLAYER.setAnimationAdapter(getSequenceAdapter());
        PLAYER.setSpeed(SPEED);
        var start_visibility;
        var end_visibility;
        var start_transparency;
        var end_transparency;
        var phantom_transparency;
        var start_color;
        var end_color;
        var moveby;
        var screw;

        this.animations.forEach(function(animation, i) {
            // Divide by 100 as Percentage but multiply by 1000 as MS
            var start_time = duration_step * this.animations[i].startTimePercentage * 10;
            var end_time = duration_step * this.animations[i].endTimePercentage * 10;

            if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceLocationPair" ) {
                this.animations[i].location.center = new THREE.Vector3( this.animations[i].point[0], this.animations[i].point[1], this.animations[i].point[2] ) ;
                this.animations[i].location.scale = 1;
                this.animations[i].location.traverse = false;
                this.animations[i].location.global = true; // Does not seem to matter from CV it appears to be always global straight
                delete this.animations[i].location.previousPosition;
                delete this.animations[i].location.previousQuaternion;
                PLAYER.addLocationTween( start_time, end_time, this.animations[i].instance, null,  this.animations[i].location,  true, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceColorPair" ) {
                start_color = null;
                end_color = convertColor(this.animations[i].color);
                PLAYER.addColorTween( start_time, end_time, this.animations[i].instance, null, start_color, end_color, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceVisibilityPair" ) {
                if ( this.animations[i].visibility ) {
                    start_transparency = null;
                    start_visibility = [0];
                    end_visibility = [1];
                    end_transparency = 1.0;
                }
                else {
                    start_transparency = null;
                    start_visibility = [1];
                    end_visibility = [0];
                    end_transparency = 0.0;
                }
                if ( parseFloat(start_visibility[0]) == 1 ) start_transparency = 1.0;
                PLAYER.addVisibilityTransparencyTween( start_time, end_time, this.animations[i].instance, null, start_visibility, end_visibility, start_transparency, end_transparency, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceTransparencyPair" ) {
                start_visibility = [1];
                end_visibility = [1];
                start_transparency = null;
                PLAYER.addVisibilityTransparencyTween( start_time, end_time, this.animations[i].instance, null, start_visibility, end_visibility, start_transparency, this.animations[i].transparency, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstancePhantomPair" ) {
                start_visibility = [1];
                end_visibility = [1];
                start_transparency = null;
                phantom_transparency = 0.25;
                if ( ! this.animations[i].phantom ) {
                    phantom_transparency = 1;
                }
                PLAYER.addVisibilityTransparencyTween( start_time, end_time, this.animations[i].instance, null, start_visibility, end_visibility, start_transparency, phantom_transparency, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstancePulsePair" ) {
                // Pulse is a change in translation and scale as defined in GalaxyEffects.cpp line 293...
                PLAYER.addPulseTween(start_time, end_time, this.animations[i].instance, null, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceFlashPair" ) {
                start_color = null;
                end_color = convertColor(this.animations[i].color);
                PLAYER.addFlashTween( start_time, end_time, this.animations[i].instance, null, start_color, end_color, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceWobblePair" ) {
                // Wobbly aka shake is multiple rotations as defined in GalaxyEffects.cpp line 258...
                PLAYER.addWobbleTween(start_time, end_time, this.animations[i].instance, null, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceFlyOutPair" ) {
                moveby = {
                    position: getDirectionVector(this.animations[i].direction),
                    global: this.animations[i].global
                };
                PLAYER.addFlyTween( start_time, end_time, this.animations[i].instance, null,  moveby, true, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceFlyInPair" ) {
                moveby = {
                    position: getDirectionVector(this.animations[i].direction),
                    global: this.animations[i].global
                };
                PLAYER.addFlyTween( start_time, end_time, this.animations[i].instance, null,  moveby, false, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceUnscrewPair") {
                screw = {
                    rel: false,
                    values: this.animations[i].screwValues
                };
                PLAYER.addUnScrewTween(start_time, end_time, this.animations[i].instance, null,  screw, null);
            }
            else if ( this.animations[i].animation_type == "galaxy_3di:step_shapeInstanceRelUnscrewPair") {
                screw = {
                    rel: true,
                    values: this.animations[i].screwValues
                };
                PLAYER.addUnScrewTween(start_time, end_time, this.animations[i].instance, null, screw, null);
            }
        }.bind(this));

        this.UNDO_TWEENS = PLAYER.getUndoTweens().slice(0);

        PLAYER.playAnimation(callback);
        if ( ENABLE_AUDIO ) {
            AUDIO_PLAYER.playAudio();
        }
    };

    SequenceStep.prototype.playReverse = function(callback ) {
        PLAYER.setUndoTweens( this.UNDO_TWEENS );
        PLAYER.reverseAnimation(callback);
    };

    function getDirectionVector(direction) {
        var v = new THREE.Vector3(0,0,0);
        if ( direction === 0 ) {
            v.x = 1;
        }
        else if ( direction === 1 ) {
            v.y = 1;
        }
        else if (direction === 2 ) {
            v.z = 1;
        }
        else if ( direction === 3 ) {
            v.x = -1;
        }
        else if ( direction === 4 ) {
            v.y = -1;
        }
        else if ( direction === 5 ) {
            v.z = -1;
        }
        v.multiplyScalar(1.0);
        return v;
    }

    function convertColor(hexcolor) {
        var color = [];
        var r_hex = hexcolor.substring(0,2);
        var r_int = parseInt(r_hex,16);
        var r_percent = r_int/255;
        color.push(r_percent);
        var g_hex = hexcolor.substring(2,4);
        var g_int = parseInt(g_hex,16);
        var g_percent = g_int/255;
        color.push(g_percent);
        var b_hex = hexcolor.substring(4,6);
        var b_int = parseInt(b_hex,16);
        var b_percent = b_int/255;
        color.push(b_percent);
        return color;
    }

    function Property(property) {
        if ( property.nodeName !==  "galaxy_3di:property" )  return null;
        this.type = property.attributes.type.value;
        this.name = property.attributes.name.value;
        if ( property.attributes.value !== undefined ) {
            this.value = property.attributes.value.value;
        }
        else {
            this.value = property.textContent;
        }
    }

    function PropertyArray(propertyArray) {
        if ( propertyArray.nodeName !==  "galaxy_3di:property_array" )  return null;
        this.type = propertyArray.attributes.type.value;
        this.name = propertyArray.attributes.name.value;
        this.count = parseInt(propertyArray.attributes.count.value);
        this.values = [];
        for ( var i=0; i < propertyArray.childNodes.length; i++ ) {
            if ( propertyArray.childNodes[i].nodeName === "galaxy_3di:property" ) {
                this.values.push( propertyArray.childNodes[i].textContent.replace(/,/g, " ") );
            }
        }
    }

    function ShapeInstanceAnimation(animation) {
        if (
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceLocationPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceColorPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceVisibilityPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceTransparencyPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstancePhantomPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceFlashPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstancePulsePair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceWobblePair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceFlyOutPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceFlyInPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceUnscrewPair" &&
             animation.nodeName !==  "galaxy_3di:step_shapeInstanceRelUnscrewPair"
             )  return null;
        this.animation_type = animation.nodeName;
        for ( var i=0; i < animation.childNodes.length; i++ ) {
            var property = new Property(animation.childNodes[i]);
            if ( property.name !== undefined ) {
                if ( property.name === "step_shapeInstance" ) {
                    this.instance = property.value;
                    // At the moment this does not support the case where the step is operating on temporary graphics
                    if ( this.instance === "" ) {
                        this.animation_type = undefined;
                        return null;
                    }
                }
                else if ( property.name === "step_startTime" ) {
                    this.startTimePercentage = parseFloat(property.value);
                }
                else if ( property.name === "step_endTime" ) {
                    this.endTimePercentage = parseFloat(property.value);
                }
                else if ( property.name === "step_traverseChildren" ) {
                    this.traverseChildren = toBoolean(property.value);
                }
                else if ( property.name === "step_color" ) {
                    this.color = property.value;
                }
                else if ( property.name === "step_visibility" ) {
                    this.visibility = toBoolean(property.value);
                }
                else if ( property.name === "step_point" ) {
                    this.point = toArray(property.value);
                }
                else if ( property.name === "step_global" ) {
                    this.global = toBoolean(property.value);
                }
                else if ( property.name === "step_transLevel" ) {
                    this.transparency = parseFloat(property.value);
                }
                else if ( property.name === "step_phantom" ) {
                    this.phantom = toArray(property.value);
                }
                else if ( property.name === "step_flyin" ) {
                    this.flyin = toBoolean(property.value);
                }
                else if ( property.name === "step_direction"  ) {
                    this.direction = parseInt(property.value);
                }
                else if ( property.name === "step_location" ) {
                    this.location = toLocationFromMatrix(property.value);
                }
            }
            else {
                var propertyArray = new PropertyArray( animation.childNodes[i] );
                if ( propertyArray.name !== undefined ) {
                    this.screwValues = [];
                    if ( propertyArray.name === "step_unscrewValues" ) {
                        for ( var j = 0; j < propertyArray.values.length; j++ ) {
                            this.location = toLocation(propertyArray.values[j]);
                            this.screwValues.push( this.location );
                        }
                    }
                }
            }
        }
    }

    ShapeInstanceAnimation.prototype.print = function() {
        console.log("Animation : " + this.animation_type);
        console.log("Instance : " + this.instance + " start : " + this.startTimePercentage + " end : " + this.endTimePercentage + " traverseChildren : " + this.traverseChildren );
        if ( this.color !== undefined ) {
            console.log("Color : " + this.color);
        }
        if ( this.visibility !== undefined ) {
            console.log("Visibility : " + this.visibility);
        }
        if ( this.point !== undefined ) {
            console.log("point : " + this.point.toString());
        }
        if ( this.flyin !== undefined ) {
            console.log("Flyin : " + this.flyin);
        }
        if ( this.direction !== undefined ) {
            console.log("Direction : " + this.direction);
        }
        if ( this.location !== undefined ) {
            console.log("Location : " + this.location.toString());
        }
        if ( this.screwValues !== undefined ) {
            for ( var i=0; i < this.screwValues.length; i++ ) {
                console.log("Screw Values " + i + " : " + this.screwValues[i].toString() );
            }
        }
    };

    function ShapeInstanceInitial(idpath)
    {
        this.idpath = idpath;

        this.visible = true;
        this.color = null;
        this.transparency = -1;
        this.location = null;

        // Get the inital values for each data

    }

    ShapeInstanceInitial.prototype.setVisible = function(visible) {
        this.visible = visible;
    };

    ShapeInstanceInitial.prototype.setColor = function(color) {
        this.color = color;
    };

    ShapeInstanceInitial.prototype.setTransparency = function(transparency) {
        this.transparency = transparency;
    };

    ShapeInstanceInitial.prototype.setLocation = function(location) {
        location.global = true;
        this.location = location;
    };

    function toBoolean (value) {
        if ( value ===  "true" ) return true;
        return false;
    }

    function toArray(value) {
        return value.split(" ");
    }

    function toLocation(value) {
        var v =  value.split(" ");
        var quaternion = new THREE.Quaternion(parseFloat(v[3]), parseFloat(v[4]), parseFloat(v[5]), parseFloat(v[6]));
        var position = new THREE.Vector3(parseFloat(v[0]), parseFloat(v[1]), parseFloat(v[2]));
        var center = new THREE.Vector3(parseFloat(v[8]), parseFloat(v[9]), parseFloat(v[10]));
        var location = {
            rotation_matrix: null,
            quaternion: quaternion,
            position: position,
            center: center,
            global: true
        };
        return location;
    }

    function toLocationFromMatrix(value) {
        var v =  value.split(" ");
        var rotation_matrix  = new THREE.Matrix4();
        // This should be the order, but compared to Unity and the resultig quaternion, it seems to be the transpose
        //rotation_matrix.set(parseFloat(v[0]), parseFloat(v[1]), parseFloat(v[2]), 0,  parseFloat(v[3]), parseFloat(v[4]), parseFloat(v[5]), 0, parseFloat(v[6]), parseFloat(v[7]), parseFloat(v[8]), 0, 0,0,0,1 ) ;
        rotation_matrix.set(parseFloat(v[0]), parseFloat(v[3]), parseFloat(v[6]), 0,  parseFloat(v[1]), parseFloat(v[4]), parseFloat(v[7]), 0, parseFloat(v[2]), parseFloat(v[5]), parseFloat(v[8]), 0, 0,0,0,1 ) ;
        var quaternion = new THREE.Quaternion().setFromRotationMatrix(rotation_matrix);
        var position = new THREE.Vector3(parseFloat(v[9]), parseFloat(v[10]), parseFloat(v[11]));
        var location = {
            rotation_matrix: rotation_matrix,
            quaternion: quaternion,
            position: position,
            global: true
        };
        return location;
    }

    return {
        setSequenceAdapter: setSequenceAdapter,
        getSequenceAdapter: getSequenceAdapter,
        loadSequence: loadSequence,
        unloadSequence: unloadSequence,
        playSequence: playSequence,
        nextSequence: nextSequence,
        previousSequence: previousSequence,
        getStepName: getStepName,
        getStepDuration: getStepDuration,
        getCurrentStep: getCurrentStep,
        getTotalSteps: getTotalSteps,
        getEnableAudio: getEnableAudio,
        setEnableAudio: setEnableAudio,
        setCurrentStep: setCurrentStep,
        registerEvent: registerEvent,
        stopAnimation: stopAnimation,
        applyInitialStates: applyInitialStates,
        reset: reset,
        goToStep: goToStep
    };
};
