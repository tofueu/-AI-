// Load only sources referenced by a validated NOVA draw frame.
// The host owns PNG decoding and URL resolution; this module never fetches URLs itself.
export async function loadNovaFrameImages(frame, {decode, resolvePath=(path)=>path}={}) {
  if (!frame || !Array.isArray(frame.commands) || typeof decode!=='function' || typeof resolvePath!=='function')
    throw new Error('Invalid NOVA image loader configuration');
  const paths=[];
  const seen=new Set();
  for (const command of frame.commands) {
    if (!command || typeof command.src!=='string' || !command.src.trim() ||
        command.src!==command.src.trim() || command.src.includes('\\') ||
        command.src.startsWith('/') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(command.src) ||
        command.src.includes('?') || command.src.includes('#') ||
        !command.src.split('/').every(part=>part && part!=='.' && part!=='..') ||
        !/\.png$/i.test(command.src)) throw new Error('Unsafe NOVA PNG source');
    if (!seen.has(command.src)) { seen.add(command.src); paths.push(command.src); }
  }
  const decoded=await Promise.all(paths.map(async path=>{
    const location=resolvePath(path);
    if(typeof location!=='string'||!location) throw new Error('Unresolved NOVA PNG: '+path);
    const image=await decode(location,path);
    if(!image) throw new Error('Failed to decode NOVA PNG: '+path);
    return [path,image];
  }));
  return Object.assign(Object.create(null),Object.fromEntries(decoded));
}
