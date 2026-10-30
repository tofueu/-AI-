/** NOVA Photoshop PSD layered reader, data-only, dependency-free.
 * Supports standard Photoshop PSD RGB 8-bit, raw, PackBits RLE, ZIP compression.
 * Does not execute PSD embedded resources, scripts, actions, smart objects or linked files.
 * The animation rig is supplied by Workbench, never trusted from the PSD.
 */
const LIMIT_BYTES=30*1024*1024;
const LIMIT_PIXELS=2048*2048;
const LIMIT_LAYERS=180;
const dec=new TextDecoder('utf-8',{fatal:false});
const fail=reason=>{throw Error('NOVA PSD：'+reason);};
export function psdLayerId(name){
  if(typeof name!=='string')return null;
  let m=/^PART__([a-z][a-z0-9_]{1,36})$/.exec(name);
  if(m)return {kind:'part',part:m[1]};
  m=/^VAR__([a-z][a-z0-9_]{1,29})__([a-z][a-z0-9_]{1,29})__([a-z][a-z0-9_]{1,36})$/.exec(name);
  if(m)return {kind:'variant',category:m[1],option:m[2],part:m[3]};
  return null;
}
/** Return decoded pixels of every nonempty editable PART__ / VAR__ PSD layer. */
export async function parseNovaPsd(input){
  const buffer=input instanceof ArrayBuffer?input:input?.buffer instanceof ArrayBuffer?
    input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength):null;
  if(!buffer||buffer.byteLength<60||buffer.byteLength>LIMIT_BYTES)fail('PSD 大小超出範圍（最大 30 MB）');
  const view=new DataView(buffer);const bytes=new Uint8Array(buffer);const length=bytes.length;
  const str=(p,n)=>{if(p<0||p+n>length)fail('PSD 結構長度錯誤');return dec.decode(bytes.subarray(p,p+n));};
  const u16=p=>{if(p<0||p+2>length)fail('PSD 欄位超出檔案');return view.getUint16(p);};
  const s16=p=>{if(p<0||p+2>length)fail('PSD 欄位超出檔案');return view.getInt16(p);};
  const u32=p=>{if(p<0||p+4>length)fail('PSD 欄位超出檔案');return view.getUint32(p);};
  const s32=p=>{if(p<0||p+4>length)fail('PSD 欄位超出檔案');return view.getInt32(p);};
  if(str(0,4)!=='8BPS'||u16(4)!==1)fail('檔案不是標準 PSD；暫不支援 PSB');
  const channels=u16(12),height=u32(14),width=u32(18),depth=u16(22),mode=u16(24);
  if(width<32||height<32||width*height>LIMIT_PIXELS||depth!==8||mode!==3||channels<3||channels>4)
    fail('目前僅支援 RGB、8-bit、寬高不超過 2048 的分層 PSD；請在 Photoshop 轉成 RGB/8-bit');
  let pos=26;
  const advanceSection=()=>{const size=u32(pos);pos+=4;if(size>length-pos)fail('PSD 區段損壞');const start=pos;pos+=size;return {start,size};};
  advanceSection(); // color mode
  advanceSection(); // image resources
  const mask=advanceSection();
  if(mask.size<6)fail('PSD 沒有可編輯的分層資料（可能已合併圖層）');
  pos=mask.start;
  const layerInfoLength=u32(pos);pos+=4;
  const layerInfoEnd=pos+layerInfoLength;
  if(layerInfoEnd>mask.start+mask.size||layerInfoLength<2)fail('PSD 沒有有效圖層');
  const signedCount=s16(pos);pos+=2;
  const count=Math.abs(signedCount);
  if(count<1||count>LIMIT_LAYERS)fail('PSD 圖層數必須介於 1 到 180');
  const layers=[];
  for(let i=0;i<count;i++){
    if(pos+18>layerInfoEnd)fail('PSD 圖層記錄不完整');
    const top=s32(pos),left=s32(pos+4),bottom=s32(pos+8),right=s32(pos+12);pos+=16;
    const cw=right-left,ch=bottom-top,n=u16(pos);pos+=2;
    if(cw<0||ch<0||cw*ch>LIMIT_PIXELS||Math.abs(left)>4096||Math.abs(top)>4096||n>10)fail('PSD 圖層大小或通道不合法');
    const channels=[];
    for(let j=0;j<n;j++){
      const id=s16(pos),size=u32(pos+2);pos+=6;
      if(size<2||size>LIMIT_BYTES)fail('PSD 通道大小不合法');
      channels.push({id,size});
    }
    if(str(pos,4)!=='8BIM')fail('PSD 圖層混合資料錯誤');
    pos+=8; // signature, blend key
    pos+=4; // opacity/clipping/flags/filler
    const extra=u32(pos);pos+=4;const extraEnd=pos+extra;
    if(extraEnd>layerInfoEnd)fail('PSD 圖層附加資料錯誤');
    const maskSize=u32(pos);pos+=4+maskSize;
    const blendSize=u32(pos);pos+=4+blendSize;
    if(pos+1>extraEnd)fail('PSD 圖層名稱遺失');
    const nameLength=bytes[pos],name=str(pos+1,nameLength);pos+=((nameLength+1+3)>>2)<<2;
    // Additional records may include Photoshop Unicode layer name ('luni').
    let unicodeName=null;
    while(pos+12<=extraEnd){
      const sig=str(pos,4),key=str(pos+4,4),size=u32(pos+8);pos+=12;
      if(size>extraEnd-pos)break;
      if((sig==='8BIM'||sig==='8B64')&&key==='luni'&&size>=4){
        const chars=u32(pos);if(chars>0&&chars<=512&&chars*2+4<=size){
          let unicode='';for(let k=0;k<chars;k++)unicode+=String.fromCharCode(u16(pos+4+k*2));
          unicodeName=unicode;
        }
      }
      pos+=size+(size&1);
    }
    pos=extraEnd;
    layers.push({name:unicodeName||name,top,left,width:cw,height:ch,channels});
  }
  const output=[];const names=new Set();
  for(const layer of layers){
    const channelStart=pos;
    for(const c of layer.channels){
      c.offset=pos;pos+=c.size;
      if(pos>layerInfoEnd)fail('PSD 通道資料超出圖層範圍');
    }
    const id=psdLayerId(layer.name);if(!id)continue; // GUIDE__ layers never imported
    if(names.has(layer.name))fail('PSD 圖層名稱重複：'+layer.name);
    names.add(layer.name);
    const {width:lw,height:lh}=layer;
    if(lw<1||lh<1)continue;
    const chById=new Map(layer.channels.map(c=>[c.id,c]));
    const alpha=chById.has(-1)?await decodeChannel(bytes,view,chById.get(-1),lw,lh):null;
    if(alpha&&!alpha.some(v=>v!==0))continue; // transparent blank painter slot
    // RGB channels may be omitted when base/variant is a grayscale layer.
    const rgb=[];
    for(let n=0;n<3;n++)rgb.push(chById.has(n)?await decodeChannel(bytes,view,chById.get(n),lw,lh):new Uint8Array(lw*lh));
    const pixels=new Uint8ClampedArray(lw*lh*4);
    let minX=lw,minY=lh,maxX=-1,maxY=-1;
    for(let i=0;i<lw*lh;i++){
      const a=alpha?alpha[i]:255;
      if(a>0){const x=i%lw,y=(i/lw)|0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
      const j=i*4;pixels[j]=rgb[0][i];pixels[j+1]=rgb[1][i];pixels[j+2]=rgb[2][i];pixels[j+3]=a;
    }
    if(maxX<0)continue;
    // Crop alpha bounds, reduce GPU memory; retain 2 pixel border to avoid clipping antialias.
    minX=Math.max(0,minX-2);minY=Math.max(0,minY-2);maxX=Math.min(lw-1,maxX+2);maxY=Math.min(lh-1,maxY+2);
    const tw=maxX-minX+1,th=maxY-minY+1,cropped=new Uint8ClampedArray(tw*th*4);
    for(let y=0;y<th;y++)cropped.set(pixels.subarray(((minY+y)*lw+minX)*4,((minY+y)*lw+minX+tw)*4),y*tw*4);
    output.push({...id,name:layer.name,left:layer.left+minX,top:layer.top+minY,width:tw,height:th,pixels:cropped});
  }
  return {width,height,layers:output,layerCount:count,editableLayerCount:names.size};
}
async function decodeChannel(data,view,channel,width,height){
  const start=channel.offset,end=start+channel.size,method=view.getUint16(start),offset=start+2;
  const result=new Uint8Array(width*height);
  if(method===0){
    if(end-offset!==result.length)fail('PSD 原始通道長度與圖片不相符');
    result.set(data.subarray(offset,end));return result;
  }
  if(method===1){
    if(offset+height*2>end)fail('PSD RLE 列索引損壞');
    let cursor=offset+height*2;
    for(let y=0;y<height;y++){
      const rowBytes=view.getUint16(offset+y*2),limit=cursor+rowBytes;
      if(limit>end)fail('PSD RLE 資料不足');
      let i=y*width,filled=0;
      while(cursor<limit){
        const b=(data[cursor++]<<24)>>24; // signed byte
        if(b>=0){const n=b+1;if(cursor+n>limit||filled+n>width)fail('PSD RLE 游程長度錯誤');result.set(data.subarray(cursor,cursor+n),i);cursor+=n;i+=n;filled+=n;}
        else if(b!==-128){const n=1-b;if(cursor>=limit||filled+n>width)fail('PSD RLE 重複長度錯誤');result.fill(data[cursor++],i,i+n);i+=n;filled+=n;}
      }
      if(filled!==width)fail('PSD RLE 畫素列長度錯誤');
    }
    return result;
  }
  if(method===2){
    if(typeof DecompressionStream==='undefined')fail('目前瀏覽器不支援 PSD ZIP 壓縮圖層；請以 RLE 重新儲存');
    const stream=new Blob([data.subarray(offset,end)]).stream().pipeThrough(new DecompressionStream('deflate'));
    const decoded=new Uint8Array(await new Response(stream).arrayBuffer());
    if(decoded.length!==result.length)fail('PSD ZIP 通道長度錯誤');
    return decoded;
  }
  fail('目前不支援這種 PSD 圖層壓縮方式：'+method+'（請以 RLE 儲存）');
}