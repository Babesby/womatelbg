// Ship both the JavaScript/WASM runtime and the image-segmentation model
// with WOMATE's Vercel deployment. No learner photo is ever sent to a server.
const fs=require('node:fs');
const path=require('node:path');
const https=require('node:https');
const root=process.cwd();
const source=path.join(root,'node_modules','@mediapipe','tasks-vision','wasm');
const target=path.join(root,'public','assets','canopy','mediapipe');
const files=[
 'vision_wasm_internal.js','vision_wasm_internal.wasm',
 'vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'
];
const modelUrl='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const output=path.join(target,'selfie_segmenter.tflite');
function download(url,destination,redirects=0){
 return new Promise((resolve,reject)=>{
  if(redirects>3)return reject(new Error('Too many redirects downloading the selfie model'));
  const req=https.get(url,{timeout:30000,headers:{'User-Agent':'WOMATE-Canopy-Build/1.0'}},res=>{
   if([301,302,307,308].includes(res.statusCode)&&res.headers.location){
    res.resume();
    return resolve(download(new URL(res.headers.location,url).href,destination,redirects+1));
   }
   if(res.statusCode!==200){
    res.resume();
    return reject(new Error('Model download HTTP '+res.statusCode));
   }
   const stream=fs.createWriteStream(destination+'.part');
   res.pipe(stream);
   stream.on('finish',()=>{
    stream.close(()=>{
     const size=fs.statSync(destination+'.part').size;
     if(size<50000){fs.rmSync(destination+'.part',{force:true});return reject(new Error('Downloaded model is unexpectedly small'));}
     fs.renameSync(destination+'.part',destination);
     resolve();
    });
   });
   stream.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(new Error('Model download timed out')));
  req.on('error',reject);
 });
}
(async()=>{
 for(const name of files){
  const src=path.join(source,name);
  if(!fs.existsSync(src))throw new Error('MediaPipe WASM file missing: '+src+'; run npm ci');
 }
 fs.mkdirSync(path.join(target,'wasm'),{recursive:true});
 for(const name of files)fs.copyFileSync(path.join(source,name),path.join(target,'wasm',name));
 if(!fs.existsSync(output)||fs.statSync(output).size<50000){
  console.log('WOMATE: fetching the official selfie segmenter model for self-hosting...');
  await download(modelUrl,output);
 }
 console.log('WOMATE: local MediaPipe WASM and selfie model are ready for Vite');
})().catch(err=>{console.error('WOMATE graduation asset build failed:',err.message);process.exitCode=1});
