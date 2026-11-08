import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaRigPreviewSvg} from './rig-preview-svg.js';
for(const variant of ['chibi','adult'])test(variant+' contact sheet',()=>{
 const svg=renderNovaRigPreviewSvg({variant,action:'typing',frames:[{timeMs:0,pose:{head:{rotation:2}}},{timeMs:100,pose:{arm_l:{rotation:15}}}]});
 assert.match(svg,/width="960" height="210"/);
 assert.equal((svg.match(/<circle r=/g)||[]).length,2);
 assert.match(svg,/typing · 2/);
});
test('escape labels and reject invalid pose',()=>{
 assert.match(renderNovaRigPreviewSvg({variant:'chibi',action:'<bad&',frames:[{timeMs:0,pose:{}}]}),/&lt;bad&amp;/);
 assert.throws(()=>renderNovaRigPreviewSvg({variant:'adult',frames:[{timeMs:0,pose:{head:{rotation:Infinity}}}]}));
 assert.throws(()=>renderNovaRigPreviewSvg({variant:'adult',frames:[]}));
});
