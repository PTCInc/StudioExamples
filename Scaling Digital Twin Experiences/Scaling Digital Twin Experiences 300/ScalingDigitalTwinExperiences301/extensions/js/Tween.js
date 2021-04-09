/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/sole/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/sole/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

( function ( root ) {

    if ( 'performance' in root === false ) {
        root.performance = {};
    }

    // IE 8
    Date.now = ( Date.now || function () {
        return new Date().getTime();
    } );

    if ( 'now' in root.performance === false ) {
        var offset = root.performance.timing && root.performance.timing.navigationStart ? performance.timing.navigationStart
                                                                                        : Date.now();

        root.performance.now = function () {
            return Date.now() - offset;
        };
    }

} )( this );

var TWEEN = TWEEN || ( function () {

    var _tweens = [];
    var _pause = false;
    var _pauseStart = null;
    var _pauseTime = 0;

    return {

        REVISION: '14',

        getAll: function () {

            return _tweens;

        },

        removeAll: function () {

            _tweens = [];

        },

        add: function ( tween ) {
            //if ( _tweens.length <= 3 ) {
            _tweens.push( tween );
            //}


        },

        remove: function ( tween ) {

            var i = _tweens.indexOf( tween );

            if ( i !== -1 ) {

                _tweens.splice( i, 1 );

            }

        },

        // MPH added callback
        update: function ( time, progress_callback, finished_callback ) {

            if ( _tweens.length === 0 ) return false;

            if ( _pause ) {
                var now = window.performance.now();
                _pauseTime = now - _pauseStart + _pauseTime;
                _pauseStart = now;
                return false;
            }

            var i = 0;

            time = time !== undefined ? time : window.performance.now();

            time = time - _pauseTime;

            if ( progress_callback !== undefined ) {
                progress_callback(this, time);
            }

            while ( i < _tweens.length ) {

                if ( _tweens[ i ].update( time ) ) {

                    i++;

                } else {

                    _tweens.splice( i, 1 );
                    if ( _tweens.length == 0 ) {
                        if ( finished_callback !== undefined ) {
                            finished_callback(this);
                        }
                    }

                }

            }

            return true;

        },

        pause: function ( p ) {
            _pauseStart = window.performance.now();
            _pause = p;
        },

        isPaused: function () {
            return _pause;
        },

        stop: function () {
            var i = _tweens.length - 1;
            for ( i = _tweens.length - 1; i >= 0; i-- ) {
                _tweens[i].stop();
            }
            _pause = false;
        }
    };

} )();

