/** Minimal 8-bit RGB layered PSD test fixture; no Photoshop/ImageMagick runtime required. */
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const s16=n=>{const b=Buffer.alloc(2);b.writeInt16BE(n);return b;};
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const i32=n=>{const b=Buffer.alloc(4);b.writeInt32BE(n);return b;};
const ascii=s=>Buffer.from(s,'ascii');
const join=list=>Buffer.concat(list);
const shapes=[
 {name:'PART__head',x:254,y:170,w:136,h:170,rgb:[220,170,240]},
 {name:'PART__torso',x:273,y:383,w:95,h:140,rgb:[80,65,148]},
 {name:'PART__upperarm_l',x:211,y:397,w:48,h:82,rgb:[180,125,220]},
 {name:'VAR__eyes__happy__eyes_l',x:283,y:257,w:20,h:16,rgb:[105,50,180]}
];
export function makeTestPsd(){
 const records=[],channels=[];
 for(const s of shapes){
  const pixels=s.w*s.h;
  const ch=[Buffer.alloc(pixels,255),...s.rgb.map(v=>Buffer.alloc(pixels,v))];
  const ids=[-1,0,1,2];
  const enc=ch.map(b=>join([u16(0),b]));
  const name=ascii(s.name);
  const pascal=join([Buffer.from([name.length]),name,Buffer.alloc((4-(name.length+1)%4)%4)]);
  const extra=join([u32(0),u32(0),pascal]);
  records.push(join([i32(s.y),i32(s.x),i32(s.y+s.h),i32(s.x+s.w),u16(4),
    ...ids.flatMap((id,i)=>[s16(id),u32(enc[i].length)]),
    ascii('8BIM'),ascii('norm'),Buffer.from([255,0,0,0]),u32(extra.length),extra]));
  channels.push(...enc);
 }
 const layers=join([s16(shapes.length),...records,...channels]);
 const layerAndMask=join([u32(layers.length),layers,u32(0)]);
 const header=join([ascii('8BPS'),u16(1),Buffer.alloc(6),u16(4),u32(800),u32(640),u16(8),u16(3)]);
 const composite=join([u16(0),Buffer.alloc(640*800*4)]);
 return join([header,u32(0),u32(0),u32(layerAndMask.length),layerAndMask,composite]);
}
