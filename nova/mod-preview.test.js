import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaModPreview} from './mod-preview.js';

const manifest=(variant='chibi')=>({schemaVersion:1,variant,layers:{hair_front:{src:'hair.png'},hat:{operation:'hide'}}});
function harness() {
 const events=[];let factory;
 const preview=createNovaModPreview({stageOptions:{rig:{variant:'chibi'}},createStage:async options=>{
   if(factory) return factory(options);
   const stage={start(){events.push('start')},stop(){events.push('stop')}};
   events.push(options.mods);return stage;
 }});
 return {preview,events,setFactory:fn=>{factory=fn}};
}
test('imports replace/hide MOD and swaps active stage',async()=>{
 const h=harness();
 assert.equal(await h.preview.setMods([manifest()]),true);
 assert.equal(h.events[0][0].layers.hair_front.src,'hair.png');
 assert.equal(h.events[0][0].layers.hat.operation,'hide');
 assert.equal(await h.preview.setMods([]),true);
 assert.deepEqual(h.events.slice(1).filter(x=>typeof x==='string'),['start','start','stop']);
 h.preview.dispose();
 assert.equal(h.preview.disposed,true);
});
test('failed replacement keeps existing stage running',async()=>{
 const h=harness();await h.preview.setMods([]);
 h.setFactory(async()=>{throw Error('PNG missing')});
 await assert.rejects(h.preview.setMods([manifest()]),/PNG missing/);
 assert.equal(h.events.filter(x=>x==='stop').length,0);
 h.preview.dispose();
});
test('late stale load is stopped, never activated',async()=>{
 const h=harness();let release;
 h.setFactory(()=>new Promise(resolve=>{release=resolve}));
 const pending=h.preview.setMods([]);
 h.setFactory(async()=>({start(){h.events.push('new')},stop(){h.events.push('new-stop')}}));
 assert.equal(await h.preview.setMods([]),true);
 release({start(){h.events.push('stale-start')},stop(){h.events.push('stale-stop')}});
 assert.equal(await pending,false);
 assert.deepEqual(h.events,['new','stale-stop']);
});
test('reject invalid MOD without launching a stage',async()=>{
 const h=harness();
 await assert.rejects(h.preview.setMods([{schemaVersion:1,variant:'adult',layers:{hat:{src:'../bad.png'}}}]),/Invalid MOD PNG path/);
 assert.deepEqual(h.events,[]);
 h.preview.dispose();
 await assert.rejects(h.preview.setMods([]),/disposed/);
});
