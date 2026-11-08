// NOVA joint-frame diagnostic contact sheet; not finished character artwork.
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderNovaRigPreviewSvg({variant,action,frames,columns=6}={}) {
 if(!['chibi','adult'].includes(variant)||!Array.isArray(frames)||!frames.length||frames.length>120||!Number.isInteger(columns)||columns<1||columns>12)throw new Error('Invalid preview');
 const chibi=variant==='chibi', w=160,h=210,rows=Math.ceil(frames.length/columns),out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*w}" height="${rows*h}" viewBox="0 0 ${columns*w} ${rows*h}"><rect width="100%" height="100%" fill="#f4f0fa"/>`];
 for(const [i,frame] of frames.entries()){
  if(!frame||!Number.isFinite(frame.timeMs)||!frame.pose||typeof frame.pose!=='object')throw new Error('Invalid frame');
  for(const transform of Object.values(frame.pose)) {
   if(!transform||typeof transform!=='object'||Array.isArray(transform))throw new Error('Invalid transform');
   for(const n of Object.values(transform))if(typeof n!=='number'||!Number.isFinite(n))throw new Error('Invalid transform');
  }
  const val=(j,k)=>frame.pose[j]?.[k]??0,bodyY=chibi?105:91,headY=chibi?61:48,torsoH=chibi?46:66;
  out.push(`<g transform="translate(${(i%columns)*w} ${Math.floor(i/columns)*h})"><rect x="3" y="3" width="154" height="204" rx="9" fill="white" stroke="#d5c6e8"/><text x="10" y="19" font-size="10" fill="#59496d">${xml(action??'motion')} · ${i+1}</text><g transform="translate(80 ${val('root','y')})">`);
  for(const [x,r] of [[-19,val('leg_l','rotation')],[19,val('leg_r','rotation')]])out.push(`<g transform="translate(${x} ${bodyY+torsoH-3}) rotate(${r})"><path d="M0 0 V${chibi?33:39}" stroke="#6b528e" stroke-width="13" stroke-linecap="round"/></g>`);
  for(const [x,r] of [[-28,val('arm_l','rotation')],[28,val('arm_r','rotation')]])out.push(`<g transform="translate(${x} ${bodyY+9}) rotate(${r})"><path d="M0 0 V${chibi?31:45}" stroke="#ad83d0" stroke-width="12" stroke-linecap="round"/></g>`);
  out.push(`<rect x="-27" y="${bodyY}" width="54" height="${torsoH}" rx="14" fill="#bba0db" stroke="#6b528e" stroke-width="2"/><g transform="translate(0 ${headY+val('head','y')}) rotate(${val('head','rotation')})"><circle r="${chibi?31:22}" fill="#ead5f8" stroke="#6b528e" stroke-width="2"/><circle cx="-10" cy="2" r="3"/><circle cx="10" cy="2" r="3"/><path d="M-5 12 Q0 16 5 12" stroke="#503766" stroke-width="2" fill="none"/></g></g></g>`);
 }
 return out.join('')+'</svg>';
}
