import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaFrame} from './frame-composer.js';

for (const variant of ['chibi','adult']) {
  test(variant+' composes animated MOD layers with safe clothing',()=>{
    const base={head:{src:'head.png'},top:{src:'old-top.png'},bottom:{src:'old-bottom.png'}};
    const safeOutfit={top:{src:'safe-top.png'},bottom:{src:'safe-bottom.png'}};
    const mods=[{variant,layers:{top:{operation:'hide'},hair_front:{src:'new-hair.png'}}}];
    const frame=composeNovaFrame({variant,base,mods,safeOutfit,state:'running',elapsedSeconds:0.2});
    assert.equal(frame.action,'type');
    assert.equal(frame.layers.find(x=>x.slot==='top').src,'safe-top.png');
    assert.equal(frame.layers.find(x=>x.slot==='bottom').src,'old-bottom.png');
    assert.equal(frame.layers.find(x=>x.slot==='hair_front').joint,'head');
    assert.ok(frame.layers.every(x=>Number.isFinite(x.transform.rotation)));
    assert.equal(base.top.src,'old-top.png');
    assert.equal(mods[0].layers.hair_front.src,'new-hair.png');
  });
  test(variant+' full dress hides two-piece clothing in composed frame',()=>{
    const frame=composeNovaFrame({variant,base:{top:{src:'top.png'},bottom:{src:'bottom.png'}},mods:[{variant,layers:{dress:{src:'dress.png'}}}],state:'idle'});
    assert.ok(frame.layers.some(x=>x.slot==='dress'));
    assert.ok(!frame.layers.some(x=>x.slot==='top'||x.slot==='bottom'));
  });
}
