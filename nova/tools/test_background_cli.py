"""CLI integration tests for the conservative NOVA background remover."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image

SCRIPT = Path(__file__).with_name('remove_background.py')


class TestBackgroundCli(unittest.TestCase):
    def test_exports_transparent_png_and_mask_without_overwriting_source(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'source.png'
            target = root / 'nested' / 'character.png'
            im = Image.new('RGBA', (9, 9), (255, 255, 255, 255))
            for y in range(2, 7):
                for x in range(2, 7):
                    im.putpixel((x, y), (90, 20, 140, 255))
            im.save(source)
            before = source.read_bytes()
            proc = subprocess.run([sys.executable, str(SCRIPT), str(source), str(target)], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertEqual(source.read_bytes(), before)
            with Image.open(target) as output, Image.open(target.with_name('character_mask.png')) as mask:
                self.assertEqual(output.getpixel((0, 0))[3], 0)
                self.assertEqual(output.getpixel((4, 4))[3], 255)
                self.assertEqual(list(output.getchannel('A').getdata()), list(mask.getdata()))

    def test_rejects_overwriting_source_and_non_png_output(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'source.png'
            Image.new('RGB', (4, 4), 'white').save(source)
            before = source.read_bytes()
            for target in (source, Path(folder) / 'bad.jpg'):
                proc = subprocess.run([sys.executable, str(SCRIPT), str(source), str(target)], capture_output=True, text=True)
                self.assertNotEqual(proc.returncode, 0)
                self.assertEqual(source.read_bytes(), before)
                if target != source:
                    self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
