import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaFrameSvg} from './frame-svg.js';
for(const variant of ['chibi','adult']) {
  test(`${variant} SVG preserves layer order and rotation`,()=>{
    const svg=renderNovaFrameSvg({variant,layers:[
      {src:'body.png',transform:{x:0,y:0,rotation:0}},
      {src:'hair&"<.png',transform:{x:3,y:-5,rotation:20}}
    ]});
    assert.ok(svg.indexOf('body.png')<svg.indexOf('hair&amp;&quot;&lt;.png'));
    assert.match(svg,/translate\(259 251\) rotate\(20\)/);
    assert.match(svg,/viewBox="0 0 512 512"/);
  });
}
test('rejects nonfinite poses and unsafe canvas sizes',()=>{
  assert.throws(()=>renderNovaFrameSvg({variant:'chibi',layers:[{src:'a',transform:{x:NaN,y:0,rotation:0}}]}));
  assert.throws(()=>renderNovaFrameSvg({variant:'adult',layers:[]},{width:0}));
  assert.throws(()=>renderNovaFrameSvg({variant:'adult',layers:[{src:'javascript:alert(1)',transform:{x:0,y:0,rotation:0}}]}));
});
