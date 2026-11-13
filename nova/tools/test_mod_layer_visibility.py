"""Regression tests for invisible optional layers and clothing fallback in both rigs."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames


class ModLayerVisibilityTests(unittest.TestCase):
    def test_empty_optional_layers_are_visually_hidden(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                size = tuple(manifest["canvas"])
                Image.new("RGBA", size, (0, 0, 0, 0)).save(root / "eyes.png")
                Image.new("RGBA", size, (0, 0, 0, 0)).save(root / "accessory.png")
                Image.new("RGBA", size, (200, 40, 80, 255)).save(root / "clothes.png")
                timeline = {"duration_ms": 100, "loop": False,
                            "frames": [{"time_ms": 0, "joints": {}}]}
                with_empty = render_frames(root, timeline, fps=10)[0].tobytes()
                manifest["layers"].pop("eyes")
                manifest["layers"].pop("accessory")
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                without_empty = render_frames(root, timeline, fps=10)[0].tobytes()
                self.assertEqual(with_empty, without_empty)

    def test_missing_clothes_uses_fallback_without_changing_source(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                size = tuple(manifest["canvas"])
                fallback = root / "default_outfit.png"
                Image.new("RGBA", size, (25, 60, 90, 255)).save(fallback)
                manifest["fallback_clothes"] = fallback.name
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                original_clothes = (root / "clothes.png").read_bytes()
                original_fallback = fallback.read_bytes()
                timeline = {"duration_ms": 100, "loop": False,
                            "frames": [{"time_ms": 0, "joints": {}}]}
                frame = render_frames(root, timeline, fps=10)[0]
                self.assertEqual(frame.getpixel((0, 0)), (25, 60, 90, 255))
                self.assertEqual((root / "clothes.png").read_bytes(), original_clothes)
                self.assertEqual(fallback.read_bytes(), original_fallback)


if __name__ == "__main__":
    unittest.main()
