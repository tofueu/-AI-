import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaFrameSvg} from './frame-svg.js';

for (const variant of ['chibi','adult']) {
  test(`${variant} supports per-part dimensions and pivot for facial features and clothing`, () => {
    const svg=renderNovaFrameSvg({variant,layers:[
      {src:'face/eyes.png',width:36,height:18,anchorX:0.5,anchorY:0.25,transform:{x:4,y:-6,rotation:12}},
      {src:'body.png',transform:{x:0,y:0,rotation:0}}
    ]});
    assert.match(svg,/x="-18" y="-4.5" width="36" height="18"/);
    assert.match(svg,/x="-128" y="-128" width="256" height="256"/);
    assert.ok(svg.indexOf('eyes.png')<svg.indexOf('body.png'));
  });
}
test('rejects unsafe per-layer dimensions and pivots',()=>{
  const layer={src:'a.png',transform:{x:0,y:0,rotation:0}};
  for(const patch of [{width:0},{height:Infinity},{anchorX:-0.1},{anchorY:1.1},{width:'50'}]){
    assert.throws(()=>renderNovaFrameSvg({variant:'chibi',layers:[{...layer,...patch}]}));
  }
});
