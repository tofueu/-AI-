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

LAYER_ORDER = ('body', 'hair_back', 'head', 'eyes', 'mouth', 'clothes', 'hair_front', 'accessory')


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
        if name not in joints:
            raise ValueError(f'Unknown parent joint: {name}')
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

    # Validate the complete rig even when a joint has no visible MOD layer.
    # Otherwise a cyclic or missing-parent joint can silently pass rendering.
    for joint_name in joints:
        resolve(joint_name)

    output = Image.new('RGBA', (width, height))
    for slot in layers:
        if slot not in LAYER_ORDER:
            raise ValueError(f'Unknown layer slot: {slot}')
    for slot in LAYER_ORDER:
        if slot not in layers:
            continue
        image = layers[slot]
        if image.size != (width, height):
            raise ValueError(f'Layer size mismatch: {slot}')
        if slot not in slot_joints:
            raise ValueError(f'Unknown layer slot: {slot}')
        if image.getchannel('A').getbbox() is None:
            continue
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
    # A MOD may hide or omit its clothes layer, but a valid fallback must
    # restore visible clothing before any frames are rendered.
    if 'clothes' not in layers or layers['clothes'].getchannel('A').getbbox() is None:
        fallback = manifest.get('fallback_clothes')
        if not isinstance(fallback, str) or not fallback:
            raise ValueError('Visible clothes or fallback_clothes is required')
        fallback_path = (root / fallback).resolve()
        if not fallback_path.is_relative_to(root) or not fallback_path.is_file():
            raise ValueError('Unsafe or missing fallback clothes')
        with Image.open(fallback_path) as src:
            fallback_image = src.convert('RGBA')
        if fallback_image.size != tuple(rig['canvas']):
            raise ValueError('Fallback clothes size mismatch')
        if fallback_image.getchannel('A').getbbox() is None:
            raise ValueError('Fallback clothes must be visible')
        layers['clothes'] = fallback_image
    if 'body' not in layers or layers['body'].getchannel('A').getbbox() is None:
        raise ValueError('Visible base body is required')
    durations = []
    for pose in poses:
        if not isinstance(pose, dict) or not isinstance(pose.get('angles', {}), dict):
            raise ValueError('Invalid pose or angles')
        duration = pose.get('duration_ms', 120)
        if type(duration) is not int or not 20 <= duration <= 10000:
            raise ValueError('Invalid frame duration')
        durations.append(duration)
    suffix = output_path.suffix.lower()
    if suffix not in ('.gif', '.png'):
        raise ValueError('Output must be PNG or GIF')
    if suffix == '.png' and len(poses) != 1:
        raise ValueError('PNG requires exactly one pose')
    frames = [render_frame(rig, layers, pose.get('angles', {})) for pose in poses]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if suffix == '.gif':
        frames[0].save(output_path, save_all=True, append_images=frames[1:], duration=durations,
                       loop=0, disposal=2, optimize=False)
    else:
        frames[0].save(output_path)
    return output_path


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('rig')
    p.add_argument('manifest')
    p.add_argument('poses')
    p.add_argument('output')
    a = p.parse_args()
    print(export(a.rig, a.manifest, a.poses, a.output))
