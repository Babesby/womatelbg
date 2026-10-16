// Copy version-matched MediaPipe WASM assets into Vite's public directory.
// Images are never sent to the server; WASM runs locally in the browser.
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const source=path.join(root,'node_modules','@mediapipe','tasks-vision','wasm');
const target=path.join(root,'public','assets','canopy','mediapipe','wasm');
const files=[
  'vision_wasm_internal.js','vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'
];
for(const name of files){
 const src=path.join(source,name);
 if(!fs.existsSync(src)){
  console.error('MediaPipe dependency missing:',src);
  console.error('Run npm ci or npm install before building.');
  process.exit(1);
 }
}
fs.mkdirSync(target,{recursive:true});
for(const name of files)fs.copyFileSync(path.join(source,name),path.join(target,name));
console.log('CANOPY MEDIAPIPE WASM READY: local assets for background removal');
