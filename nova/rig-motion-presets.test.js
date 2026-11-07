import test from 'node:test';
import assert from 'node:assert/strict';
import {NOVA_MOTION_PRESETS,sampleNovaPreset} from './rig-motion-presets.js';
for(const variant of ['chibi','adult'])for(const [name,frames] of Object.entries(NOVA_MOTION_PRESETS))test(`${variant}/${name} finite and loops`,()=>{
 assert.deepEqual(sampleNovaPreset(variant,name,0).pose,sampleNovaPreset(variant,name,frames.at(-1).atMs).pose);
 for(const t of [0,100,250,500,1000])for(const transform of Object.values(sampleNovaPreset(variant,name,t).pose))for(const value of Object.values(transform))assert.ok(Number.isFinite(value));
});
test('unknown preset rejected',()=>assert.throws(()=>sampleNovaPreset('chibi','not-real',0),/Unknown/));
