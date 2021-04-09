/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */

PTC.ARScene = function () {
    var modelItemCache = {}; // modelID or modelItemID is key; THREE.Object3D instance is value.
    var asLoadedModelData = {}; // modelID is key; json datastructure is value.
    var threeScene;
    var first = true;

    function getRoot() {
        if (threeScene === undefined) {
            threeScene = new THREE.Object3D();
        }

        return threeScene;
    }

    function addObject(obj) {
        if (threeScene === undefined) {
            threeScene = new THREE.Object3D();
        }

        var t3d = new THREE.Object3D();
        t3d.name = obj.name;
        t3d.position.x=obj.x;
        t3d.position.y=obj.y;
        t3d.position.z=obj.z;
        t3d.quaternion.x=obj.qx;
        t3d.quaternion.y=obj.qy;
        t3d.quaternion.z=obj.qz;
        t3d.quaternion.w=obj.qw;
        t3d.cr = obj.cr;
        t3d.cg = obj.cg;
        t3d.cb = obj.cb;
        t3d.ca = obj.ca;

        t3d.matrixAutoUpdate = false;
        t3d.rotationAutoUpdate = false;
        t3d.updateMatrix();
        modelItemCache[obj.name] = t3d;

        //set parent
        if (obj.parent && obj.parent.length > 0) {
            var parent = modelItemCache[obj.parent];
            if (parent !== undefined) {
                parent.add(t3d);
            } else {
                // We expect to have a root node like model-01-/ where model-01 is the parent id and -/ is the expected root suffix.
                var expectedSuffix = "-/";
                if (obj.parent + expectedSuffix !== obj.name) {
                    // Only print a log statement if we run into a node we don't expect to be parentless.
                    console.log("Couldn't find parent named [" + obj.parent + "] for node [" + obj.name + "]. Adding to root of the scene.");
                }
                threeScene.add(t3d);
            }
        }
        return obj;
    }

    function getItemThatStartWith(idpath) {
        //console.log("getItemThatStartWith:" + idpath);
        var results = [];
        var ele = modelItemCache[idpath];
        results.push(ele);
        return results;
    }

    function getItem(idpath) {
        return modelItemCache[idpath];
        //return null;
    }

    function update() {
        threeScene.updateMatrixWorld(true);
    }

    function loadModelData(modelID, modelData) {
        if (asLoadedModelData[modelID] === undefined) {
            console.log("setting initial model data");
            asLoadedModelData[modelID] = modelData;
        }

        for (var i = 0 ; i < modelData.length; i++) {
            var olObj = modelData[i];
            addObject(olObj);
        }

        update();
    }

    function removeModelDataFromScene(modelID) {
        asLoadedModelData[modelID] = undefined;

        // remove the modelData from both threeScene as well as modelItemCache;
        var key;

        for (key in modelItemCache) {
            if (! modelItemCache.hasOwnProperty(key)) { continue; }
            if (key.startsWith(modelID + "-")) {
                delete modelItemCache[key];
            }
        }

        if (threeScene) {
            var objectsToRemove = [];
            var i;
            for (i=0; i<threeScene.children.length; i++) {
                if (threeScene.children[i].name.startsWith(modelID + "-")) {
                    objectsToRemove.push(threeScene.children[i]);
                }
            }
            threeScene.remove.apply(threeScene, objectsToRemove);
        }
    }

    function reloadModelData(modelID) {
        console.log("reloading model data");
        var originalModelData = asLoadedModelData[modelID];

        if (originalModelData === undefined) {
            console.log("cannot reload model data for [" + modelID + "] because it has not yet been loaded.");
            return;
        }

        removeModelDataFromScene(modelID);
        loadModelData(modelID, originalModelData);
    }

    function getAsLoadedModelData(modelID) {
        return asLoadedModelData[modelID] || [];
    }

    return {
        getItemThatStartWith: getItemThatStartWith,
        update:update,
        addObject:addObject,
        getAsLoadedModelData: getAsLoadedModelData,
        getItem:getItem,
        getRoot:getRoot,
        loadModelData:loadModelData,
        removeModelDataFromScene: removeModelDataFromScene,
        reloadModelData:reloadModelData
    };
};

PTC.GLOBAL_SCENE = new PTC.ARScene();
