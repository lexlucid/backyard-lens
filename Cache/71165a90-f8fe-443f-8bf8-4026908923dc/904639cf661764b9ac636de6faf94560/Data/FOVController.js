//@input Asset.Texture deviceCameraTexture
//@input Component.ScreenTransform screenT
//@input SceneObject distObj
//@input SceneObject pivotObj
//@input Component.Text text
//@input Component.Camera camera
//@input Component.ScriptComponent placementScript

var camera = script.camera;
var distObjT = script.distObj.getTransform();
var pivotObjT = script.pivotObj.getTransform();
var objPos = new vec3(0, 0, 0)

var pixelSize = 24;
var screenWidth = 400;
var initFov = camera.fov;

var prevWidth = 0;
var prevHeight = 0;


var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(update);

function update(){
    
    var height = script.deviceCameraTexture.getHeight();
    var width = script.deviceCameraTexture.getWidth();
    
    if (height == prevHeight && width == prevWidth && !script.placementScript.getObjectStatus()){
        return;
    }

    script.text.text = width + " " + height + "\n" + global.deviceInfoSystem.screenScale;
    
    prevHeight = height;
    prevWidth = width;
    
    var screenScale = global.deviceInfoSystem.screenScale;
    if (!screenScale){
        screenScale = 2;
    }
    
    script.screenT.anchors.top = 1;
    script.screenT.anchors.bottom = 1 - pixelSize * screenScale * 2 / height;    
    
    script.screenT.anchors.left = -1;
    script.screenT.anchors.right = -1 + pixelSize * screenScale * 2 / width;
    
    var aspect = script.placementScript.getAspect();
    
    if (width < aspect * height){
        setCameraFov(height, width);
    }
    else{
        setCameraFov(height, aspect * height);
    }
}

function setCameraFov(height, width){
    var diag = Math.sqrt((height * height) + (width * width))
    var distance = diag / (2 * Math.tan(initFov / 2));
    
    var newFov = 2 * Math.atan((diag) / (2 * distance * width / height))

    script.camera.fov = newFov;
}