/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */


PTC.AnimationPlayer = function () {
    var animation_root;
    var POSX = 0;
    var POSY = 1;
    var POSZ = 2;
    var QX = 3;
    var QY = 4;
    var QZ = 5;
    var QW = 6;
    var SCALE = 7;
    var ATX = 8;
    var ATY = 9;
    var ATZ = 10;
    var ATD = 11;
    var LEFT = 12;
    var RIGHT = 13;
    var BOTTOM = 14;
    var TOP = 15;
    var DEPTH = 16;
    var ORTHO = 17;

    var ANIMATION_TWEENS = [];
    var UNDO_TWEENS = [];
    var UNDO_DURATION = 0.1;
    var event_callback = null;
    var event_type = null;

    var SPEED = 1;
    var RUNNING_TIME = 0;
    var animationAdapter = null;
    var DEBUG = false;
    var DEFAULT_CREO_GREY_COLOR = [ 0.69411765, 0.74117647, 0.78823529 ];
    var stopAnimating = true;
    var afterAnimationCompleteCallback;

    function setAnimationAdapter(adapter) {
        animationAdapter = adapter;
    }

    function getAnimationAdapter() {
        return animationAdapter;
    }

    function loadAnimation(url, speed, callback) {
        setSpeed(speed);
        var request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader('Content-Type',  'text/xml');
        request.send();
        request.onreadystatechange = function() {
            if (request.readyState === 4) {
                if ( request.status === 200 || request.status === 0 ) {
                    // This had an issue on FF possibly Safari, so for the time being at least the pvi is pre-processed to extract the PVM,
                    // this also helps in manual reading of the PVM
                    //var pvidoc  = (new DOMParser()).parseFromString(request.responseText,"text/xml");
                    //var pvm = getPVM(pvidoc);
                    //if ( pvm !== undefined ) {
                    //var pvmdoc = (new DOMParser()).parseFromString(pvm, "text/xml");
                    var pvmdoc  = (new DOMParser()).parseFromString(request.responseText,"application/xml");
                    var timeline = getTimeline(pvmdoc);
                    if ( timeline !== null ) {
                        if (DEBUG) {
                            console.log("Name : " + timeline.attributes.name.value);
                            console.log("Autoplay : " + timeline.attributes.autoplay.value);
                            console.log("Timescale : " + timeline.attributes.timescale.value);
                            console.log("Units : " + timeline.attributes.units.value);
                        }
                        for ( var i=0; i < timeline.childNodes.length; i++ ) {
                            if ( timeline.childNodes[i].nodeName === "containertrack" ) {
                                animation_root = new ContainerTrack(timeline.childNodes[i]);
                                constructTweens( animation_root );
                            }
                        }
                        if ( callback !== undefined ) {
                            var result = {
                                duration: RUNNING_TIME,
                                name: timeline.attributes.name.value
                            };
                            callback(this, result);
                        }
                    }
                    //}
                }
            }
        };
    }

    function setSpeed(speed) {
        SPEED = speed;
    }

    function onAnimationFrame() {
        if (stopAnimating === true) {
            return;
        }

        TWEEN.update(undefined, function (obj, time) {}, function (obj) {
            var localCallback = afterAnimationCompleteCallback;
            afterAnimationCompleteCallback = undefined;

            if (typeof(localCallback) === "function") {
                setTimeout(localCallback, 0);
            }

            stopAnimating = true;
        });

        window.requestAnimationFrame(onAnimationFrame);
    }

    function playAnimation(callback) {
        if ( ! TWEEN.isPaused() ) {
            var i=0;
            for ( i=0; i < ANIMATION_TWEENS.length; i++) {
                ANIMATION_TWEENS[i].start();
            }
        }
        else {
            TWEEN.pause(false);
        }

        if (ANIMATION_TWEENS.length === 0) {
            // When there are no animation tweens, we need to invoke the callback ourselves.

            // This can happen if performing a "forward" action for a flash tween; which ends up not adding an animation.
            // It can also happen if the sequence step is using an animation type that is unsupported.
            if (typeof(callback === "function")) {
                setTimeout(callback, 0);
            }
        }
        else {
            // begin the animation using requestAnimationFrame
            stopAnimating = false;
            afterAnimationCompleteCallback = callback;
            window.requestAnimationFrame(onAnimationFrame);
        }
    }

    function reverseAnimation(callback) {
        var i=0;
        // play the steps in reverse order
        for ( i=UNDO_TWEENS.length - 1; i >= 0; i-- ) {
            UNDO_TWEENS[i].start();
        }

        if (UNDO_TWEENS.length === 0) {
            // When there are no animation tweens, we need to invoke the callback ourselves.

            // This can happen if performing a "rewind" action for a flash tween; which ends up not adding an undo animation.
            // It can also happen if the sequence step is using an animation type that is unsupported.
            if (typeof(callback === "function")) {
                setTimeout(callback, 0);
            }
        }
        else {
            // begin the "undo" animation using requestAnimationFrame.
            // note that this does not actually animate really, it jumps to the end state in 10 milliseconds
            stopAnimating = false;
            afterAnimationCompleteCallback = callback;
            window.requestAnimationFrame(onAnimationFrame);
        }
    }

    function getUndoTweens() {
        return UNDO_TWEENS;
    }

    function setUndoTweens(tweens) {
        UNDO_TWEENS = tweens.slice(0);
    }

    function pauseAnimation() {
        TWEEN.pause(true);
    }

    function isPaused() {
        return TWEEN.isPaused();
    }

    function stopAnimation(callback) {
        stopAnimating = true;
        if (typeof(callback) === "function") {
            setTimeout(callback, 0);
        }
    }

    function registerEvent(type, callback) {
        event_type = type;
        event_callback = callback;
    }

    // These are core animation tweens, not sequence tweens
    function constructTweens(container) {

        var i=0;
        var j;
        var k;
        var tw;
        var start, end;
        var end_time;
        var duration;
        var start_values, end_values;
        var from_data, to_data;
        var start_transparency, end_transparency;
        var meshes;
        UNDO_TWEENS = [];
        for ( i=0; i < container.tracks.length; i++ ) {
            if ( container.tracks[i] instanceof ContainerTrack ) {
                constructTweens( container.tracks[i] );
            }
            if ( container.tracks[i] instanceof ItemTrack ) {
                if ( container.tracks[i].type === "camera" ) {
                    j=0;
                    for ( j=0; j < container.tracks[i].tracks.length; j++ ) {
                        if ( container.tracks[i].tracks[j].property === "camera") {
                            k=1;
                            for ( k=0; k < container.tracks[i].tracks[j].keys.length; k++ ) {
                                start = k-1;
                                if ( container.tracks[i].tracks[j].keys[k].segment === "true" || k === 0 ) {
                                    start = k;
                                }
                                end = k;
                                var start_camera = container.tracks[i].tracks[j].keys[start];
                                start_values = start_camera.values;
                                var end_camera = container.tracks[i].tracks[j].keys[end];
                                end_values = end_camera.values;
                                duration = (end_camera.time - start_camera.time) * SPEED;
                                from_data = {
                                    data: {
                                        object: defaultCamera,
                                        fov : {
                                            top: parseFloat(start_values[TOP]),
                                            bottom: parseFloat(start_values[BOTTOM]),
                                            left: parseFloat(start_values[LEFT]),
                                            right: parseFloat(start_values[RIGHT]),
                                            depth: parseFloat(start_values[DEPTH])
                                        },
                                        position :  new THREE.Vector3(parseFloat(start_values[POSX]), parseFloat(start_values[POSY]), parseFloat(start_values[POSZ])),
                                        quaternion : new THREE.Quaternion(parseFloat(start_values[QX]), parseFloat(start_values[QY]), parseFloat(start_values[QZ]), parseFloat(start_values[QW])),
                                        center :  new THREE.Vector3(parseFloat(start_values[ATX]), parseFloat(start_values[ATY]), parseFloat(start_values[ATZ])),
                                        scale : parseFloat(start_values[SCALE]),
                                        mc : start_values[ATD],
                                        event_callback: {
                                            type: event_type,
                                            callback: event_callback
                                        },
                                    }
                                };
                                to_data = {
                                    data: {
                                        object: defaultCamera,
                                        fov : {
                                            top: parseFloat(end_values[TOP]),
                                            bottom: parseFloat(end_values[BOTTOM]),
                                            left: parseFloat(end_values[LEFT]),
                                            right: parseFloat(end_values[RIGHT]),
                                            depth: parseFloat(end_values[DEPTH])
                                        },
                                        position :  new THREE.Vector3(parseFloat(end_values[POSX]), parseFloat(end_values[POSY]), parseFloat(end_values[POSZ])),
                                        quaternion : new THREE.Quaternion(parseFloat(end_values[QX]), parseFloat(end_values[QY]), parseFloat(end_values[QZ]), parseFloat(end_values[QW])),
                                        center :  new THREE.Vector3(parseFloat(end_values[ATX]), parseFloat(end_values[ATY]), parseFloat(end_values[ATZ])),
                                        scale : parseFloat(end_values[SCALE]),
                                        mc : end_values[ATD],
                                        event_callback: {
                                            type: event_type,
                                            callback: event_callback
                                        },
                                    }
                                };
                                if ( isInitalState( duration, start_values, end_values) ) {
                                    getAnimationAdapter().cameraInitialization(from_data.data);
                                }
                                else {
                                    tw = new TWEEN.Tween( from_data );
                                    tw.to( to_data, duration );
                                    tw.easing(TWEEN.Easing.Linear.None);
                                    tw.interpolation(getAnimationAdapter().cameraInterpolation);
                                    tw.delay( (container.tracks[i].tracks[j].keys[start].time) * SPEED);
                                    end_time = (container.tracks[i].tracks[j].keys[start].time) * SPEED + duration;
                                    if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
                                    ANIMATION_TWEENS.push(tw);
                                }
                            }
                        }
                        else {
                            console.log("Don't yet support track type property " + container.tracks[i].tracks[j].property);
                        }
                    }
                }
                else if ( container.tracks[i].type === "selectionitem" ) {
                    if (DEBUG) console.log (" Tween " + container.tracks[i].selectionItem.sbomIdPath);
                    for ( j=0; j < container.tracks[i].tracks.length; j++ ) {
                        if ( container.tracks[i].tracks[j].property === "color") {
                            for ( k=0; k < container.tracks[i].tracks[j].keys.length; k++ ) {
                                start = k-1;
                                if ( container.tracks[i].tracks[j].keys[k].segment === "true" || k === 0 ) {
                                    start = k;
                                }
                                end = k;
                                var start_color = container.tracks[i].tracks[j].keys[start];
                                start_values = start_color.values;
                                var end_color = container.tracks[i].tracks[j].keys[end];
                                end_values = end_color.values;
                                duration = (end_color.time - start_color.time) * SPEED;
                                meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.instance);
                                if ( meshes === undefined || meshes.length === 0 ) {
                                    meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.sbomIdPath);
                                }
                                if ( meshes === undefined || meshes.length === 0 ) {
                                    console.log("Assembly not processed geometry" + container.tracks[i].selectionItem.instance + " nor " + container.tracks[i].selectionItem.sbomIdPath + " to change " + container.tracks[i].tracks[j].property );
                                }
                                else {
                                    from_data = {
                                        data: {
                                            object: meshes,
                                            color: [parseFloat(start_values[0]), parseFloat(start_values[1]), parseFloat(start_values[2])]
                                        }
                                    };
                                    to_data = {
                                        data: {
                                            color: [parseFloat(end_values[0]), parseFloat(end_values[1]), parseFloat(end_values[2])]
                                        }
                                    };
                                    if ( isInitalState( duration, start_values, end_values) ) {
                                        getAnimationAdapter().colorInitialization(from_data.data);
                                    }
                                    else {
                                        tw = new TWEEN.Tween( from_data );
                                        tw.to( to_data, duration );
                                        tw.easing(TWEEN.Easing.Linear.None);
                                        tw.interpolation(getAnimationAdapter().colorInterpolation);
                                        tw.delay(container.tracks[i].tracks[j].keys[start].time * SPEED);
                                        end_time =  (container.tracks[i].tracks[j].keys[start].time) * SPEED + duration;
                                        if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
                                        ANIMATION_TWEENS.push(tw);
                                    }
                                }
                            }
                        }
                        else if ( container.tracks[i].tracks[j].property === "transparency" ) {
                            // This is the opacity of the object
                            k=1;
                            for ( k=0; k < container.tracks[i].tracks[j].keys.length; k++ ) {
                                start = k-1;
                                if ( container.tracks[i].tracks[j].keys[k].segment === "true" || k === 0 ) {
                                    start = k;
                                }
                                end = k;
                                start_transparency = container.tracks[i].tracks[j].keys[start];
                                start_values = start_transparency.values;
                                end_transparency = container.tracks[i].tracks[j].keys[end];
                                end_values = end_transparency.values;
                                duration = (end_transparency.time - start_transparency.time) * SPEED;
                                meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.instance);
                                if ( meshes === undefined || meshes.length === 0 ) {
                                    meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.sbomIdPath);
                                }
                                if ( meshes === undefined || meshes.length === 0 ) {
                                    console.log("Assembly not processed geometry" + container.tracks[i].selectionItem.instance + " nor " + container.tracks[i].selectionItem.sbomIdPath + " to change " + container.tracks[i].tracks[j].property );
                                }
                                else {
                                    from_data = {
                                        data: {
                                            object: meshes,
                                            transparency: parseFloat(start_values[0])
                                        }
                                    };
                                    to_data = {
                                        data: {
                                            transparency: parseFloat(end_values[0])
                                        }
                                    };
                                    if ( isInitalState( duration, start_values, end_values) ) {
                                        getAnimationAdapter().transparencyInitialization(from_data.data);
                                    }
                                    else {
                                        tw = new TWEEN.Tween( from_data );
                                        tw.to( to_data, duration );
                                        tw.easing(TWEEN.Easing.Linear.None);
                                        tw.interpolation(getAnimationAdapter().transparencyInterpolation);
                                        tw.delay(container.tracks[i].tracks[j].keys[start].time * SPEED);
                                        end_time =  (container.tracks[i].tracks[j].keys[start].time) * SPEED + duration;
                                        if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
                                        ANIMATION_TWEENS.push(tw);
                                    }
                                }
                            }
                        }
                        else if ( container.tracks[i].tracks[j].property === "visibility" ) {
                            k=1;
                            for ( k=0; k < container.tracks[i].tracks[j].keys.length; k++ ) {
                                start = k-1;
                                if ( container.tracks[i].tracks[j].keys[k].segment === "true" || k === 0 ) {
                                    start = k;
                                }
                                end = k;
                                var start_visibility = container.tracks[i].tracks[j].keys[start];
                                start_values = start_visibility.values;
                                var end_visibility = container.tracks[i].tracks[j].keys[end];
                                end_values = end_visibility.values;
                                duration = (end_visibility.time - start_visibility.time) * SPEED;
                                meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.instance);
                                if ( meshes === undefined || meshes.length === 0  ) {
                                    meshes = getAnimationAdapter().getGeometryByPath(container.tracks[i].selectionItem.sbomIdPath);
                                }
                                if ( meshes === undefined || meshes.length === 0) {
                                    console.log("Assembly not processed geometry" + container.tracks[i].selectionItem.instance + " nor " + container.tracks[i].selectionItem.sbomIdPath + " to change " + container.tracks[i].tracks[j].property );
                                }
                                else {
                                    end_transparency = 0.0;
                                    if ( parseFloat(end_values[0]) == 1 ) end_transparency = 1.0;
                                    start_transparency = 0.0;
                                    if ( parseFloat(start_values[0]) == 1 ) start_transparency = 1.0;
                                    if ( meshes !== undefined && meshes !== null ) {
                                        from_data = {
                                            data: {
                                                object: meshes,
                                                visibility: toBoolean(start_values[0]),
                                                transparency: start_transparency
                                            }
                                        };
                                        to_data = {
                                            data: {
                                                visibility: toBoolean(end_values[0]),
                                                transparency: end_transparency
                                            }
                                        };
                                        if ( isInitalState( duration, start_values, end_values) ) {
                                            getAnimationAdapter().visibilityInitialization(from_data.data);
                                        }
                                        else {
                                            tw = new TWEEN.Tween( from_data );
                                            tw.to( to_data, duration );
                                            tw.easing(TWEEN.Easing.Linear.None);
                                            tw.interpolation(getAnimationAdapter().visibilityInterpolation);
                                            tw.delay(container.tracks[i].tracks[j].keys[start].time * SPEED);
                                            end_time =  (container.tracks[i].tracks[j].keys[start].time) * SPEED + duration;
                                            if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
                                            ANIMATION_TWEENS.push(tw);
                                        }
                                    }
                                }
                            }
                        }
                        else if ( container.tracks[i].tracks[j].property === "location" ) {
                            k=1;
                            for ( k=0; k < container.tracks[i].tracks[j].keys.length; k++ ) {
                                start = k-1;
                                if ( container.tracks[i].tracks[j].keys[k].segment === "true" || k === 0 ) {
                                    start = k;
                                }
                                end = k;
                                var start_location = container.tracks[i].tracks[j].keys[start];
                                start_values = start_location.values;
                                var end_location = container.tracks[i].tracks[j].keys[end];
                                end_values = end_location.values;
                                duration = (end_location.time - start_location.time) * SPEED;

                                var group = getAnimationAdapter().getSelectedObject(container.tracks[i].selectionItem.instance);
                                if ( group === undefined  ) {
                                    group = getAnimationAdapter().getSelectedObject(container.tracks[i].selectionItem.sbomIdPath);
                                }
                                if ( group === undefined ) {
                                    console.log("Not processing geometry " + container.tracks[i].selectionItem.instance + " nor " + container.tracks[i].selectionItem.sbomIdPath + " to change " + container.tracks[i].tracks[j].property );
                                }
                                else {
                                    var object = groups;
                                    var originalpositions = [];
                                    var originalQuaternions = [];
                                    var fps = [];
                                    var tps = [];
                                    for ( var ig = 0 ; ig < groups.length; ig++ ) {
                                        for ( var im = 0 ; im < groups[ig].children.length; im++ ) {
                                            originalpositions.push( new THREE.Vector3( groups[ig].children[im].position.x, groups[ig].children[im].position.y, groups[ig].children[im].position.z) );
                                            originalQuaternions.push( new THREE.Quaternion(groups[ig].children[im].quaternion.x, groups[ig].children[im].quaternion.y, groups[ig].children[im].quaternion.z, groups[ig].children[im].quaternion.w) );
                                            // The positions in the animation are relative to the parent, and so need to be rotated, clearly this is a hack for the moment
                                            var fp = new THREE.Vector3(parseFloat(start_values[POSX]), parseFloat(start_values[POSY]), parseFloat(start_values[POSZ]));
                                            var mat4 = new THREE.Matrix4();
                                            mat4.makeRotationFromQuaternion(getAnimationAdapter().getQuaternion(groups[ig].children[im]));
                                            mat4.setPosition(getAnimationAdapter().getPosition(groups[ig].children[im]));
                                            var rotmat4 = new THREE.Matrix4();
                                            rotmat4.copy(mat4);
                                            rotmat4.elements[12] = 0.0;
                                            rotmat4.elements[13] = 0.0;
                                            rotmat4.elements[14] = 0.0;
                                            fp.applyMatrix4(rotmat4);
                                            fps.push(fp);
                                            var tp = new THREE.Vector3(parseFloat(end_values[POSX]), parseFloat(end_values[POSY]), parseFloat(end_values[POSZ]));
                                            tp.applyMatrix4(rotmat4);
                                            tps.push(tp);
                                        }
                                    }

                                    from_data = {
                                        data: {
                                            object: object,
                                            startPosition : originalpositions,
                                            startQuaternion : originalQuaternions,
                                            position: fps,
                                            quaternion : new THREE.Quaternion(parseFloat(start_values[QX]), parseFloat(start_values[QY]), parseFloat(start_values[QZ]), parseFloat(start_values[QW])),
                                            center :  new THREE.Vector3(parseFloat(start_values[ATX]), parseFloat(start_values[ATY]), parseFloat(start_values[ATZ])),
                                            scale : parseFloat(start_values[SCALE]),
                                            mc : start_values[ATD]
                                        }
                                    };
                                    to_data = {
                                        data: {
                                            position: tps,
                                            quaternion : new THREE.Quaternion(parseFloat(end_values[QX]), parseFloat(end_values[QY]), parseFloat(end_values[QZ]), parseFloat(end_values[QW])),
                                            center :  new THREE.Vector3(parseFloat(end_values[ATX]), parseFloat(end_values[ATY]), parseFloat(end_values[ATZ])),
                                            scale : parseFloat(end_values[SCALE]),
                                            mc : end_values[ATD]
                                        }
                                    };
                                    if ( isInitalState( duration, start_values, end_values) ) {
                                        //getAnimationAdapter().locationInitialization(from_data.data, to_data.data);
                                    }
                                    else {
                                        if ( object !== null ) {
                                            tw = new TWEEN.Tween( from_data );
                                            tw.to( to_data, duration );
                                            tw.delay(container.tracks[i].tracks[j].keys[start].time * SPEED);
                                            tw.interpolation(getAnimationAdapter().seqLocationInterpolation);
                                            end_time =  (container.tracks[i].tracks[j].keys[start].time) * SPEED + duration;
                                            if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
                                            ANIMATION_TWEENS.push(tw);
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            console.log("Don't yet support selection property " + container.tracks[i].tracks[j].property);
                        }
                    }
                }
                else {
                    console.log("Don't yet support track type " + container.tracks[i].type);
                }
            }
        }
    }

    function toBoolean (value) {
        if ( value == 1 ) return true;
        return false;
    }

    function dummyInterpolation(start, end, value ) {
        if (DEBUG) console.log("calling dummyInterpolation for " + start.object);
    }

    function addDummyTween( start_time, end_time, dummyfor, callback ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        var from_data = {
            data: {
                object: dummyfor,
                attribute: 0
            }
        };
        var to_data = {
            data: {
                attribute: 1
            }
        };
        var tw = new TWEEN.Tween( from_data );
        tw.to( to_data, duration );
        tw.easing(TWEEN.Easing.Linear.None);
        tw.interpolation(dummyInterpolation);
        tw.delay(start_time * SPEED);
        if ( callback !== null ) {
            tw.onComplete(callback);
        }
        var eend_time =  start_time * SPEED + duration;
        if ( eend_time > RUNNING_TIME ) RUNNING_TIME = eend_time;
        ANIMATION_TWEENS.push(tw);
        return true;
    }

    function addPulseTween( start_time, end_time, instance, sbomIdPath, callback ) {
        var start = start_time;
        var duration = end_time - start;
        // For the case of Next/Previous, Flash ends showing nothing, however when played slowly there are tweens
        if ( duration < 1000.0 ) {
            return true;
        }

        var object = getAnimationAdapter().getSelectedObject(instance);
        if ( object === null ) {
            object = getAnimationAdapter().getSelectedObject(sbomIdPath);
        }
        if ( object === null ) {
            console.log("Not processing geometry " + instance + " nor " + sbomIdPath + " to pulse" );
            return false;
        }
        var pivot = new THREE.Vector3(0.0,0.0,0.0);

        var location = [];
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: 1.2, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: getAnimationAdapter().getScale(object), center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: 1.2, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: getAnimationAdapter().getScale(object), center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: 1.2, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: getAnimationAdapter().getScale(object), center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: 1.2, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: getAnimationAdapter().getScale(object), center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: 1.2, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: new THREE.Vector3().copy(getAnimationAdapter().getPosition(object)), scale: getAnimationAdapter().getScale(object), center: pivot, global: false });
        var start_step = start;
        var step_duration = duration / location.length;
        for ( var i = 0; i < location.length - 1; i++) {
            addLocationTween(start_step, start_step + step_duration, instance, sbomIdPath, location[i], false, null);
            start_step = start_step + step_duration;
        }
        addLocationTween(start_step, start_step + step_duration, instance, sbomIdPath, location[location.length - 1], false, callback);
        return true;
    }

    function addWobbleTween( start_time, end_time, instance, sbomIdPath, callback ) {
        var start = start_time;
        var duration = end_time - start;
        // For the case of Next/Previous, Flash ends showing nothing, however when played slowly there are tweens
        if ( duration < 1000.0 ) {
            return true;
        }

        var object = getAnimationAdapter().getSelectedObject(instance);
        if ( object === null ) {
            object = getAnimationAdapter().getSelectedObject(sbomIdPath);
        }
        if ( object === null ) {
            console.log("Not processing geometry " + instance + " nor " + sbomIdPath + " to wobble" );
            return false;
        }

        // To keep the location tween happy
        var position = object.position;
        var pivot = new THREE.Vector3(0.0,0.0,0.0);

        var fiveDegrees = 5.0 * Math.PI / 180.0;

        var vectorx = new THREE.Vector3(1,0,0);
        var vectory = new THREE.Vector3(0,1,0);
        var vectorz = new THREE.Vector3(0,1,0);
        var xplusquat = new THREE.Quaternion().setFromAxisAngle( vectorx, fiveDegrees);
        var xminusquat = new THREE.Quaternion().setFromAxisAngle( vectorx, -fiveDegrees);
        var yplusquat = new THREE.Quaternion().setFromAxisAngle( vectory, fiveDegrees);
        var yminusquat = new THREE.Quaternion().setFromAxisAngle( vectory, -fiveDegrees);
        var zplusquat = new THREE.Quaternion().setFromAxisAngle( vectorz, fiveDegrees);
        var zminusquat = new THREE.Quaternion().setFromAxisAngle( vectorz, -fiveDegrees);

        var location = [];
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false });
        location.push( { quaternion: new THREE.Quaternion().copy(xplusquat).multiply(yplusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(yminusquat).multiply(xminusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(xplusquat).multiply(zplusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(zminusquat).multiply(xminusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(xplusquat).multiply(yplusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(yminusquat).multiply(xminusquat).multiply(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false} );
        location.push( { quaternion: new THREE.Quaternion().copy(getAnimationAdapter().getQuaternion(object)), position: position, center: pivot, global: false });
        var nwobble = 6;
        var nstep = location.length;
        var duration_per_wobble = duration/nwobble;
        var duration_per_wobble_step = duration_per_wobble/nstep;
        for ( var iwobble = 0 ; iwobble < nwobble; iwobble++ ) {
            var start_wobble = start + iwobble * duration_per_wobble;
            for ( var istep = 0 ; istep < nstep; istep++ ) {
                var start_step = start_wobble + istep * duration_per_wobble_step;
                var end_step = start_step + duration_per_wobble_step;
                if ( istep == (nstep - 1) && iwobble == (nwobble - 1) ) {
                    addLocationTween(start_step, end_step, instance, sbomIdPath, location[istep], false, callback);

                }
                else {
                    addLocationTween(start_step, end_step, instance, sbomIdPath, location[istep], false, null);
                }
            }
        }



        return true;
    }

    // Works
    function addUnScrewTween( start_time, end_time, instance, sbomIdPath, screw_values, callback ) {
        var start = start_time;
        var duration = end_time - start;
        var duration_per_step = duration/3;

        var object = getAnimationAdapter().getSelectedObject(instance);
        if ( object === null ) {
            object = getAnimationAdapter().getSelectedObject(sbomIdPath);
        }
        if ( object === null ) {
            console.log("Not processing geometry " + instance + " nor " + sbomIdPath + " to unscrew" );
            return false;
        }
        var start_step = start;
        var end_step = start_step + duration_per_step;

        // So it appears there are 4 values, and these are relative to the first in terms of position
        // In terms of previous/undo, just need to reset to the first tween
        for ( var istep = 1; istep < screw_values.values.length-1; istep++ ) {
            if ( istep == 1 ) {
                addLocationTween(start_step, end_step, instance, sbomIdPath, screw_values.values[istep], true, null);
            }
            else {
                addLocationTween(start_step, end_step, instance, sbomIdPath, screw_values.values[istep], false, null);
            }
            if ( istep != screw_values.values.length-1) {
                screw_values.values[istep+1].previousPosition = screw_values.values[istep].previousPosition;
                screw_values.values[istep+1].previousQuaternion = screw_values.values[istep].previousQuaternion;
            }
            start_step = start_step + duration_per_step;
            end_step = start_step + duration_per_step;
        }
        addLocationTween(start_step, end_step, instance, sbomIdPath, screw_values.values[screw_values.values.length-1], false, callback);
        return true;
    }

    // This works, it appears in illustrate that in a step the color of an object can only change once, so this code matches that behavior
    function addColorTween( start_time, end_time, instance, sbomIdPath, start_color, end_color, callback ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        var meshes = getAnimationAdapter().getGeometryByPath(instance);
        if ( meshes === undefined || meshes.length === 0 ) {
            meshes = getAnimationAdapter().getGeometryByPath(sbomIdPath);
        }
        if ( meshes === undefined || meshes.length === 0 ) {
            console.log("Assembly not processed geometry" + instance + " nor " + sbomIdPath + " to change color" );
            return false;
        }

        var undoColor = start_color;
        if ( start_color === null ) {
            start_color = getAnimationAdapter().getColorArray(meshes[0]);
            undoColor = start_color;

            if (start_color === null) {
                // Happens when the node doesn't have any color data.
                // Default to Creo Grey for the tween, but make sure the undoColor is still null.
                start_color = DEFAULT_CREO_GREY_COLOR;
                undoColor = null;
            }
        }
        var from_data = {
            data: {
                object: meshes,
                color: start_color
            }
        };

        // This is used by the undo tween as the final state after the undo.
        var undo_data = {
            data: {
                object: meshes,
                color: undoColor
            }
        };

        var to_data = {
            data: {
                object: meshes,
                color: end_color
            }
        };
        if ( isInitalState( duration, start_color, end_color) ) {
            getAnimationAdapter().colorInitialization(from_data.data);
            return false;
        }
        var tw = new TWEEN.Tween( from_data );
        tw.to( to_data, duration );
        tw.easing(TWEEN.Easing.Linear.None);
        tw.interpolation(getAnimationAdapter().colorInterpolation);
        tw.delay(start_time * SPEED);
        if ( callback !== null ) {
            tw.onComplete(callback);
        }
        var eend_time =  start_time * SPEED + duration;
        if ( eend_time > RUNNING_TIME ) RUNNING_TIME = eend_time;
        ANIMATION_TWEENS.push(tw);

        var utw = new TWEEN.Tween( to_data );
        utw.to( undo_data, UNDO_DURATION );
        utw.easing(TWEEN.Easing.Linear.None);
        utw.interpolation(getAnimationAdapter().colorInterpolation);
        utw.delay(0);
        UNDO_TWEENS.push(utw);

        return true;
    }

    // This works, results can be slightly different to Illustrate if the color has previously changed. Illustrate flashes to a different color not set by the user.
    // I believe this behavior here is correct
    function addFlashTween( start_time, end_time, instance, sbomIdPath, start_color, end_color, callback ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        // For the case of Next/Previous, Flash ends showing nothing, however when played slowly there are tweens
        if ( duration < 500.0 ) return false;
        var meshes = getAnimationAdapter().getGeometryByPath(instance);
        if ( meshes === undefined || meshes.length === 0 ) {
            meshes = getAnimationAdapter().getGeometryByPath(sbomIdPath);
        }
        if ( meshes === undefined || meshes.length === 0 ) {
            console.log("Assembly not processed geometry" + instance + " nor " + sbomIdPath + " to change color" );
            return false;
        }

        // We can set the original color, but this may have changed by the time the Tween runs
        var requiresFinalNullColor = false;
        var original_color = getAnimationAdapter().getColorArray(meshes[0]);

        if (original_color === null) {
            original_color = DEFAULT_CREO_GREY_COLOR;
            requiresFinalNullColor = true;
        }

        var from_data = {
            data: {
                object: meshes,
                color: original_color
            }
        };
        var to_data = {
            data: {
                object: meshes,
                color: end_color
            }
        };

        // Flash is the changing of color from the original and back again 6 times within the overall duration, so 12 individual tweens
        var cycles = 12;
        duration = duration/cycles;
        var isOriginal = true;
        resetToNullColorFN = function() {
            if (requiresFinalNullColor) {
                var data = {
                    object: meshes,
                    color: null
                };
                getAnimationAdapter().colorInitialization(data);
            }
            if (callback) {
                callback.apply(this, arguments);
            }
        };

        var setupColorFunc = function(object, result) {
            var color = getAnimationAdapter().getColorArray(object.data.object[0]);
            if (color === null) {
                object.data.color = DEFAULT_CREO_GREY_COLOR;
                requiresFinalNullColor = true;
            } else {
                object.data.color = color;
                requiresFinalNullColor = false;
            }
        };

        for ( var i = 0 ; i < cycles; i++ ) {
            var tw;
            if ( isOriginal ) {
                tw = new TWEEN.Tween( from_data );
                tw.to( to_data, duration );
                // For the case where the color of the object has changed since the tween was created we need to set the color here
                // function defined above to avoid creating it in a loop.
                tw.onStart(setupColorFunc);
            }
            else {
                tw = new TWEEN.Tween( to_data );
                tw.to( from_data, duration );
            }
            isOriginal = !isOriginal;
            tw.easing(TWEEN.Easing.Linear.None);
            tw.interpolation(getAnimationAdapter().colorInterpolation);
            var st = start + i*duration;
            tw.delay(st);
            if ( i == (cycles - 1) ) {
                tw.onComplete(resetToNullColorFN);
            }
            var eend_time =  st + duration;
            if ( eend_time > RUNNING_TIME ) RUNNING_TIME = eend_time;
            ANIMATION_TWEENS.push(tw);
        }

        var undo_data = {
            data: {
                object: meshes,
                color: from_data.data.color
            }
        };
        if (requiresFinalNullColor) {
            undo_data.data.color = null;
        }

        var utw = new TWEEN.Tween( to_data );
        utw.to( undo_data, UNDO_DURATION );
        utw.easing(TWEEN.Easing.Linear.None);
        utw.interpolation(getAnimationAdapter().colorInterpolation);
        utw.delay(0);
        UNDO_TWEENS.push(utw);

        return true;
    }

    // This works
    function addVisibilityTransparencyTween( start_time, end_time, instance, sbomIdPath, start_visibility, end_visibility, start_transparency, end_transparency, callback ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        var meshes = getAnimationAdapter().getGeometryByPath(instance);
        if ( meshes === undefined || meshes.length === 0 ) {
            meshes = getAnimationAdapter().getGeometryByPath(sbomIdPath);
        }
        if ( meshes === undefined || meshes.length === 0 ) {
            console.log("Assembly not processed geometry" + instance + " nor " + sbomIdPath + " to change visibility" );
            return false;
        }
        if ( start_transparency === null ) {
            start_transparency = getAnimationAdapter().getOpacity(meshes[0]);
        }
        var from_data = {
            data: {
                object: meshes,
                visibility: toBoolean(start_visibility[0]),
                transparency: start_transparency
            }
        };
        var to_data = {
            data: {
                object: meshes,
                visibility: toBoolean(end_visibility),
                transparency: end_transparency
            }
        };
        if ( isInitalState( duration, start_visibility, end_visibility) ) {
            getAnimationAdapter().visibilityInitialization(from_data.data);
            return false;
        }
        var tw = new TWEEN.Tween( from_data );
        tw.to( to_data, duration );
        tw.easing(TWEEN.Easing.Linear.None);
        tw.interpolation(getAnimationAdapter().visibilityInterpolation);
        tw.delay(start_time * SPEED);
        if ( callback !== null ) {
            tw.onComplete(callback);
        }
        var eend_time =  start_time * SPEED + duration;
        if ( eend_time > RUNNING_TIME ) RUNNING_TIME = eend_time;
        ANIMATION_TWEENS.push(tw);

        var utw = new TWEEN.Tween( to_data );
        utw.to( from_data, UNDO_DURATION );
        utw.easing(TWEEN.Easing.Linear.None);
        utw.interpolation(getAnimationAdapter().visibilityInterpolation);
        utw.delay(0);
        UNDO_TWEENS.push(utw);

        return true;
    }

    // This only works when Global Fly is selected. The behavior in Illustrate then does not match exactly as assemblies appear to move independent and can move apart
    function addFlyTween(start_time, end_time, instance, sbomIdPath, moveby, out, callback ) {
        // Fly out is a move and a fade out after 50% of the time
        // Fly in is a move and a fade in for first 50% of the time
        if ( ! addMoveByTween(start_time, end_time, instance, sbomIdPath, moveby, !out, callback ) ) {
            return false;
        }
        var vt_start_time;
        var vt_end_time;
        var vt_start_visibility;
        var vt_end_visibility;
        var vt_start_transparency;
        var vt_end_transparency;
        if ( out ) {
            vt_start_time = start_time + ( end_time - start_time ) /2;
            vt_end_time = end_time;
            vt_start_visibility = [1];
            vt_end_visibility = [0];
            vt_start_transparency = 1;
            vt_end_transparency = 0;
        }
        else {
            vt_start_time = start_time;
            vt_end_time = start_time + ( end_time - start_time ) /2;
            vt_start_visibility = [0];
            vt_end_visibility = [1];
            vt_start_transparency = 0;
            vt_end_transparency = 1;
        }
        addVisibilityTransparencyTween( vt_start_time, vt_end_time, instance, sbomIdPath, vt_start_visibility, vt_end_visibility, vt_start_transparency, vt_end_transparency, null );
        return true;
    }

    // This only works when Global Fly is selected. The behavior in Illustrate then does not match exactly as assemblies appear to move independent and can move apart
    function addMoveByTween(start_time, end_time, instance, sbomIdPath, moveby, moveto, callback ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        var object = getAnimationAdapter().getSelectedObject(instance);
        if ( object === null ) {
            object = getAnimationAdapter().getSelectedObject(sbomIdPath);
        }
        if ( object === null ) {
            console.log("Not processing geometry " + instance + " nor " + sbomIdPath + " to change location" );
            return false;
        }

        var scalar = getAnimationAdapter().getFlyScalar(object);
        moveby.position.multiplyScalar(scalar);

        if ( ! moveby.global) {
            moveby.position.applyQuaternion(getAnimationAdapter().getQuaternion(object));
        }

        var from_data = {
            data: {
                object: object,
                startPosition : object.position.clone(),
                startQuaternion : object.quaternion.clone(),
                position: new THREE.Vector3(0,0,0),
                quaternion : new THREE.Quaternion(),
                center :  new THREE.Vector3(0,0,0),
                scale : 1,
                mc: false
            }
        };
        var to_data = {
            data: {
                object: object,
                startPosition : object.position.clone(),
                startQuaternion : object.quaternion.clone(),
                position: new THREE.Vector3().copy(moveby.position),
                quaternion : new THREE.Quaternion(),
                center :  new THREE.Vector3(0,0,0),
                scale : 1,
                mc: false
            }
        };

        var tw = new TWEEN.Tween( from_data );
        tw.to( to_data, duration );
        tw.delay(start_time * SPEED);
        tw.onStart( function (object, result) {
        } );
        tw.interpolation(getAnimationAdapter().locationMoveByInterpolation);
        if ( callback !== null ) {
            tw.onComplete(callback);
        }
        end_time =  start_time * SPEED + duration;
        if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
        ANIMATION_TWEENS.push(tw);

        var utw = new TWEEN.Tween( to_data );
        utw.to( from_data, UNDO_DURATION );
        utw.easing(TWEEN.Easing.Linear.None);
        utw.interpolation(getAnimationAdapter().locationMoveByInterpolation);
        utw.delay(0);
        UNDO_TWEENS.push(utw);

        return true;
    }

    function MatrixTRS(position, quaternion, scale) {
        var mat = new THREE.Matrix4();
        mat.makeRotationFromQuaternion(quaternion);
        mat.setPosition(position);
        mat.scale(scale);
        return mat;
    }

    function addLocationTween(start_time, end_time, instance, sbomIdPath, location, create_undo, callback, screwto ) {
        var start = start_time * SPEED;
        var duration = end_time * SPEED - start;
        var group = getAnimationAdapter().getSelectedObject(instance);
        if ( group === null ) {
            group = getAnimationAdapter().getSelectedObject(sbomIdPath);
        }
        if ( group === null ) {
            console.log("Not processing geometry " + instance + " nor " + sbomIdPath + " to change location" );
            return false;
        }

        // This mimics the Unity code
        var quatlocal = location.quaternion;
        var poslocal = location.position;

        if ( location.global ){
            // The animation is define using global positioning, so it needs converting to local

            /*
              var relativeTo = getAnimationAdapter().getWorldMatrix(group.parent);
              var mat = MatrixTRS(location.position, location.quaternion, new THREE.Vector3(1.0,1.0,1.0));
              var relativeToInverse = (new THREE.Matrix4()).getInverse(relativeTo);
              var matlocal = (new THREE.Matrix4()).multiplyMatrices(relativeToInverse, mat);
              quatlocal = (new THREE.Quaternion()).setFromRotationMatrix(matlocal);
              poslocal = (new THREE.Vector3()).setFromMatrixPosition(matlocal);
            */

            var localLocation = getAnimationAdapter().getLocalFromWorldLocation( location, group.parent);
            quatlocal = localLocation.quaternion;
            poslocal = localLocation.position;
        }

        var mat_part_local = MatrixTRS(getAnimationAdapter().getPosition(group), getAnimationAdapter().getQuaternion(group), new THREE.Vector3(1.0,1.0,1.0));
        // For Un-screw, where we need the position at the end of part of the step
        if ( location.previousPosition !== undefined ) {
            if ( location.scale === undefined ) location.scale = 1.0;
            mat_part_local = MatrixTRS(location.previousPosition, location.previousQuaternion, new THREE.Vector3(location.scale,location.scale,location.scale));
        }
        var pt = MatrixTRS(location.center, new THREE.Quaternion(0.0,0.0,0.0,1.0), new THREE.Vector3(1.0,1.0,1.0));
        var mpt = (new THREE.Matrix4()).getInverse(pt);

        var to_pivot = (new THREE.Matrix4()).multiplyMatrices(mpt, mat_part_local);
        var quat_to_pivot = (new THREE.Quaternion()).setFromRotationMatrix(to_pivot);
        var pos_to_pivot = (new THREE.Vector3()).setFromMatrixPosition(to_pivot);

        // mat_pivot_local is the global location after the translation
        var mat_pivot_local = MatrixTRS(poslocal, quatlocal, new THREE.Vector3(1.0,1.0,1.0));

        var rot_pivot = (new THREE.Matrix4()).multiplyMatrices(mpt, mat_pivot_local);
        var quat_after_rot = (new THREE.Quaternion()).setFromRotationMatrix(rot_pivot);
        var pos_after_rot = (new THREE.Vector3()).setFromMatrixPosition(rot_pivot);

        // This should be the same as poslocal, quatlocal
        var mat_part_global = (new THREE.Matrix4()).multiplyMatrices(pt, rot_pivot);
        var quat_part = (new THREE.Quaternion()).setFromRotationMatrix(mat_part_global);
        var pos_part = (new THREE.Vector3()).setFromMatrixPosition(mat_part_global);

        location.previousPosition = pos_part;
        location.previousQuaternion = quat_part;

        var scale = 1.0;
        if ( location.scale !== undefined ) {
            scale = location.scale;
        }

        var from_data = {
            data: {
                object: group,
                startPosition : getAnimationAdapter().getPosition(group),
                startQuaternion : getAnimationAdapter().getQuaternion(group),
                startScale : getAnimationAdapter().getScale(group),
                endPosition : poslocal,
                endQuaternion : quatlocal,
                position: pos_to_pivot,
                quaternion : quat_to_pivot,
                center : location.center,
                scale : getAnimationAdapter().getScale(group),
                mc: false,
                global: location.global,
                loc:location,
                callback: callback
            }
        };
        var to_data = {
            data: {
                object: group,
                startPosition : getAnimationAdapter().getPosition(group),
                startQuaternion : getAnimationAdapter().getQuaternion(group),
                startScale : getAnimationAdapter().getScale(group),
                endPosition : pos_part,
                endQuaternion : quat_part,
                position: pos_after_rot,
                quaternion : quat_after_rot,
                center : location.center,
                scale : scale,
                mc: false,
                global: location.global,
                loc:location,
                callback: callback
            }
        };

        var tw = new TWEEN.Tween( from_data );
        tw.to( to_data, duration );
        tw.delay(start_time * SPEED);
        tw.interpolation(getAnimationAdapter().seqLocationInterpolation);
        tw.onStart( function (object, result) {
            insertPivotNode(object.data.object, object.data.center, object.data.position, object.data.quaternion);
        } );
        tw.onComplete( function (object, result) {
            removePivotNode(object.data.object, object.data.endPosition, object.data.endQuaternion);
            object.data.loc.previousPosition = undefined;
            object.data.loc.previousQuaternion = undefined;

            if ( object.data.callback !== null ) {
                object.data.callback.call( object, result);
            }
        } );
        end_time =  start_time * SPEED + duration;
        if ( end_time > RUNNING_TIME ) RUNNING_TIME = end_time;
        ANIMATION_TWEENS.push(tw);

        if ( create_undo ) {
            var utw = new TWEEN.Tween( to_data );
            utw.to( from_data, UNDO_DURATION );
            utw.easing(TWEEN.Easing.Linear.None);
            utw.interpolation(getAnimationAdapter().seqLocationInterpolation);
            utw.onStart( function (object, result) {
                insertPivotNode(object.data.object, object.data.center, object.data.startPosition, object.data.startQuaternion);
            } );
            utw.onComplete( function (object, result) {
                removePivotNode(object.data.object, object.data.startPosition, object.data.startQuaternion);
                if ( object.data.callback !== null ) {
                    object.data.callback.call( object, result);
                }
            } );
            utw.delay(0);
            UNDO_TWEENS.push(utw);
        }
        return true;
    }

    function insertPivotNode(object, pivot, position, quaternion) {
        getAnimationAdapter().insertPivot(object.name, pivot, position, quaternion);
    }

    function removePivotNode(object, position, quaternion) {
        getAnimationAdapter().removePivot(object.name, position, quaternion);
    }

    function isInitalState( duration, start_values, end_values ) {
        if ( duration !== 0.0 ) return false;
        for ( var i = 0; i < start_values.length; i++ ) {
            if ( start_values[i] != end_values[i] ) return false;
        }
        return true;
    }

    function getPVM(pvi) {
        // Just find one
        for ( var i=0; i < pvi.childNodes.length; i++ ) {
            if ( pvi.childNodes[i].nodeName === "galaxy_schematic:figure" || pvi.childNodes[i].nodeName === "galaxy_3di:figure") {
                for ( var j=0; j < pvi.childNodes[i].childNodes.length; j++ ) {
                    if ( pvi.childNodes[i].childNodes[j].nodeName === "galaxy_3di:annotations" ) {
                        for ( var k=0; k < pvi.childNodes[i].childNodes[j].childNodes.length; k++ ) {
                            if ( pvi.childNodes[i].childNodes[j].childNodes[k].nodeName === "galaxy_3di:animation::Timeline" ) {
                                for ( var l=0; l < pvi.childNodes[i].childNodes[j].childNodes[k].childNodes.length; l++ ) {
                                    if ( pvi.childNodes[i].childNodes[j].childNodes[k].childNodes[l].nodeName === "galaxy_3di:property" ) {
                                        return pvi.childNodes[i].childNodes[j].childNodes[k].childNodes[l].attributes.value.value;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    function getTimeline(pvm) {
        var timeline = pvm.getElementsByTagName("timeline");
        if ( timeline !== null ) return timeline[0];
        return null;
    }

    function ContainerTrack(track)
    {
        this.id = track.attributes.id.value;
        this.name = track.attributes.name.value;
        if (DEBUG) console.log("ContainerTrack  id " + this.id + " name " + this.name );
        this.tracks = this.parse(track);
    }

    ContainerTrack.prototype.parse = function(track)
    {
        var tracks = [];
        for ( var i=0; i < track.childNodes.length; i++ ) {
            if ( track.childNodes[i].nodeName === "containertrack" ) {
                tracks.push( new ContainerTrack(track.childNodes[i]) );
            }
            else if ( track.childNodes[i].nodeName === "itemtrack" ) {
                tracks.push( new ItemTrack(track.childNodes[i]) );

            }
            else if ( track.childNodes[i].nodeName !== "#text" ) {
                console.log("Not processing " + track.childNodes[i].nodeName);
            }
        }
        return tracks;
    };

    function ItemTrack(track)
    {
        this.id = track.attributes.id.value;
        this.name = track.attributes.name.value;
        this.type = track.attributes.type.value;
        this.selectionItem = null;
        if (DEBUG) console.log("ItemTrack  id " + this.id + " name " + this.name + " type " + this.type );
        this.tracks = this.parse(track);
    }

    ItemTrack.prototype.parse = function(track)
    {
        var tracks = [];
        for ( var i=0; i < track.childNodes.length; i++ ) {
            if ( track.childNodes[i].nodeName === "propertytrack" ) {
                tracks.push( new PropertyTrack(track.childNodes[i]) );
            }
            else if ( track.childNodes[i].nodeName === "selectionitem" ) {
                this.selectionItem = new SelectionItem(track.childNodes[i]);
            }
            else if ( track.childNodes[i].nodeName !== "#text" ) {
                console.log("Not processing " + track.childNodes[i].nodeName);
            }
        }
        return tracks;
    };

    function SelectionItem(track)
    {
        this.itemType = track.attributes.itemtype.value;
        this.sbomIdPath = track.attributes.sbomIdPath.value;
        this.instance = track.attributes.instance.value;
        // MPH: Need to understand why it is 0:/path....
        this.instance = this.instance.substring(2);
        if (DEBUG) console.log("SelectionItem  itemtype " + this.itemType + " sbomIdPath " + this.sbomIdPath + " instance " + this.instance );
    }

    function PropertyTrack(track)
    {
        this.id = track.attributes.id.value;
        this.name = track.attributes.name.value;
        this.property = track.attributes.property.value;
        if (DEBUG) console.log("PropertyTrack  id " + this.id + " name " + this.name + " property " + this.property );
        this.keys = this.parse(track);
    }

    PropertyTrack.prototype.parse = function(track)
    {
        var keys = [];
        for ( var i=0; i < track.childNodes.length; i++ ) {
            if ( track.childNodes[i].nodeName === "key" ) {
                keys.push( new Key(track.childNodes[i]) );
            }
        }
        return keys;
    };

    function Key(_key)
    {
        this.time = _key.attributes.time.value;
        this.fraction = _key.attributes.fraction.value;
        this.segment = _key.attributes.segment.value;
        this.type = _key.attributes.type.value;
        this.valueText = null;
        this.values = [];
        for ( var i=0; i < _key.childNodes.length; i++ ) {
            if ( _key.childNodes[i].nodeName === "value" ) {
                this.valueText = _key.childNodes[i].textContent;
                this.values = this.valueText.split(",");
            }
            else if ( _key.childNodes[i].nodeName === "trajectory" ) {
            }
            else if ( _key.childNodes[i].nodeName !== "#text" ) {
                console.log("Not processing " + _key.childNodes[i].nodeName);
            }
        }
        if (DEBUG) console.log("Key  time " + this.time + " fraction " + this.fraction + " segment " + this.segment  + " type " + this.type + " values " + this.valueText);
    }

    return {
        setAnimationAdapter: setAnimationAdapter,
        getAnimationAdapter: getAnimationAdapter,
        addDummyTween: addDummyTween,
        addWobbleTween: addWobbleTween,
        addUnScrewTween: addUnScrewTween,
        addColorTween: addColorTween,
        addFlashTween: addFlashTween,
        addPulseTween: addPulseTween,
        addVisibilityTransparencyTween: addVisibilityTransparencyTween,
        addFlyTween: addFlyTween,
        addLocationTween: addLocationTween,
        setSpeed: setSpeed,
        loadAnimation: loadAnimation,
        playAnimation: playAnimation,
        reverseAnimation: reverseAnimation,
        pauseAnimation: pauseAnimation,
        stopAnimation: stopAnimation,
        isPaused: isPaused,
        getUndoTweens: getUndoTweens,
        setUndoTweens: setUndoTweens,
        registerEvent: registerEvent,
        insertPivotNode: insertPivotNode
    };

};
