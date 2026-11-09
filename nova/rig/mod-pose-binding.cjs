'use strict';
const {variants,pose}=require('./joint-animation.cjs');
const {slots}=require('../tools/generate-mod-templates.cjs');
const slotJoint=Object.freeze({
 hair_back:'head',body:'torso',base_clothes:'torso',bottom:'hip',top:'torso',outer:'torso',shoes:'leftFoot',
 head:'head',head_shape:'head',face:'head',eyes:'head',mouth:'head',hair_front:'head',hat:'head',accessory:'rightHand',full_character:'hip'
});
const FALLBACK='base_clothes';
function validSource(value){return typeof value==='string'&&value.trim().length>0;}
function composeLayers(variant,clip,time,assets={}){
 if(!variants[variant])throw new TypeError('Unknown character variant');
 if(!assets||typeof assets!=='object'||Array.isArray(assets))throw new TypeError('Invalid assets');
 const current=pose(variant,clip,time),base=variants[variant];
 const source=slot=>Object.hasOwn(assets,slot)?assets[slot]:undefined;
 const full=validSource(source('full_character'));
 const clothing=['top','outer','base_clothes'].some(s=>validSource(source(s)));
 return slots.flatMap(slot=>{
  if(full&&slot!=='full_character')return [];
  let src=source(slot);
  if(slot===FALLBACK&&!clothing&&!full)src='builtin://base-clothes/'+variant;
  if(!validSource(src))return [];
  const joint=slotJoint[slot];
  if(!joint)throw new Error('Unmapped MOD slot: '+slot);
  const [x,y]=current[joint], [bx,by]=base[joint];
  return [{slot,src,joint,dx:x-bx,dy:y-by}];
 });
}
module.exports={slotJoint,composeLayers};
