import test from 'node:test';
import assert from 'node:assert/strict';
import {composeNovaModSvg} from './nova-mod-svg-compositor.js';
import {NOVA_LAYERS} from './nova-rig-motion.js';

for (const variant of ['chibi','adult']) {
 test(`${variant}: rear hair paints behind body and facial features`,()=>{
  const mod={hairBack:'assets/back.png',body:'assets/body.png',head:'assets/head.png',eyes:'assets/eyes.png',hairFront:'assets/front.png'};
  const result=composeNovaModSvg(variant,mod);
  const index=name=>result.svg.indexOf(`data-layer="${name}"`);
  for(const name of ['hairBack','body','head','eyes','hairFront'])assert.ok(index(name)>=0,name);
  assert.ok(index('hairBack')<index('body'));
  assert.ok(index('body')<index('head'));
  assert.ok(index('head')<index('eyes'));
  assert.ok(index('eyes')<index('hairFront'));
  assert.deepEqual(Object.keys(result.layers),NOVA_LAYERS);
  for(const name of ['top','bottom','underwear'])assert.match(result.svg,new RegExp(`data-layer="${name}"`));
 });
}
