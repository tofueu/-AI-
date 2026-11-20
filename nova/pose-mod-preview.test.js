import test from 'node:test';
import assert from 'node:assert/strict';
import {createNovaClip} from './animation-timeline.js';
import {renderNovaPoseSvg} from './pose-mod-preview.js';

for (const variant of ['chibi','adult']) {
  const base={variant,layers:{body:{path:'body.png'},head:{path:'head.png'},outfit:{path:'clothes.png'},armL:{path:'arm.png'},hat:{path:'hat.png'}}};
  const clip=createNovaClip({variant,name:'walk',durationMs:1000,frames:[
    {timeMs:0,pose:{head:{rotation:0},arm_l:{rotation:0}}},
    {timeMs:1000,pose:{head:{rotation:20},arm_l:{rotation:40}}}
  ],loop:false});
  test(`${variant} sampled pose preserves replacement artwork and clothing fallback`,()=>{
    const result=renderNovaPoseSvg(base,{layers:{hat:null,armL:{path:'custom-arm.png'},outfit:null}},clip,500,{pivots:{head:[100,80],armL:[60,120]}});
    assert.deepEqual(result.fallbacks,['outfit']);
    assert.match(result.svg,/data-bone="head"/);
    assert.match(result.svg,/rotate\(10\)/);
    assert.match(result.svg,/rotate\(20\)/);
    assert.match(result.svg,/custom-arm.png/);
    assert.match(result.svg,/clothes.png/);
    assert.doesNotMatch(result.svg,/data-slot="hat"/);
    assert.match(result.svg,/translate\(100 80\)/);
  });
  test(`${variant} rejects unsafe pivots and mismatched clips`,()=>{
    assert.throws(()=>renderNovaPoseSvg(base,{},clip,500,{pivots:{head:[Infinity,0]}}));
    assert.throws(()=>renderNovaPoseSvg(base,{},clip,500,{pivots:{outfit:[1,2]}}));
    assert.throws(()=>renderNovaPoseSvg(base,{},clip,500,{pivots:{head:[-1,0]}}));
    assert.throws(()=>renderNovaPoseSvg({...base,variant:variant==='chibi'?'adult':'chibi'}, {},clip,500));
  });
}