TWEEN.Tween = function ( object ) {

    var _object = object;
    var _valuesStart = {};
    var _delta = {};
    var _valuesEnd = {};
    var _valuesStartRepeat = {};
    var _duration = 1000;
    var _repeat = 0;
    var _yoyo = false;
    var _isPlaying = false;
    var _reversed = false;
    var _delayTime = 0;
    var _startTime = null;
    var _easingFunction = TWEEN.Easing.Linear.None;
    var _interpolationFunction = TWEEN.Interpolation.Linear;
    var _useInterpolationFunction = false;
    var _chainedTweens = [];
    var _onStartCallback = null;
    var _onStartCallbackFired = false;
    var _onUpdateCallback = null;
    var _onCompleteCallback = null;
    var _onStopCallback = null;
    var _id = "";
    var previous = undefined;

    var _lastupdate = {};

    // Set all starting values present on the target object
    for ( var field in object ) {

        _valuesStart[ field ] = parseFloat(object[field], 10);
        _delta[field] = 0.0;

    }

    this.id = function( name ) {
        _id = name;
    }

    this.to = function ( properties, duration ) {

        if ( duration !== undefined ) {

            _duration = duration;

        }

        _valuesEnd = properties;

        return this;

    };

    this.reset = function() {
        for ( var property in _valuesStart ) {
            _object[property] = _valuesStart[property];
            _valuesStartRepeat[ property ] = _valuesStart[ property ]
        }
        for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

            _chainedTweens[ i ].reset();

        }
        _onUpdateCallback.call( this, _object );
    }

    this.start = function ( time ) {

        TWEEN.add( this );

        _isPlaying = true;

        _onStartCallbackFired = false;

        _startTime = time !== undefined ? time : window.performance.now();
        _startTime += _delayTime;
        //console.log("Start at " + _startTime + " Delay " + _delayTime + " Duration " + _duration +  " End at " + (_startTime + _duration));

        for ( var property in _valuesEnd ) {

            // check if an Array was provided as property value
            if ( _valuesEnd[ property ] instanceof Array ) {

                if ( _valuesEnd[ property ].length === 0 ) {

                    continue;

                }

                // create a local copy of the Array with the start value at the front
                // MPH not sure why they do this?
                //_valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

            }

            _valuesStart[ property ] = _object[ property ];

            if( ( _valuesStart[ property ] instanceof Array ) === false ) {
                _valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
            }

            _valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

        }

        return this;

    };

    this.stop = function () {

        if ( !_isPlaying ) {
            return this;
        }

        TWEEN.remove( this );
        _isPlaying = false;

        if ( _onStopCallback !== null ) {

            _onStopCallback.call( this, _object );

        }

        this.stopChainedTweens();
        return this;

    };

    this.stopChainedTweens = function () {

        for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

            _chainedTweens[ i ].stop();

        }

    };

    this.delay = function ( amount ) {

        _delayTime = amount;
        return this;

    };

    this.repeat = function ( times ) {

        _repeat = times;
        return this;

    };

    this.yoyo = function( yoyo ) {

        _yoyo = yoyo;
        return this;

    };


    this.easing = function ( easing ) {

        _easingFunction = easing;
        return this;

    };

    this.interpolation = function ( interpolation ) {

        _interpolationFunction = interpolation;
        _useInterpolationFunction = true;
        return this;

    };

    this.chain = function () {

        _chainedTweens = arguments;
        return this;

    };

    this.onStart = function ( callback ) {

        _onStartCallback = callback;
        return this;

    };

    this.onUpdate = function ( callback ) {

        _onUpdateCallback = callback;
        return this;

    };

    this.onComplete = function ( callback ) {

        _onCompleteCallback = callback;
        return this;

    };

    this.onStop = function ( callback ) {

        _onStopCallback = callback;
        return this;

    };

    this.update = function ( time ) {

        var property;

        //console.log( _id + "  time = " + time + " _startTime = " + _startTime);

        if ( time < _startTime ) {
            //console.log("Skip it");

            return true;

        }

        var value;

        if ( _onStartCallbackFired === false ) {

            if ( _onStartCallback !== null ) {

                // MPH added this
                _onStartCallback.call( this, _object );

            }

            /* MPH Added */
            for ( var field in _object ) {
                _valuesStart[ field ] = parseFloat(_object[field], 10);
                if ( isNaN( _valuesStart[ field ] ) ) {
                    _valuesStart[ field ] = _object[field];
                }
            }
            /* to here */

            _onStartCallbackFired = true;

            // set this to initialize correctly
            value = 0.0

        }
        else {

            var elapsed = ( time - _startTime ) / _duration;
            elapsed = elapsed > 1 ? 1 : elapsed;

            value = _easingFunction( elapsed );
        }

        for ( property in _valuesEnd ) {

            var start = _valuesStart[ property ];
            var end = _valuesEnd[ property ];

            // MPH Not sure why this only was using the function when end was an Array?
            //if ( end instanceof Array ) {
            if ( _useInterpolationFunction ) {

                _interpolationFunction( start, end, value );

            } else {

                // Parses relative end values with start as base (e.g.: +10, -3)
                /* MPH Commented out
                if ( typeof(end) === "string" ) {
                    end = start + parseFloat(end, 10);
                }
                */
                if ( typeof(end) === "string" ) {
                    end = parseFloat(end, 10);
                }


                // protect against non numeric properties.
                if ( typeof(end) === "number" ) {
                    _delta[property] = ( end - start ) * value - _object[ property ]
                    _object[ property ] = start + ( end - start ) * value;
                }

            }

        }

        if ( _onUpdateCallback !== null ) {

            //console.log(_id);
            _lastupdate = _onUpdateCallback.call( this, _object, value, _delta, _lastupdate );

        }

        if ( elapsed == 1 ) {

            if ( _repeat > 0 ) {

                if( isFinite( _repeat ) ) {
                    _repeat--;
                }

                // reassign starting values, restart by making startTime = now
                for( property in _valuesStartRepeat ) {

                    if ( typeof( _valuesEnd[ property ] ) === "string" ) {
                        _valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
                    }

                    if (_yoyo) {
                        var tmp = _valuesStartRepeat[ property ];
                        _valuesStartRepeat[ property ] = _valuesEnd[ property ];
                        _valuesEnd[ property ] = tmp;
                    }

                    _valuesStart[ property ] = _valuesStartRepeat[ property ];

                }

                if (_yoyo) {
                    _reversed = !_reversed;
                }

                _startTime = time + _delayTime;

                return true;

            } else {

                if ( _onCompleteCallback !== null ) {

                    _onCompleteCallback.call( this, _object );

                }

                for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

                    _chainedTweens[ i ].start( time );

                }

                return false;

            }

        }

        return true;

    };

};


