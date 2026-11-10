"""Render NOVA layered MOD poses as RGBA frames or an animated GIF.

Input layers are full-canvas transparent PNGs. Rotation is around each joint's
normalized pivot; parent rotations propagate to descendants. Source files are
never modified. This is a preview renderer, not a mesh-deformation system.
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image


def render_frame(rig, layers, angles):
    width, height = rig['canvas']
    if width <= 0 or height <= 0:
        raise ValueError('Invalid canvas')
    joints = rig['joints']
    slot_joints = rig['slot_joints']
    transforms = {}
    if set(angles) - set(joints):
        raise ValueError('Unknown joint rotation')
    visiting = set()

    def resolve(name):
        if name in transforms:
            return transforms[name]
        if name in visiting:
            raise ValueError('Cyclic joint hierarchy')
        visiting.add(name)
        joint = joints[name]
        parent = joint['parent']
        px, py = (joint['pivot'][0] * width, joint['pivot'][1] * height)
        theta = float(angles.get(name, 0))
        if not math.isfinite(theta):
            raise ValueError('Nonfinite rotation')
        if parent is None:
            result = (theta, px, py)
        else:
            ptheta, ppx, ppy = resolve(parent)
            a = math.radians(ptheta)
            dx, dy = px - ppx, py - ppy
            px = ppx + math.cos(a) * dx - math.sin(a) * dy
            py = ppy + math.sin(a) * dx + math.cos(a) * dy
            result = (ptheta + theta, px, py)
        visiting.remove(name)
        transforms[name] = result
        return result

    output = Image.new('RGBA', (width, height))
    for slot, image in layers.items():
        if slot not in slot_joints:
            raise ValueError(f'Unknown layer slot: {slot}')
        if image.size != (width, height):
            raise ValueError(f'Layer size mismatch: {slot}')
        joint_name = slot_joints[slot]
        angle, x, y = resolve(joint_name)
        original = joints[joint_name]['pivot']
        ox, oy = original[0] * width, original[1] * height
        turned = image.rotate(-angle, resample=Image.Resampling.BICUBIC, center=(ox, oy))
        shifted = Image.new('RGBA', (width, height))
        shifted.paste(turned, (round(x - ox), round(y - oy)))
        output.alpha_composite(shifted)
    return output


def export(rig_path, manifest_path, poses_path, output_path):
    rig_path, manifest_path, poses_path, output_path = map(Path, (rig_path, manifest_path, poses_path, output_path))
    if output_path.exists():
        raise FileExistsError(output_path)
    rig = json.loads(rig_path.read_text(encoding='utf-8'))
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    poses = json.loads(poses_path.read_text(encoding='utf-8'))
    if not isinstance(poses, list) or not poses:
        raise ValueError('Expected nonempty list of poses')
    if len(poses) > 240:
        raise ValueError('Too many frames')
    root = manifest_path.parent.resolve()
    layers = {}
    entries = manifest['layers']
    if isinstance(entries, dict):
        entries = [{'slot': slot, 'file': filename} for slot, filename in entries.items()]
    for entry in entries:
        if not entry.get('visible', True):
            continue
        slot = entry['slot']
        if slot in layers:
            raise ValueError(f'Duplicate visible layer slot: {slot}')
        path = (root / entry['file']).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError(f'Unsafe or missing layer: {slot}')
        with Image.open(path) as src:
            layers[slot] = src.convert('RGBA')
    durations = []
    for pose in poses:
        if not isinstance(pose, dict) or not isinstance(pose.get('angles', {}), dict):
            raise ValueError('Invalid pose or angles')
        duration = pose.get('duration_ms', 120)
        if type(duration) is not int or not 20 <= duration <= 10000:
            raise ValueError('Invalid frame duration')
        durations.append(duration)
    frames = [render_frame(rig, layers, pose.get('angles', {})) for pose in poses]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == '.gif':
        frames[0].save(output_path, save_all=True, append_images=frames[1:], duration=durations,
                       loop=0, disposal=2, optimize=False)
    elif output_path.suffix.lower() == '.png':
        if len(frames) != 1:
            raise ValueError('PNG requires exactly one pose')
        frames[0].save(output_path)
    else:
        raise ValueError('Output must be PNG or GIF')
    return output_path


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('rig')
    p.add_argument('manifest')
    p.add_argument('poses')
    p.add_argument('output')
    a = p.parse_args()
    print(export(a.rig, a.manifest, a.poses, a.output))
