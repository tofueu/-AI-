// Deterministic frame schedule for NOVA MOD preview/export. No image assets are modified.
// The caller renders each pose using sampleNovaPose(variant, motion, elapsedMs).
const DURATIONS = Object.freeze({idle:1200, walk:800, typing:600});
export function planNovaAnimationFrames({variant, motion, fps=12, loops=1} = {}) {
 if (variant !== 'chibi' && variant !== 'adult') throw new Error('Unknown NOVA variant');
 if (!Object.hasOwn(DURATIONS, motion)) throw new Error('Unknown NOVA motion');
 if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new RangeError('NOVA fps must be 1..60');
 if (!Number.isInteger(loops) || loops < 1 || loops > 10) throw new RangeError('NOVA loops must be 1..10');
 const durationMs = DURATIONS[motion] * loops;
 const frameCount = Math.round(durationMs * fps / 1000);
 if (frameCount > 600) throw new RangeError('Too many NOVA frames');
 const frames = Array.from({length:frameCount}, (_, index) => ({
  index,
  elapsedMs: Math.round(index * durationMs / frameCount),
  filename: `${variant}-${motion}-${String(index).padStart(4,'0')}.svg`
 }));
 return {variant,motion,fps,loops,durationMs,frames};
}
