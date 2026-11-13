"""Q/adult MOD rendering: empty slots stay invisible; required clothing falls back."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.rig_layer_preview import render_frames


class EmptyLayerAndClothingTests(unittest.TestCase):
    def test_empty_layers_and_fallback_clothes(self):
        for size in ((256, 256), (512, 768)):
            with self.subTest(size=size), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "rig.json").write_text(json.dumps({
                    "joints": {"hip": [0.5, 0.5], "head": [0.5, 0.25]}
                }), encoding="utf-8")
                (root / "manifest.json").write_text(json.dumps({
                    "canvas": list(size),
                    "layers": {"eyes": "empty.png", "clothes": "empty.png"},
                    "require_clothes": True,
                    "fallback_clothes": "outfit.png"
                }), encoding="utf-8")
                Image.new("RGBA", size, (0, 0, 0, 0)).save(root / "empty.png")
                Image.new("RGBA", size, (25, 70, 120, 255)).save(root / "outfit.png")
                before = {name: (root / name).read_bytes()
                          for name in ("empty.png", "outfit.png")}
                frames = render_frames(root, {
                    "duration_ms": 100, "frames": [{"time_ms": 0, "joints": {}}]
                }, fps=10)
                self.assertEqual(len(frames), 1)
                self.assertEqual(frames[0].getpixel((size[0] // 2, size[1] // 2)),
                                 (25, 70, 120, 255))
                for name, data in before.items():
                    self.assertEqual((root / name).read_bytes(), data)

    def test_transparent_fallback_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "rig.json").write_text(json.dumps({
                "joints": {"hip": [0.5, 0.5]}
            }), encoding="utf-8")
            (root / "manifest.json").write_text(json.dumps({
                "canvas": [256, 256], "layers": {},
                "require_clothes": True, "fallback_clothes": "blank.png"
            }), encoding="utf-8")
            Image.new("RGBA", (256, 256)).save(root / "blank.png")
            with self.assertRaisesRegex(ValueError, "Fallback clothing is transparent"):
                render_frames(root, {
                    "duration_ms": 100, "frames": [{"time_ms": 0, "joints": {}}]
                })


if __name__ == "__main__":
    unittest.main()
