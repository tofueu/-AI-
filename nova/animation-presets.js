// NOVA loop-safe keyframe presets for both rig variants.
export const NOVA_ACTION_NAMES=Object.freeze(['idle','walk','run','typing','cry','sleep']);
const profiles={chibi:{bob:7,step:10,arm:18},adult:{bob:5,step:17,arm:12}};
const pose=(y=0,leg=0,arm=0,head=0)=>({root:{y},upper_leg_l:{rotation:leg},upper_leg_r:{rotation:-leg},upper_arm_l:{rotation:-arm},upper_arm_r:{rotation:arm},head:{rotation:head}});
export function createNovaAction(variant,name){
 const p=profiles[variant];if(!p)throw new Error('Unsupported NOVA variant');
 let duration,frames;
 switch(name){
 case 'idle':duration=1600;frames=[[0,pose()],[800,pose(-p.bob,0,0,3)],[1600,pose()]];break;
 case 'walk':duration=800;frames=[[0,pose(0,p.step,p.arm)],[200,pose(-p.bob/2)],[400,pose(0,-p.step,-p.arm)],[600,pose(-p.bob/2)],[800,pose(0,p.step,p.arm)]];break;
 case 'run':duration=520;frames=[[0,pose(0,p.step*1.6,p.arm*1.5)],[130,pose(-p.bob)],[260,pose(0,-p.step*1.6,-p.arm*1.5)],[390,pose(-p.bob)],[520,pose(0,p.step*1.6,p.arm*1.5)]];break;
 case 'typing':duration=700;frames=[[0,{...pose(),lower_arm_l:{rotation:60},lower_arm_r:{rotation:-60}}],[350,{...pose(-2),lower_arm_l:{rotation:70},lower_arm_r:{rotation:-52}}],[700,{...pose(),lower_arm_l:{rotation:60},lower_arm_r:{rotation:-60}}]];break;
 case 'cry':duration=1200;frames=[[0,pose(0,0,0,-8)],[600,pose(p.bob/2,0,0,-16)],[1200,pose(0,0,0,-8)]];break;
 case 'sleep':duration=2000;frames=[[0,pose(0,0,0,15)],[1000,pose(-2,0,0,17)],[2000,pose(0,0,0,15)]];break;
 default:throw new Error('Unknown NOVA action: '+name);
 }
 return {name,variant,duration,loop:true,keyframes:frames.map(([time,bones])=>({time,bones}))};
}
