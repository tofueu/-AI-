// Resolve local NOVA joint poses into world transforms for layered MOD rendering.
// The same parent-first skeleton format works for chibi and adult characters.
export function composeNovaRig(bones, pose = {}) {
  if (!Array.isArray(bones) || !bones.length || !pose || typeof pose !== 'object' || Array.isArray(pose)) throw new Error('Invalid skeleton or pose');
  const world = new Map();
  for (const bone of bones) {
    if (!bone || typeof bone.id !== 'string' || !/^[a-z][a-z0-9_-]*$/i.test(bone.id) || world.has(bone.id)) throw new Error('Invalid bone id');
    const parent = bone.parent == null ? null : world.get(bone.parent);
    if (bone.parent != null && !parent) throw new Error('Parent must precede child');
    const override = pose[bone.id] ?? {};
    if (!override || typeof override !== 'object' || Array.isArray(override)) throw new Error('Invalid joint pose');
    const x=override.x ?? bone.x ?? 0, y=override.y ?? bone.y ?? 0, rotation=override.rotation ?? bone.rotation ?? 0;
    if (![x,y,rotation].every(v=>typeof v==='number'&&Number.isFinite(v))) throw new Error('Invalid transform');
    const radians = (parent?.rotation ?? 0)*Math.PI/180;
    world.set(bone.id,{
      id:bone.id,
      x:parent ? parent.x+x*Math.cos(radians)-y*Math.sin(radians) : x,
      y:parent ? parent.y+x*Math.sin(radians)+y*Math.cos(radians) : y,
      rotation:(parent?.rotation ?? 0)+rotation
    });
  }
  for (const id of Object.keys(pose)) if (!world.has(id)) throw new Error('Unknown pose joint');
  return [...world.values()];
}
