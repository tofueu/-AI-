"""Generate loopable NOVA joint-angle pose timelines (not finished artwork)."""
import argparse
import json
import math
from pathlib import Path

PRESETS = ('idle', 'walk', 'typing')


def generate(preset, frames=16, duration_ms=100):
    if preset not in PRESETS:
        raise ValueError('Unknown preset')
    if type(frames) is not int or not 4 <= frames <= 120:
        raise ValueError('frames must be an integer between 4 and 120')
    if type(duration_ms) is not int or not 20 <= duration_ms <= 10000:
        raise ValueError('Invalid frame duration')
    result = []
    for index in range(frames):
        phase = 2 * math.pi * index / frames
        wave = math.sin(phase)
        opposite = math.sin(phase + math.pi)
        if preset == 'idle':
            angles = {'torso': 1.5 * wave, 'head': -1.5 * wave,
                      'left_arm': 2 * wave, 'right_arm': -2 * wave}
        elif preset == 'walk':
            angles = {'torso': 2 * math.sin(2 * phase), 'head': -math.sin(2 * phase),
                      'left_arm': 18 * opposite, 'right_arm': 18 * wave,
                      'left_leg': 20 * wave, 'right_leg': 20 * opposite}
        else:
            angles = {'torso': wave, 'head': -2 * wave,
                      'left_arm': -10 + 6 * math.sin(2 * phase),
                      'right_arm': 10 - 6 * math.sin(2 * phase)}
        result.append({'angles': {name: round(value, 4) for name, value in angles.items()},
                       'duration_ms': duration_ms})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('preset', choices=PRESETS)
    parser.add_argument('output', type=Path)
    parser.add_argument('--frames', type=int, default=16)
    parser.add_argument('--duration-ms', type=int, default=100)
    args = parser.parse_args()
    poses = generate(args.preset, args.frames, args.duration_ms)
    if args.output.exists():
        parser.error('Output already exists; refusing to overwrite')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(poses, indent=2) + '\n', encoding='utf-8')
    print(args.output)
