"""Regression tests for single-frame PNG exports and invisible optional slots."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

try:
    from .create_blank_mod import create_template, SIZES
    from .rig_animator import export
except ImportError:
    from create_blank_mod import create_template, SIZES
    from rig_animator import export


class SingleFrameExportTests(unittest.TestCase):
    def test_png_export_with_hidden_optional_layers(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                directory = create_template(Path(tmp) / variant, variant)
                body = Image.new('RGBA', size)
                ImageDraw.Draw(body).ellipse(
                    (size[0] // 3, size[1] // 3, size[0] * 2 // 3,
                     size[1] * 3 // 4), fill=(180, 140, 220, 255))
                body.save(directory / 'body.png')
                manifest_path = directory / 'mod.json'
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
                next(layer for layer in manifest['layers']
                     if layer['slot'] == 'body')['visible'] = True
                manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
                output = directory / 'preview.png'
                export(directory / 'rig.json', manifest_path,
                       directory / 'poses.json', output)
                with Image.open(output) as rendered:
                    self.assertEqual(rendered.size, size)
                    self.assertEqual(rendered.mode, 'RGBA')
                    self.assertIsNotNone(rendered.getchannel('A').getbbox())
                with self.assertRaises(FileExistsError):
                    export(directory / 'rig.json', manifest_path,
                           directory / 'poses.json', output)

    def test_png_rejects_multiple_poses_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = create_template(Path(tmp) / 'chibi', 'chibi')
            poses = directory / 'poses.json'
            poses.write_text(json.dumps([{'angles': {}}, {'angles': {}}]),
                             encoding='utf-8')
            output = directory / 'invalid.png'
            with self.assertRaises(ValueError):
                export(directory / 'rig.json', directory / 'mod.json',
                       poses, output)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
