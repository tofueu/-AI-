'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const {generate,slots,variants,size}=require('../tools/generate-mod-templates.cjs');
const html=fs.readFileSync(path.join(__dirname,'../mod-layer-preview.html'),'utf8');
const match=html.match(/const slots=(\[[^;]+\]);/);
assert.ok(match,'production slots declared');
assert.deepEqual(slots,JSON.parse(match[1].replace(/'/g,'"')),'template slots must match actual preview slots');
console.log('PASS template slots match production preview');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nova-mod-'));
try{
 const result=generate(tmp);assert.equal(result.files,32);console.log('PASS 32 distinct slot paths');
 const manifest=JSON.parse(fs.readFileSync(path.join(tmp,'manifest.json')));assert.deepEqual(manifest.slots,slots);assert.deepEqual(manifest.variants,variants);console.log('PASS manifest matches generated variants and slots');
 for(const variant of variants)for(const slot of slots){const png=fs.readFileSync(path.join(tmp,variant,slot+'.png'));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);assert.equal(png[25],6);const len=png.readUInt32BE(33);const raw=zlib.inflateSync(png.subarray(41,41+len));assert.equal(raw.length,size*(1+size*4));assert.ok(raw.every(x=>x===0));}
 console.log('PASS 32 valid transparent 512x512 RGBA PNGs');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
