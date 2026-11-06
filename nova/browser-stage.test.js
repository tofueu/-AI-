import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaBrowserStage} from './browser-stage.js';
function setup(variant='chibi') {
 const calls=[];const playback={start(){calls.push('start')},stop(){calls.push('stop')},render(t){calls.push(['render',t]);return t}};
 const options={ctx:{},rig:{variant},motionName:'idle',base:{body:{src:'body.png'}},mods:[],safeOutfit:{},requestFrame:()=>1,cancelFrame:()=>{},
 compose:args=>{calls.push(['compose',args.timeMs,args.rig.variant]);return {commands:[{src:'body.png'}]}},
 loadImages:async(frame)=>{calls.push(['load',frame.commands[0].src]);return {'body.png':{}}},
 makePlayback:args=>{calls.push(['playback',Object.keys(args.images)]);return playback}};
 return {options,calls};
}
for(const variant of ['chibi','adult']) test(`${variant} preloads before creating playback and supports controls`,async()=>{
 const {options,calls}=setup(variant);const stage=await createNovaBrowserStage(options);
 assert.deepEqual(calls,[['compose',0,variant],['load','body.png'],['playback',['body.png']]]);
 stage.start();assert.equal(stage.render(80),80);stage.stop();
 assert.deepEqual(calls.slice(3),['start',['render',80],'stop']);
 assert.equal(Object.isFrozen(stage),true);
});
test('broken PNG aborts before scheduler is created',async()=>{
 const {options,calls}=setup();options.loadImages=async()=>{throw Error('PNG broken')};
 await assert.rejects(createNovaBrowserStage(options),/PNG broken/);
 assert.equal(calls.some(x=>x[0]==='playback'),false);
});
test('invalid stage rejects before loading',async()=>{
 const {options,calls}=setup();options.rig=null;
 await assert.rejects(createNovaBrowserStage(options),/Missing NOVA browser stage/);
 assert.deepEqual(calls,[]);
});
test('missing scheduler rejects before loading',async()=>{
 const {options,calls}=setup();options.requestFrame=null;
 await assert.rejects(createNovaBrowserStage(options),/Missing NOVA animation scheduler/);
 assert.deepEqual(calls,[]);
});
