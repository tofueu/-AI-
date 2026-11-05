// Detect visually empty RGBA PNG layers after reversing PNG row filters.
// Caller must first validate the PNG structure, dimensions and inflate size.
export function isFullyTransparentRgba(raw,width,height) {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||raw.length!==height*(width*4+1)) throw new Error('Invalid RGBA raster');
  const stride=width*4;
  let previous=new Uint8Array(stride);
  for(let y=0;y<height;y++) {
    const start=y*(stride+1), filter=raw[start];
    if(filter>4) throw new Error('Unsupported PNG filter');
    const row=new Uint8Array(stride);
    for(let i=0;i<stride;i++) {
      const left=i>=4?row[i-4]:0,up=previous[i],upperLeft=i>=4?previous[i-4]:0;
      let predictor=0;
      if(filter===1) predictor=left;
      else if(filter===2) predictor=up;
      else if(filter===3) predictor=Math.floor((left+up)/2);
      else if(filter===4) {
        const p=left+up-upperLeft, a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft);
        predictor=a<=b&&a<=c?left:b<=c?up:upperLeft;
      }
      row[i]=(raw[start+1+i]+predictor)&255;
    }
    for(let i=3;i<stride;i+=4) if(row[i]!==0) return false;
    previous=row;
  }
  return true;
}
