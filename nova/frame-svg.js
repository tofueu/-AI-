// Render a composed NOVA frame as SVG without altering or embedding source artwork.
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function renderNovaFrameSvg(frame, {width=512,height=512,artWidth=256,artHeight=256}={}) {
  if (!frame || !['chibi','adult'].includes(frame.variant) || !Array.isArray(frame.layers)) throw new Error('Invalid NOVA frame');
  if (![width,height,artWidth,artHeight].every(v=>finite(v)&&v>0&&v<=8192)) throw new Error('Invalid NOVA canvas size');
  const images = frame.layers.map(layer => {
    if (!layer || typeof layer.src!=='string' || !layer.src.trim() || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(layer.src.trim()) || layer.src.split(/[\\/]/).includes('..') || !layer.transform ||
        !['x','y','rotation'].every(k=>finite(layer.transform[k]))) throw new Error('Invalid NOVA draw layer');
    const {x,y,rotation}=layer.transform;
    // MOD creators may size and pivot individual parts without changing the source PNG.
    const w=layer.width ?? artWidth, h=layer.height ?? artHeight;
    const anchorX=layer.anchorX ?? 0.5, anchorY=layer.anchorY ?? 0.5;
    if (![w,h,anchorX,anchorY].every(finite) || w<=0 || h<=0 || w>8192 || h>8192 || anchorX<0 || anchorX>1 || anchorY<0 || anchorY>1) throw new Error('Invalid NOVA layer dimensions or anchor');
    const cx=width/2+x, cy=height/2+y;
    return `<image href="${escapeXml(layer.src)}" x="${-artWidth/2}" y="${-artHeight/2}" width="${artWidth}" height="${artHeight}" transform="translate(${cx} ${cy}) rotate(${rotation})" />`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="NOVA ${frame.variant} frame">${images.join('')}</svg>`;
}
