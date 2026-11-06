// Map AI Workbench task events to existing NOVA rig animations.
// Pure state adapter: callers own elapsed time and rendering.
import {createNovaClip} from './rig-presets.js';
import {sampleClip} from './rig-animation.js';

export const NOVA_TASK_STATES=Object.freeze(['idle','queued','running','reviewing','succeeded','failed']);
const ACTION_BY_STATE=Object.freeze({
 idle:'idle',queued:'idle',running:'type',reviewing:'idle',succeeded:'walk',failed:'cry'
});
export function actionForNovaTask(state) {
 if(typeof state!=='string'||!Object.hasOwn(ACTION_BY_STATE,state)) throw new Error('Invalid NOVA task state');
 return ACTION_BY_STATE[state];
}
export function sampleNovaTask({variant,state,elapsedSeconds,loop=true}) {
 const action=actionForNovaTask(state);
 const clip=createNovaClip(variant,action);
 return {...sampleClip(clip,elapsedSeconds,{loop}),action,state};
}
