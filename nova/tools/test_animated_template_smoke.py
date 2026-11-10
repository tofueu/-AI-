"""End-to-end scaffold -> pose timeline -> GIF smoke tests for both rigs.

Uses synthetic shapes, not the official NOVA character artwork.
"""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

try:
    from .create_blank_mod import create_template, SIZES
    from .pose_presets import generate
    from .rig_animator import export
except ImportError:
    from create_blank_mod import create_template, SIZES
    from pose_presets import generate
    from rig_animator import export


class AnimatedTemplateSmokeTests(unittest.TestCase):
    def test_chibi_and_adult_gif_export(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                directory = create_template(Path(tmp) / variant, variant)
                width, height = size
                body = Image.new('RGBA', size, (0, 0, 0, 0))
                draw = ImageDraw.Draw(body)
                draw.ellipse((width * .38, height * .43, width * .62,
                              height * .78), fill=(210, 160, 180, 255))
                body.save(directory / 'body.png')
                manifest_path = directory / 'mod.json'
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
                for layer in manifest['layers']:
                    if layer['slot'] == 'body':
                        layer['visible'] = True
                manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
                poses_path = directory / 'walk.json'
                poses_path.write_text(json.dumps(generate('walk', 8, 100)), encoding='utf-8')
                output = directory / 'walk.gif'
                export(directory / 'rig.json', manifest_path, poses_path, output)
                self.assertTrue(output.is_file())
                with Image.open(output) as gif:
                    self.assertEqual(gif.size, size)
                    self.assertEqual(gif.n_frames, 8)
                    gif.seek(0)
                    first = gif.convert('RGBA')
                    self.assertIsNotNone(first.getchannel('A').getbbox())
                    gif.seek(2)
                    later = gif.convert('RGBA')
                    self.assertNotEqual(first.tobytes(), later.tobytes())
                with self.assertRaises(FileExistsError):
                    export(directory / 'rig.json', manifest_path, poses_path, output)


if __name__ == '__main__':
    unittest.main()
