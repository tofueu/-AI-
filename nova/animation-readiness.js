// Independent animation delivery gate. Metadata is not proof of rendered motion.
export function assessNovaAnimationReadiness(variant, clips, requiredActions = ['idle', 'walk', 'type']) {
  if (!['chibi', 'adult'].includes(variant) || !Array.isArray(clips) ||
      !Array.isArray(requiredActions) || !requiredActions.length ||
      requiredActions.some(action => typeof action !== 'string' || !action.trim()) ||
      new Set(requiredActions).size !== requiredActions.length)
    throw new Error('Invalid NOVA animation manifest');
  const failures = [];
  for (const action of requiredActions) {
    const matches = clips.filter(clip => clip && clip.action === action);
    if (matches.length !== 1) { failures.push(`${action}: expected exactly one clip`); continue; }
    const clip = matches[0];
    if (!Array.isArray(clip.frames) || clip.frames.length < 3) {
      failures.push(`${action}: requires at least three frames`); continue;
    }
    const frames = clip.frames;
    if (frames.some((frame, index) => !frame || !Number.isInteger(frame.index) || frame.index !== index ||
        typeof frame.asset !== 'string' || !frame.asset.trim() ||
        !Number.isInteger(frame.durationMs) || frame.durationMs < 30 || frame.durationMs > 3000)) {
      failures.push(`${action}: invalid frame order, asset or duration`); continue;
    }
    if (new Set(frames.map(frame => frame.asset)).size < 3)
      failures.push(`${action}: repeated frame assets are not distinct animation`);
  }
  return {variant, ready: failures.length === 0, failures, checkedActions: [...requiredActions]};
}
export function assessNovaAnimationPair(chibiClips, adultClips, requiredActions) {
  const chibi = assessNovaAnimationReadiness('chibi', chibiClips, requiredActions);
  const adult = assessNovaAnimationReadiness('adult', adultClips, requiredActions);
  return {ready: chibi.ready && adult.ready, variants: {chibi, adult}};
}
