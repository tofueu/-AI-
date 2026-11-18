import {renderNovaModSvg} from './svg-layer-preview.js';
import {embedNovaSvgPngAssets} from './embedded-svg.js';

/** Render a resolved NOVA MOD preview with all PNG assets embedded for portability. */
export function renderPortableNovaModSvg(base, mod = {}, assets = {}, options = {}) {
  const preview = renderNovaModSvg(base, mod, options);
  const packed = embedNovaSvgPngAssets(preview.svg, assets);
  return {...preview, svg:packed.svg, embeddedPaths:packed.embeddedPaths};
}
