"""Export an animated NOVA rig as a looping GIF without changing source layers."""
from pathlib import Path
from PIL import Image


def export_gif(frames, destination, duration_ms=100, loop=0):
    """Write RGBA frames to an atomic GIF output; return the output path."""
    if not isinstance(frames, (list, tuple)) or not frames:
        raise ValueError("At least one frame required")
    if type(duration_ms) is not int or not 20 <= duration_ms <= 60000:
        raise ValueError("Invalid frame duration")
    if type(loop) is not int or not 0 <= loop <= 65535:
        raise ValueError("Invalid loop count")
    if any(not isinstance(frame, Image.Image) for frame in frames):
        raise TypeError("Frames must be PIL images")
    size = frames[0].size
    if size[0] < 1 or size[1] < 1 or any(frame.size != size for frame in frames):
        raise ValueError("Frame sizes must match")
    path = Path(destination)
    if path.suffix.lower() != ".gif":
        raise ValueError("Destination must be .gif")
    if path.exists():
        raise FileExistsError("Refusing to overwrite an existing GIF")
    if not path.parent.is_dir():
        raise FileNotFoundError("Output directory does not exist")
    # GIF has no full alpha; map fully transparent pixels to a dedicated index.
    prepared = []
    for frame in frames:
        rgba = frame.convert("RGBA")
        alpha = rgba.getchannel("A")
        rgb = Image.new("RGB", size, (0, 0, 0))
        rgb.paste(rgba, mask=alpha)
        indexed = rgb.quantize(colors=255)
        # Reserve index 255 for transparent pixels.
        indexed.putpalette(indexed.getpalette()[:765] + [0, 0, 0])
        indexed.paste(255, (0, 0, *size), Image.eval(alpha, lambda a: 255 if a < 128 else 0))
        indexed.info["transparency"] = 255
        prepared.append(indexed)
    # Exclusive creation ensures a previous asset cannot be silently destroyed.
    with path.open("xb") as handle:
        try:
            prepared[0].save(handle, format="GIF", save_all=True,
                             append_images=prepared[1:], duration=duration_ms,
                             loop=loop, disposal=2, transparency=255,
                             optimize=False)
        except Exception:
            handle.close()
            path.unlink(missing_ok=True)
            raise
    return path
