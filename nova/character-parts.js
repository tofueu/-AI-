// Q-version layered MOD composition. Never overwrites original artist files.
export const CHIBI_PARTS=Object.freeze(['body','head','face','hair_back','hair_front','hat','top','bottom','left_arm','right_arm','left_hand','right_hand','left_leg','right_leg','left_shoe','right_shoe','accessory']);
const allowed=new Set(CHIBI_PARTS);
const pathPattern=/^(?!\/)(?!.*(?:^|\/)\.\.?\/)[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/[a-z0-9_.-]+\.png$/i;
function check(pack) {
 if(!pack||typeof pack!=='object'||Array.isArray(pack)||!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(pack.id??'')) throw Error('Invalid MOD id');
 if(!['parts','whole'].includes(pack.mode)||!pack.parts||typeof pack.parts!=='object'||Array.isArray(pack.parts)) throw Error('Invalid MOD structure');
 if(pack.mode==='whole'&&!pack.parts.body) throw Error('Whole MOD requires body');
 for(const [key,value] of Object.entries(pack.parts))
  if(!allowed.has(key)||(value!==null&&(typeof value!=='string'||!pathPattern.test(value)))) throw Error('Invalid MOD part/path');
}
export function resolveChibiMod({base,whole=null,overrides=null}={}) {
 check(base); if(base.mode!=='whole') throw Error('Base must be whole');
 if(whole){check(whole);if(whole.mode!=='whole') throw Error('Whole replacement required');}
 if(overrides){check(overrides);if(overrides.mode!=='parts') throw Error('Part overrides required');}
 const parts={...base.parts,...(whole?.parts??{})};
 for(const [key,value] of Object.entries(overrides?.parts??{})) {
  if(value===null) delete parts[key]; else parts[key]=value;
 }
 for(const key of ['body','top','bottom']) if(!parts[key]) {
  if(!base.parts[key]) throw Error('Missing base clothing/body fallback: '+key);
  parts[key]=base.parts[key];
 }
 return {format:'nova-chibi-resolved-v1',source:{base:base.id,whole:whole?.id??null,overrides:overrides?.id??null},
  layers:CHIBI_PARTS.filter(key=>parts[key]).map(part=>({part,path:parts[part]})),
  skeletalReady:['head','left_arm','right_arm','left_leg','right_leg'].every(key=>Boolean(parts[key]))};
}
