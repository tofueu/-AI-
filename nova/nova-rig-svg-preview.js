import {sampleNovaPose,resolveNovaLayers} from './nova-rig-motion.js';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderNovaRigSvg(variant='chibi',motion='idle',time=0,mod={},base={}){
 const {canvas:[w,h],joints:j}=sampleNovaPose(variant,motion,time);
 const links=[['root','neck'],['neck','head'],['shoulderL','elbowL'],['elbowL','handL'],['shoulderR','elbowR'],['elbowR','handR'],['root','hipL'],['hipL','kneeL'],['kneeL','footL'],['root','hipR'],['hipR','kneeR'],['kneeR','footR']];
 const lines=links.map(([a,b])=>'<line x1="'+j[a][0]+'" y1="'+j[a][1]+'" x2="'+j[b][0]+'" y2="'+j[b][1]+'" stroke="#a78bfa" stroke-width="12" stroke-linecap="round"/>').join('');
 const dots=Object.entries(j).map(([name,[x,y]])=>'<circle data-joint="'+xml(name)+'" cx="'+x+'" cy="'+y+'" r="5" fill="#f5d0fe"/>').join('');
 const layers=Object.entries(resolveNovaLayers(mod,base)).filter(([,v])=>v!==null).map(([k,v])=>'<metadata data-layer="'+xml(k)+'" data-asset="'+xml(v)+'"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img"><title>NOVA joint preview, not final art</title>'+layers+lines+dots+'</svg>';
}
