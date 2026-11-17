"""Security and failure-cleanup regression tests for contact sheet exports."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.animation_contact_sheet import export_contact_sheet


class ContactSheetSafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.frames = self.root / "frames"
        self.frames.mkdir()
        Image.new("RGBA", (16, 16), (200, 100, 50, 255)).save(self.frames / "frame_0000.png")
        (self.frames / "manifest.json").write_text(
            json.dumps({"canvas": [16, 16], "frames": ["frame_0000.png"]}), encoding="utf-8"
        )

    def test_rejects_symlinked_frame(self):
        original = self.frames / "frame_0000.png"
        original.rename(self.frames / "real.png")
        try:
            original.symlink_to(self.frames / "real.png")
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable")
        with self.assertRaises(ValueError):
            export_contact_sheet(self.frames, self.root / "out.png")
        self.assertFalse((self.root / "out.png").exists())

    def test_rejects_symlinked_manifest(self):
        manifest = self.frames / "manifest.json"
        manifest.rename(self.frames / "real.json")
        try:
            manifest.symlink_to(self.frames / "real.json")
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable")
        with self.assertRaises(ValueError):
            export_contact_sheet(self.frames, self.root / "out.png")

    def test_failed_save_does_not_leave_partial_output(self):
        target = self.root / "out.png"
        def fail_save(image, fp, **kwargs):
            fp.write(b"partial")
            raise OSError("simulated disk failure")
        with patch.object(Image.Image, "save", fail_save):
            with self.assertRaises(OSError):
                export_contact_sheet(self.frames, target)
        self.assertFalse(target.exists())

    def test_existing_output_not_overwritten(self):
        target = self.root / "out.png"
        target.write_bytes(b"keep")
        with self.assertRaises(FileExistsError):
            export_contact_sheet(self.frames, target)
        self.assertEqual(target.read_bytes(), b"keep")


if __name__ == "__main__":
    unittest.main()
