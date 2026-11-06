// Browser adapter for NOVA PNG assets. The existing asset-loader validates every
// manifest path before this adapter constructs an image request.
import {loadNovaFrameImages} from './asset-loader.js';

export function createNovaBrowserDecoder({ImageClass=globalThis.Image, crossOrigin=null}={}) {
  if(typeof ImageClass!=='function') throw new Error('NOVA browser Image constructor unavailable');
  return (url)=>new Promise((resolve,reject)=>{
    let image;
    try {
      image=new ImageClass();
      image.onload=()=>{ cleanup(); resolve(image); };
      image.onerror=()=>{ cleanup(); reject(new Error('NOVA PNG failed to load')); };
      function cleanup(){ image.onload=null; image.onerror=null; }
      if(crossOrigin!==null) image.crossOrigin=crossOrigin;
      image.src=url;
    } catch(error) {
      if(image) { image.onload=null; image.onerror=null; }
      reject(error);
    }
  });
}

export async function loadNovaBrowserImages(frame,{assetBase='',ImageClass=globalThis.Image,crossOrigin=null}={}) {
  if(typeof assetBase!=='string' || /[?#]/.test(assetBase)) throw new Error('Invalid NOVA asset base');
  const prefix=assetBase ? assetBase.replace(/\/$/,'')+'/' : '';
  return loadNovaFrameImages(frame,{
    resolvePath:path=>prefix+path,
    decode:createNovaBrowserDecoder({ImageClass,crossOrigin})
  });
}
