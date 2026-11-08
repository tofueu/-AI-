import test from 'node:test';
import assert from 'node:assert/strict';
import {renderNovaRigPreviewSvg} from './rig-preview-svg.js';

for (const variant of ['chibi', 'adult']) {
  test(variant + ' rejects null and malformed joint transforms', () => {
    for (const transform of [null, undefined, [], 12, 'invalid']) {
      assert.throws(
        () => renderNovaRigPreviewSvg({variant, frames: [{timeMs: 0, pose: {head: transform}}]}),
        /Invalid transform/
      );
    }
  });
}
