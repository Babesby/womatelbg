// Optional graduation gown positioning. Runs locally in the learner's browser.
// MediaPipe code/model/WASM load from a third-party CDN ONLY when Fit Gown is used.
// The selected image is processed with browser canvas; it is never uploaded.
const MEDIAPIPE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const VIEW={width:1080,height:1350};
export const GOWN_INITIAL={x:.5,y:.81,width:1.15,rotation:0};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
let detectorPromise;

async function detector(){
  if(!detectorPromise){
    detectorPromise=(async()=>{
      const vision=await import(/* @vite-ignore */ MEDIAPIPE+'/+esm');
      const files=await vision.FilesetResolver.forVisionTasks(MEDIAPIPE+'/wasm');
      const options={baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'IMAGE',numPoses:1,minPoseDetectionConfidence:.48};
      try{return await vision.PoseLandmarker.createFromOptions(files,options)}
      catch{return await vision.PoseLandmarker.createFromOptions(files,{...options,baseOptions:{modelAssetPath:MODEL,delegate:'CPU'}})}
    })().catch(err=>{detectorPromise=null;throw err});
  }
  return detectorPromise;
}

function imageToCanvas(img){
  const longest=Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height);
  const target=clamp(longest,1,720),scale=target/longest;
  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
  c.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c;
}

export async function fitGownToBody(photo){
  if(!photo)throw new Error('Upload your photo first.');
  const c=imageToCanvas(photo);
  const landmarker=await detector();
  const landmarks=landmarker.detect(c).landmarks?.[0];
  const a=landmarks?.[11],b=landmarks?.[12]; // shoulders (left/right)
  if(!a||!b||Math.min(a.visibility??1,b.visibility??1)<.48)
    throw new Error('Both shoulders could not be found clearly. Try a photo showing your upper body, or adjust the gown yourself.');
  const iw=photo.naturalWidth||photo.width,ih=photo.naturalHeight||photo.height;
  const s=Math.max(VIEW.width/iw,VIEW.height/ih);
  const dx=(VIEW.width-iw*s)/2,dy=(VIEW.height-ih*s)/2;
  const left={x:dx+a.x*iw*s,y:dy+a.y*ih*s};
  const right={x:dx+b.x*iw*s,y:dy+b.y*ih*s};
  const span=Math.hypot(right.x-left.x,right.y-left.y);
  // The transparent gown has extra-wide flowing sleeves. Approximate a natural
  // shoulder fit from the measured body span, then let the learner fine-tune.
  const width=clamp(span*2.10/VIEW.width,.62,1.70);
  const gownHeight=width*VIEW.width*1.5; // 1024 x 1536 source asset
  const shoulderCenterY=(left.y+right.y)/2;
  const rotation=clamp(Math.atan2(right.y-left.y,right.x-left.x)*180/Math.PI,-12,12);
  return {
    x:clamp((left.x+right.x)/(2*VIEW.width),-.15,1.15),
    y:clamp((shoulderCenterY+.32*gownHeight)/VIEW.height,-.2,1.9),
    width,rotation
  };
}
