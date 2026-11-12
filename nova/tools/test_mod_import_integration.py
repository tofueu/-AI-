"""End-to-end MOD import invariants for both independent NOVA rig sizes."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .mod_loader import load_mod
    from .rig_templates import create_blueprint
except ImportError:
    from mod_loader import load_mod
    from rig_templates import create_blueprint


class ModImportIntegrationTests(unittest.TestCase):
    def test_both_styles_hide_empty_optional_layers_and_keep_original_files(self):
        for style in ("chibi", "adult"):
            with self.subTest(style=style), tempfile.TemporaryDirectory() as temp:
                root = Path(temp) / "character"
                root.mkdir()
                fallback = Path(temp) / "basic_clothing"
                fallback.mkdir()
                size = tuple(create_blueprint(style)["canvas_size"])
                layers = {}
                for slot in ("body", "head", "eyes", "hat", "top", "bottom"):
                    path = root / (slot + ".png")
                    alpha = 0 if slot in ("eyes", "hat", "top", "bottom") else 255
                    Image.new("RGBA", size, (120, 60, 90, alpha)).save(path)
                    layers[slot] = path.name
                for slot in ("top", "bottom"):
                    Image.new("RGBA", size, (40, 50, 60, 255)).save(
                        fallback / (slot + ".png"))
                (root / "manifest.json").write_text(
                    json.dumps({"style": style, "layers": layers}),
                    encoding="utf-8")
                originals = {
                    str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                    for directory in (root, fallback)
                    for p in directory.iterdir() if p.is_file()
                }
                blueprint, parts = load_mod(root, fallback)
                self.assertEqual(tuple(blueprint["canvas_size"]), size)
                self.assertEqual({part["slot"] for part in parts},
                                 {"body", "head", "top", "bottom"})
                self.assertTrue(all(part["image"].size == size for part in parts))
                for path, digest in originals.items():
                    self.assertEqual(hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                                     digest, path)


if __name__ == "__main__":
    unittest.main()
