// Standalone gallery for exported diagnostic SVGs (not final NOVA character artwork).
// Relative URLs work when the folder is opened locally without a web server.
export function renderRigPreviewGallery() {
  const variants = ['chibi', 'adult'];
  const cards = variants.map(variant => `<section><h2>${variant === 'chibi' ? 'Q 版' : '成人版'}</h2><object type="image/svg+xml" data="nova-${variant}-typing-rig.svg" width="320" height="340" aria-label="NOVA ${variant} typing rig animation">請使用支援 SVG 動畫的瀏覽器開啟預覽</object><p>骨架動作診斷圖，非正式角色美術</p></section>`).join('\n');
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOVA 骨架動畫驗證</title><style>body{font-family:system-ui,sans-serif;background:#f5f1fb;color:#35274c;margin:2rem}main{display:flex;flex-wrap:wrap;gap:1.5rem}section{background:white;border-radius:16px;padding:1rem;box-shadow:0 2px 12px #35274c18}object{display:block;max-width:100%}p{font-size:.9rem}</style></head><body><h1>NOVA 雙版本打字動畫預覽</h1><p>此頁僅用於檢查骨架動畫連貫性，不能當作角色驗收圖。</p><main>${cards}</main></body></html>`;
}
