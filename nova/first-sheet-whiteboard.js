// NOVA first-sheet MOD whiteboard: renderer-independent slot coordinates.
// This is a guide for artists, not extracted original artwork.
export const NOVA_MOD_SLOTS = Object.freeze([
  'hair_back','body','leg_l','leg_r','shoes_l','shoes_r',
  'arm_l','arm_r','hand_l','hand_r','bottom','top','outer',
  'head','face','eyes','mouth','hair_front','hat','accessory'
]);
const variants = {
  chibi:{head:[256,142,162,156],body:[256,320,118,140],hip_l:[226,385,40,45],hip_r:[286,385,40,45],shoulder_l:[191,304,30,30],shoulder_r:[321,304,30,30],wrist_l:[161,360,22,22],wrist_r:[351,360,22,22],ankle_l:[220,454,28,26],ankle_r:[292,454,28,26]},
  adult:{head:[256,100,110,115],body:[256,260,98,185],hip_l:[230,356,46,52],hip_r:[282,356,46,52],shoulder_l:[193,212,30,32],shoulder_r:[319,212,30,32],wrist_l:[174,334,22,22],wrist_r:[338,334,22,22],ankle_l:[227,470,30,26],ankle_r:[285,470,30,26]}
};
const escape = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function createNovaWhiteboard(variant) {
  if (!Object.hasOwn(variants,variant)) throw new Error('Invalid NOVA variant');
  const v=variants[variant], shapes=Object.entries(v).map(([name,[x,y,w,h]])=>
    `<ellipse cx="${x}" cy="${y}" rx="${w/2}" ry="${h/2}" fill="none" stroke="#9b65e6" stroke-dasharray="6 5"/><circle cx="${x}" cy="${y}" r="3" fill="#6c3ea5"/><text x="${x+w/2+6}" y="${y}" font-size="12" fill="#51317d">${escape(name)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>NOVA ${variant} MOD artist whiteboard</title><rect width="512" height="512" fill="#fff"/><path d="M256 20V492 M20 256H492" stroke="#ddd" stroke-dasharray="3 6"/>${shapes}</svg>`;
}
export function createNovaBlankManifest(variant) {
  if (!Object.hasOwn(variants,variant)) throw new Error('Invalid NOVA variant');
  return {format:'nova-mod-whiteboard-v1',variant,canvas:{width:512,height:512},
    note:'Empty slots are intentionally hidden. Outfit fallback must be provided by the trusted base pack.',
    slots:NOVA_MOD_SLOTS.map(slot=>({slot,filename:slot+'.png',hidden:true}))};
}
