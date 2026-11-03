import {LAYER_SLOTS,NOVA_VARIANTS} from './mod-layers.js';

// Deterministic blank PNG layer manifest for artists; no PSD export is implied.
export function createNovaModTemplate(variant,{width=1024,height=1024}={}) {
  if(!NOVA_VARIANTS.includes(variant)) throw new Error('Unsupported NOVA variant');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>4096||height>4096) throw new Error('Invalid template dimensions');
  return {
    schemaVersion:1, variant, canvas:{width,height},
    layers:LAYER_SLOTS.map((slot,index)=>({slot,filename:`${String(index+1).padStart(2,'0')}_${slot}.png`,hidden:true,anchor:{x:Math.floor(width/2),y:Math.floor(height/2)}}))
  };
}

export function validateNovaModTemplate(manifest) {
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)) throw new Error('Invalid template');
  const expected=createNovaModTemplate(manifest.variant,manifest.canvas);
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.layers)||manifest.layers.length!==expected.layers.length) throw new Error('Invalid template schema');
  for(let i=0;i<expected.layers.length;i++) {
    const actual=manifest.layers[i],ref=expected.layers[i];
    if(!actual||actual.slot!==ref.slot||actual.filename!==ref.filename||typeof actual.hidden!=='boolean'||!actual.anchor||!Number.isFinite(actual.anchor.x)||!Number.isFinite(actual.anchor.y)||actual.anchor.x<0||actual.anchor.y<0||actual.anchor.x>manifest.canvas.width||actual.anchor.y>manifest.canvas.height) throw new Error(`Invalid template layer ${i}`);
  }
  return true;
}
