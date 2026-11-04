// Standalone, offline HTML player for exported NOVA SVG frames.
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function buildNovaPreviewHtml(sequence) {
  if (!sequence || !Array.isArray(sequence.frames) || !sequence.frames.length || !Number.isInteger(sequence.fps) || sequence.fps < 1 || sequence.fps > 60) throw new Error('Invalid NOVA sequence');
  if (sequence.frames.length > 3600 || !['chibi','adult'].includes(sequence.variant)) throw new Error('Invalid NOVA sequence');
  const frames = sequence.frames.map(frame => {
    if (typeof frame.svg !== 'string' || !/^<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(frame.svg) || /<script\b|<foreignObject\b|\bon\w+\s*=|<iframe\b/i.test(frame.svg)) throw new Error('Unsafe SVG frame');
    return frame.svg;
  });
  const encoded = frames.map(svg => Buffer.from(svg, 'utf8').toString('base64'));
  const title = `NOVA ${sequence.variant} ${String(sequence.action ?? 'preview')}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{background:#191827;color:#fff;font:16px system-ui;text-align:center;margin:2rem}img{width:min(90vw,512px);height:min(90vw,512px);object-fit:contain;background:#28243c;border-radius:18px}button{padding:.6rem 1rem;margin:.5rem}</style></head><body><h1>${escapeHtml(title)}</h1><img id="frame" alt="NOVA animated preview"><p><button id="toggle" type="button">Pause</button><span id="counter" aria-live="off"></span></p><script>const frames=${JSON.stringify(encoded)};const fps=${sequence.fps};let index=0,playing=true;const image=document.getElementById('frame'),counter=document.getElementById('counter'),button=document.getElementById('toggle');function show(){image.src='data:image/svg+xml;base64,'+frames[index];counter.textContent=(index+1)+' / '+frames.length;}show();button.addEventListener('click',()=>{playing=!playing;button.textContent=playing?'Pause':'Play';});setInterval(()=>{if(playing){index=(index+1)%frames.length;show();}},1000/fps);</script></body></html>`;
}
