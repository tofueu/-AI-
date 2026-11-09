#!/usr/bin/env python3
"""Remove a uniform border-connected background from NOVA reference art.

Conservative pre-processing only: complex backgrounds, hair and antialiasing
require manual masking. Original input is never overwritten.
Requires Pillow: pip install Pillow
"""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image


def remove_border_background(image, tolerance=24):
    if not 0 <= tolerance <= 255:
        raise ValueError('tolerance must be between 0 and 255')
    rgba = image.convert('RGBA')
    width, height = rgba.size
    if not width or not height:
        raise ValueError('empty image')
    px = rgba.load()
    corners = [px[x, y][:3] for x, y in ((0, 0), (width-1, 0), (0, height-1), (width-1, height-1))]
    groups = [sum(max(abs(a-b) for a,b in zip(c, d)) <= tolerance for d in corners) for c in corners]
    if max(groups) < 3:
        raise ValueError('Background is not uniform at three corners; use manual masking')
    # Transparent corner RGB is undefined and must not become the background key.\n    # An already-transparent image should be returned unchanged.\n    if all(px[x, y][3] == 0 for x, y in ((0, 0), (width-1, 0), (0, height-1), (width-1, height-1))):\n        return rgba.copy(), rgba.getchannel('A')\n    opaque_corners = [px[x, y][:3] for x, y in ((0, 0), (width-1, 0), (0, height-1), (width-1, height-1)) if px[x, y][3] > 0]\n    if not opaque_corners:\n        return rgba.copy(), rgba.getchannel('A')\n    bg = corners[groups.index(max(groups))]
    mask = bytearray(width*height)
    q = deque()
    def enqueue(x,y):
        i=y*width+x
        if mask[i] or px[x,y][3] == 0:
            return
        if max(abs(px[x,y][c]-bg[c]) for c in range(3)) <= tolerance:
            mask[i]=1
            q.append((x,y))
    for x in range(width):
        enqueue(x,0);enqueue(x,height-1)
    for y in range(height):
        enqueue(0,y);enqueue(width-1,y)
    while q:
        x,y=q.popleft()
        if x:enqueue(x-1,y)
        if x+1<width:enqueue(x+1,y)
        if y:enqueue(x,y-1)
        if y+1<height:enqueue(x,y+1)
    out=rgba.copy()
    op=out.load()
    for i, selected in enumerate(mask):
        if selected:
            x=i%width;y=i//width
            r,g,b,_=op[x,y]
            op[x,y]=(r,g,b,0)
    # Keep pre-existing transparency and semi-transparent edges in the editable mask.
    # The mask must match the actual alpha channel of the exported PNG.
    matte=out.getchannel('A')
    return out,matte


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=Path)
    p.add_argument('output',type=Path)
    p.add_argument('--tolerance',type=int,default=24)
    args=p.parse_args()
    if args.output.suffix.lower() != '.png':
        p.error('output must be PNG to preserve transparency and the editable mask')
    if args.input.resolve()==args.output.resolve():
        p.error('output must differ from input; original is preserved')
    with Image.open(args.input) as im:
        result,mask=remove_border_background(im,args.tolerance)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    result.save(args.output)
    mask.save(args.output.with_name(args.output.stem+'_mask.png'))
    print(f'Wrote {args.output} and editable mask; inspect hair and edge artifacts manually')


if __name__=='__main__':
    main()
