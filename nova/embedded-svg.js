/** Package PNG references as self-contained SVG data URIs (not a PNG decoder). */
const SIG=[137,80,78,71,13,10,26,10];
const MAX=32*1024*1024;
const decode=s=>s.replace(/&(amp|quot|lt|gt|apos);/g,(_,k)=>({amp:'&',quot:'"',lt:'<',gt:'>',apos:"'"}[k]));
export function embedNovaSvgPngAssets(svg,assets){
 if(typeof svg!=='string'||!svg.includes('<svg')||!svg.includes('</svg>'))throw Error('Invalid SVG');
 if(!assets||typeof assets!=='object')throw Error('Invalid assets');
 const get=k=>assets instanceof Map?assets.get(k):Object.hasOwn(assets,k)?assets[k]:undefined;
 const embeddedPaths=[];
 const result=svg.replace(/(<image\s[^>]*?\bhref=")([^"]+)(")/g,(full,a,encoded,z)=>{
  const path=decode(encoded);
  if(path.startsWith('data:'))return full;
  if(!/^[\w./&'() +@-]+\.png$/i.test(path)||path.startsWith('/')||path.split('/').includes('..'))throw Error('Unsafe asset path: '+path);
  const b=get(path);
  if(!(b instanceof Uint8Array)||b.length<24||b.length>MAX)throw Error('Missing or invalid PNG: '+path);
  if(!SIG.every((v,i)=>b[i]===v)||b[12]!==73||b[13]!==72||b[14]!==68||b[15]!==82)throw Error('Invalid PNG header: '+path);
  const view=new DataView(b.buffer,b.byteOffset,b.byteLength);
  const w=view.getUint32(16),h=view.getUint32(20);
  if(!w||!h||w>8192||h>8192)throw Error('Invalid PNG dimensions: '+path);
  embeddedPaths.push(path);
  return a+'data:image/png;base64,'+Buffer.from(b).toString('base64')+z;
 });
 return {svg:result,embeddedPaths};
}
