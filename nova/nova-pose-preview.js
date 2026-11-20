import {sampleNovaPose,NOVA_RIGS} from './nova-rig-motion.js';
// Diagnostic joint preview, not final character artwork.
export function renderNovaPoseSvg(variant,motion,timeMs=0){
 const pose=sampleNovaPose(variant,motion,timeMs),p=pose.joints,[w,h]=pose.canvas;
 const links=[['neck','head'],['neck','shoulderL'],['neck','shoulderR'],['shoulderL','elbowL'],['elbowL','handL'],['shoulderR','elbowR'],['elbowR','handR'],['neck','root'],['root','hipL'],['root','hipR'],['hipL','kneeL'],['kneeL','footL'],['hipR','kneeR'],['kneeR','footR']];
 const lines=links.map(([a,b])=>`<line x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"/>`).join('');
 const dots=Object.entries(p).map(([name,[x,y]])=>`<circle data-joint="${name}" cx="${x}" cy="${y}" r="5"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-variant="${variant}" data-motion="${motion}" data-time-ms="${timeMs}"><g stroke="#7350a5" stroke-width="9" stroke-linecap="round">${lines}</g><g fill="#c5a4ee" stroke="#7350a5" stroke-width="2">${dots}</g></svg>`;
}
export function renderNovaPoseSequence(variant,motion,{frames=12,durationMs}={}){
 if(!Number.isInteger(frames)||frames<2||frames>120)throw new RangeError('frames must be 2..120');
 if(durationMs!==undefined&&(!Number.isFinite(durationMs)||durationMs<=0))throw new RangeError('Invalid duration');
 const durations={idle:1200,walk:800,typing:600};
 const duration=durationMs??durations[motion];
 if(!duration)throw new Error('Unknown NOVA motion');
 if(!NOVA_RIGS[variant])throw new Error('Unknown NOVA rig variant');
 return Array.from({length:frames},(_,i)=>({timeMs:duration*i/frames,svg:renderNovaPoseSvg(variant,motion,duration*i/frames)}));
}
