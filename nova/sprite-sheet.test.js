import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaSpriteSheet} from './sprite-sheet.js';
const pose=(variant='chibi')=>({variant,layers:[{src:'art/body.png',transform:{x:1,y:2,rotation:0,scaleX:1,scaleY:1}}]});
test('two frames produce positioned nested SVGs',()=>{
 const x=renderNovaSpriteSheet([pose(),pose('adult')],{frameWidth:100,frameHeight:120,columns:2});
 assert.match(x,/width="200" height="120"/);
 assert.match(x,/x="100" y="0"/);
 assert.equal((x.match(/<image /g)||[]).length,2);
});
test('rows wrap',()=>{
 const x=renderNovaSpriteSheet([pose(),pose(),pose()],{frameWidth:100,frameHeight:100,columns:2});
 assert.match(x,/width="200" height="200"/);
 assert.match(x,/x="0" y="100"/);
});
test('invalid frames rejected',()=>{
 assert.throws(()=>renderNovaSpriteSheet([]));
 assert.throws(()=>renderNovaSpriteSheet([{}]));
});
test('oversized output rejected',()=>assert.throws(()=>renderNovaSpriteSheet([pose()],{frameWidth:4096,columns:5})));
