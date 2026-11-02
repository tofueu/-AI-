// Render a sampled NOVA pose as an SVG without depending on a desktop runtime.
// The source paths are encoded as XML attributes; never inject raw markup.
const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderNovaSvg(pose,{width=640,height=640}={}) {
 if(!pose || !['chibi','adult'].includes(pose.variant) || !Array.isArray(pose.layers)) throw new Error('Invalid NOVA pose');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096) throw new Error('Invalid canvas size');
 const elements=pose.layers.map(layer=>{
  if(!layer || typeof layer.src!=='string' || !layer.src || !layer.transform) throw new Error('Invalid bound layer');
  const {x,y,rotation,scaleX,scaleY}=layer.transform;
  if(![x,y,rotation,scaleX,scaleY].every(v=>typeof v==='number'&&Number.isFinite(v)))throw new Error('Invalid transform');
  // Only packaged relative PNGs may be used; reject remote, data and path traversal URLs.
  if(!/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.png$/.test(layer.src))throw new Error('Unsafe asset path');
  const href=escapeXml(layer.src);
  return `<image href="${href}" x="0" y="0" width="${width}" height="${height}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scaleX} ${scaleY})"/>`;
 });
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elements.join('')}</svg>`;
}