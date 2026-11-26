"""Convert trusted NOVA renderNovaFrameSequence JSON to animated GIF.
Requires Pillow and CairoSVG. Usage: python nova/export_gif.py sequence.json output.gif
"""
import argparse
import io
import json
import math
from pathlib import Path

import cairosvg
from PIL import Image


def export_gif(sequence, output):
    frames = sequence['frames']
    if not 1 <= len(frames) <= 600 or sequence['frameCount'] != len(frames):
        raise ValueError('Invalid frame count')
    images, delays = [], []
    elapsed = ticks = 0
    for index, frame in enumerate(frames):
        duration = frame['durationMs']
        if frame['index'] != index or not math.isfinite(duration) or duration <= 0:
            raise ValueError('Invalid frame index or duration')
        elapsed += duration
        next_ticks = max(ticks + 1, round(elapsed / 10))
        delays.append((next_ticks - ticks) * 10)
        ticks = next_ticks
        with Image.open(io.BytesIO(cairosvg.svg2png(bytestring=frame['svg'].encode('utf-8')))) as png:
            rgba = png.convert('RGBA')
        if images and rgba.size != images[0].size:
            raise ValueError('Frame dimensions differ')
        # Reserve palette index 255 for transparency in every frame.
        indexed = rgba.convert('RGB').quantize(colors=255)
        indexed.putpalette((indexed.getpalette() + [0] * 768)[:768])
        indexed.paste(255, mask=rgba.getchannel('A').point(lambda a: 255 if a < 128 else 0))
        images.append(indexed)
    images[0].save(output, format='GIF', save_all=True, append_images=images[1:],
                   duration=delays, disposal=2, transparency=255, optimize=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sequence', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    export_gif(json.loads(args.sequence.read_text(encoding='utf-8')), args.output)