TWEEN.Easing = {

    Linear: {

        None: function ( k ) {

            return k;

        }

    },

    Quadratic: {

        In: function ( k ) {

            return k * k;

        },

        Out: function ( k ) {

            return k * ( 2 - k );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
            return - 0.5 * ( --k * ( k - 2 ) - 1 );

        }

    },

    Cubic: {

        In: function ( k ) {

            return k * k * k;

        },

        Out: function ( k ) {

            return --k * k * k + 1;

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k + 2 );

        }

    },

    Quartic: {

        In: function ( k ) {

            return k * k * k * k;

        },

        Out: function ( k ) {

            return 1 - ( --k * k * k * k );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
            return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

        }

    },

    Quintic: {

        In: function ( k ) {

            return k * k * k * k * k;

        },

        Out: function ( k ) {

            return --k * k * k * k * k + 1;

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

        }

    },

    Sinusoidal: {

        In: function ( k ) {

            return 1 - Math.cos( k * Math.PI / 2 );

        },

        Out: function ( k ) {

            return Math.sin( k * Math.PI / 2 );

        },

        InOut: function ( k ) {

            return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

        }

    },

    Exponential: {

        In: function ( k ) {

            return k === 0 ? 0 : Math.pow( 1024, k - 1 );

        },

        Out: function ( k ) {

            return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

        },

        InOut: function ( k ) {

            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
            return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

        }

    },

    Circular: {

        In: function ( k ) {

            return 1 - Math.sqrt( 1 - k * k );

        },

        Out: function ( k ) {

            return Math.sqrt( 1 - ( --k * k ) );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
            return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

        }

    },

    Elastic: {

        In: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

        },

        Out: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

        },

        InOut: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
            return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

        }

    },

    Back: {

        In: function ( k ) {

            var s = 1.70158;
            return k * k * ( ( s + 1 ) * k - s );

        },

        Out: function ( k ) {

            var s = 1.70158;
            return --k * k * ( ( s + 1 ) * k + s ) + 1;

        },

        InOut: function ( k ) {

            var s = 1.70158 * 1.525;
            if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
            return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

        }

    },

    Bounce: {

        In: function ( k ) {

            return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

        },

        Out: function ( k ) {

            if ( k < ( 1 / 2.75 ) ) {

                return 7.5625 * k * k;

            } else if ( k < ( 2 / 2.75 ) ) {

                return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

            } else if ( k < ( 2.5 / 2.75 ) ) {

                return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

            } else {

                return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

            }

        },

        InOut: function ( k ) {

            if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
            return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

        }

    }

};

