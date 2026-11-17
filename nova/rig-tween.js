// Interpolate local joint transforms; composeNovaRig resolves their world transforms.
export function interpolateNovaPose(bones, from = {}, to = {}, progress = 0) {
  if (!Array.isArray(bones) || !bones.length || !Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error('Invalid interpolation');
  for (const pose of [from,to]) if (!pose || typeof pose !== 'object' || Array.isArray(pose)) throw new Error('Invalid pose');
  const ids = new Set(bones.map(b => b?.id));
  if (ids.size !== bones.length || ids.has(undefined)) throw new Error('Invalid skeleton');
  for (const pose of [from,to]) for (const id of Object.keys(pose)) if (!ids.has(id)) throw new Error('Unknown pose joint');
  const result = {};
  for (const bone of bones) {
    const a = from[bone.id] ?? {}, b = to[bone.id] ?? {};
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) throw new Error('Invalid joint pose');
    const values = {};
    for (const key of ['x','y','rotation']) {
      const base = bone[key] ?? 0, start = a[key] ?? base, end = b[key] ?? base;
      if (![base,start,end].every(v => typeof v === 'number' && Number.isFinite(v))) throw new Error('Invalid joint transform');
      const delta = key === 'rotation' ? ((end-start+540)%360)-180 : end-start;
      values[key] = start + delta * progress;
    }
    result[bone.id] = values;
  }
  return result;
}
