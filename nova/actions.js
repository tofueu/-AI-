// Original procedural NOVA animation clips. Angles in degrees.
const k=(time,bones)=>({time,bones});
const clip=(duration,keyframes)=>({duration,loop:true,keyframes});
export const NOVA_ACTIONS=Object.freeze({
 idle:clip(2000,[k(0,{torso:{y:0},head:{rotation:-2},hair_front:{rotation:-3}}),k(1000,{torso:{y:-3},head:{rotation:2},hair_front:{rotation:3}}),k(2000,{torso:{y:0},head:{rotation:-2},hair_front:{rotation:-3}})]),
 walk:clip(800,[k(0,{root:{y:0},upper_leg_l:{rotation:24},upper_leg_r:{rotation:-24},upper_arm_l:{rotation:-16},upper_arm_r:{rotation:16}}),k(200,{root:{y:-5},upper_leg_l:{rotation:0},upper_leg_r:{rotation:0}}),k(400,{root:{y:0},upper_leg_l:{rotation:-24},upper_leg_r:{rotation:24},upper_arm_l:{rotation:16},upper_arm_r:{rotation:-16}}),k(600,{root:{y:-5},upper_leg_l:{rotation:0},upper_leg_r:{rotation:0}}),k(800,{root:{y:0},upper_leg_l:{rotation:24},upper_leg_r:{rotation:-24},upper_arm_l:{rotation:-16},upper_arm_r:{rotation:16}})]),
 type:clip(600,[k(0,{upper_arm_l:{rotation:-45},lower_arm_l:{rotation:-35},upper_arm_r:{rotation:45},lower_arm_r:{rotation:35},hand_l:{rotation:-8},hand_r:{rotation:8}}),k(300,{upper_arm_l:{rotation:-45},lower_arm_l:{rotation:-32},upper_arm_r:{rotation:45},lower_arm_r:{rotation:32},hand_l:{rotation:9},hand_r:{rotation:-9}}),k(600,{upper_arm_l:{rotation:-45},lower_arm_l:{rotation:-35},upper_arm_r:{rotation:45},lower_arm_r:{rotation:35},hand_l:{rotation:-8},hand_r:{rotation:8}})]),
 cry:clip(1400,[k(0,{head:{rotation:-6},torso:{y:0},upper_arm_l:{rotation:-30},upper_arm_r:{rotation:30}}),k(700,{head:{rotation:6},torso:{y:5},upper_arm_l:{rotation:-40},upper_arm_r:{rotation:40}}),k(1400,{head:{rotation:-6},torso:{y:0},upper_arm_l:{rotation:-30},upper_arm_r:{rotation:30}})]),
 sleep:clip(2400,[k(0,{head:{rotation:-12},torso:{y:3}}),k(1200,{head:{rotation:-15},torso:{y:7}}),k(2400,{head:{rotation:-12},torso:{y:3}})]),
 celebrate:clip(1000,[k(0,{root:{y:0},upper_arm_l:{rotation:-70},upper_arm_r:{rotation:70}}),k(500,{root:{y:-14},upper_arm_l:{rotation:-110},upper_arm_r:{rotation:110}}),k(1000,{root:{y:0},upper_arm_l:{rotation:-70},upper_arm_r:{rotation:70}})])
});
export function getNovaAction(name,{reducedMotion=false}={}) {
 if(typeof name!=='string'||!Object.hasOwn(NOVA_ACTIONS,name))throw new Error('Unknown NOVA action: '+String(name));
 if(!reducedMotion)return NOVA_ACTIONS[name];
 return {duration:0,loop:false,keyframes:[{time:0,bones:NOVA_ACTIONS[name].keyframes[0].bones}]};
}
