// Run: node nova/tests/mod-layer-logic.test.cjs
// Extract the actual browser function so the tests exercise production logic.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../mod-layer-preview.html'),'utf8');
const slotsMatch=html.match(/const slots=(\[[^;]+\]);/);
assert.ok(slotsMatch,'production slot array exists');
const slots=JSON.parse(slotsMatch[1].replace(/'/g,'"'));
const begin=html.indexOf('function visibleLayers(character){');
const end=html.indexOf('\nfunction draw()',begin);
assert.ok(begin>=0&&end>begin,'production visibleLayers function exists');
const visibleLayers=new Function('slots',html.slice(begin,end)+';return visibleLayers;')(slots);
const image={width:512,height:512};
const layer=()=>({visible:true,image});
const cases=[
 ['empty character',{},[]],
 ['base outfit only',{base_clothes:layer()},['base_clothes']],
 ['top only retains base',{base_clothes:layer(),top:layer()},['base_clothes','top']],
 ['bottom only retains base',{base_clothes:layer(),bottom:layer()},['base_clothes','bottom']],
 ['coat only retains base',{base_clothes:layer(),outer:layer()},['base_clothes','outer']],
 ['complete outfit hides base',{base_clothes:layer(),top:layer(),bottom:layer()},['bottom','top']],
 ['hidden bottom retains base',{base_clothes:layer(),top:layer(),bottom:{visible:false,image}},['base_clothes','top']],
 ['empty top retains base',{base_clothes:layer(),top:{visible:true,image:null},bottom:layer()},['base_clothes','bottom']],
 ['head and hair layer order',{head_shape:layer(),eyes:layer(),mouth:layer(),hair_front:layer(),hat:layer()},['head_shape','eyes','mouth','hair_front','hat']],
 ['full character overrides all',{base_clothes:layer(),hat:layer(),full_character:layer()},['full_character']],
 ['hidden full character does not override',{base_clothes:layer(),full_character:{visible:false,image}},['base_clothes']],
 ['transparent empty slot absent',{base_clothes:layer(),accessory:{visible:false,image:null}},['base_clothes']]
];
for(const [name,character,expected] of cases){
 const actual=visibleLayers(character).map(x=>Object.entries(character).find(([,v])=>v===x)[0]);
 assert.deepEqual(actual,expected,name);
 console.log('PASS',name);
}
console.log('PASS '+cases.length+'/'+cases.length+' production layer tests');
