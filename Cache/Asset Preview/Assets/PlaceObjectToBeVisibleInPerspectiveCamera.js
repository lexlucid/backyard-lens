// @input SceneObject parent
// @input SceneObject pivot { "hint": "Object to be used as pivot point (a center of the meshes)" }
// @input Component.Camera camera { "hint": "Please note that the camera should have initial transform (no rotation, no translation)" }
// @input float paddingThreshold { "widget": "slider", "min": 0.3, "max": 0.9, "step": 0.01 }

// @input Component.ScriptComponent interaction

const objectTransform = script.parent.getTransform();
const pivotTransform = script.pivot.getTransform();

const EPS = 1e-3;

var objAspect = 1;
var isNewObject = true;

function reparent() {
    const objects = [];
    // backwards to avoid index invalidation
    for (let i = global.scene.getRootObjectsCount() - 1; i >= 0; --i) {
        const root = global.scene.getRootObject(i);
        if (root.name === '[ROOT]') {
            continue;
        }

        root.setParent(script.parent);
        objects.push(root);
//        root.enabled = false;
    }

    return objects;
}

function executeRecursivelyOnAllChildren(parent, callback) {
    callback(parent);
    parent.children.forEach(child => executeRecursivelyOnAllChildren(child, callback));
}

function aabbMinSingle(mesh) {
    // -INF;INF for text components, needs to be faked
    // TODO: find better solution!
    if (mesh.getTypeName() === 'Component.Text' || mesh.getTypeName() === 'Component.Text3D') {
        const textScale = 2.5; // calculated empirically
        const center = mesh.getSceneObject().getTransform()
            .getWorldPosition();
        return center.add(new vec3(1, 1, 0).uniformScale(-textScale));
    }

    // for some reason twice as small for images
    // currently based off the fact that we instantiate images in "Fit" mode
    // TODO: in prefabs with arbitrary images stretch mode can be different, account for it as well!
    if (mesh.getTypeName() === 'Component.Image') {
        return mesh.worldAabbMin().uniformScale(0.25);
    }

    // okay for other meshes
    return mesh.worldAabbMin();
}

function aabbMaxSingle(mesh) {
    // same concerns as for aabbMin

    if (mesh.getTypeName() === 'Component.Text' || mesh.getTypeName() === 'Component.Text3D') {
        const textScale = 2.5;
        const center = mesh.getSceneObject().getTransform()
            .getWorldPosition();
        return center.add(new vec3(1, 1, 0).uniformScale(textScale));
    }

    if (mesh.getTypeName() === 'Component.Image') {
        return mesh.worldAabbMax().uniformScale(0.25);
    }

    return mesh.worldAabbMax();
}

function placeToBeVisible(rootObjects) {
    const allMeshes = [];

    rootObjects.forEach(function(object) {
        executeRecursivelyOnAllChildren(object, (child) => {
            child.getComponents('Component.BaseMeshVisual').forEach((mesh) => {
                allMeshes.push(mesh);
            });
        });
    });

    if (allMeshes.length === 0) {
        return;
    }

    let aabbMin = vec3.one().uniformScale(Number.POSITIVE_INFINITY);
    let aabbMax = vec3.one().uniformScale(Number.NEGATIVE_INFINITY);
    
    objAspect = 1;

    for (let i = 0; i < allMeshes.length; i++) {
        const mesh = allMeshes[i];
        if (mesh.getTypeName() === 'Component.Image' && mesh.mainPass && mesh.mainPass.baseTex){
            mesh.getSceneObject().getComponent("Component.Image").stretchMode = StretchMode.FitWidth;
            objAspect = mesh.mainPass.baseTex.getWidth() / mesh.mainPass.baseTex.getHeight()
        }
        aabbMin = vec3.min(aabbMin, aabbMinSingle(mesh));
        aabbMax = vec3.max(aabbMax, aabbMaxSingle(mesh));
    }

    const meshCenter = vec3.lerp(aabbMin, aabbMax, 0.5);
    const height = aabbMax.y - aabbMin.y;
    const width = aabbMax.x - aabbMin.x;

    const depth = aabbMax.z - aabbMin.z;
    script.interaction.setFlatMode(depth < EPS);

    const cameraConeLeftTop = script.camera.screenSpaceToWorldSpace(vec2.zero(), 100);
    const cameraConeRightBot = script.camera.screenSpaceToWorldSpace(vec2.one(), 100);

//    const neededScale = Math.max(width / (cameraConeRightBot.x - cameraConeLeftTop.x),
//        height / (cameraConeLeftTop.y - cameraConeRightBot.y)) / Math.tan(script.camera.fov * (1 - script.paddingThreshold));
    
    const aabbMaxX = Math.max(aabbMax.x, Math.abs(aabbMin.x));
    const aabbMaxY = Math.max(aabbMax.y, Math.abs(aabbMin.y));
    const aabbMaxZ = Math.max(aabbMax.z, Math.abs(aabbMin.z));
    
    const neededScale1 = 0.87 * 4 * Math.max(Math.max(aabbMaxX, aabbMaxY), aabbMaxZ)
    
    const pos = objectTransform.getWorldPosition();
    const pivotPos = vec3.zero();

    pivotPos.z = Math.min(-2 * script.camera.near, -neededScale1);
    pos.z -= meshCenter.z - pivotPos.z;
    pos.x -= meshCenter.x;
    pos.y -= meshCenter.y;

    pivotTransform.setWorldPosition(pivotPos);
    objectTransform.setWorldPosition(pos);
}

function reparentNew() {
    const newObjects = reparent();
    if (newObjects.length === 0) {
        return;
    }
    
    isNewObject = true;

    var prevFov = script.camera.fov;
    script.camera.fov = 60 * Math.PI / 180;
    script.interaction.reset();
    placeToBeVisible(newObjects);
    script.camera.fov = prevFov;
}

script.createEvent('UpdateEvent').bind(function(eventData) {
    reparentNew();
});

script.getAspect = function(){
    return objAspect;
}

script.getObjectStatus = function(){
    if (isNewObject){
        isNewObject = false;
        return true;
    }
    
    return false;
}
