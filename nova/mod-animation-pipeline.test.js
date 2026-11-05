import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNovaModAnimation} from './mod-animation-pipeline.js';
import {NOVA_ACTION_NAMES} from './animation-presets.js';
for (const variant of ['chibi','adult']) {
  for (const action of NOVA_ACTION_NAMES) {
    test(variant+' '+action+' composes visible outfit and animated SVG frames',()=>{
      const sequence=buildNovaModAnimation({
        variant,action,fps:10,
        base:{body:{src:'body.png'},head:{src:'head.png'}},
        mods:[{variant,layers:{hair_front:{src:'hair.png'},hat:{operation:'hide'},top:{hidden:true}}}],
        safeOutfit:{top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}}
      });
      assert.equal(sequence.variant,variant);
      assert.equal(sequence.action,action);
      assert.ok(sequence.frames.length>=2);
      assert.match(sequence.frames[0].svg,/href="safe-top.png"/);
      assert.match(sequence.frames[0].svg,/href="safe-bottom.png"/);
      assert.match(sequence.frames[0].svg,/href="hair.png"/);
      assert.doesNotMatch(sequence.frames[0].svg,/href="hat.png"/);
      assert.notEqual(sequence.frames[0].svg,sequence.frames[Math.floor(sequence.frames.length/2)].svg);
    });
  }
}
test('missing safe clothing is rejected',()=>{
 assert.throws(()=>buildNovaModAnimation({variant:'chibi',action:'idle'}),/safe outfit/);
});
test('unsupported action rejected',()=>{
 assert.throws(()=>buildNovaModAnimation({variant:'adult',action:'teleport',safeOutfit:{top:{src:'t.png'},bottom:{src:'b.png'}}}),/Unknown NOVA action/);
});
