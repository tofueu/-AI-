import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaMotionRig,createNovaMotionClips,sampleNovaMotion} from './motion-presets.js';
for(const variant of ['chibi','adult']) {
  test(`${variant} has distinct rig and three playable actions`,()=>{
    const rig=createNovaMotionRig(variant);
    assert.equal(new Set(rig.map(b=>b.id)).size,rig.length);
    for(const action of ['idle','walk','type']) {
      const frames=createNovaMotionClips(variant)[action];
      assert.ok(frames.length>=3);
      assert.ok(frames.every(f=>f.durationMs>0));
      for(const t of [0,50,200,1000]) assert.ok(Object.values(sampleNovaMotion(variant,action,t)).every(j=>Object.values(j).every(Number.isFinite)));
    }
  });
  test(`${variant} loop returns to start and walk actually moves joints`,()=>{
    const clip=createNovaMotionClips(variant).walk;
    const period=clip.reduce((sum,f)=>sum+f.durationMs,0);
    assert.deepEqual(sampleNovaMotion(variant,'walk',0),sampleNovaMotion(variant,'walk',period));
    assert.notDeepEqual(sampleNovaMotion(variant,'walk',0),sampleNovaMotion(variant,'walk',period/2));
  });
}
test('rejects unsupported variants and actions',()=>{
  assert.throws(()=>createNovaMotionRig('unknown'));
  assert.throws(()=>createNovaMotionClips('unknown'));
  assert.throws(()=>sampleNovaMotion('adult','fly',0));
});
