"""Export a sequence of NOVA MOD poses as a looping GIF.

Each pose directory contains the same manifest and PNG layers accepted by
compose(). Source layers are never modified.
"""
from pathlib import Path
from PIL import Image
from nova.tools.compose_mod import compose


def render_gif(pose_dirs, base_outfit, output_path, frame_duration_ms=120):
    poses = [Path(p) for p in pose_dirs]
    if len(poses) < 2:
        raise ValueError("animation requires at least two poses")
    if type(frame_duration_ms) is not int or not 20 <= frame_duration_ms <= 5000:
        raise ValueError("invalid frame duration")
    frames = [compose(p, base_outfit) for p in poses]
    if len({frame.size for frame in frames}) != 1:
        raise ValueError("animation frames must share a canvas size")
    output = Path(output_path)
    # Keep alpha by compositing on a transparent palette entry; reserve index 0.
    paletted = []
    for frame in frames:
        rgba = frame.convert("RGBA")
        alpha = rgba.getchannel("A")
        rgb = Image.new("RGB", rgba.size, (0, 0, 0))
        rgb.paste(rgba, mask=alpha)
        indexed = rgb.quantize(colors=255)
        # Shift used indices to 1..255 so index 0 can represent transparency.
        palette = indexed.getpalette()[:255 * 3]
        pixels = indexed.point(lambda v: v + 1)
        pixels.putpalette([0, 0, 0] + palette + [0] * (768 - 3 - len(palette)))
        pixels.paste(0, mask=alpha.point(lambda a: 255 if a == 0 else 0))
        pixels.info["transparency"] = 0
        paletted.append(pixels)
    with output.open("xb") as handle:
        try:
            paletted[0].save(
                handle, format="GIF", save_all=True, append_images=paletted[1:],
                duration=frame_duration_ms, loop=0, disposal=2,
                transparency=0, optimize=False,
            )
        except Exception:
            handle.close()
            output.unlink(missing_ok=True)
            raise
    return output
