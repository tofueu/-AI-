"""Security regressions for NOVA rigid-layer MOD metadata and slot validation."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames

TIMELINE = {"duration_ms": 100, "loop": False,
            "frames": [{"time_ms": 0, "joints": {}}]}


class MetadataSafetyTests(unittest.TestCase):
    def test_unknown_layer_slot_rejected(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["layers"]["unexpected"] = "head.png"
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "unknown MOD layers"):
                    render_frames(root, TIMELINE)

    def test_metadata_symlink_escape_rejected(self):
        for variant in ("chibi", "adult"):
            for filename in ("manifest.json", "rig.json"):
                with self.subTest(variant=variant, filename=filename), tempfile.TemporaryDirectory() as tmp:
                    root = create_template(Path(tmp) / "mod", variant)
                    source = root / filename
                    external = Path(tmp) / filename
                    external.write_bytes(source.read_bytes())
                    source.unlink()
                    try:
                        source.symlink_to(external)
                    except (OSError, NotImplementedError):
                        self.skipTest("Symlinks unavailable on this filesystem")
                    with self.assertRaisesRegex(ValueError, "metadata must stay"):
                        render_frames(root, TIMELINE)


if __name__ == "__main__":
    unittest.main()
