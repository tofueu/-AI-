// Motion presets for the existing NOVA joint interpolator; no artwork is changed.
import {sampleNovaMotion} from './rig-motion.js';
export const NOVA_MOTION_PRESETS=Object.freeze({
 idle:[{atMs:0,pose:{root:{y:0},head:{rotation:0}}},{atMs:500,pose:{root:{y:-3},head:{rotation:2}}},{atMs:1000,pose:{root:{y:0},head:{rotation:0}}}],
 walk:[{atMs:0,pose:{leg_l:{rotation:20},leg_r:{rotation:-20},arm_l:{rotation:-12},arm_r:{rotation:12}}},{atMs:300,pose:{leg_l:{rotation:-20},leg_r:{rotation:20},arm_l:{rotation:12},arm_r:{rotation:-12}}},{atMs:600,pose:{leg_l:{rotation:20},leg_r:{rotation:-20},arm_l:{rotation:-12},arm_r:{rotation:12}}}],
 typing:[{atMs:0,pose:{arm_l:{rotation:-30},arm_r:{rotation:30},hand_l:{y:0},hand_r:{y:0}}},{atMs:200,pose:{arm_l:{rotation:-30},arm_r:{rotation:30},hand_l:{y:4},hand_r:{y:-4}}},{atMs:400,pose:{arm_l:{rotation:-30},arm_r:{rotation:30},hand_l:{y:0},hand_r:{y:0}}}],
 cry:[{atMs:0,pose:{head:{rotation:-4,y:0}}},{atMs:450,pose:{head:{rotation:4,y:6}}},{atMs:900,pose:{head:{rotation:-4,y:0}}}]
});
export function sampleNovaPreset(variant,name,timeMs){
 if(!Object.hasOwn(NOVA_MOTION_PRESETS,name))throw new Error('Unknown NOVA motion preset');
 return sampleNovaMotion({variant,frames:NOVA_MOTION_PRESETS[name],timeMs});
}
