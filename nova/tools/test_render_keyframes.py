"""Integration checks for keyframes -> rendered GIF for both MOD canvas sizes."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

try:
    from .create_blank_mod import create_template, SIZES
    from .render_keyframes import render_keyframes
except ImportError:
    from create_blank_mod import create_template, SIZES
    from render_keyframes import render_keyframes


class KeyframeRenderTests(unittest.TestCase):
    def test_chibi_and_adult_render_and_source_preservation(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / variant, variant)
                body = Image.new("RGBA", size)
                ImageDraw.Draw(body).ellipse((size[0]*.4, size[1]*.4, size[0]*.6, size[1]*.7), fill=(190, 100, 130, 255))
                body.save(root / "body.png")
                manifest_path = root / "mod.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                next(x for x in manifest["layers"] if x["slot"] == "body")["visible"] = True
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                keyframes = root / "keys.json"
                keyframes.write_text(json.dumps([
                    {"angles": {"torso": -10}, "duration_ms": 160},
                    {"angles": {"torso": 10}, "duration_ms": 160}
                ]), encoding="utf-8")
                before = {p.name: p.read_bytes() for p in (root / "body.png", manifest_path, keyframes)}
                out = root / "motion.gif"
                render_keyframes(root / "rig.json", manifest_path, keyframes, out, steps=4)
                with Image.open(out) as gif:
                    self.assertEqual(gif.size, size)
                    self.assertEqual(gif.n_frames, 8)
                    gif.seek(0)
                    first = gif.convert("RGBA").tobytes()
                    gif.seek(4)
                    self.assertNotEqual(first, gif.convert("RGBA").tobytes())
                self.assertEqual(before, {p.name: p.read_bytes() for p in (root / "body.png", manifest_path, keyframes)})
                with self.assertRaises(FileExistsError):
                    render_keyframes(root / "rig.json", manifest_path, keyframes, out)
                with self.assertRaises(ValueError):
                    render_keyframes(root / "rig.json", manifest_path, keyframes, root / "invalid.png")


if __name__ == "__main__":
    unittest.main()
