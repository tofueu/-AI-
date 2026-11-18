// Validate PNG headers for MOD assets before loading them into the renderer.
// This does not decode pixels or replace full image-decoder validation.
const SIGNATURE = [137,80,78,71,13,10,26,10];
const read32 = (b, p) => (((b[p] * 0x1000000) + (b[p+1] << 16) + (b[p+2] << 8) + b[p+3]) >>> 0);

export function inspectNovaPngAsset(bytes, canvas, options = {}) {
  if (!(bytes instanceof Uint8Array)) throw new Error('PNG bytes required');
  const maxBytes = options.maxBytes ?? 16 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 33 || bytes.length > maxBytes) throw new Error('PNG file size exceeds limit');
  if (bytes.length < 33 || !SIGNATURE.every((value, i) => bytes[i] === value)) throw new Error('Invalid PNG signature');
  if (read32(bytes, 8) !== 13 || String.fromCharCode(...bytes.subarray(12,16)) !== 'IHDR') throw new Error('Invalid PNG IHDR');
  const width = read32(bytes,16), height = read32(bytes,20);
  if (!width || !height || width > 4096 || height > 4096) throw new Error('Invalid PNG dimensions');
  if (!canvas || !Number.isInteger(canvas.width) || !Number.isInteger(canvas.height) || width !== canvas.width || height !== canvas.height) throw new Error('PNG canvas mismatch');
  const depth = bytes[24], colorType = bytes[25], compression = bytes[26], filter = bytes[27], interlace = bytes[28];
  if (!([2,6].includes(colorType)) || depth !== 8 || compression !== 0 || filter !== 0 || ![0,1].includes(interlace)) throw new Error('Unsupported PNG format');
  if (colorType !== 6) throw new Error('PNG layer must have RGBA alpha');
  return {width,height,bitDepth:depth,colorType:'RGBA',interlaced:interlace === 1};
}
