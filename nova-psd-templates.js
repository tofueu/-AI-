/** Recover complete Q/mature layered PSD templates from Git-backed compressed chunks.
 * Keeps exact source PSD bytes, SHA-256 verification, no external dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const DATA={
 chibi:{parts:5,source:'35552f30ed9653e6ff5baf21606c51cbd9597d7e743ac098395fcc6e700b16d6',compressed:'ef88188241de30bb5eea302ef6f1a4ece1c64a7ab0799e4dacc86bd14065d872'},
 mature:{parts:3,source:'983892511ca2f0bf1930b34a59f6ccd65d3da6beadb42b0956b97104b4c81d1a',compressed:'916f3988a44a3c83119e2af325a2edfba4a2ae6c56279c4301af7a73eed82bf1'}
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function psdTemplateBytes(root,style){
 const spec=DATA[style];if(!spec)throw Error('Unknown PSD style');
 const folder=path.join(root,'art','nova-official','psd-templates');
 let parts=[];
 for(let i=0;i<spec.parts;i++){
  const p=path.join(folder,`${style}.psd.gz.part${String(i).padStart(2,'0')}`);
  if(!fs.existsSync(p))throw Error('Git PSD part missing: '+path.basename(p));
  parts.push(fs.readFileSync(p));
 }
 const zipped=Buffer.concat(parts);
 if(sha(zipped)!==spec.compressed)throw Error('Git PSD compressed template checksum mismatch');
 const psd=zlib.gunzipSync(zipped,{maxOutputLength:15*1024*1024});
 if(sha(psd)!==spec.source)throw Error('Git PSD source checksum mismatch');
 if(psd.subarray(0,4).toString('ascii')!=='8BPS')throw Error('Template no longer a PSD');
 return psd;
}
export function installPsdTemplates(root){
 const dest=path.join(root,'public','assets','nova-psd-templates');
 fs.mkdirSync(dest,{recursive:true});
 const outputs=[];
 for(const style of ['chibi','mature']){
  const filename=`NOVA_Artist_${style}_Layer_Template_v1.psd`;
  const file=path.join(dest,filename);
  if(fs.existsSync(file)&&sha(fs.readFileSync(file))===DATA[style].source){outputs.push({style,cached:true});continue;}
  const psd=psdTemplateBytes(root,style),temp=file+'.tmp';
  fs.writeFileSync(temp,psd);fs.renameSync(temp,file);
  outputs.push({style,cached:false,bytes:psd.length});
 }
 return outputs;
}