'use strict';
const fs=require('node:fs');
const path=require('node:path');
const SLOTS=['full_character','head','eyes','mouth','hair_back','hair_front','hat','body','clothes','left_arm','right_arm','left_leg','right_leg','accessory'];
const VARIANTS={chibi:{head:[140,38,232,218],body:[158,235,196,210]},adult:{head:[156,18,200,172],body:[170,195,172,276]}};
function exportModTemplate(outDir,variant='chibi'){
 if(!Object.hasOwn(VARIANTS,variant))throw new TypeError('Unknown NOVA variant');
 if(typeof outDir!=='string'||!outDir.trim())throw new TypeError('outDir required');
 const dir=path.resolve(outDir);fs.mkdirSync(dir,{recursive:true});
 const guide=VARIANTS[variant];
 const boxes=Object.entries(guide).map(([name,[x,y,w,h]])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#8a63b4" stroke-dasharray="8 5"/><text x="${x+5}" y="${y+18}" font-size="14" fill="#5c3480">${name} guide</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><title>NOVA ${variant} transparent MOD whiteboard</title><g id="guides" opacity="0.7">${boxes}<path d="M256 0V512 M0 256H512" stroke="#aaa" stroke-dasharray="3 6"/></g>${SLOTS.map(slot=>`<g id="slot-${slot}" data-slot="${slot}"/>`).join('')}</svg>`;
 fs.writeFileSync(path.join(dir,'whiteboard.svg'),svg);
 const manifest={schemaVersion:1,variant,canvas:{width:512,height:512},note:'Transparent slots are intentionally empty. Paint each slot as a full-canvas transparent PNG; keep the same origin for all layers. The SVG guides are not character artwork.',slots:Object.fromEntries(SLOTS.map(slot=>[slot,'']))};
 fs.writeFileSync(path.join(dir,'mod-template.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'README.txt'),'NOVA MOD whiteboard ('+variant+')\nOpen whiteboard.svg in a vector editor. Place artwork on the named slot groups, then export each occupied slot as a 512x512 transparent PNG with unchanged canvas origin. Set its path in mod-template.json. Blank slots remain empty and should be hidden. This is an editable guide, not an approved character design or a PSD.\n');
 return {dir,variant,slotCount:SLOTS.length};
}
if(require.main===module){try{console.log(JSON.stringify(exportModTemplate(process.argv[3]||'nova-mod-template',process.argv[2]||'chibi')))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={exportModTemplate,SLOTS};
