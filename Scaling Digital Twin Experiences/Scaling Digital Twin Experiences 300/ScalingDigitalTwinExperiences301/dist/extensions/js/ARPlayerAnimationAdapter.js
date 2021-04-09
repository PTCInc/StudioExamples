/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
PTC.ARPlayerAnimationAdapter = function (aModel,scene) {

    var model = aModel;
    var SCENE = scene;
    var DEBUG_ADAPTER = false;

    /*
    function getScene()
                returns the active Scene or group
    */
    function getScene()
    {
        return SCENE;
    }

    // UTILITIES:  used when acting on selected

    /*
    function getSelectedObjects(idpath)
                    var idpath the CV idpath to the specific instance of a part or assembly
                    returns = an array of the parts, which may be group
    */
    function getSelectedObjects(idpath) {
        if(DEBUG_ADAPTER) console.log("getSelectedObjects:" + idpath );
        return getObjectsByName(getScene(), 'name', idpath);
    }

  /*
    function getSelectedObject(idpath)
                    var idpath the CV idpath to the specific instance of a part or assembly
                    returns = the part, which may be group
    */
    function getSelectedObject(idpath) {
        return getObjectByName(getScene(), idpath);
    }

    /*
    function getGeometryByPath(idpath)
                    var idpath the CV idpath to the specific instance of a part or assembly
                    returns = the mesh(es) that graphically constitute the part or parts of the path is a parent assembly
    Note: as this may be an assembly, we need to traverse all children recursively
    */
    function getGeometryByPath(idpath) {
        if(DEBUG_ADAPTER) console.log("getGeometryByPath:" + idpath );
        return getSelectedObjects(idpath);
    }

    /*
    function getObjectByName (obj, idpath )
        var obj is the Scene
        idpath the path of an assembly or component
        returns: matching object
    */
    function getObjectByName( obj, idpath ) {
        return SCENE.getItem(model + "-" + idpath);
    }
    /*
    function getObjectsByName (obj, name, idpath )
        var obj is the Scene
        var name is the property, usually 'name'
        idpath the path of an assembly or component
        returns: Array of matching objects
    */
    function getObjectsByName( obj,name, idpath ) {
        return SCENE.getItemThatStartWith(model + "-" + idpath);
    }

    /*
    function getObjectUserData(idpath)
                    var idpath the CV idpath to the specific instance of a part or assembly
                    returns = the userData in particular
                        {Material: mat, Visible: visible, Location: location ....}
    */
    function getObjectUserData(idpath) {
        var object = getObjectByName(getScene(), idpath);
        if ( object === null ) return null;
        return object.userData;
    }

        /*
    function getMeshUserData(idpath)
                    var idpath the CV idpath to the specific instance of a part or assembly
                    returns = the userData in particular
                        {Material: mat, Visible: visible, Location: location ....}
    */
    function getMeshUserData(idpath) {
        var meshData = [];
        return meshData;
    }
    // Utility interpolation functions
    function linearInterpolate(start, end, value) {
        return (end - start) * value + start;
    }

    function linearArrayInterpolation(start, end, value) {
        var i;
        var result = [];
        for ( i = 0; i < start.length; i++ ) {
            result[i] = linearInterpolate(start[i], end[i], value);
        }
        return result;
    }

    // Color
    function colorInitialization(start) {
        var i;
        if ( Array.isArray(start.object) ) {
            for ( i = 0 ; i < start.object.length; i++ ) {
                var obj = start.object[i];
                if (start.color === null) {
                    // null is explictly used by the flash tween to reset the color to null if it was initially null
                    vuforia.setColor(obj.name, null);
                    delete obj.cr;
                    delete obj.cg;
                    delete obj.cb;
                } else {
                    obj.cr = start.color[0];
                    obj.cg = start.color[1];
                    obj.cb = start.color[2];
                    vuforia.setColor(obj.name, [obj.cr,obj.cg,obj.cb,1]);
                }
                if(DEBUG_ADAPTER) console.log("TBD: colorInitialization on " + obj.name );

                //start.object[i].material.color.r = start.color[0];
                //start.object[i].material.color.g = start.color[1];
                //start.object[i].material.color.b = start.color[2];
            }
        } else {
            start.object.cr = start.color[0];
            start.object.cg = start.color[1];
            start.object.cb = start.color[2];
            vuforia.setColor( start.object.name, [start.color[0], start.color[1], start.color[2], 1]);
        }
    }

    function colorInterpolation( start, end, value ) {
        var i;
        var newvalue;

        // If either the start color or end color is null then we cannot interpolate.
        // Instead simply null out the color on the local scenegraph and tell VVE to set null color in the native scene graph.
        // This should only happen in an undo tween.
        if (end.color === null || start.color === null) {
            newvalue = null;
        } else {
            newvalue = linearArrayInterpolation( start.color, end.color, value);
        }

        for ( i = 0; i < start.object.length; i++ ) {
            var obj = start.object[i];
            if (newvalue === null) {
                delete obj.cr;
                delete obj.cg;
                delete obj.cb;
                vuforia.setColor( obj.name, null);
            } else {
                obj.cr = newvalue[0];
                obj.cg = newvalue[1];
                obj.cb = newvalue[2];
                vuforia.setColor( obj.name, [obj.cr,obj.cg,obj.cb,1]);
            }

            if(DEBUG_ADAPTER) console.log("TBD: colorInterpolation on " + obj.name );
            //start.object[i].material.color.r = newvalue[0];
            //start.object[i].material.color.g = newvalue[1];
            //start.object[i].material.color.b = newvalue[2];
        }
    }

    // Transparency
    function transparencyInitialization(start) {
        var i;
        var transparency = start.transparency;
        if ( start.visibility !== undefined ) {
            if ( ! start.visibility) transparency = 0.0;
            else transparency = 1;
        }
        for ( i = 0 ; i < start.object.length; i++ ) {
            var obj = start.object[i];
            obj.transparency = transparency;
            if(DEBUG_ADAPTER) console.log("TtransparencyInitialization: " + transparency );
            vuforia.setProperties( obj.name,
                {
                billboard:  false,
                occluded : false,
                hidden : -1,
                opacity:  transparency,
                decal : false
            });
        }
    }

    function transparencyInterpolation( start, end, value ) {
        var i;
        var newvalue = linearInterpolate(start.transparency, end.transparency, value);
        for ( i = 0; i < start.object.length; i++ ) {
            var obj = start.object[i];
            obj.transparency = newvalue;
            if(DEBUG_ADAPTER) console.log("transparencyInterpolation: " + newvalue );
            vuforia.setProperties( obj.name,
                {
                billboard:  false,
                occluded : false,
                hidden : -1,
                opacity:  newvalue,
                decalc : false
            });
        }
    }

    // Visibility
    function visibilityInitialization(start) {
        transparencyInitialization(start);
    }

    function visibilityInterpolation( start, end, value ) {
        // Can't really interpolate visibility, so we fade it and change visibility state at the end
        transparencyInterpolation( start, end, value );
    }

    //Location
    function locationInitialization(start) {
        // This is only used during initialization
        var local_location = start.location;
        if ( local_location.global ) {
            if ( start.object.parent !== null ) {
                local_location = getLocalFromWorldLocation(start.location, start.object.parent);
            }
        }
        setQuaternion(start.object, local_location.quaternion);
        setPosition(start.object, local_location.position);
        var euler = toEuler(local_location.quaternion);
        vuforia.setRotation(start.object.name,euler.x,euler.y,euler.z);
        vuforia.setTranslation(start.object.name, local_location.position.x, local_location.position.y, local_location.position.z);
    }

    function seqLocationInterpolation( start, end, value ) {

        // Update the quaternion by slerping between start and end quaternion and then applying it to the original quaternion of the object
        // This does not take into account changes in pivot center, but for the moment gets things moving
        if ( !start.quaternion.equals(end.quaternion) ) {
            var q1 = (new THREE.Quaternion()).copy(start.quaternion);
            var newq = q1.slerp(end.quaternion, value);
            var euler;
            if ( start.global ) {
                start.object.quaternion.copy(newq);
                euler = toEuler(newq);
                vuforia.setRotation(start.object.name,euler.x,euler.y,euler.z);
            }
            else {
                start.object.quaternion.copy(newq);
                euler = toEuler(newq);
                vuforia.setRotation(start.object.name,euler.x,euler.y,euler.z);
            }
        }

        // Interpolate between start & end position and apply to original.
        // not strictly correct, but gets things moving
        if ( start.position !== undefined && start.position.length !== 0 ) {
            start.object.position.x = linearInterpolate(start.position.x, end.position.x, value);
            start.object.position.y = linearInterpolate(start.position.y, end.position.y, value);
            start.object.position.z = linearInterpolate(start.position.z, end.position.z, value);
            vuforia.setTranslation(start.object.name, start.object.position.x, start.object.position.y, start.object.position.z);
        }

        if ( end.scale !== undefined ) {
            var scale_interp = linearInterpolate(start.object.scale.x, end.scale, value);
            start.object.scale.x = scale_interp;
            start.object.scale.y = scale_interp;
            start.object.scale.z = scale_interp;
            vuforia.setScale(start.object.name,scale_interp,scale_interp,scale_interp);
        }
        start.object.updateMatrix();
        getScene().update();
    }

    function locationMoveByInterpolation( start, end, value ) {
        start.object.position.x = start.startPosition.x + linearInterpolate(start.position.x, end.position.x, value);
        start.object.position.y = start.startPosition.y + linearInterpolate(start.position.y, end.position.y, value);
        start.object.position.z = start.startPosition.z + linearInterpolate(start.position.z, end.position.z, value);
        vuforia.setTranslation(start.object.name, start.object.position.x, start.object.position.y, start.object.position.z);
        start.object.updateMatrix();
        getScene().update();
    }

    // Camera
    function cameraInitialization(start) {

    }

    function cameraInterpolation( start, end, value ) {

    }

    /*
    function getPosition(object)
                    var object a mesh or group
                    returns = Vector3 x,y,z of the object
    */
    function getPosition(object) {
        return new THREE.Vector3().copy(object.position);
    }

    function toEuler(q) {
        var eu = new THREE.Euler();
        eu.setFromQuaternion(q,"ZYX");
        var result={};
        result.x = eu.x * 180/Math.PI;
        result.y = eu.y * 180/Math.PI;
        result.z = eu.z * 180/Math.PI;
        return result;
    }

    /*
    function getQuaternion(object)
                    var object a mesh or group
                    returns = Quaternion (x,y,z,w) of the object
    */
    function getQuaternion(object) {
        return new THREE.Quaternion().copy(object.quaternion);
    }

    /*
    function getScale(object)
                    var object a mesh or group
                    returns = single value of the objects scale (assumes x,y,z are equal)
    */
    function getScale(object) {
        return object.scale.x;
    }

    /*
    function getWorldMatrix(object)
                    var object a mesh or group
                    returns = 4X4 Matrix
    */
    function getWorldMatrix(object) {
        return object.matrixWorld.clone();
    }

    /*
    function getOpacity(object)
                    var object a mesh or group
                    returns = opacity (0.0 - 1.0)
    */
    function getOpacity(object) {
        return object.transparency;
    }

    /*
    function getColorArray(object)
                    var object a mesh or group
                    returns an Array [r,g,b] where color is 0.0 to 1.0; alternatively returns null if node has no color data.
    */
    function getColorArray(object) {
        if (typeof(object.cr) === "number" &&
            typeof(object.cg) === "number" &&
            typeof(object.cb) === "number"
           ) {
            return [object.cr, object.cg, object.cb];
        }

        return null;
    }

    function insertPivot(name, center, position, quaternion) {
        // get the node based on the idpath (name)
        var group = SCENE.getItem(name);
        // Get a copy of the location of the group
        var position_orig = getPosition(group);
        var quaternion_orig = getQuaternion(group);
        //Create the pivot node
        var pivot = new THREE.Object3D();
        pivot.name = "PIVOT_" + group.name;
        vuforia.insertGroupNode({name:pivot.name, target:group.name}, function() {
            vuforia.setTranslation(pivot.name,center.x,center.y,center.z);
        });

        pivot.visible = true;
        // Add the Pivot to the group part parent and set the location to the center
        group.parent.add(pivot);
        setPosition(pivot, center);
        // Remove the group from its parent
        group.parent.remove(group);
        // Add the group to the pivot and set its location
        pivot.add(group);
        setPosition(group, position);
        vuforia.setTranslation(group.name,position.x,position.y,position.z);
        setQuaternion(group, quaternion);
        var euler = toEuler(quaternion);
        vuforia.setRotation(group.name,euler.x,euler.y,euler.z);
    }

    function removePivot(name, position, quaternion) {
        // get the node based on the idpath (name)
        var group = SCENE.getItem(name);
        var pivot_node = group.parent;
        // Add the group to the pivots parent
        pivot_node.parent.add(group);
        pivot_node.parent.remove(pivot_node);
        vuforia.removeNode({name:pivot_node.name, reparent:true});
        setPosition(group, position);
        setQuaternion(group, quaternion);
        vuforia.setTranslation(group.name,position.x,position.y,position.z);
        var euler = toEuler(quaternion);
        vuforia.setRotation(group.name,euler.x,euler.y,euler.z);
        // Remove the pivot from its parent
        pivot_node = null;
    }

    function setPosition(object, position){
        object.position.x = position.x;
        object.position.y = position.y;
        object.position.z = position.z;
    }

    function setQuaternion(object, quaternion) {
        object.quaternion.x = quaternion.x;
        object.quaternion.y = quaternion.y;
        object.quaternion.z = quaternion.z;
        object.quaternion.w = quaternion.w;
    }

    /*
    function getFlyScalar(object)
                    var object a mesh or group
                    returns a float specifying the distance to fly to/from. Can be any formula
    */
    function getFlyScalar(object) {
        var scalar = 1;
        return scalar;
    }

    /*
    function isPart(object)
                    var object a mesh or group
                    returns true if object is a part/assembly in the scene
    */
    function isPart(object) {
        return (object.type === "Object3D");
    }

    /*
    function getLocalFromWorldLocation(location, object)
        location.position Vector3 of global position
        location.quaternion Quaternion global quaternion
        object Part used to determine the local location
        returns local location with respect to the object
    */
    function getLocalFromWorldLocation(location, object) {
        var relativeTo = getWorldMatrix(object);
        var mat = MatrixTRS(location.position, location.quaternion, new THREE.Vector3(1.0,1.0,1.0));
        var relativeToInverse = (new THREE.Matrix4()).getInverse(relativeTo);
        var matlocal = (new THREE.Matrix4()).multiplyMatrices(relativeToInverse, mat);
        return { position: (new THREE.Vector3()).setFromMatrixPosition(matlocal), quaternion: (new THREE.Quaternion()).setFromRotationMatrix(matlocal)};
    }

    /*
    function MatrixTRS( position, quaternion, scale)
        position Vector3
        quaternion Quaternion
        scale Vector3
        returns Matrix4
    */
    function MatrixTRS(position, quaternion, scale) {
        var mat = new THREE.Matrix4();
        mat.makeRotationFromQuaternion(quaternion);
        mat.setPosition(position);
        mat.scale(scale);
        return mat;
    }

    return {
        colorInterpolation: colorInterpolation,
        colorInitialization: colorInitialization,
        transparencyInterpolation: transparencyInterpolation,
        transparencyInitialization: transparencyInitialization,
        visibilityInterpolation: visibilityInterpolation,
        visibilityInitialization: visibilityInitialization,
        cameraInterpolation: cameraInterpolation,
        cameraInitialization: cameraInitialization,
        seqLocationInterpolation: seqLocationInterpolation,
        locationMoveByInterpolation: locationMoveByInterpolation,
        locationInitialization: locationInitialization,
        getGeometryByPath: getGeometryByPath,
        getSelectedObjects: getSelectedObjects,
        getSelectedObject: getSelectedObject,
        getPosition: getPosition,
        getQuaternion: getQuaternion,
        getScale: getScale,
        getScene: getScene,
        //getWorldMatrix: getWorldMatrix,
        getLocalFromWorldLocation: getLocalFromWorldLocation,
        getOpacity: getOpacity,
        getColorArray: getColorArray,
        insertPivot: insertPivot,
        removePivot: removePivot,
        getFlyScalar: getFlyScalar,
        isPart: isPart,
        getObjectUserData: getObjectUserData,
        getMeshUserData: getMeshUserData
    };
};
