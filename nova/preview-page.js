// Build an offline, script-free preview page for a NOVA animated SVG.
// The SVG must be produced by the trusted NOVA renderer, not supplied by a MOD.
export function renderNovaPreviewPage(animatedSvg,{title='NOVA animation preview'}={}) {
  if(typeof animatedSvg!=='string'||!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" [\s\S]*<\/svg>$/.test(animatedSvg))throw new Error('Invalid NOVA SVG');
  if(typeof title!=='string'||title.length>120)throw new Error('Invalid preview title');
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Never permit script or event-handler injection into a preview document.
  if(/<\s*(?:script|foreignObject|iframe)\b|\bon[a-z]+\s*=|(?:javascript|data):/i.test(animatedSvg))throw new Error('Unsafe NOVA SVG');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline';"><title>${escape(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#211d2e;color:#f2eaff;font-family:system-ui}main{text-align:center;padding:24px}svg{max-width:90vw;height:auto;background:repeating-conic-gradient(#ffffff18 0% 25%,transparent 0% 50%) 50%/20px 20px}</style></head><body><main><h1>${escape(title)}</h1>${animatedSvg}</main></body></html>`;
}