TWEEN.Interpolation = {

    Location: function ( end, value, start, previous ) {
        console.log("Location update");
        var mat = new THREE.Matrix4();
        var matrot = new THREE.Matrix4();
        var mattrans = new THREE.Matrix4();
        var uspincenter = new THREE.Matrix4();
        var spincenter = new THREE.Matrix4();
        var changed = false;

        if ( previous == undefined ) {
            previous = {
                        camera: null,
                        position :  null,
                        quaternion : null,
                        center :  null,
                        scale : null,
                        mc : null
                        };
        }

        if ( !start.quaternion.equals(end.quaternion) ) {
            var q1;
            if ( previous.quaternion == null ) {
                previous.quaternion = new THREE.Quaternion().copy(start.quaternion);
            }
            q1 = (new THREE.Quaternion()).copy(previous.quaternion);
            var    invq1 = (new THREE.Quaternion()).copy(q1).inverse();
            var newq = q1.slerp(end.quaternion, value);
            previous.quaternion.copy(newq);
            newq.multiply(invq1);
            matrot.makeRotationFromQuaternion(newq);
            changed = true;
        }
        var delta = new THREE.Vector3();
        // MPH THIS IS WRONG!!
        if (previous.position === null ) {
            previous.position = new THREE.Vector3().copy(start.position);
        }
        delta.x = (end.position.x - start.position.x ) * value + start.position.x - previous.position.x;
        delta.y = (end.position.y - start.position.y ) * value + start.position.y - previous.position.y;
        delta.z = (end.position.z - start.position.z ) * value + start.position.z - previous.position.z;
        previous.position.add(delta);

        if ( delta.x != 0.0 && delta.y != 0.0 && delta.z != 0.0 ) {
            mattrans.makeTranslation( delta.x , delta.y, delta.z);
            changed = true;
        }
        if ( changed ) {
            if ( start.center.x != 0.0 || start.center.y != 0.0 || start.center.z != 0.0 ) {
                uspincenter.makeTranslation(-start.center.x, -start.center.y, -start.center.z);
                spincenter.makeTranslation(start.center.x, start.center.y, start.center.z);
            }
            mat = matrot.multiply(mattrans);
            end.obj.applyMatrix(uspincenter);
            end.obj.applyMatrix(mat);
            end.obj.applyMatrix(spincenter);
        }
        return previous;
    },

    Camera: function ( end, value, start, previous ) {

    /*
    if ( value < 0.25 ) {
        value = 0;
    }
    else if ( value > 0.25 && value < 0.5 ) {
        value = 0.25;
    }
    else if ( value > 0.5 && value < 0.75 ) {
        value = 0.5;
    }
    else if ( value > 0.75 && value < 0.95 ) {
        value = 0.75;
    }
    else if ( value > 0.95  ) {
        value = 1.0;
    }
    */
    console.log("Camera update " + value);
        var fav;
        if ( value == 0 ) {
            //FOV height - Three's camera is based on height
            if ( start.fov.top == -start.fov.bottom ) {
                fov = (2 * Math.atan(Math.abs(start.fov.top), start.fov.depth))*180/Math.PI;
            }
            else {
                fov = (Math.abs(Math.atan(-start.fov.bottom, start.fov.depth) + Math.atan(start.fov.top, start.fov.depth)))*180/Math.PI;
            }
            var aspect = container.offsetWidth / container.offsetHeight;

            start.camera.fov = fov;
            start.camera.aspect = aspect;
            start.camera.near = 0.125;
            start.camera.far = 32;
            start.camera.updateProjectionMatrix();

            start.camera.up = new THREE.Vector3( 0, 1, 0 );
            start.camera.position.copy(start.position);
            start.camera.lookAt(start.center);
            if ( start.event_callback != null && start.event_callback.type == "onLookAt") {
                start.event_callback.callback(this, start.center);
            }
            start.camera.quaternion.copy(start.quaternion);
            start.camera.quaternion.normalize();
            start.camera.updateMatrix();
            return start;
        }

        var update = {
                        camera: null,
                        fov : {
                                top: null,
                                bottom: null,
                                left: null,
                                right: null,
                                depth: null
                                },
                        position :  new THREE.Vector3(),
                        quaternion : new THREE.Quaternion(),
                        center :  new THREE.Vector3(),
                        scale : previous.scale,
                        mc : previous.mc
                    };

        //console.log("Camera update " + value);
        var mat = new THREE.Matrix4();
        var matrot = new THREE.Matrix4();
        var mattrans = new THREE.Matrix4();
        var uspincenter = new THREE.Matrix4();
        var spincenter = new THREE.Matrix4();
        var changed = false;

        var top = (end.fov.top - start.fov.top) * value + start.fov.top;
        var bottom = (end.fov.bottom - start.fov.bottom) * value + start.fov.bottom;
        var depth = (end.fov.depth - start.fov.depth) * value + start.fov.depth;
        if ( top == -bottom ) {
            fov = (2 * Math.atan(Math.abs(top), depth))*180/Math.PI;
        }
        else {
            fov = (Math.abs(Math.atan(-bottom, depth) + Math.atan(top, depth)))*180/Math.PI;
        }
        start.camera.fov = fov;
        start.camera.updateProjectionMatrix();
        start.camera.up = new THREE.Vector3( 0, 1, 0 );

        var newpos = new THREE.Vector3();
        var delta = new THREE.Vector3();
        newpos.x = (end.position.x - start.position.x ) * value + start.position.x;
        delta.x = newpos.x - previous.position.x;
        newpos.y = (end.position.y - start.position.y ) * value + start.position.y;
        delta.y = newpos.y - previous.position.y;
        newpos.z = (end.position.z - start.position.z ) * value + start.position.z;
        delta.z = newpos.z - previous.position.z;

        update.position.copy(newpos);
        //if ( delta.x != 0.0 && delta.y != 0.0 && delta.z != 0.0 ) {
            mattrans.makeTranslation( delta.x , delta.y, delta.z);
        //    changed = true;
        //}
        /* */

        var newq;
        if ( previous.quaternion !== null ) {
            if ( !start.quaternion.equals(end.quaternion) ) {
                var q1;
                if ( previous.quaternion == null ) {
                    previous.quaternion = (new THREE.Quaternion()).copy(start.quaternion);
                }
                q1 = (new THREE.Quaternion()).copy(previous.quaternion);
                console.log("v = " + value);
//console.log("q1 v = " + value + " x = " + q1.x + " y = " + q1.y + " z = " +  q1.z + " w = " + q1.w);
                var    invq1 = (new THREE.Quaternion()).copy(q1).inverse();
//console.log("start.quaternion v = " + value + " x = " + start.quaternion.x + " y = " + start.quaternion.y + " z = " +  start.quaternion.z + " w = " + start.quaternion.w);
//console.log("end.quaternion v = " + value + " x = " + end.quaternion.x + " y = " + end.quaternion.y + " z = " +  end.quaternion.z + " w = " + end.quaternion.w);
                var s = (new THREE.Quaternion()).copy(start.quaternion);
                newq = s.slerp(end.quaternion, value);
                update.quaternion.copy(newq);
//console.log("newq v = " + value + " x = " + newq.x + " y = " + newq.y + " z = " +  newq.z + " w = " + newq.w);
                //newq = start.quaternion.slerp(end.quaternion, value).normalize();
                newq.multiply(invq1);
//console.log("milq v = " + value + " x = " + newq.x + " y = " + newq.y + " z = " +  newq.z + " w = " + newq.w);
                matrot.makeRotationFromQuaternion(newq);
                changed = true;
            }
        }
        else {
            previous.quaternion = (new THREE.Quaternion()).copy(start.quaternion);
            end.obj.quaternion.copy(start.quaternion);
            changed = true;
        }

        if ( changed ) {
            if ( start.center.x != 0.0 || start.center.y != 0.0 || start.center.z != 0.0 ) {
                uspincenter.makeTranslation(-start.center.x, -start.center.y, -start.center.z);
                spincenter.makeTranslation(start.center.x, start.center.y, start.center.z);
            }
            mat = matrot.multiply(mattrans);
            start.camera.applyMatrix(uspincenter);
            start.camera.applyMatrix(mat);
            start.camera.applyMatrix(spincenter);
            start.camera.lookAt(start.center);
            if ( start.event_callback != null && start.event_callback.type == "onLookAt") {
                start.event_callback.callback(this, start.center);
            }
        }
        if ( value == 1.0 ) {
            //pauseAnimation();
        }
        return update;
    },

    Linear: function ( v, k ) {

        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

        if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
        if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

        return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

    },

    Bezier: function ( v, k ) {

        var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

        for ( i = 0; i <= n; i++ ) {
            b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
        }

        return b;

    },

    CatmullRom: function ( v, k ) {

        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

        if ( v[ 0 ] === v[ m ] ) {

            if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

            return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

        } else {

            if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
            if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

            return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

        }

    },

    Utils: {

        Linear: function ( p0, p1, t ) {

            return ( p1 - p0 ) * t + p0;

        },

        Bernstein: function ( n , i ) {

            var fc = TWEEN.Interpolation.Utils.Factorial;
            return fc( n ) / fc( i ) / fc( n - i );

        },

        Factorial: ( function () {

            var a = [ 1 ];

            return function ( n ) {

                var s = 1, i;
                if ( a[ n ] ) return a[ n ];
                for ( i = n; i > 1; i-- ) s *= i;
                return a[ n ] = s;

            };

        } )(),

        CatmullRom: function ( p0, p1, p2, p3, t ) {

            var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
            return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

        }

    }

};

// UMD (Universal Module Definition)
( function ( root ) {

    if ( typeof define === 'function' && define.amd ) {

        // AMD
        define( [], function () {
            return TWEEN;
        } );

    } else if ( typeof exports === 'object' ) {

        // Node.js
        module.exports = TWEEN;

    } else {

        // Global variable
        root.TWEEN = TWEEN;

    }

} )( this );
