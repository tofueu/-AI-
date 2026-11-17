"""Regression tests for review contact sheet generation."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.animation_contact_sheet import export_contact_sheet


class ContactSheetTests(unittest.TestCase):
    def _sequence(self, root):
        folder = Path(root) / "frames"
        folder.mkdir()
        names = ["frame_0000.png", "frame_0001.png", "frame_0002.png"]
        for name in names:
            Image.new("RGBA", (32, 48), (200, 30, 100, 120)).save(folder / name)
        (folder / "manifest.json").write_text(
            json.dumps({"canvas": [32, 48], "frames": names}), encoding="utf-8"
        )
        return folder

    def test_exports_labeled_contact_sheet_without_touching_frames(self):
        with tempfile.TemporaryDirectory() as root:
            folder = self._sequence(root)
            original = [(folder / p).read_bytes() for p in
                        ("frame_0000.png", "frame_0001.png", "frame_0002.png")]
            target = Path(root) / "review.png"
            export_contact_sheet(folder, target, columns=2, thumb_size=(64, 64))
            with Image.open(target) as sheet:
                self.assertEqual(sheet.size, (128, 176))
            self.assertEqual(original, [(folder / p).read_bytes() for p in
                                       ("frame_0000.png", "frame_0001.png", "frame_0002.png")])

    def test_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as root:
            folder = self._sequence(root)
            target = Path(root) / "review.png"
            target.write_bytes(b"keep")
            with self.assertRaises(FileExistsError):
                export_contact_sheet(folder, target)
            self.assertEqual(target.read_bytes(), b"keep")

    def test_rejects_traversal_and_wrong_canvas(self):
        with tempfile.TemporaryDirectory() as root:
            folder = self._sequence(root)
            manifest = folder / "manifest.json"
            data = json.loads(manifest.read_text())
            data["frames"] = ["../escape.png"]
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                export_contact_sheet(folder, Path(root) / "review.png")
            data["frames"] = ["frame_0000.png"]
            data["canvas"] = [99, 99]
            manifest.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                export_contact_sheet(folder, Path(root) / "review.png")


if __name__ == "__main__":
    unittest.main()
